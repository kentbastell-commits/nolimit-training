// Compress the 16:9 masters into app-delivery-sized copies. The masters
// (~9-10 Mbps average, per ffprobe) are correctly high quality for
// Xiaohongshu (which recommends 6 Mbps+) and for future re-edits, but the
// coaching app/mini program plays a file exactly as uploaded — no platform
// re-transcodes it — so a delivery copy needs a real mobile bitrate.
// CRF 23 (libx264, medium preset) targets ~1.5-3.5 Mbps for this kind of
// content while keeping resolution/frame rate untouched. +faststart moves
// the moov atom to the front so playback can start before the whole file
// downloads (the server already supports Range requests; this is the other
// half of fast start).
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const FFMPEG =
  "C:\\Users\\kentb\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe";
const SRC = "C:\\Users\\kentb\\Videos\\nolimit-footage\\16x9";
const OUT = "C:\\Users\\kentb\\Videos\\nolimit-footage\\16x9 Compressed";

mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC).filter((f) => f.toLowerCase().endsWith(".mp4"));
console.log(`${files.length} files to compress\n`);

let done = 0,
  skipped = 0,
  failed = 0,
  srcBytes = 0,
  outBytes = 0;
const failures = [];

for (const name of files) {
  const srcPath = join(SRC, name);
  const outPath = join(OUT, name);
  // A file present at the initial readdirSync can still vanish before its
  // turn in this loop (observed: a transient DJI "_preview" proxy file some
  // other process created and cleaned up mid-run) — skip rather than crash
  // the whole batch on an ENOENT this far in.
  if (!existsSync(srcPath)) {
    console.log(`SKIP (vanished before processing): ${name}`);
    skipped++;
    continue;
  }
  const srcSize = statSync(srcPath).size;
  srcBytes += srcSize;

  if (existsSync(outPath) && statSync(outPath).size > 0) {
    skipped++;
    outBytes += statSync(outPath).size;
    continue;
  }

  const t0 = Date.now();
  const res = spawnSync(
    FFMPEG,
    [
      "-y",
      "-i",
      srcPath,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outPath,
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );

  if (res.status !== 0) {
    failed++;
    failures.push(name);
    console.log(`FAIL: ${name}: ${res.stderr?.toString().slice(-300)}`);
    continue;
  }

  const outSize = statSync(outPath).size;
  outBytes += outSize;
  done++;
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  const pct = (100 * (1 - outSize / srcSize)).toFixed(0);
  console.log(
    `ok [${done + skipped}/${files.length}]: ${name} ` +
      `${(srcSize / 1048576).toFixed(1)}MB -> ${(outSize / 1048576).toFixed(1)}MB ` +
      `(-${pct}%, ${secs}s)`
  );
}

console.log(
  `\nDONE: ${done} compressed, ${skipped} already done, ${failed} failed`
);
console.log(
  `total: ${(srcBytes / 1048576 / 1024).toFixed(2)}GB -> ${(outBytes / 1048576 / 1024).toFixed(2)}GB`
);
if (failures.length) console.log("failed:", failures.join(", "));
