import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let translate: typeof import("../../../server/db/translate.ts");
const llm = (text: string, finish_reason = "stop") => new Response(JSON.stringify({ choices: [{ finish_reason, message: { content: text } }] }));
const tmt = (text: string) => new Response(JSON.stringify({ Response: { TargetText: text } }));

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("AI_API_KEY", "test-key");
  vi.stubEnv("AI_BASE_URL", "https://translation.test/v1");
  vi.stubEnv("AI_MODEL", "deepseek-test");
  vi.stubEnv("TENCENT_TMT_SECRET_ID", "test-id");
  vi.stubEnv("TENCENT_TMT_SECRET_KEY", "test-key");
  translate = await import("../../../server/db/translate.ts");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("DeepSeek first, Tencent fallback", () => {
  it("uses DeepSeek for both directions and keeps the operations prompt separate", async () => {
    const fetch = vi.fn(async () => llm("translated")); vi.stubGlobal("fetch", fetch);
    await translate.translateText("Rest 90 seconds", "zh");
    await translate.translateText("休息90秒", "en");
    await translate.translateText("Publish 3 videos", "zh", "ops");
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls.every(([url]) => String(url).endsWith("/chat/completions"))).toBe(true);
    const payloads = fetch.mock.calls.map((args: any) => JSON.parse(args[1].body));
    expect(payloads[0].model).toBe("deepseek-test");
    expect(payloads[1].messages[0].content).toContain("Chinese into English");
    expect(payloads[2].messages[0].content).toContain("internal company");
  });

  it.each(["http", "truncated", "empty", "network"])("falls back after a %s DeepSeek failure", async (failure) => {
    const providers: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (String(url).includes("chat/completions")) {
        providers.push("deepseek");
        if (failure === "network") throw new Error("offline");
        return failure === "http" ? new Response("", { status: 503 }) : llm(failure === "empty" ? "" : "partial", "length");
      }
      providers.push("tencent"); return tmt("休息90秒");
    }));
    expect(await translate.translateText("Rest 90 seconds", "zh")).toBe("休息90秒");
    expect(providers).toEqual(["deepseek", "tencent"]);
  });


  it("treats a 'please provide the text' answer as a failure and falls back to Tencent", async () => {
    const fetch = vi.fn(async (url) => String(url).includes("chat/completions") ? llm("请提供需要翻译的文本。") : tmt("器械"));
    vi.stubGlobal("fetch", fetch);
    expect(await translate.translateText("Machine", "zh")).toBe("器械");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("leaves the caller's saved text intact when both providers fail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    const apply = vi.fn();
    await expect(translate.fillTranslation("Keep training", "zh", apply)).resolves.toBeUndefined();
    expect(apply).not.toHaveBeenCalled();
  });

  it("retries DeepSeek after a temporary cached Tencent fallback expires", async () => {
    vi.useFakeTimers();
    let recovered = false;
    const fetch = vi.fn(async (url) => String(url).includes("chat/completions") ? (recovered ? llm("DeepSeek recovered") : new Response("", { status: 503 })) : tmt("backup"));
    vi.stubGlobal("fetch", fetch);
    expect(await translate.translateText("Training note", "zh")).toBe("backup");
    recovered = true;
    expect(await translate.translateText("Training note", "zh")).toBe("backup");
    await vi.advanceTimersByTimeAsync(60_001);
    expect(await translate.translateText("Training note", "zh")).toBe("DeepSeek recovered");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("keeps the timeout active while reading a hung response body", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async (url, init) => String(url).includes("chat/completions") ? {
      ok: true, json: () => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted")))),
    } : tmt("backup")));
    const request = translate.translateText("Slow response", "zh");
    await vi.advanceTimersByTimeAsync(15_001);
    await expect(request).resolves.toBe("backup");
  });
});

describe("translation under load", () => {
  it("coalesces 100 identical concurrent requests", async () => {
    const fetch = vi.fn(async () => llm("共同译文")); vi.stubGlobal("fetch", fetch);
    const results = await Promise.all(Array.from({ length: 100 }, () => translate.translateText("Same session", "zh")));
    expect(results.every((r) => r === "共同译文")).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("limits distinct concurrent provider requests to four", async () => {
    let active = 0, peak = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      active++; peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active--; return llm("done");
    }));
    const results = await Promise.all(Array.from({ length: 40 }, (_, n) => translate.translateText(`Session ${n}`, "zh")));
    expect(results.every(Boolean)).toBe(true);
    expect(peak).toBe(4);
  });

  it("preserves the full long Chinese source and respects Tencent's UTF-8 byte limit", async () => {
    const source = "深蹲训练说明🙂，保持核心稳定。\n".repeat(140);
    const received: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url, init) => {
      if (String(url).includes("chat/completions")) return new Response("", { status: 503 });
      const text = JSON.parse(init.body).SourceText; received.push(text); return tmt(text);
    }));
    expect(await translate.translateText(source, "en")).toBe(source.trim());
    expect(received.length).toBeGreaterThan(1);
    expect(received.every((s) => Buffer.byteLength(s, "utf8") <= 1800 && !s.includes("�"))).toBe(true);
    expect(translate.translationChunks(source).join("")).toBe(source);
  });

  it("never saves a partial long translation if a later chunk fails", async () => {
    let count = 0;
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (String(url).includes("chat/completions")) return ++count === 1 ? llm("first part") : new Response("", { status: 503 });
      return new Response("", { status: 503 });
    }));
    expect(await translate.translateText("Long source sentence. ".repeat(160), "zh")).toBeNull();
  });

  it("returns unavailable for oversized text rather than silently cutting it", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await translate.translateText("x".repeat(32_001), "zh")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
