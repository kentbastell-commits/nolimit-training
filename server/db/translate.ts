// Translate-on-write — replaces the Feishu AI-formula columns after the
// Postgres cutover. DeepSeek first, Tencent Machine Translation (TMT) second.
// Callers keep the saved interface text/original if both are unavailable.
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
const cache = new Map<string, { text: string | null; expires: number }>();
const pending = new Map<string, Promise<string | null>>();
const CACHE_MAX = 500;
const MAX_ACTIVE = 4;
const MAX_PENDING = 256;
let active = 0;
const waiting: Array<() => void> = [];

// Bound external work independently of the number of athletes or template rows.
async function withSlot<T>(work: () => Promise<T>): Promise<T> {
  if (active >= MAX_ACTIVE) await new Promise<void>((resolve) => waiting.push(resolve));
  else active++;
  try { return await work(); }
  finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}

function remember(key: string, text: string | null, ttl: number) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, { text, expires: Date.now() + ttl });
}

/** Byte-safe chunks, preserving every character and paragraph boundary. */
export function translationChunks(text: string, maxBytes = 1800): string[] {
  const chunks: string[] = [];
  let rest = text;
  while (Buffer.byteLength(rest, "utf8") > maxBytes) {
    let end = 0, bytes = 0, boundary = 0;
    for (const char of rest) {
      const size = Buffer.byteLength(char, "utf8");
      if (bytes + size > maxBytes) break;
      bytes += size;
      end += char.length;
      if (/[\s。！？.!?]/u.test(char)) boundary = end;
    }
    const cut = boundary > end / 2 ? boundary : end;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) chunks.push(rest);
  return chunks;
}

// Timeout covers reading the response body as well as receiving headers.
async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response.ok ? await response.json() : null;
  } finally { clearTimeout(timer); }
}

// ---- LLM path (preferred): domain-aware translation ----------------------
// Generic MT renders coaching language literally ("out of the hole" → 冲出洞).
// When AI_API_KEY is set (DeepSeek, same convention as kangfu), translate
// through a chat model with an S&C/physiology-tuned prompt instead; TMT
// stays as the fallback so translation still works if the LLM is down or
// the DeepSeek balance runs dry.
function llmConfig() {
  const key = process.env.AI_API_KEY;
  if (!key) return null;
  return {
    key,
    base: (process.env.AI_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, ""),
    model: process.env.AI_MODEL || "deepseek-chat",
  };
}

export function translationsConfigured(): boolean {
  return Boolean(llmConfig() || creds());
}

const LLM_PROMPTS: Record<"zh" | "en", string> = {
  zh: [
    "You translate messages on a strength & conditioning coaching platform from English into Chinese.",
    "Audience: Chinese athletes reading their coach's instructions, feedback and chat messages.",
    "Rules:",
    "- Write natural, native coaching Chinese — the register a Chinese S&C coach or physio uses with an athlete (口令式提示 where the source is a cue), never literal word-by-word translation.",
    "- Use standard Chinese training/anatomy terminology: 深蹲, 髋关节铰链, 离心/向心, 等长收缩, 腘绳肌, 臀肌, 核心稳定, 触底反弹 for 'out of the hole', 充分休息, etc.",
    "- Keep ALL numbers, sets×reps, weights, percentages, distances and times exactly as written, including tempo notation (31X0, 30X1 stay untouched).",
    "- Keep common training abbreviations untranslated: RPE, RIR, 1RM, MAS, HR, ISO, CMJ, RSI, EQI, PAILs, AMRAP, EMOM, Tabata.",
    "- Translate exercise names to their standard Chinese gym names (Bulgarian Split Squat → 保加利亚分腿蹲, RDL → 罗马尼亚硬拉, Hip Thrust → 臀推, Bench Pull → 卧姿划船/仰卧划船, Depth Jump → 深跳, Pogo Jumps → 直膝弹跳, Dead Bug → 死虫式, Farmer Carry → 农夫行走, Kettlebell Swing → 壶铃摆动, Box Jump → 跳箱).",
    "- Coaching slang translates to what a Chinese coach actually says, never literally: grind / grind it out → 磨着完成·艰难完成, lockout → 锁定, sticking point → 卡点, brace → 绷紧核心, pump → 充血, drive through the floor → 用力蹬地, snappy/explosive → 干脆·有爆发力, squeeze → 收紧, control the negative → 控制离心.",
    "- Climbing slang: send → 完攀, crimp → 抠点, sloper → 斜面点, jug → 大把手点, heel hook → 挂脚跟, toe hook → 勾脚尖, flag → 旗式平衡, deadpoint → 定点瞬抓, campus → campus板训练, project → 攻关线路.",
    "- Keep the coach's warm, direct tone. Preserve line breaks.",
    "- Output ONLY the translation — no explanations, no quotes, no notes.",
  ].join("\n"),
  en: [
    "You translate messages on a strength & conditioning coaching platform from Chinese into English.",
    "Audience: an English-speaking coach reading an athlete's message or notes.",
    "Rules:",
    "- Natural, concise English with standard S&C terminology; never stiff literal translation.",
    "- Keep ALL numbers, sets×reps, weights, percentages, distances and times exactly as written.",
    "- Keep training abbreviations as-is: RPE, RIR, 1RM, MAS, HR, ISO, CMJ, RSI.",
    "- Preserve line breaks. Output ONLY the translation — no explanations, no quotes, no notes.",
  ].join("\n"),
};

// Company-operations register: goals, content plans, brand copy, feedback
// between founders and staff — business Chinese/English, not coaching cues.
const OPS_PROMPTS: Record<"zh" | "en", string> = {
  zh: [
    "You translate internal company content for a sports-training startup from English into Chinese.",
    "Content includes company goals, marketing/content plans, brand copy, performance feedback and operational notes.",
    "Rules:",
    "- Natural, professional workplace Chinese — the register used inside a Chinese startup (目标/复盘/投放/转化/涨粉/种草 where appropriate), never literal word-by-word translation.",
    "- Keep platform names as commonly written in China: 小红书, 抖音, 视频号, 公众号, B站; keep brand names (NX LIMIT), URLs, hashtags and @handles untouched.",
    "- Keep ALL numbers, dates, percentages, currency amounts and KPIs exactly as written.",
    "- Marketing/business terms use standard Chinese equivalents: engagement → 互动, conversion → 转化, lead → 潜在客户/线索, campaign → 推广活动, retention → 留存, funnel → 转化漏斗, KPI/ROI stay as-is.",
    "- Sports terms that appear use standard Chinese training vocabulary (力量训练, 体能, 私教课).",
    "- Preserve line breaks and list structure. Output ONLY the translation — no explanations, no quotes, no notes.",
  ].join("\n"),
  en: [
    "You translate internal company content for a sports-training startup from Chinese into English.",
    "Content includes company goals, marketing/content plans, brand copy, performance feedback and operational notes; the reader is an English-speaking founder.",
    "Rules:",
    "- Natural, concise business English; never stiff literal translation.",
    "- Keep Chinese platform names in their common English forms: 小红书 → Xiaohongshu (RED), 抖音 → Douyin, 视频号 → WeChat Channels, 公众号 → WeChat Official Account, B站 → Bilibili.",
    "- Keep ALL numbers, dates, percentages, currency amounts (¥ stays ¥) and KPIs exactly as written; 涨粉 → follower growth, 种草 → seeding/product recommendation content, 复盘 → review/retro, 投放 → ad placement.",
    "- Preserve line breaks and list structure. Output ONLY the translation — no explanations, no quotes, no notes.",
  ].join("\n"),
};

// The chat model answering "please provide the text" instead of translating.
const LLM_REFUSAL = /^\s*(?:请(?:您)?提供|请给出|请输入|Please (?:provide|share|give)|I (?:need|would need|can(?:'|no)t)|Sorry)/i;

async function llmTranslate(
  text: string,
  target: "en" | "zh",
  domain: "coaching" | "ops" = "coaching"
): Promise<string | null> {
  const cfg = llmConfig();
  if (!cfg) return null;
  try {
    const data = await fetchJson(`${cfg.base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.2,
        max_tokens: 2000,
        messages: [
          { role: "system", content: (domain === "ops" ? OPS_PROMPTS : LLM_PROMPTS)[target] },
          { role: "user", content: text },
        ],
      }),
    }, 15000);
    const choice = data?.choices?.[0];
    // A token-limited answer is incomplete and must never become a saved cue.
    if (choice?.finish_reason && choice.finish_reason !== "stop") return null;
    const out = choice?.message?.content;
    if (typeof out !== "string" || !out.trim()) return null;
    // A one-word source ("Machine") sometimes makes the chat model answer
    // with a request for text instead of a translation; 17 library rows
    // carried "请提供需要翻译的文本。" as their Chinese equipment (found
    // 2026-09-25). A refusal is a failure, not a translation.
    if (LLM_REFUSAL.test(out)) return null;
    return out.trim();
  } catch {
    return null;
  }
}

/**
 * Translate `text` into `target` ("en" | "zh"). Source language is
 * auto-detected. Prefers the domain-prompted LLM, falls back to TMT.
 * Returns null when translation is unavailable for any reason.
 */
export async function translateText(
  text: string,
  target: "en" | "zh",
  domain: "coaching" | "ops" = "coaching"
): Promise<string | null> {
  const clean = String(text || "").trim();
  if (!clean || Buffer.byteLength(clean, "utf8") > 32_000) return null;

  const cacheKey = `${domain}:${target}:${clean}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.text;
  const inFlight = pending.get(cacheKey);
  if (inFlight) return inFlight;
  if (pending.size >= MAX_PENDING) return null;
  const job = withSlot(async () => {
    const chunks = translationChunks(clean);
    const translateAll = async (translate: (chunk: string) => Promise<string | null>) => {
      const results: string[] = [];
      for (const chunk of chunks) {
        if (!chunk.trim()) { results.push(chunk); continue; }
        const result = await translate(chunk.trim());
        if (!result) return null;
        results.push((chunk.match(/^\s*/)?.[0] || "") + result + (chunk.match(/\s*$/)?.[0] || ""));
      }
      return results.join("");
    };
    const primary = await translateAll((chunk) => llmTranslate(chunk, target, domain));
    if (primary) { remember(cacheKey, primary, 6 * 60 * 60_000); return primary; }
    const fallback = await translateAll((chunk) => tmtTranslate(chunk, target));
    // A temporary fallback must not hide DeepSeek's recovery for the process lifetime.
    remember(cacheKey, fallback, fallback ? 60_000 : 5_000);
    return fallback;
  }).catch(() => null).finally(() => pending.delete(cacheKey));
  pending.set(cacheKey, job);
  return job;
}

async function tmtTranslate(clean: string, target: "en" | "zh"): Promise<string | null> {
  const c = creds();
  if (!c) return null; // no TMT key either — silently disabled

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    // The shared chunker keeps this below TMT's 2000 UTF-8 byte limit.
    const payload = JSON.stringify({
      SourceText: clean,
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

    const data = await fetchJson(`https://${ENDPOINT}`, {
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
    }, 5000);
    const translated = data?.Response?.TargetText;
    return typeof translated === "string" && translated.trim() ? translated.trim() : null;
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
