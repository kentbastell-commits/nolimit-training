// epoch-ms (how timestamps are stored) -> "YYYY-MM-DD" in China time (+08:00).
// A plain UTC collapse shifted anything recorded before 08:00 CST to the
// previous day; the Feishu-era impls rendered in server-local (+8) time, and
// the product's users are in China, so the fixed offset is the faithful one.
export function epochToDate(ms: number | null | undefined, empty = ""): string {
  if (ms == null) return empty;
  const n = Number(ms);
  if (!Number.isFinite(n)) return empty;
  const d = new Date(n + 8 * 3600 * 1000);
  if (Number.isNaN(d.getTime())) return empty;
  return d.toISOString().split("T")[0];
}

export function str(v: unknown): string {
  return v == null ? "" : String(v);
}
