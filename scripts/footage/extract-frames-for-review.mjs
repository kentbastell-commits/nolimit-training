import { existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const FFMPEG =
  "C:\\Users\\kentb\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe";
const SRC = "C:\\Users\\kentb\\Videos\\nolimit-footage\\16x9";
const OUT = "C:\\Users\\kentb\\Videos\\nolimit-footage\\_frame-review";
mkdirSync(OUT, { recursive: true });

const files = [
  "2 up 1 Down Stability Ball Hamstring Curl__0203_16x9_CLEAN.mp4",
  "Accentuated Eccentric DB Squat Jumps__0190_16x9_CLEAN.mp4",
  "BB Rear Foot Elevated Split Squat__0156_16x9_CLEAN.mp4",
  "Ballistic Back Extension__0213_16x9_CLEAN.mp4",
  "Cable Tricep Extension Lateral Bias__0196_16x9_CLEAN.mp4",
  "DB Alternating Split Jumps__0194_16x9_CLEAN.mp4",
  "DB Continuous Split Jumps__0193_16x9_CLEAN.mp4",
  "DB Continuous Squat Jumps__0192_16x9_CLEAN.mp4",
  "DB Countermovement Jump__0187_16x9_CLEAN.mp4",
  "DB Rear Foot Elevated Split Squat__0154_16x9_CLEAN.mp4",
  "DB Shoulder Warmup__0180_16x9_CLEAN.mp4",
  "DB Squat Jump__0186_16x9_CLEAN.mp4",
  "Glute Dominant Back Extension__0211_16x9_CLEAN.mp4",
  "Half Kneel Plate Rotation__0183_16x9_CLEAN.mp4",
  "High Incline DB Bench Press__0142_16x9_CLEAN.mp4",
  "KB Side Bend__0185_16x9_CLEAN.mp4",
  "Katana Cable Tricep Extension__0199_16x9_CLEAN.mp4",
  "Rope Tricep Extension__0198_16x9_CLEAN.mp4",
  "Single Arm DB Row__0146_16x9_CLEAN.mp4",
  "Seated Calf ISO High Position__0125_16x9_CLEAN.mp4",
  "Seated Calf ISO Low Position__0126_16x9_CLEAN.mp4",
  "Single Leg Back Extension__0209_16x9_CLEAN.mp4",
  "Single Leg Back Extension ISO__0210_16x9_CLEAN.mp4",
  "Single Leg DB Hip Thrust__0217_16x9_CLEAN.mp4",
  "Single Leg Squat 1__0173_16x9_CLEAN.mp4",
  "Single Leg Squat 2__0174_16x9_CLEAN.mp4",
  "Single Leg Squat 3__0175_16x9_CLEAN.mp4",
  "Single Leg Stability Ball Hamstring Curl__0202_16x9_CLEAN.mp4",
  "Stability Ball Hamstring Curl__0201_16x9_CLEAN.mp4",
  "Stability Ball Pike Rollouts__0205_16x9_CLEAN.mp4",
  "Stability Ball Pike to Pushup__0206_16x9_CLEAN.mp4",
  "Stability Ball Plank Rollouts__0207_16x9_CLEAN.mp4",
  "Stability Ball Toe Touches__0204_16x9_CLEAN.mp4",
  "Zombie Squat__0165_16x9_CLEAN.mp4",
];

for (const name of files) {
  const src = `${SRC}\\${name}`;
  if (!existsSync(src)) {
    console.log("MISSING SOURCE:", name);
    continue;
  }
  const base = name.replace(/__\d+_16x9_CLEAN\.mp4$/, "").replace(/[^a-z0-9]+/gi, "_");
  // Two frames per clip: 35% and 65% through, to catch the exercise mid-rep
  // (a single frame near the start often catches setup/black, not the move).
  for (const [tag, pct] of [["a", 0.35], ["b", 0.65]]) {
    const out = `${OUT}\\${base}_${tag}.jpg`;
    try {
      const dur = execFileSync(FFMPEG, ["-i", src], { stdio: ["ignore", "ignore", "pipe"] }).toString();
    } catch (e) {
      const stderr = e.stderr?.toString() || "";
      const m = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      const seconds = m ? (+m[1] * 3600 + +m[2] * 60 + +m[3]) : 10;
      const t = Math.max(0.2, seconds * pct);
      execFileSync(FFMPEG, ["-y", "-ss", String(t), "-i", src, "-frames:v", "1", "-q:v", "3", out], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    }
  }
  console.log("done:", name);
}
console.log("all frames extracted to", OUT);
