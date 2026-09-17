// Read-only by default. --apply fills missing mirrors, never curated Chinese.
// Usage: npx tsx scripts/translationCoverage.ts [--area programs] [--apply --limit 100]
// Run after migrations. No client text, credentials or model prompts are printed.
import "dotenv/config";
import { and, asc, eq, getTableColumns, gt, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db, pool } from "../server/db/client.ts";
import { startCacheBus, stopCacheBus } from "../server/db/cacheBus.ts";
import { fillRowTranslations, humanTranslationText, translationAreas, type TranslationArea } from "../server/db/contentTranslations.ts";

const argument = (name: string) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
const apply = process.argv.includes("--apply");
const areaName = argument("--area");
const limit = Number(argument("--limit") || 100);
if (areaName && !Object.hasOwn(translationAreas, areaName)) throw new Error("Unknown translation area");
if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit must be a positive integer");
let remaining = limit, missingRows = 0, unavailable = 0;
try {
  if (apply) await startCacheBus();
  for (const [name, area] of Object.entries(translationAreas)) {
    if (areaName && name !== areaName) continue;
    const cols = getTableColumns(area.table);
    const missing = or(...area.fields.map((f) => and(isNotNull(cols[f.source]),
      sql`btrim(${cols[f.source]}::text) not in ('', '[]', '{}', '""')`,
      or(isNull(cols[f.mirror]), eq(cols[f.mirror], "")))));
    let cursor: string | undefined, missingHere = 0, filled = 0;
    while (true) {
      const rows = await db.select().from(area.table)
        .where(and(missing, cursor ? gt(cols[area.id], cursor) : undefined))
        .orderBy(asc(cols[area.id])).limit(100);
      if (!rows.length) break;
      const candidates = rows.filter((row) => area.fields.some((f) =>
        !String(row[f.mirror] ?? "").trim() && humanTranslationText(row[f.source], f.kind)));
      missingHere += candidates.length;
      if (apply && remaining > 0) {
        const ids = candidates.slice(0, remaining).map((r) => String(r[area.id]));
        const result = await fillRowTranslations(name as TranslationArea, ids);
        filled += result.filled;
        unavailable += result.unavailable;
        remaining -= ids.length;
      }
      cursor = String(rows[rows.length - 1][area.id]);
    }
    missingRows += missingHere;
    console.log(JSON.stringify({ area: name, rowsWithMissingMirrors: missingHere, ...(apply ? { fieldsFilled: filled } : {}) }));
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "read-only", missingRows, unavailable, ...(apply ? { rowLimit: limit } : {}) }));
  if (unavailable) process.exitCode = 1;
} finally {
  if (apply) await stopCacheBus();
  await pool.end();
}
