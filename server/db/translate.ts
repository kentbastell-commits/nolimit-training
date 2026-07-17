// Translate-on-write — replaces the Feishu AI-formula columns after the
// Postgres cutover. Tencent Machine Translation (TMT) via a hand-rolled
// TC3-HMAC-SHA256 signed call (no SDK dependency).
//
// Design rules (same as the kangfu AI calls):
//  - BEST-EFFORT ONLY: any failure (missing creds, timeout, API error)
//    returns null and the caller's save proceeds untranslated. A translation
//    must never block or fail a write.
//  - Fire-and-forget at the call sites: pg impls `void fillTranslations(...)`
//    AFTER the row is committed, then patch the mirror column.
//  - Only fills EMPTY mirror columns — never overwrites human-authored text.
//  - Small in-process cache so repeated saves of the same text (e.g. a
//    program name saved per-session-row) cost one API call.
import { createHmac, createHash } from "node:crypto";

const ENDPOINT = "tmt.tencentcloudapi.com";

function creds() {
  const id = process.env.TENCENT_TMT_SECRET_ID;
  const key = process.env.TENCENT_TMT_SECRET_KEY;
  if (!id || !key) return null;
  return { id, key, region: process.env.TENCENT_TMT_REGION || "ap-shanghai" };
}

const hmac = (msg: string | Buffer, key: string | Buffer) =>
  createHmac("sha256", key).update(msg).digest();
const hmacHex = (msg: string, key: Buffer) =>
  createHmac("sha256", key).update(msg, "utf8").digest("hex");
const sha256Hex = (msg: string) =>
  createHash("sha256").update(msg, "utf8").digest("hex");

// text -> translated text, keyed by target language.
const cache = new Map<string, string>();
const CACHE_MAX = 500;

/**
 * Translate `text` into `target` ("en" | "zh"). Source language is
 * auto-detected. Returns null when translation is unavailable for any reason.
 */
export async function translateText(
  text: string,
  target: "en" | "zh"
): Promise<string | null> {
  const clean = String(text || "").trim();
  if (!clean) return null;
  const c = creds();
  if (!c) return null; // no key configured — silently disabled

  const cacheKey = `${target}:${clean}`;
  const hit = cache.get(cacheKey);
  if (hit !== undefined) return hit;

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    // TMT caps a single request at 2000 utf-8 bytes of source text; clip
    // rather than fail (mirror fields are previews, not archives).
    const payload = JSON.stringify({
      SourceText: clean.slice(0, 1500),
      Source: "auto",
      Target: target,
      ProjectId: 0,
    });

    const canonicalRequest = [
      "POST",
      "/",
      "",
      `content-type:application/json; charset=utf-8\nhost:${ENDPOINT}\n`,
      "content-type;host",
      sha256Hex(payload),
    ].join("\n");
    const stringToSign = [
      "TC3-HMAC-SHA256",
      timestamp,
      `${date}/tmt/tc3_request`,
      sha256Hex(canonicalRequest),
    ].join("\n");
    const kDate = hmac(date, "TC3" + c.key);
    const kService = hmac("tmt", kDate);
    const kSigning = hmac("tc3_request", kService);
    const signature = hmacHex(stringToSign, kSigning);
    const authorization =
      `TC3-HMAC-SHA256 Credential=${c.id}/${date}/tmt/tc3_request, ` +
      `SignedHeaders=content-type;host, Signature=${signature}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://${ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: authorization,
        "X-TC-Action": "TextTranslate",
        "X-TC-Version": "2018-03-21",
        "X-TC-Timestamp": String(timestamp),
        "X-TC-Region": c.region,
      },
      body: payload,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const data: any = await res.json();
    const translated = data?.Response?.TargetText;
    if (!translated || typeof translated !== "string") return null;

    if (cache.size >= CACHE_MAX) {
      const first = cache.keys().next().value;
      if (first !== undefined) cache.delete(first);
    }
    cache.set(cacheKey, translated);
    return translated;
  } catch {
    return null; // timeouts / network / API errors: caller proceeds untranslated
  }
}

/**
 * Fire-and-forget helper for pg impls: translate `sourceText` and run
 * `apply(translated)` (an UPDATE of the mirror column) if it succeeds.
 * Never throws; call sites use `void fillTranslation(...)`.
 */
export async function fillTranslation(
  sourceText: string | null | undefined,
  target: "en" | "zh",
  apply: (translated: string) => Promise<unknown>
): Promise<void> {
  try {
    const translated = await translateText(String(sourceText || ""), target);
    if (translated) await apply(translated);
  } catch {
    // never propagate — translation is strictly best-effort
  }
}
