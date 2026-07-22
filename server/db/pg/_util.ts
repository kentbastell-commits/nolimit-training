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

// Decode common Postgres error codes into a human-readable message — the
// blanket "Server error" hid what actually went wrong (a stale link, a
// duplicate id, an empty required field).
export function pgErrorMessage(e: any): string {
  const code = e?.code || e?.cause?.code;
  const detail = String(e?.detail || e?.cause?.detail || "");
  switch (code) {
    case "23503":
      return (
        "The save references a record that doesn't exist" +
        (detail ? ` (${detail})` : "") +
        " — refresh the page and try again."
      );
    case "23505":
      return "Duplicate id" + (detail ? ` (${detail})` : "") + " — please retry.";
    case "23502":
      return "A required field was empty.";
    case "22P02":
      return "A field had the wrong format (bad number or id).";
    default:
      return e?.message ? String(e.message) : String(e);
  }
}
