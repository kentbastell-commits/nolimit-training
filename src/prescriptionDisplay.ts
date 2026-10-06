// Translate display text only; keep the coach's stored prescription unchanged.
export function localizePrescriptionValue(value: unknown, zh: boolean, field = ""): string {
  const text = String(value ?? "");
  if (!zh) return text;
  const maximum = field === "reps" ? "最多次数" : field === "time" ? "最长时间" : "最大";
  return text
    .replace(/\bmax(?:imum)?\b/gi, maximum)
    .replace(/\bsec(?:onds?)?\b|\bsecs\b/gi, "秒")
    .replace(/(\d)\s*s\b/gi, "$1 秒")
    .replace(/\bmins?\b|\bminutes?\b/gi, "分钟")
    .replace(/\breps?\b/gi, "次")
    .replace(/\/\s*side\b|\b(?:per|each) side\b/gi, "／侧");
}
