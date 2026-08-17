// Batch-crop the square (3072x3072) originals into the two approved formats,
// using per-clip measurements (measurements.json) taken from the analysis
// contact sheets. The crop rules generalize the two edits Kent approved:
//
//   16:9 (library): full width, window top ~50px above the clip's highest
//     head position (squat y=420, bike y=1095 both came from this rule).
//   9:16 (social): bottom-anchored (floor kept, ceiling cut), ~420px
//     headroom and never tighter than 75% of frame height (Kent 2026-08-17:
//     the first bike cut looked "almost a little too zoomed in" — thumbnails
//     shouldn't make anyone look too big), window widened when the subject
//     is wide (floor exercises), person-centered horizontally.
//
// measurements.json: [{ clip, headTop, xLeft, xRight }] — fractions 0..1 of
// the square frame. Resumable: existing outputs are skipped.
//
//   node scripts/footage/batch-crop.mjs <srcDir> <outDir> <measurements.json>
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const SRC = process.argv[2] || "C:\\Users\\kentb\\Videos\\nolimit-footage\\2026-08-08";
const OUT = process.argv[3] || "C:\\Users\\kentb\\Videos\\nolimit-footage\\edited";
const MEASURES = process.argv[4] || "C:\\Users\\kentb\\Videos\\nolimit-footage\\analysis\\measurements.json";
const S = 3072;
const CONCURRENCY = 2;

mkdirSync(join(OUT, "16x9"), { recursive: true });
mkdirSync(join(OUT, "9x16"), { recursive: true });

const even = (n) => 2 * Math.round(n / 2);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function crops({ headTop, xLeft, xRight }) {
  const headPx = headTop * S;
  const centerX = ((xLeft + xRight) / 2) * S;

  const y169 = even(clamp(headPx - 50, 0, S - 1728));

  const hCand = Math.max(S - Math.max(0, headPx - 420), S * 0.75);
  const wNeed = (xRight - xLeft) * S + 240;
  const W = even(clamp(Math.max(hCand * (9 / 16), wNeed), 900, 1728));
  const H = even(Math.min(S, W * (16 / 9)));
  const y916 = S - H;
  const x916 = even(clamp(centerX - W / 2, 0, S - W));

  return {
    c169: `crop=${S}:1728:0:${y169},scale=1920:1080`,
    c916: `crop=${W}:${H}:${x916}:${y916},scale=1080:1920`,
  };
}

const measures = JSON.parse(readFileSync(MEASURES, "utf8"));
console.log(`${measures.length} clips to encode (x2 formats)`);

const jobs = [];
for (const m of measures) {
  const src = join(SRC, m.clip);
  const base = basename(m.clip, ".MP4");
  const { c169, c916 } = crops(m);
  jobs.push(
    { src, vf: c169, dest: join(OUT, "16x9", `${base}_16x9.mp4`), label: `${base} 16x9` },
    { src, vf: c916, dest: join(OUT, "9x16", `${base}_9x16.mp4`), label: `${base} 9x16` }
  );
}

let done = 0, skipped = 0, failed = 0;
const failures = [];
let next = 0;

async function worker() {
  while (next < jobs.length) {
    const job = jobs[next++];
    if (existsSync(job.dest)) { skipped++; continue; }
    const started = Date.now();
    try {
      // Source is 10-bit HEVC (DJI Main 10) — h264_nvenc needs the explicit
      // 8-bit conversion or it fails with a misleading "No capable devices".
      await run("ffmpeg", [
        "-v", "error", "-hwaccel", "cuda", "-i", job.src, "-vf", job.vf,
        "-pix_fmt", "yuv420p",
        // Delivery bitrate cap: cq alone ballooned long clips past the
        // library's 160MB upload limit (500MB+ at ~30Mbps). 8Mbps max keeps
        // every clip upload-ready; 1080p gym content is transparent here.
        "-c:v", "h264_nvenc", "-preset", "p5", "-rc", "vbr", "-cq", "22",
        "-maxrate", "8M", "-bufsize", "16M", "-b:v", "0",
        "-c:a", "copy", "-movflags", "+faststart",
        "-y", job.dest,
      ], { maxBuffer: 16 * 1024 * 1024 });
      done++;
      console.log(`ok [${done + skipped}/${jobs.length}] ${job.label} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
    } catch (error) {
      failed++;
      failures.push(job.label);
      console.log(`FAIL ${job.label}: ${String(error.message).slice(0, 200)}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`\nDONE: ${done} encoded, ${skipped} skipped, ${failed} failed`);
if (failures.length) console.log("failed:", failures.join(", "));
