// Mini-program server calls that need the app access_token: today only
// "resolve a getPhoneNumber code into the user's verified phone number".
// The token is cached in-process (WeChat issues it for ~2h and rate-limits
// the mint endpoint), same shape as the WeChat Pay tenant token cache.

import crypto from "node:crypto";

type TokenCache = { token: string; expiresAt: number };
let cache: TokenCache | null = null;

export async function getMiniAccessToken(fetcher: typeof fetch = fetch): Promise<string> {
  const appid = process.env.WECHAT_MINI_APPID;
  const secret = process.env.WECHAT_MINI_SECRET;
  if (!appid || !secret) throw new Error("WeChat mini program not configured");
  if (cache && cache.expiresAt > Date.now() + 60_000) return cache.token;
  const res = await fetcher(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`
  );
  const body = (await res.json()) as { access_token?: string; expires_in?: number; errmsg?: string };
  if (!body.access_token) throw new Error(`WeChat token failed: ${body.errmsg || "no access_token"}`);
  cache = { token: body.access_token, expiresAt: Date.now() + Math.max(300, Number(body.expires_in) || 7200) * 1000 };
  return cache.token;
}

/** Test seam: forget the cached token. */
export function resetMiniAccessTokenCache(): void {
  cache = null;
}

/**
 * Exchanges the one-time code from `<button open-type="getPhoneNumber">`
 * for the number WeChat verified on that account. Returns digits only (no
 * country code) — the shape every other phone column in this app stores.
 */
export async function resolveMiniPhoneNumber(
  phoneCode: string,
  fetcher: typeof fetch = fetch
): Promise<string> {
  const token = await getMiniAccessToken(fetcher);
  const res = await fetcher(
    `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(token)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: phoneCode }) }
  );
  const body = (await res.json()) as {
    errcode?: number;
    errmsg?: string;
    phone_info?: { purePhoneNumber?: string; phoneNumber?: string; countryCode?: string };
  };
  if (body.errcode && body.errcode !== 0) {
    // A stale access token is the one recoverable failure: drop the cache so
    // the next attempt mints a fresh one.
    if (body.errcode === 40001 || body.errcode === 42001) cache = null;
    throw new Error(`WeChat phone lookup failed: ${body.errmsg || body.errcode}`);
  }
  const phone = String(body.phone_info?.purePhoneNumber || body.phone_info?.phoneNumber || "").replace(/\D/g, "");
  if (!phone) throw new Error("WeChat phone lookup returned no number");
  return phone;
}

/**
 * A getPhoneNumber code is SINGLE-USE. When sign-up needs a second round
 * trip (new phone -> ask a name -> create), the verified number travels back
 * to the app as this short-lived signed token instead of re-spending the
 * code (which WeChat rejects - the bug behind "WeChat login failed" on
 * 2026-09-17). Ten minutes is plenty for typing a name.
 */
const phoneTokenSecret = (): string =>
  `phone:${process.env.PAY_LINK_SECRET || process.env.WECHAT_MINI_SECRET || ""}`;

export function makeVerifiedPhoneToken(phone: string, ttlMs = 10 * 60_000): string {
  const payload = `${Buffer.from(phone, "utf8").toString("base64url")}.${Date.now() + ttlMs}`;
  const mac = crypto.createHmac("sha256", phoneTokenSecret()).update(payload).digest("base64url").slice(0, 24);
  return `${payload}.${mac}`;
}

export function verifyPhoneToken(token: string): string | null {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [encoded, expires, mac] = parts;
  const expected = crypto.createHmac("sha256", phoneTokenSecret()).update(`${encoded}.${expires}`).digest("base64url").slice(0, 24);
  const a = Buffer.from(mac); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(expires) < Date.now()) return null;
  const phone = Buffer.from(encoded, "base64url").toString("utf8");
  return /^\d{7,15}$/.test(phone) ? phone : null;
}
