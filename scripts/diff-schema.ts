// Compare the live Feishu schema dump (scripts/introspect-schema.mjs output)
// against the ETL's per-table `expected` field lists. Read-only reporting —
// feeds the schema-resync pass. Run: npx tsx scripts/diff-schema.ts <dump.json>
import fs from "node:fs";
import { TABLES } from "../server/db/etl/transform.ts";

const dumpPath = process.argv[2];
if (!dumpPath) throw new Error("usage: npx tsx scripts/diff-schema.ts <dump.json>");
const dump = JSON.parse(fs.readFileSync(dumpPath, "utf8"));

const byEnv = new Map<string, any>();
const byId = new Map<string, any>();
for (const t of dump.tables) {
  if (t.envVar) byEnv.set(t.envVar, t);
  byId.set(t.tableId, t);
}

const covered = new Set<string>();
for (const spec of TABLES) {
  const live = byEnv.get(spec.envVar) || (spec.fallbackId ? byId.get(spec.fallbackId) : null);
  if (!live) {
    console.log(`!! ${spec.table}: NO LIVE TABLE for ${spec.envVar}`);
    continue;
  }
  covered.add(live.tableId);
  const liveNames = new Set<string>(live.fields.map((f: any) => f.name));
  const expected = new Set<string>(spec.expected);
  const added = [...liveNames].filter((n) => !expected.has(n));
  const removed = [...expected].filter((n) => !liveNames.has(n));
  if (added.length || removed.length) {
    console.log(`== ${spec.table} (${live.name})`);
    for (const n of added) {
      const f = live.fields.find((x: any) => x.name === n);
      console.log(`   + ${n}  [${f.uiType}]${f.options ? " opts: " + f.options.join("|") : ""}`);
    }
    for (const n of removed) console.log(`   - ${n}  (in ETL, gone live)`);
  }
}

console.log("\n== live tables NOT covered by ETL:");
for (const t of dump.tables) {
  if (!covered.has(t.tableId)) {
    console.log(`   ${t.name}  (${t.envVar || "no env var"})  ${t.fields.length} fields`);
  }
}
