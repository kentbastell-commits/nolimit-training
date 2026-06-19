// ETL runner.
//   Dry run (no DB needed):  npx tsx server/db/etl/run.ts --dry-run
//   Load into Postgres:      npx tsx server/db/etl/run.ts        (needs DATABASE_URL)
import "dotenv/config";
import { listAll, textOrNull, type FeishuRecord } from "./extract.ts";
import { TABLES, deriveTeamMembers, code, type Ctx } from "./transform.ts";

const dryRun = process.argv.includes("--dry-run") || process.env.ETL_DRY_RUN === "1";

// Feishu link-mirror / bookkeeping columns we deliberately don't map.
const IGNORE_UNMAPPED =
  /^(UnknownName|SourceID|Workout Logs1?|Clients|Clients 2|Check-?ins?|Check-in|Assigned (Workouts|Forms|Tests)|Product Orders|Progress Metrics|Exercise Results|Workout Templates|Subscriptions|Body Metrics|Members|Groups|Positions|Photo Search Keywords|Thumbnail Search Keywords|Display Target|Set Prescriptions|Exercise Alternates|Duration\/Weeks)/i;

async function main() {
  // 1. Extract raw records per configured table.
  const raw: Record<string, FeishuRecord[]> = {};
  for (const spec of TABLES) {
    const id = process.env[spec.envVar] || spec.fallbackId;
    if (!id) {
      console.log(`SKIP ${spec.table}: no table id (${spec.envVar})`);
      raw[spec.table] = [];
      continue;
    }
    const all = await listAll(id);
    // Drop Feishu blank seed rows: a real row has a non-empty business-code PK.
    // (Tables keyed by record_id, e.g. teams, have pkField "" and keep all rows.)
    raw[spec.table] = spec.pkField
      ? all.filter((rec) => textOrNull(rec.fields[spec.pkField]) !== null)
      : all;
  }

  // 2. Build id maps (Feishu record_id -> business code) for FK resolution.
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

  if (dryRun) {
    report(raw, rows, teamMembers);
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set — start Postgres and configure it, or use --dry-run.");
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
