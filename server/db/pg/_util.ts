// epoch-ms (how timestamps are stored) -> "YYYY-MM-DD", matching the Feishu impls.
export function epochToDate(ms: number | null | undefined, empty = ""): string {
  if (ms == null) return empty;
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return empty;
  return d.toISOString().split("T")[0];
}

export function str(v: unknown): string {
  return v == null ? "" : String(v);
}
