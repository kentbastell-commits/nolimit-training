// Render the 2026-08-08 square originals into clean local 16:9 masters.
//
// - Every clip uses a manually audited crop across its complete duration.
// - True 16:9 is used wherever the relevant movement fits.
// - Graduated near-fit compositions add only enough side-fill to preserve
//   feet, equipment, and complete movement paths.
// - Explanation clips receive local noise reduction, compression, loudness
//   normalization, and synchronized cuts for conservative filler intervals.
// - No captions, emoji, stickers, generated graphics, or external APIs.

import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { canonicalOutputTitle } from "./canonical-output-titles.mjs";
import { FRAMING_DECISIONS, framingLabel } from "./framing-decisions-16x9.mjs";

const run = promisify(execFile);
const SOURCE = "C:\\Users\\kentb\\Videos\\nolimit-footage\\2026-08-08";
const OUTPUT = "C:\\Users\\kentb\\Videos\\nolimit-footage\\local-16x9-clean\\final";
const TRANSCRIPTS = "C:\\Users\\kentb\\Videos\\nolimit-footage\\local-16x9-clean\\transcripts-and-fillers.json";
const TREATMENTS = "C:\\Users\\kentb\\Videos\\nolimit-footage\\local-16x9-clean\\treatments.json";
const SIZE = 3072;
const LANDSCAPE_HEIGHT = 1728;
const VERSION = 3;
const WORKERS = 2;

const args = process.argv.slice(2);
const includeIndex = args.indexOf("--include");
const includePattern = includeIndex >= 0 ? new RegExp(args[includeIndex + 1], "i") : null;
const force = args.includes("--force");

function isExplanation(name) {
  return /Explanation/i.test(name);
}

const even = (value) => Math.round(value / 2) * 2;

function removalExpression(fillers) {
  if (!fillers?.length) return null;
  const intervals = fillers.map(({ start, end }) => `between(t\\,${Number(start).toFixed(3)}\\,${Number(end).toFixed(3)})`);
  return `not(${intervals.join("+")})`;
}

function videoGraph({ cropHeight, cropY, fillers }) {
  const removal = removalExpression(fillers);
  const prefix = removal ? `select='${removal}',setpts=N/FRAME_RATE/TB,` : "";
  if (cropHeight > LANDSCAPE_HEIGHT) {
    return [
      `[0:v]${prefix}split=2[bg0][fg0]`,
      // The camera is locked off. A held blurred source frame is sufficient
      // behind the moving, vertically preserved foreground.
      "[bg0]select='eq(n\\,0)',scale=480:480,crop=480:270:0:105,gblur=sigma=12,scale=1920:1080:flags=bilinear,loop=loop=-1:size=1:start=0,setpts=N/FRAME_RATE/TB[bg]",
      `[fg0]crop=${SIZE}:${cropHeight}:0:${cropY},scale=-2:1080:flags=lanczos[fg]`,
      "[bg][fg]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p[vout]",
    ].join(";");
  }
  return `[0:v]${prefix}crop=${SIZE}:${cropHeight}:0:${cropY},scale=1920:1080:flags=lanczos,format=yuv420p[vout]`;
}

function audioGraph(fillers) {
  const removal = removalExpression(fillers);
  const prefix = removal ? `aselect='${removal}',asetpts=N/SR/TB,` : "";
  return `[0:a]${prefix}highpass=f=75,lowpass=f=14500,afftdn=nf=-28:tn=1,acompressor=threshold=0.10:ratio=3:attack=5:release=90:makeup=1.6,loudnorm=I=-16:LRA=7:TP=-1.5[aout]`;
}

const transcripts = existsSync(TRANSCRIPTS) ? JSON.parse(readFileSync(TRANSCRIPTS, "utf8")) : [];
const transcriptByFile = new Map(transcripts.map((record) => [record.file, record]));

const allJobs = Object.entries(FRAMING_DECISIONS)
  .map(([clip, decision]) => {
    const source = join(SOURCE, clip);
    const title = canonicalOutputTitle(clip);
    const destination = join(OUTPUT, `${title}_16x9_CLEAN.mp4`);
    const meta = `${destination}.render.json`;
    const explanation = isExplanation(clip);
    const transcript = transcriptByFile.get(clip);
    const fillers = explanation ? (transcript?.fillers ?? []) : [];
    const cropHeight = even(decision.cropHeight);
    const cropY = even(decision.cropY);
    const foregroundWidth = cropHeight === LANDSCAPE_HEIGHT ? 1920 : even(1080 * SIZE / cropHeight);
    return {
      source, destination, meta, title, clip, explanation, fillers,
      cropHeight, cropY, foregroundWidth,
      framing: framingLabel({ cropHeight }),
    };
  });

const jobs = allJobs.filter(({ clip }) => !includePattern || includePattern.test(clip));

mkdirSync(OUTPUT, { recursive: true });
writeFileSync(TREATMENTS, `${JSON.stringify(allJobs.map((job) => ({
  clip: job.clip,
  output: job.destination,
  framing: job.framing,
  crop_height: job.cropHeight,
  crop_y: job.cropY,
  foreground_width: job.foregroundWidth,
  side_fill_px_per_side: (1920 - job.foregroundWidth) / 2,
  speech_enhancement: job.explanation,
  filler_intervals: job.fillers,
  visual_overlays: false,
})), null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  event: "render_plan",
  files: jobs.length,
  true_16x9: jobs.filter((job) => job.cropHeight === LANDSCAPE_HEIGHT).length,
  near_fit: jobs.filter((job) => job.cropHeight > LANDSCAPE_HEIGHT && job.cropHeight < SIZE).length,
  full_square: jobs.filter((job) => job.cropHeight === SIZE).length,
  speech_cleanup: jobs.filter((job) => job.explanation).length,
  filler_cuts: jobs.reduce((total, job) => total + job.fillers.length, 0),
}));

let cursor = 0;
let completed = 0;
let skipped = 0;
let failed = 0;

async function render(job) {
  if (!existsSync(job.source)) throw new Error(`Missing source: ${job.source}`);
  if (!force && existsSync(job.destination) && existsSync(job.meta)) {
    try {
      const record = JSON.parse(readFileSync(job.meta, "utf8"));
      if (
        record.version === VERSION &&
        record.crop_height === job.cropHeight &&
        record.crop_y === job.cropY
      ) return "skipped";
    } catch { /* rerender */ }
  }

  const graphParts = [videoGraph(job)];
  if (job.explanation) graphParts.push(audioGraph(job.fillers));
  const ffmpegArgs = [
    "-v", "error", "-hwaccel", "cuda", "-i", job.source,
    "-filter_complex", graphParts.join(";"),
    "-map", "[vout]",
    ...(job.explanation ? ["-map", "[aout]"] : ["-map", "0:a?"]),
    "-c:v", "h264_nvenc", "-preset", "p5", "-rc", "vbr", "-cq", "20",
    "-maxrate", "10M", "-bufsize", "20M", "-b:v", "0",
    ...(job.explanation ? ["-c:a", "aac", "-b:a", "192k"] : ["-c:a", "copy"]),
    "-map_metadata", "0", "-movflags", "+faststart", "-y", job.destination,
  ];
  await run("ffmpeg", ffmpegArgs, { maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  writeFileSync(job.meta, `${JSON.stringify({
    version: VERSION,
    source: job.source,
    output_title: job.title,
    framing: job.framing,
    crop_height: job.cropHeight,
    crop_y: job.cropY,
    foreground_width: job.foregroundWidth,
    side_fill_px_per_side: (1920 - job.foregroundWidth) / 2,
    speech_enhancement: job.explanation,
    filler_intervals: job.fillers,
    visual_overlays: false,
  }, null, 2)}\n`, "utf8");
  return "rendered";
}

async function worker() {
  for (;;) {
    const index = cursor++;
    if (index >= jobs.length) return;
    const job = jobs[index];
    const started = Date.now();
    try {
      const result = await render(job);
      if (result === "skipped") skipped += 1;
      else completed += 1;
      console.log(JSON.stringify({ event: result, progress: completed + skipped + failed, total: jobs.length, clip: job.clip, elapsed_sec: Math.round((Date.now() - started) / 1000) }));
    } catch (error) {
      failed += 1;
      console.error(JSON.stringify({ event: "render_failed", progress: completed + skipped + failed, total: jobs.length, clip: job.clip, error: error instanceof Error ? error.message : String(error) }));
    }
  }
}

await Promise.all(Array.from({ length: WORKERS }, worker));
console.log(JSON.stringify({ event: "render_done", completed, skipped, failed, total: jobs.length }));
if (failed) process.exitCode = 1;
