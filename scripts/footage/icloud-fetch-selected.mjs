// Download ONLY the iCloud videos ticked on the contact sheet, into the
// phone-inbox that proxy-phone-videos.mjs already consumes.
//
//   node scripts/footage/icloud-fetch-selected.mjs <selected.txt> [--dest C:\Users\kentb\Videos\phone-inbox] [--dry] [--keep-local]
//
// How it works: iCloud for Windows keeps every video as a cloud-only
// placeholder; reading it makes the cloud-files filter pull the bytes without
// needing an iCloud API login. Bytes are written to a resumable partial and
// promoted only after duration and a full-stream media scan pass. After a
// verified copy the ORIGINAL is released back to cloud-only
// (`attrib +U -P`), so the download costs disk once, not twice — this box
// had 59GB free against a 1.46TB library. --keep-local skips that release.
//
// Re-runnable: completed files are skipped and `.icloud-partial` files resume.
// The default stops after one bad file so a flaky connection cannot damage a
// series of placeholders; --continue-on-error restores best-effort batching.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { execFileSync, execSync } from "node:child_process";
import { copyResumable, validateMedia } from "./icloud-copy-core.mjs";

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
const CONTINUE_ON_ERROR = flags.has("--continue-on-error");
const listFile = positional[0];
const STOP_FILE = process.env.ICLOUD_STOP_FILE || join(DEST, ".stop-icloud-fetch");
const CHUNK_BYTES = Math.max(1, Number(process.env.ICLOUD_CHUNK_MB || 4)) * 1024 * 1024;

if (!listFile || !existsSync(listFile)) {
  console.error(
    "usage: node scripts/footage/icloud-fetch-selected.mjs <selected.txt> " +
    "[--dest dir] [--dry] [--keep-local] [--continue-on-error]",
  );
  process.exit(1);
}
const names = [...new Set(
  readFileSync(listFile, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => basename(l)),
)];
mkdirSync(DEST, { recursive: true });

// The review manifests were recorded while the files were cloud placeholders.
// iCloud can report a different byte size after hydration, so manifest bytes
// are planning estimates only. Duration plus a complete media scan are the
// completion gate.
const expected = new Map();
const reviewRoot = dirname(listFile);
if (existsSync(reviewRoot)) {
  for (const d of readdirSync(reviewRoot)) {
    const mf = join(reviewRoot, d, "manifest.json");
    if (!/^\d{4}-\d{2}-\d{2}_/.test(d) || !existsSync(mf)) continue;
    const rows = JSON.parse(readFileSync(mf, "utf8").replace(/^﻿/, ""));
    for (const row of Array.isArray(rows) ? rows : [rows]) {
      expected.set(row.name, { bytes: Number(row.bytes) || 0, seconds: Number(row.seconds) || 0 });
    }
  }
}

let totalBytes = 0;
const plan = [];
for (const name of names) {
  const src = join(ROOT, name);
  if (!existsSync(src)) { plan.push({ name, status: "missing" }); continue; }
  const current = statSync(src).size;
  const meta = expected.get(name) || {};
  const size = meta.bytes || current;
  const dst = join(DEST, name);
  const partial = `${dst}.icloud-partial`;
  if (existsSync(dst)) {
    try {
      validateMedia(dst, meta.seconds, true);
      plan.push({ name, status: "already" });
      continue;
    } catch {
      // A previous CopyFile-based run may have left a full-size but empty or
      // truncated destination. It is quarantined immediately before retry.
    }
  }
  const partialBytes = existsSync(partial) ? Math.min(statSync(partial).size, size) : 0;
  totalBytes += size - partialBytes;
  plan.push({
    name, status: "fetch", src, dst, partial, size, partialBytes,
    seconds: meta.seconds || 0, invalidDest: existsSync(dst),
  });
}
const toFetch = plan.filter((p) => p.status === "fetch");
console.log(
  `${names.length} selected → ${toFetch.length} to download (${(totalBytes / 1048576).toFixed(0)} MB), ` +
  `${plan.filter((p) => p.status === "already").length} already in ${DEST}, ` +
  `${plan.filter((p) => p.status === "missing").length} not found in iCloud folder`,
);
for (const p of plan.filter((p) => p.status === "missing")) console.log(`  missing: ${p.name}`);
const invalidDestinations = toFetch.filter((p) => p.invalidDest);
if (invalidDestinations.length) {
  console.log(`${invalidDestinations.length} invalid prior destination files will be quarantined before retry`);
}
if (DRY) { console.log("dry run — nothing copied"); process.exit(0); }

// Copy into an appendable partial instead of using copyFileSync. Windows
// creates a CopyFile destination at its final logical size before iCloud has
// hydrated the source; a killed or failed run can therefore look complete on
// the next run. This partial grows only as bytes are actually read and resumes.
let stopRequested = false;
process.on("SIGINT", () => {
  stopRequested = true;
  console.log("\nstop requested — finishing the current chunk, then leaving a resumable partial");
});
process.on("SIGTERM", () => {
  stopRequested = true;
  console.log("\nstop requested — finishing the current chunk, then leaving a resumable partial");
});

const failed = [];
let doneBytes = 0;
const t0 = Date.now();
let attempted = 0;
let stopped = false;
for (const [i, p] of toFetch.entries()) {
  if (stopRequested || existsSync(STOP_FILE)) {
    console.log(`\nstopping cleanly before ${p.name}; remove ${STOP_FILE} and re-run to continue.`);
    stopped = true;
    break;
  }
  const started = Date.now();
  if (i % 5 === 0 && freeGb(DEST) - (p.size - p.partialBytes) / 1073741824 < MIN_FREE_GB) {
    console.log(
      `\nstopping: ${freeGb(DEST).toFixed(1)} GB free on ${DEST.slice(0, 2)} would drop under the ${MIN_FREE_GB} GB floor. ` +
      `${toFetch.length - i} files remain — free space (or set MIN_FREE_GB) and re-run the same command to continue.`,
    );
    stopped = true;
    break;
  }
  attempted++;
  try {
    const copied = copyResumable(p, {
      shouldStop: () => stopRequested || existsSync(STOP_FILE),
      chunkBytes: CHUNK_BYTES,
      onProgress: position => console.log(`    ${(position / 1048576).toFixed(0)}/~${(p.size / 1048576).toFixed(0)} MB advertised`),
    }); // reads hydrate the placeholder through the cloud filter
    if (copied.stopped) {
      console.log(
        `  ${i + 1}/${toFetch.length}  ${p.name}  paused at ` +
        `${(copied.position / 1048576).toFixed(1)} MB`,
      );
      attempted--;
      stopped = true;
      break;
    }
    const got = statSync(p.dst).size;
    doneBytes += got;
    if (!KEEP_LOCAL) {
      // Release the original back to cloud-only so it doesn't occupy disk twice.
      try { execFileSync("attrib", ["+U", "-P", p.src], { stdio: "ignore" }); } catch { /* best effort */ }
    }
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    const rate = doneBytes / ((Date.now() - t0) / 1000) / 1048576;
    const resumed = copied.resumedAt ? `, resumed at ${(copied.resumedAt / 1048576).toFixed(1)} MB` : "";
    console.log(`  ${i + 1}/${toFetch.length}  ${p.name}  ${(got / 1048576).toFixed(1)} MB in ${secs}s${resumed}  (avg ${rate.toFixed(1)} MB/s)`);
  } catch (error) {
    failed.push({ name: p.name, error: error instanceof Error ? error.message : String(error) });
    console.log(`  ${i + 1}/${toFetch.length}  ${p.name}  FAILED: ${failed[failed.length - 1].error}`);
    const current = existsSync(p.src) ? statSync(p.src).size : 0;
    console.log(
      `    ${existsSync(p.partial) ? "kept interrupted partial" : "invalid partial quarantined"}; source now reports ${current} bytes ` +
      `(manifest advertised ${p.size})`,
    );
    if (!CONTINUE_ON_ERROR) {
      console.log("    stopping after the first network/file error to avoid damaging more placeholders");
      break;
    }
  }
}
console.log(`\nfetched ${attempted - failed.length}/${toFetch.length} (${(doneBytes / 1048576).toFixed(0)} MB) into ${DEST}`);
if (failed.length) {
  console.log(`failed (${failed.length}) — re-run the same command to retry just these:`);
  for (const f of failed) console.log(`  ${f.name}: ${f.error}`);
  process.exitCode = 2;
} else if (stopped) {
  console.log("stopped cleanly; re-run the same command to resume from the partial file");
} else {
  console.log("next: node --env-file=.env.local scripts/footage/proxy-phone-videos.mjs");
}
