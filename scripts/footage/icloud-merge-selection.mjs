// Merge the reviewers' sheet-NNN.keep.txt files (one per contact sheet) into
// a single newest-first download list for icloud-fetch-selected.mjs.
//
//   node scripts/footage/icloud-merge-selection.mjs [reviewRoot] [--out selected-all.txt]
//
// Shard folders are visited newest range first and sheets in numeric order
// (the composer already sorts each shard newest-first), so the fetch pulls
// the most recent footage before the disk floor is reached.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const ROOT = argv.find((a) => !a.startsWith("--")) || "C:\\Users\\kentb\\Videos\\icloud-review";
const outIdx = argv.indexOf("--out");
const OUT = outIdx >= 0 ? argv[outIdx + 1] : join(ROOT, "selected-all.txt");

const shards = readdirSync(ROOT)
  .filter((d) => /^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/.test(d) && existsSync(join(ROOT, d, "manifest.json")))
  .sort()
  .reverse();

const bytesByName = new Map();
const seen = new Set();
const ordered = [];
let sheetsTotal = 0;
let sheetsReviewed = 0;
for (const shard of shards) {
  const manifest = JSON.parse(readFileSync(join(ROOT, shard, "manifest.json"), "utf8").replace(/^\uFEFF/, ""));
  for (const row of Array.isArray(manifest) ? manifest : [manifest]) bytesByName.set(row.name, Number(row.bytes) || 0);
  const sheetDir = join(ROOT, shard, "sheets");
  if (!existsSync(sheetDir)) { console.log(`${shard}: no sheets yet`); continue; }
  const sheets = readdirSync(sheetDir).filter((f) => /^sheet-\d+\.json$/.test(f)).sort();
  const keeps = readdirSync(sheetDir).filter((f) => /^sheet-\d+\.keep\.txt$/.test(f)).sort();
  sheetsTotal += sheets.length;
  sheetsReviewed += keeps.length;
  let kept = 0;
  for (const keep of keeps) {
    for (const line of readFileSync(join(sheetDir, keep), "utf8").split(/\r?\n/)) {
      const name = line.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      ordered.push(name);
      kept++;
    }
  }
  console.log(`${shard}: ${keeps.length}/${sheets.length} sheets reviewed, ${kept} clips kept`);
}
const totalBytes = ordered.reduce((sum, name) => sum + (bytesByName.get(name) || 0), 0);
writeFileSync(OUT, ordered.join("\n") + (ordered.length ? "\n" : ""), "utf8");
console.log(`\n${ordered.length} clips selected (${(totalBytes / 1073741824).toFixed(1)} GB), ${sheetsReviewed}/${sheetsTotal} sheets reviewed -> ${OUT}`);
