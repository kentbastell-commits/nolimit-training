// Website WeChat-QR-login handshake tokens. Two app processes sit behind
// nginx round-robin, so the handshake state must live in Postgres — an
// in-memory map would 404 half the polls.
import { and, eq, lt } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../client.ts";
import { wxLoginTokens } from "../schema.ts";

export const WX_LOGIN_TOKEN_TTL_MS = 5 * 60_000;

export async function createWxLoginToken(): Promise<string> {
  const token = crypto.randomBytes(24).toString("base64url");
  await db.insert(wxLoginTokens).values({
    token,
    status: "pending",
    createdAt: Date.now(),
  });
  // Opportunistic cleanup so the table never accumulates.
  await db
    .delete(wxLoginTokens)
    .where(lt(wxLoginTokens.createdAt, Date.now() - 24 * 3600_000));
  return token;
}

export async function getWxLoginToken(
  token: string
): Promise<{ status: string; clientCode: string; expired: boolean } | null> {
  const rows = await db
    .select()
    .from(wxLoginTokens)
    .where(eq(wxLoginTokens.token, token))
    .limit(1);
  if (!rows.length) return null;
  const row = rows[0];
  return {
    status: String(row.status || "pending"),
    clientCode: String(row.clientCode || ""),
    expired: (row.createdAt || 0) < Date.now() - WX_LOGIN_TOKEN_TTL_MS,
  };
}

/** Marks a pending, unexpired token as logged-in. Returns false if unusable. */
export async function completeWxLoginToken(
  token: string,
  clientCode: string
): Promise<boolean> {
  const updated = await db
    .update(wxLoginTokens)
    .set({ status: "ok", clientCode })
    .where(
      and(
        eq(wxLoginTokens.token, token),
        eq(wxLoginTokens.status, "pending")
      )
    )
    .returning({ token: wxLoginTokens.token });
  return updated.length > 0;
}
