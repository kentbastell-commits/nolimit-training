// Personal WeChat invite for one athlete: a signed token that fits a mini
// program scan-code `scene` (≤32 chars), and the scan-code image itself.
//
// Whoever scans the code (or opens the app with ?invite=) and taps "Continue
// with WeChat" gets THAT WeChat account bound to this client — no phone, no
// name typing, so a parent can forward the image to a child's phone. Binding
// still refuses a client already bound to a different WeChat (wxAuth), so a
// leaked image can't hijack an account once it is in use.
import crypto from "node:crypto";
import { getCached, setCached } from "../../api/_cache.ts";
import { getMiniAccessToken } from "./miniPhone.ts";

const SIG_LEN = 12;
const DEFAULT_TTL_MS = 30 * 24 * 3600_000;

function inviteSecret(): string {
  return `invite:${process.env.PAY_LINK_SECRET || process.env.WECHAT_MINI_SECRET || ""}`;
}

function sign(clientCode: string, exp36: string): string {
  return crypto
    .createHmac("sha256", inviteSecret())
    .update(`${clientCode.toLowerCase()}.${exp36}`)
    .digest("base64url")
    .slice(0, SIG_LEN);
}

/** `i.<clientCode>.<expiry base36>.<sig>` — e.g. i.CL-0001.m1x2y3z.AbCdEfGhIjKl */
export function makeInviteToken(clientCode: string, ttlMs = DEFAULT_TTL_MS): string {
  const code = String(clientCode || "").trim();
  if (!code) throw new Error("clientCode required");
  const exp36 = Math.floor((Date.now() + ttlMs) / 1000).toString(36);
  const token = `i.${code}.${exp36}.${sign(code, exp36)}`;
  if (token.length > 32) throw new Error("invite token exceeds the 32-char scene limit");
  return token;
}

/** The client code the token names, or null when malformed/expired/forged. */
export function verifyInviteToken(token: string): string | null {
  const parts = String(token || "").trim().split(".");
  if (parts.length !== 4 || parts[0] !== "i") return null;
  const [, code, exp36, sig] = parts;
  const exp = parseInt(exp36, 36);
  if (!code || !Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  const expected = sign(code, exp36);
  if (sig.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? code : null;
}

/** Expiry of a token as epoch ms (0 when malformed). */
export function inviteTokenExpiry(token: string): number {
  const parts = String(token || "").split(".");
  const exp = parseInt(parts[2] || "", 36);
  return Number.isFinite(exp) ? exp * 1000 : 0;
}

/**
 * The scan-code image for an invite token (JPEG bytes from wxacode
 * getUnlimited), cached for an hour per token. Throws when WeChat is not
 * configured or refuses — callers on public pages treat that as "no image".
 */
export async function inviteCodeImage(
  token: string,
  fetcher: typeof fetch = fetch
): Promise<{ bytes: Buffer; contentType: string }> {
  const key = `inviteImage:${token}`;
  const cached = getCached<{ b64: string; contentType: string }>(key);
  if (cached) return { bytes: Buffer.from(cached.b64, "base64"), contentType: cached.contentType };
  const accessToken = await getMiniAccessToken(fetcher);
  const res = await fetcher(
    `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scene: token,
        page: "pages/home/index",
        width: 600,
        check_path: false,
        env_version: process.env.WECHAT_MINI_ENV_VERSION || "release",
      }),
    }
  );
  const bytes = Buffer.from(await res.arrayBuffer());
  // WeChat answers JSON (errcode) on failure and raw image bytes on success.
  if (bytes.length < 1000 || bytes[0] === 0x7b) {
    throw new Error(`wxacode failed: ${bytes.toString("utf8").slice(0, 200)}`);
  }
  const contentType = bytes[0] === 0x89 ? "image/png" : "image/jpeg";
  setCached(key, { b64: bytes.toString("base64"), contentType }, 3600_000);
  return { bytes, contentType };
}

export async function inviteCodeDataUrl(token: string, fetcher: typeof fetch = fetch): Promise<string> {
  const { bytes, contentType } = await inviteCodeImage(token, fetcher);
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}
