// Verify locally rendered 16:9 masters and generate full-duration review sheets.

import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = "C:\\Users\\kentb\\Videos\\nolimit-footage\\local-16x9-clean";
const REVIEW = join(ROOT, "review");
const TREATMENTS = join(ROOT, "treatments.json");
const QA_JSON = join(ROOT, "qa-summary.json");
const QA_MD = "C:\\Users\\kentb\\nolimit-training\\deliverables\\footage-16x9-local-clean-results.md";
const WORKERS = 3;

mkdirSync(REVIEW, { recursive: true });
const treatments = JSON.parse(readFileSync(TREATMENTS, "utf8"));
let cursor = 0;
const rows = [];

async function probe(path) {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-show_streams", "-show_format", "-of", "json", path,
  ], { maxBuffer: 4 * 1024 * 1024, windowsHide: true });
  return JSON.parse(stdout);
}

async function inspect(treatment) {
  const destination = treatment.output;
  const source = join("C:\\Users\\kentb\\Videos\\nolimit-footage\\2026-08-08", treatment.clip);
  if (!existsSync(destination) || statSync(destination).size === 0) {
    return { clip: treatment.clip, output: destination, ok: false, issues: ["missing or empty output"] };
  }

  const [sourceProbe, outputProbe] = await Promise.all([probe(source), probe(destination)]);
  const video = outputProbe.streams.find((stream) => stream.codec_type === "video");
  const audio = outputProbe.streams.find((stream) => stream.codec_type === "audio");
  const subtitles = outputProbe.streams.filter((stream) => stream.codec_type === "subtitle");
  const sourceDuration = Number(sourceProbe.format.duration);
  const outputDuration = Number(outputProbe.format.duration);
  const removed = (treatment.filler_intervals ?? []).reduce((sum, item) => sum + Number(item.end) - Number(item.start), 0);
  const expectedDuration = sourceDuration - removed;
  const issues = [];
  if (video?.width !== 1920 || video?.height !== 1080) issues.push(`unexpected dimensions ${video?.width}x${video?.height}`);
  if (!audio) issues.push("missing audio stream");
  if (subtitles.length) issues.push("unexpected subtitle stream");
  if (Math.abs(outputDuration - expectedDuration) > 0.35) issues.push(`duration mismatch source=${sourceDuration.toFixed(3)} output=${outputDuration.toFixed(3)}`);
  if (treatment.visual_overlays !== false) issues.push("visual overlay flag is not false");

  const interval = Math.max(outputDuration / 20, 0.25);
  const sheet = join(REVIEW, `${basename(destination, ".mp4")}_sheet.jpg`);
  await run("ffmpeg", [
    "-v", "error", "-i", destination,
    "-vf", `fps=1/${interval.toFixed(6)},scale=480:-1,tile=4x5`,
    "-frames:v", "1", "-y", sheet,
  ], { maxBuffer: 4 * 1024 * 1024, windowsHide: true });

  return {
    clip: treatment.clip,
    output: destination,
    sheet,
    ok: issues.length === 0,
    issues,
    width: video?.width,
    height: video?.height,
    video_codec: video?.codec_name,
    audio_codec: audio?.codec_name,
    source_duration_sec: sourceDuration,
    output_duration_sec: outputDuration,
    framing: treatment.framing,
    crop_height: treatment.crop_height,
    crop_y: treatment.crop_y,
    foreground_width: treatment.foreground_width,
    side_fill_px_per_side: treatment.side_fill_px_per_side,
    speech_enhancement: treatment.speech_enhancement,
    filler_cuts: treatment.filler_intervals?.length ?? 0,
    visual_overlays: treatment.visual_overlays,
  };
}

async function worker() {
  for (;;) {
    const index = cursor++;
    if (index >= treatments.length) return;
    const row = await inspect(treatments[index]);
    rows.push(row);
    console.log(JSON.stringify({ event: "verified", completed: rows.length, total: treatments.length, clip: row.clip, ok: row.ok }));
  }
}

await Promise.all(Array.from({ length: WORKERS }, worker));
rows.sort((a, b) => a.clip.localeCompare(b.clip));
const summary = {
  files: rows.length,
  passed: rows.filter((row) => row.ok).length,
  failed: rows.filter((row) => !row.ok).length,
  true_16x9: rows.filter((row) => row.framing === "true-16x9-full-bleed").length,
  near_fit: rows.filter((row) => row.framing?.startsWith("near-fit-")).length,
  full_square: rows.filter((row) => row.framing === "full-square-with-blurred-side-fill").length,
  speech_enhanced: rows.filter((row) => row.speech_enhancement).length,
  filler_cuts: rows.reduce((sum, row) => sum + row.filler_cuts, 0),
  visual_overlays: rows.filter((row) => row.visual_overlays).length,
  rows,
};
writeFileSync(QA_JSON, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

mkdirSync(join("C:\\Users\\kentb\\nolimit-training", "deliverables"), { recursive: true });
writeFileSync(QA_MD, `# Local clean 16:9 footage results\n\n` +
  `- Source: untouched 1:1 originals from \`2026-08-08\`\n` +
  `- Output: \`${join(ROOT, "final")}\`\n` +
  `- Files: ${summary.files}\n` +
  `- Technical QA passed: ${summary.passed}/${summary.files}\n` +
  `- True 16:9 full-bleed compositions (no blur): ${summary.true_16x9}\n` +
  `- Graduated near-fit compositions (minimal side-fill): ${summary.near_fit}\n` +
  `- Full-square preservation (maximum side-fill): ${summary.full_square}\n` +
  `- Explanation videos with local speech enhancement: ${summary.speech_enhanced}\n` +
  `- High-confidence filler cuts: ${summary.filler_cuts}\n` +
  `- Added captions/emoji/stickers/graphics: ${summary.visual_overlays}\n` +
  `- Existing 9:16 files changed by the 16:9 renderer: no (vertical corrections use the separate approved PowerShell recipes)\n`, "utf8");

console.log(JSON.stringify({ event: "verify_done", ...summary, rows: undefined, qa_json: QA_JSON, report: QA_MD }));
if (summary.failed) process.exitCode = 1;
