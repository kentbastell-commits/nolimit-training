// Tencent COS v5 signing for the exercise-library upload relay (no SDK).
// Port of scripts/footage/cos.mjs. Why this exists: a browser outside
// mainland China uploads into the Shanghai box at ~30-45 KB/s (a 10 MB clip
// is minutes and stalls; CLAUDE.md #67), while COS's global-acceleration
// host takes the same bytes at 2-25 MB/s and the server then pulls them over
// Tencent's internal network in seconds. Acceleration bills ~¥1.25/GB, so
// the ticket endpoint that hands out signatures is coach-only.
import { createHash, createHmac } from "node:crypto";

export const COS_BUCKET = process.env.COS_BUCKET || "nxlimit-footage-1454208796";
export const COS_REGION = process.env.COS_REGION || "ap-guangzhou";
export const COS_ACCEL_HOST = `${COS_BUCKET}.cos.accelerate.myqcloud.com`;
export const COS_REGION_HOST = `${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com`;
// Objects the browser drops off before the server pulls them in. A bucket
// lifecycle rule (scripts/cosWebInboxSetup.mjs) expires anything left here
// after a day, so an abandoned upload cannot sit in the bucket forever.
export const COS_WEB_INBOX_PREFIX = "web-inbox/";

export function cosConfigured(): boolean {
  return Boolean(process.env.COS_SECRET_ID && process.env.COS_SECRET_KEY);
}

const sha1 = (s: string) => createHash("sha1").update(s).digest("hex");
const hmac = (key: string, s: string) => createHmac("sha1", key).update(s).digest("hex");

export function cosAuthorization(input: {
  method: string;
  pathname: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  /** Seconds the signature stays valid (default 1h). */
  ttlSeconds?: number;
}): string {
  const id = process.env.COS_SECRET_ID || "";
  const key = process.env.COS_SECRET_KEY || "";
  const now = Math.floor(Date.now() / 1000);
  const keyTime = `${now - 60};${now + (input.ttlSeconds ?? 3600)}`;
  const signKey = hmac(key, keyTime);
  const norm = (obj: Record<string, string>) =>
    Object.entries(obj)
      .map(([k, v]) => [k.toLowerCase(), v] as const)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const paramPairs = norm(input.params || {});
  const headerPairs = norm(input.headers || {});
  const enc = (pairs: ReadonlyArray<readonly [string, string]>) =>
    pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const httpString = `${input.method.toLowerCase()}\n${input.pathname}\n${enc(paramPairs)}\n${enc(headerPairs)}\n`;
  const stringToSign = `sha1\n${keyTime}\n${sha1(httpString)}\n`;
  const signature = hmac(signKey, stringToSign);
  return [
    "q-sign-algorithm=sha1",
    `q-ak=${id}`,
    `q-sign-time=${keyTime}`,
    `q-key-time=${keyTime}`,
    `q-header-list=${headerPairs.map(([k]) => k).join(";")}`,
    `q-url-param-list=${paramPairs.map(([k]) => k).join(";")}`,
    `q-signature=${signature}`,
  ].join("&");
}

// Same vocabulary as the raw-body route in server/index.ts, so a relayed
// file lands with the same name shape and prefix as a direct upload.
export const UPLOAD_EXT = /\.(mp4|mov|webm|m4v|jpg|jpeg|png|webp)$/i;
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

export function uploadPrefixFor(kind: string): string {
  return kind === "exercise" ? "ex" : kind === "coach" ? "coach" : "fv";
}
