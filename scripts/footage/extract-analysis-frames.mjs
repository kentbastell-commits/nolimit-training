// Extract gridded analysis frames from every downloaded original so each
// clip's crop can be measured before encoding. Two frames per clip (20% and
// 60% of duration — skips the walk-to-camera start/end), 480px with a 48px
// red grid (each cell = 10% of the square frame), then contact sheets of 5
// clips per row for review.
//
//   node scripts/footage/extract-analysis-frames.mjs <srcDir> <outDir>
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

const SRC = process.argv[2] || "C:\\Users\\kentb\\Videos\\nolimit-footage\\2026-08-08";
const OUT = process.argv[3] || "C:\\Users\\kentb\\Videos\\nolimit-footage\\analysis";
mkdirSync(OUT, { recursive: true });

const clips = readdirSync(SRC).filter((f) => f.toUpperCase().endsWith(".MP4")).sort();
console.log(`${clips.length} clips`);

const frames = [];
for (const [i, clip] of clips.entries()) {
  const path = join(SRC, clip);
  const dur = Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path])
      .toString().trim()
  );
  const base = basename(clip, ".MP4").replace(/[^\w\u4e00-\u9fff-]+/g, "_");
  const out = [];
  for (const [tag, frac] of [["a", 0.2], ["b", 0.6]]) {
    const png = join(OUT, `${String(i).padStart(2, "0")}_${base}_${tag}.png`);
    execFileSync("ffmpeg", [
      "-v", "error", "-ss", String(Math.max(1, dur * frac)), "-i", path, "-frames:v", "1",
      "-vf", "scale=480:480,drawgrid=w=48:h=48:color=red@0.45",
      "-y", png,
    ]);
    out.push(png);
  }
  frames.push({ index: i, clip, duration: dur, frames: out });
  if ((i + 1) % 10 === 0) console.log(`${i + 1}/${clips.length}`);
}

writeFileSync(join(OUT, "clips.json"), JSON.stringify(frames, null, 2));

// contact sheets: 5 clips x 2 frames per sheet (10 tiles of 480px, 2 rows)
let sheet = 0;
for (let i = 0; i < frames.length; i += 5) {
  const group = frames.slice(i, i + 5);
  const inputs = group.flatMap((g) => g.frames);
  const args = ["-v", "error"];
  for (const f of inputs) args.push("-i", f);
  const n = group.length;
  // row 1 = frame a of each clip, row 2 = frame b
  const aRow = group.map((_, j) => `[${j * 2}]`).join("");
  const bRow = group.map((_, j) => `[${j * 2 + 1}]`).join("");
  const filter = `${aRow}hstack=${n}[top];${bRow}hstack=${n}[bot];[top][bot]vstack=2`;
  const png = join(OUT, `sheet_${String(sheet).padStart(2, "0")}.png`);
  args.push("-filter_complex", filter, "-y", png);
  execFileSync("ffmpeg", args);
  console.log(`sheet ${sheet}: clips ${i}..${i + n - 1}`);
  sheet++;
}
console.log("done");
