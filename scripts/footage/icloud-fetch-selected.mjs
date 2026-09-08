// Download ONLY the iCloud videos ticked on the contact sheet, into the
// phone-inbox that proxy-phone-videos.mjs already consumes.
//
//   node scripts/footage/icloud-fetch-selected.mjs <selected.txt> [--dest C:\Users\kentb\Videos\phone-inbox] [--dry] [--keep-local]
//
// How it works: iCloud for Windows keeps every video as a cloud-only
// placeholder; simply copying the file makes the cloud-files filter pull the
// bytes (verified 2026-09-08: 0.5MB in 1.6s, no iCloud API needed). After a
// verified copy the ORIGINAL is released back to cloud-only
// (`attrib +U -P`), so the download costs disk once, not twice — this box
// had 59GB free against a 1.46TB library. --keep-local skips that release.
//
// Re-runnable: a file already in dest with the same byte size is skipped.
// One bad file never sinks the batch; failures are listed at the end.
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { basename, join } from "node:path";
import { execFileSync, execSync } from "node:child_process";

// Stop before the system drive is full: this box had 59GB free against a
// 1.46TB library, so a run must be able to halt cleanly and resume later.
const MIN_FREE_GB = Number(process.env.MIN_FREE_GB || 15);
const freeGb = (dir) => {
  const out = execSync(`powershell -NoProfile -Command "(Get-PSDrive ${dir[0]}).Free"`, { encoding: "utf8" });
  return Number(out.trim()) / 1073741824;
};

const ROOT = "C:\\Users\\kentb\\iCloudPhotos\\Photos";
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const positional = argv.filter((a) => !a.startsWith("--"));
const destIdx = argv.indexOf("--dest");
const DEST = destIdx >= 0 ? argv[destIdx + 1] : "C:\\Users\\kentb\\Videos\\phone-inbox";
const DRY = flags.has("--dry");
const KEEP_LOCAL = flags.has("--keep-local");
const listFile = positional[0];

if (!listFile || !existsSync(listFile)) {
  console.error("usage: node scripts/footage/icloud-fetch-selected.mjs <selected.txt> [--dest dir] [--dry] [--keep-local]");
  process.exit(1);
}
const names = [...new Set(
  readFileSync(listFile, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => basename(l)),
)];
mkdirSync(DEST, { recursive: true });

let totalBytes = 0;
const plan = [];
for (const name of names) {
  const src = join(ROOT, name);
  if (!existsSync(src)) { plan.push({ name, status: "missing" }); continue; }
  const size = statSync(src).size;
  const dst = join(DEST, name);
  if (existsSync(dst) && statSync(dst).size === size) { plan.push({ name, status: "already" }); continue; }
  totalBytes += size;
  plan.push({ name, status: "fetch", src, dst, size });
}
const toFetch = plan.filter((p) => p.status === "fetch");
console.log(
  `${names.length} selected → ${toFetch.length} to download (${(totalBytes / 1048576).toFixed(0)} MB), ` +
  `${plan.filter((p) => p.status === "already").length} already in ${DEST}, ` +
  `${plan.filter((p) => p.status === "missing").length} not found in iCloud folder`,
);
for (const p of plan.filter((p) => p.status === "missing")) console.log(`  missing: ${p.name}`);
if (DRY) { console.log("dry run — nothing copied"); process.exit(0); }

const failed = [];
let doneBytes = 0;
const t0 = Date.now();
let attempted = 0;
for (const [i, p] of toFetch.entries()) {
  const started = Date.now();
  if (i % 5 === 0 && freeGb(DEST) - p.size / 1073741824 < MIN_FREE_GB) {
    console.log(
      `\nstopping: ${freeGb(DEST).toFixed(1)} GB free on ${DEST.slice(0, 2)} would drop under the ${MIN_FREE_GB} GB floor. ` +
      `${toFetch.length - i} files remain — free space (or set MIN_FREE_GB) and re-run the same command to continue.`,
    );
    break;
  }
  attempted++;
  try {
    copyFileSync(p.src, p.dst); // hydrates the placeholder through the cloud filter
    const got = statSync(p.dst).size;
    if (got !== p.size) throw new Error(`size mismatch: expected ${p.size}, got ${got}`);
    doneBytes += got;
    if (!KEEP_LOCAL) {
      // Release the original back to cloud-only so it doesn't occupy disk twice.
      try { execFileSync("attrib", ["+U", "-P", p.src], { stdio: "ignore" }); } catch { /* best effort */ }
    }
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    const rate = doneBytes / ((Date.now() - t0) / 1000) / 1048576;
    console.log(`  ${i + 1}/${toFetch.length}  ${p.name}  ${(got / 1048576).toFixed(1)} MB in ${secs}s  (avg ${rate.toFixed(1)} MB/s)`);
  } catch (error) {
    failed.push({ name: p.name, error: error instanceof Error ? error.message : String(error) });
    try { if (existsSync(p.dst)) unlinkSync(p.dst); } catch { /* ignore */ }
    console.log(`  ${i + 1}/${toFetch.length}  ${p.name}  FAILED: ${failed[failed.length - 1].error}`);
  }
}
console.log(`\nfetched ${attempted - failed.length}/${toFetch.length} (${(doneBytes / 1048576).toFixed(0)} MB) into ${DEST}`);
if (failed.length) {
  console.log(`failed (${failed.length}) — re-run the same command to retry just these:`);
  for (const f of failed) console.log(`  ${f.name}: ${f.error}`);
  process.exitCode = 2;
} else {
  console.log("next: node --env-file=.env.local scripts/footage/proxy-phone-videos.mjs");
}
