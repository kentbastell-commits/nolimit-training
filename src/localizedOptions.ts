// Translate the label, never the answer value persisted in a submission.
export function parseOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  const text = String(raw ?? "").trim();
  try { const value = JSON.parse(text); if (Array.isArray(value)) return parseOptions(value); } catch { /* legacy text list */ }
  return text.split(/\r?\n|[,，|]/).map((s) => s.trim()).filter(Boolean);
}

export function localizedOptions(source: unknown, chinese: unknown, language: string) {
  const values = parseOptions(source);
  const labels = parseOptions(chinese);
  return values.map((value, index) => ({
    value,
    label: language === "zh" && labels.length === values.length ? labels[index] : value,
    // Read older responses which stored the translated label as the value.
    matches: (saved: string) => saved === value || (labels.length === values.length && saved === labels[index]),
  }));
}
