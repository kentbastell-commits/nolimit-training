// Generate full-duration contact sheets using the manually selected final
// composition for every clip. Review only; production videos are unchanged.

import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";
import { FRAMING_DECISIONS } from "./framing-decisions-16x9.mjs";

const run = promisify(execFile);
const SOURCE = "C:\\Users\\kentb\\Videos\\nolimit-footage\\2026-08-08";
const QA = "C:\\Users\\kentb\\Videos\\nolimit-footage\\local-16x9-clean\\qa-summary.json";
const OUTPUT = "C:\\Users\\kentb\\Videos\\nolimit-footage\\local-16x9-clean\\audit-final-framing";
const SIZE = 3072;
const WORKERS = 3;

const args = process.argv.slice(2);
const force = args.includes("--force");
const includeIndex = args.indexOf("--include");
const includePattern = includeIndex >= 0 ? new RegExp(args[includeIndex + 1], "i") : null;

const qa = JSON.parse(readFileSync(QA, "utf8"));
const durationByClip = new Map(qa.rows.map((row) => [row.clip, row.source_duration_sec]));
mkdirSync(OUTPUT, { recursive: true });

const jobs = Object.entries(FRAMING_DECISIONS)
  .filter(([clip]) => !includePattern || includePattern.test(clip))
  .map(([clip, decision]) => {
    const title = basename(clip, extname(clip));
    return {
      clip,
      source: join(SOURCE, clip),
      destination: join(OUTPUT, `${title}_h${decision.cropHeight}_y${decision.cropY}_sheet.jpg`),
      duration: durationByClip.get(clip),
      ...decision,
    };
  });

function filterFor(job) {
  const sampleRate = 20 / Math.max(job.duration, 0.1);
  if (job.cropHeight === 1728) {
    return `crop=${SIZE}:${job.cropHeight}:0:${job.cropY},fps=${sampleRate.toFixed(8)},scale=384:216:flags=bilinear,tile=5x4`;
  }
  return [
    "split=2[bg0][fg0]",
    "[bg0]scale=384:384:flags=bilinear,crop=384:216:0:84,gblur=sigma=10[bg]",
    `[fg0]crop=${SIZE}:${job.cropHeight}:0:${job.cropY},scale=-2:216:flags=bilinear[fg]`,
    `[bg][fg]overlay=(W-w)/2:0,fps=${sampleRate.toFixed(8)},tile=5x4[out]`,
  ].join(";");
}

let cursor = 0;
let completed = 0;

async function worker() {
  for (;;) {
    const index = cursor++;
    if (index >= jobs.length) return;
    const job = jobs[index];
    if (!force && existsSync(job.destination)) {
      completed += 1;
      console.log(JSON.stringify({ event: "audit_sheet_skipped", completed, total: jobs.length, clip: job.clip }));
      continue;
    }
    const vf = filterFor(job);
    const ffmpegArgs = ["-v", "error", "-hwaccel", "cuda", "-i", job.source];
    if (job.cropHeight === 1728) {
      ffmpegArgs.push("-vf", vf, "-frames:v", "1", "-q:v", "3", "-y", job.destination);
    } else {
      ffmpegArgs.push("-filter_complex", vf, "-map", "[out]", "-frames:v", "1", "-q:v", "3", "-y", job.destination);
    }
    await run("ffmpeg", ffmpegArgs, { maxBuffer: 4 * 1024 * 1024, windowsHide: true });
    completed += 1;
    console.log(JSON.stringify({ event: "audit_sheet", completed, total: jobs.length, clip: job.clip, crop_height: job.cropHeight, crop_y: job.cropY }));
  }
}

await Promise.all(Array.from({ length: WORKERS }, worker));
console.log(JSON.stringify({ event: "audit_done", files: jobs.length, output: OUTPUT }));
