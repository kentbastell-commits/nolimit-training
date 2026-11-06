import { asc, getTableColumns, gt, sql } from "drizzle-orm";
import { db, pool } from "./client.ts";
import { fillRowTranslations, humanTranslationText, translationAreas, type TranslationArea } from "./contentTranslations.ts";
import { translationsConfigured } from "./translate.ts";

// Blank mirrors in Postgres are the durable backlog, including writes made
// while the provider/process was unavailable. Never overwrite curated copy.
const cursors = new Map<string, string>();
let nextArea = 0;
export async function retryPendingTranslations() {
  if (!translationsConfigured()) return { filled: 0, unavailable: 0 };
  const lock = await pool.connect();
  let acquired = false;
  try {
    acquired = Boolean((await lock.query("select pg_try_advisory_lock(16470921) as locked")).rows[0].locked);
    if (!acquired) return { filled: 0, unavailable: 0 };
    const areas = Object.entries(translationAreas);
    const [name, config] = areas[nextArea++ % areas.length];
    const columns = getTableColumns(config.table);
    const cursor = cursors.get(name);
    const missing = sql.join(config.fields.map(f => sql`(
      coalesce(btrim(${columns[f.source]}::text), '') not in ('', '[]', '{}', '""')
      and coalesce(btrim(${columns[f.mirror]}::text), '') = ''
    )`), sql` or `);
    const rows = await db.select().from(config.table).where(sql`(${missing}) ${cursor ? sql`and ${gt(columns[config.id], cursor)}` : sql``}`)
      .orderBy(asc(columns[config.id])).limit(20);
    if (rows.length) cursors.set(name, String(rows[rows.length - 1][config.id]));
    else cursors.delete(name);
    const ids = rows.filter(row => config.fields.some(f => !String(row[f.mirror] ?? "").trim() && humanTranslationText(row[f.source], f.kind)))
      .map(row => String(row[config.id]));
    const result = ids.length ? await fillRowTranslations(name as TranslationArea, ids) : { filled: 0, unavailable: 0 };
    if (result.filled || result.unavailable) console.info(`[translation-retry] ${name}: filled=${result.filled} pending=${result.unavailable}`);
    return result;
  } finally {
    if (acquired) await lock.query("select pg_advisory_unlock(16470921)").catch(() => {});
    lock.release();
  }
}

export function startTranslationRetry() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await retryPendingTranslations(); }
    catch { console.warn("[translation-retry] deferred; saved source remains queued in Postgres"); }
    finally { running = false; }
  };
  const first = setTimeout(() => void tick(), 10_000);
  const interval = setInterval(() => void tick(), 60_000);
  first.unref(); interval.unref();
  return () => { clearTimeout(first); clearInterval(interval); };
}
