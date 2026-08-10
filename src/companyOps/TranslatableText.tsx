// Content text that auto-translates toward the viewer's language when the
// source language differs (Yumei writes Chinese, founders write English).
// Best-effort: shows the original until/unless a translation arrives, and a
// tap on the marker toggles back to the original. Results are memoised
// per-session so repeated renders cost nothing.
import { useEffect, useState } from "react";
import type { CompanyOpsLanguage } from "./types";

const hasCjk = (text: string) => /[一-鿿]/.test(text);
const cache = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

async function fetchTranslation(text: string, target: "en" | "zh"): Promise<string | null> {
  const key = `${target}:${text}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const job = (async () => {
    try {
      const res = await fetch("/api/companyOpsTranslate", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ text, target }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { translated?: string | null };
      return data.translated || null;
    } catch {
      return null;
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, job);
  const result = await job;
  cache.set(key, result);
  return result;
}

export function TranslatableText({
  text,
  language,
  as: Tag = "p",
  className,
}: {
  text?: string | null;
  language: CompanyOpsLanguage;
  as?: "p" | "span" | "div";
  className?: string;
}) {
  const clean = String(text || "").trim();
  const target: "en" | "zh" | null =
    clean && language === "zh" && !hasCjk(clean)
      ? "zh"
      : clean && language === "en" && hasCjk(clean)
        ? "en"
        : null;
  const [translated, setTranslated] = useState<string | null>(() =>
    target ? (cache.get(`${target}:${clean}`) ?? null) : null
  );
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    let alive = true;
    setShowOriginal(false);
    if (!target) {
      setTranslated(null);
      return;
    }
    void fetchTranslation(clean, target).then((zh) => {
      if (alive) setTranslated(zh);
    });
    return () => {
      alive = false;
    };
  }, [clean, target]);

  if (!clean) return null;
  if (!target || !translated || showOriginal) {
    return (
      <Tag className={className}>
        {clean}
        {target && translated && showOriginal ? (
          <button
            type="button"
            className="fopsTranslateTag"
            onClick={() => setShowOriginal(false)}
            title={language === "zh" ? "显示译文" : "Show translation"}
          >
            {language === "zh" ? "看译文" : "translated"}
          </button>
        ) : null}
      </Tag>
    );
  }
  return (
    <Tag className={className}>
      {translated}
      <button
        type="button"
        className="fopsTranslateTag"
        onClick={() => setShowOriginal(true)}
        title={language === "zh" ? "查看原文" : "Show original"}
      >
        {language === "zh" ? "AI译·原文" : "AI · original"}
      </button>
    </Tag>
  );
}
