// Generate low-resolution, full-duration contact sheets for proposed true-16:9
// crops. These are review artifacts only; no production videos are changed.

import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const SOURCE = "C:\\Users\\kentb\\Videos\\nolimit-footage\\2026-08-08";
const MEASUREMENTS = "C:\\Users\\kentb\\Videos\\nolimit-footage\\analysis\\measurements.json";
const QA = "C:\\Users\\kentb\\Videos\\nolimit-footage\\local-16x9-clean\\qa-summary.json";
const OUTPUT = "C:\\Users\\kentb\\Videos\\nolimit-footage\\local-16x9-clean\\audit-full-bleed";
const SIZE = 3072;
const CROP_HEIGHT = 1728;
const WORKERS = 3;

const even = (value) => Math.round(value / 2) * 2;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

const measurements = JSON.parse(readFileSync(MEASUREMENTS, "utf8"));
const qa = JSON.parse(readFileSync(QA, "utf8"));
const durationByClip = new Map(qa.rows.map((row) => [row.clip, row.source_duration_sec]));
mkdirSync(OUTPUT, { recursive: true });

const jobs = measurements.map((measurement) => {
  const title = basename(measurement.clip, extname(measurement.clip));
  // Start slightly above the measured head position. The audit determines
  // whether this crop is usable and whether it should move up/down.
  const cropY = even(clamp(measurement.headTop * SIZE - 140, 0, SIZE - CROP_HEIGHT));
  return {
    clip: measurement.clip,
    source: join(SOURCE, measurement.clip),
    destination: join(OUTPUT, `${title}_y${cropY}_sheet.jpg`),
    duration: durationByClip.get(measurement.clip),
    cropY,
  };
});

let cursor = 0;
let completed = 0;

async function worker() {
  for (;;) {
    const index = cursor++;
    if (index >= jobs.length) return;
    const job = jobs[index];
    if (existsSync(job.destination)) {
      completed += 1;
      console.log(JSON.stringify({ event: "audit_sheet_skipped", completed, total: jobs.length, clip: job.clip }));
      continue;
    }
    const sampleRate = 20 / Math.max(job.duration, 0.1);
    const filter = [
      `crop=${SIZE}:${CROP_HEIGHT}:0:${job.cropY}`,
      `fps=${sampleRate.toFixed(8)}`,
      "scale=384:216:flags=bilinear",
      "tile=5x4:padding=0:margin=0",
    ].join(",");
    await run("ffmpeg", [
      "-v", "error", "-hwaccel", "cuda", "-i", job.source,
      "-vf", filter, "-frames:v", "1", "-q:v", "3", "-y", job.destination,
    ], { maxBuffer: 4 * 1024 * 1024, windowsHide: true });
    completed += 1;
    console.log(JSON.stringify({ event: "audit_sheet", completed, total: jobs.length, clip: job.clip, crop_y: job.cropY }));
  }
}

await Promise.all(Array.from({ length: WORKERS }, worker));
console.log(JSON.stringify({ event: "audit_done", files: jobs.length, output: OUTPUT }));
