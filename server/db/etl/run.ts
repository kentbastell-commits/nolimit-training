// ETL runner.
//   Dry run (no DB):        npx tsx server/db/etl/run.ts --dry-run
//   Dump to JSON (no DB):   npx tsx server/db/etl/run.ts --dump=etl-data.json
//   Load from JSON:         npx tsx server/db/etl/run.ts --from=etl-data.json   (needs DATABASE_URL)
//   Extract + load direct:  npx tsx server/db/etl/run.ts                        (needs both)
//
// --dump/--from let extraction (Feishu creds) and loading (Postgres) run on
// different machines — used for local verification and the real cutover.
import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { listAll, textOrNull, type FeishuRecord } from "./extract.ts";
import { TABLES, deriveTeamMembers, code, type Ctx } from "./transform.ts";

const dryRun = process.argv.includes("--dry-run") || process.env.ETL_DRY_RUN === "1";

function argVal(name: string): string | null {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : null;
}

const IGNORE_UNMAPPED =
  /^(UnknownName|SourceID|Workout Logs1?|Clients|Clients 2|Check-?ins?|Check-in|Assigned (Workouts|Forms|Tests)|Product Orders|Progress Metrics|Exercise Results|Workout Templates|Subscriptions|Body Metrics|Members|Groups|Positions|Photo Search Keywords|Thumbnail Search Keywords|Display Target|Set Prescriptions|Exercise Alternates|Duration\/Weeks)/i;

async function main() {
  const fromPath = argVal("from");

  // Load-only path: read a previously dumped JSON, no Feishu needed.
  if (fromPath) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set.");
    const data = JSON.parse(await readFile(fromPath, "utf8"));
    const { load } = await import("./load.ts");
    await load(data.rows, data.teamMembers);
    console.log(`\nETL load complete (from ${fromPath}).`);
    return;
  }

  // 1. Extract raw records per configured table (drop blank seed rows).
  const raw: Record<string, FeishuRecord[]> = {};
  for (const spec of TABLES) {
    const id = process.env[spec.envVar] || spec.fallbackId;
    if (!id) {
      console.log(`SKIP ${spec.table}: no table id (${spec.envVar})`);
      raw[spec.table] = [];
      continue;
    }
    const all = await listAll(id);
    // Drop blank seed rows (Feishu grid padding: no field has any text), but
    // KEEP real rows whose PK code was never written — code() falls back to
    // the record_id for those. Filtering on the PK alone silently discarded
    // every assigned-form row (writer never set "Assigned Forms ID").
    raw[spec.table] = spec.pkField
      ? all.filter(
          (rec) =>
            textOrNull(rec.fields[spec.pkField]) !== null ||
            Object.values(rec.fields || {}).some((v) => textOrNull(v) !== null)
        )
      : all;
  }

  // 2. id maps (record_id -> business code) for FK resolution.
  const idMaps: Record<string, Map<string, string>> = {};
  for (const spec of TABLES) {
    const m = new Map<string, string>();
    for (const rec of raw[spec.table] || []) m.set(rec.record_id, code(rec, spec.pkField));
    idMaps[spec.table] = m;
  }
  const ctx: Ctx = { idMaps };

  // 3. Transform.
  const rows: Record<string, Record<string, unknown>[]> = {};
  for (const spec of TABLES) rows[spec.table] = (raw[spec.table] || []).map((r) => spec.map(r, ctx));
  const teamMembers = deriveTeamMembers(raw["teams"] || [], ctx);

  const dumpPath = argVal("dump");
  if (dumpPath) {
    await writeFile(dumpPath, JSON.stringify({ rows, teamMembers }));
    const total = Object.values(rows).reduce((n, a) => n + a.length, 0) + teamMembers.length;
    console.log(`Wrote ${dumpPath} (${total} rows across ${TABLES.length} tables + team_members).`);
    return;
  }

  if (dryRun) {
    report(raw, rows, teamMembers);
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set — use --dry-run or --dump, or configure it.");
  }
  const { load } = await import("./load.ts");
  await load(rows, teamMembers);
  console.log("\nETL load complete.");
}

function report(
  raw: Record<string, FeishuRecord[]>,
  rows: Record<string, Record<string, unknown>[]>,
  teamMembers: Record<string, unknown>[]
) {
  console.log("\n=== ETL DRY RUN (extract + transform, no load) ===");
  let issues = 0;
  for (const spec of TABLES) {
    const recs = raw[spec.table] || [];
    const rws = rows[spec.table] || [];
    const expected = new Set(spec.expected);
    const seen = new Set<string>();
    for (const r of recs) for (const k of Object.keys(r.fields || {})) seen.add(k);
    const unmapped = [...seen].filter((k) => !expected.has(k) && !IGNORE_UNMAPPED.test(k));
    const cols = rws.length ? Object.keys(rws[0]) : [];
    const allEmpty = cols.filter((c) =>
      rws.every((r) => r[c] == null || (Array.isArray(r[c]) && (r[c] as unknown[]).length === 0))
    );
    console.log(`\n## ${spec.table}  (${rws.length} rows)`);
    if (rws.length) console.log("   sample: " + JSON.stringify(rws[0]));
    if (allEmpty.length) console.log("   ⚠ always-empty cols: " + allEmpty.join(", "));
    if (unmapped.length) {
      console.log("   ⚠ unmapped Feishu fields: " + unmapped.join(" | "));
      issues += unmapped.length;
    }
  }
  console.log(`\n## team_members (derived)  (${teamMembers.length} rows)`);
  if (teamMembers.length) console.log("   sample: " + JSON.stringify(teamMembers[0]));
  console.log(`\n=== dry run done. unmapped-field flags: ${issues} ===`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
