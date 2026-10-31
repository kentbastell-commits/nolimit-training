import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./db/client.ts";
import { athleteLoginLimits, athleteSessions, clients } from "./db/schema.ts";

const COOKIE = "nl-athlete-session";
const SESSION_MS = 30 * 24 * 3600_000;
const LOGIN_WINDOW_MS = 15 * 60_000;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const header = (req: Pick<VercelRequest, "headers">, name: string) => typeof req.headers[name] === "string" ? req.headers[name] as string : "";
export type AthleteProof = "pin" | "wechat" | "preview";

// Compatibility is an explicit, temporary rollout setting for the released
// mini program. New installations and an omitted/misspelled setting fail closed.
export function athleteSessionsRequired() { return process.env.ATHLETE_SESSION_MODE !== "compat"; }

export function sameOriginRequest(req: VercelRequest): boolean {
  if (header(req, "sec-fetch-site") === "cross-site") return false;
  const origin = header(req, "origin");
  if (!origin) return true; // non-browser clients use explicit credentials
  try {
    const target = new URL(origin);
    const host = header(req, "x-forwarded-host") || header(req, "host");
    const local = (value: string) => /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(value);
    return (target.host === host || (local(target.host) && local(host))) && ["https:", "http:"].includes(target.protocol);
  } catch { return false; }
}

function cookie(req: VercelRequest, token: string, maxAge: number) {
  const host = header(req, "x-forwarded-host") || header(req, "host");
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${local ? "" : "; Secure"}`;
}

function requestToken(req: VercelRequest): string {
  const authorization = header(req, "authorization");
  if (authorization) return /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization)?.[1] || "";
  const matches = header(req, "cookie").split(";").map(part => part.trim()).filter(part => part.startsWith(`${COOKIE}=`));
  if (matches.length !== 1) return "";
  return /^[A-Za-z0-9_-]{43}$/.test(matches[0].slice(COOKIE.length + 1)) ? matches[0].slice(COOKIE.length + 1) : "";
}

export async function createAthleteSession(clientId: string, proof: AthleteProof) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + (proof === "preview" ? 30 * 60_000 : SESSION_MS);
  await db.insert(athleteSessions).values({ tokenHash: hash(token), clientId, proof, createdAt: Date.now(), expiresAt });
  await db.delete(athleteSessions).where(lt(athleteSessions.expiresAt, Date.now()));
  return { sessionToken: token, sessionExpiresAt: expiresAt, clientCode: clientId };
}

/** Only call after verifying a coach-issued PIN or a WeChat identity proof. */
export async function issueAthleteSession(req: VercelRequest, res: VercelResponse, clientId: string, proof: AthleteProof) {
  const session = await createAthleteSession(clientId, proof);
  res.setHeader("Cache-Control", "no-store");
  if (header(req, "x-athlete-platform") === "mini" || proof === "preview") return session;
  res.setHeader("Set-Cookie", cookie(req, session.sessionToken, Math.floor((session.sessionExpiresAt - Date.now()) / 1000)));
  return { clientCode: clientId, sessionExpiresAt: session.sessionExpiresAt };
}

export async function readAthleteSession(req: VercelRequest) {
  const token = requestToken(req);
  if (!token) return null;
  const [session] = await db.select({ clientId: athleteSessions.clientId, proof: athleteSessions.proof,
    expiresAt: athleteSessions.expiresAt, name: clients.fullName }).from(athleteSessions)
    .innerJoin(clients, eq(clients.clientId, athleteSessions.clientId))
    .where(and(eq(athleteSessions.tokenHash, hash(token)), gt(athleteSessions.expiresAt, Date.now()))).limit(1);
  if (!session || !["pin", "wechat", "preview"].includes(session.proof)) return null;
  return session;
}

export async function revokeAthleteSession(req: VercelRequest, res: VercelResponse) {
  const token = requestToken(req);
  if (token) await db.delete(athleteSessions).where(eq(athleteSessions.tokenHash, hash(token)));
  res.setHeader("Set-Cookie", cookie(req, "", 0));
  res.setHeader("Cache-Control", "no-store");
}

/** Shared by both workers; never store the address or attempted credential. */
export async function allowAthleteLogin(req: VercelRequest, res: VercelResponse, strong = false) {
  const remote = req.socket?.remoteAddress || "local";
  // nginx overwrites X-Real-IP; only trust it from our loopback proxy.
  const proxied = /^(::1|127\.|::ffff:127\.)/.test(remote) ? header(req, "x-real-ip") : "";
  const key = `${strong ? "wechat" : "pin"}:${hash(proxied || remote)}`;
  const now = Date.now(), cutoff = now - LOGIN_WINDOW_MS;
  const [limit] = await db.insert(athleteLoginLimits).values({ key, windowStart: now, attempts: 1 }).onConflictDoUpdate({
    target: athleteLoginLimits.key,
    set: {
      attempts: sql`case when ${athleteLoginLimits.windowStart} <= ${cutoff} then 1 else ${athleteLoginLimits.attempts} + 1 end`,
      windowStart: sql`case when ${athleteLoginLimits.windowStart} <= ${cutoff} then ${now} else ${athleteLoginLimits.windowStart} end`,
    },
  }).returning();
  await db.delete(athleteLoginLimits).where(lt(athleteLoginLimits.windowStart, now - 24 * 3600_000));
  if (limit.attempts <= (strong ? 40 : 10)) return true;
  res.setHeader("Retry-After", "900");
  res.status(429).json({ error: "Too many login attempts. Try again later or use WeChat.", code: "LOGIN_RATE_LIMITED" });
  return false;
}
