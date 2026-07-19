// Copy the MediaPipe Pose runtime from node_modules into public/pose so the
// Jump Lab auto-mark feature is fully self-hosted (no Google CDN — required
// for mainland China). Runs via the prebuild/predev hooks; public/pose is
// gitignored. Only the files the JS solution actually loads are copied.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const src = "node_modules/@mediapipe/pose";
const dest = "public/pose";
const FILES = [
  "pose.js",
  "pose_solution_packed_assets_loader.js",
  "pose_solution_packed_assets.data",
  "pose_solution_simd_wasm_bin.js",
  "pose_solution_simd_wasm_bin.data",
  "pose_solution_simd_wasm_bin.wasm",
  "pose_solution_wasm_bin.js",
  "pose_solution_wasm_bin.wasm",
  "pose_web.binarypb",
  "pose_landmark_lite.tflite",
  "pose_landmark_full.tflite",
];

mkdirSync(dest, { recursive: true });
let copied = 0;
for (const file of FILES) {
  const from = path.join(src, file);
  if (!existsSync(from)) continue; // some variants ship fewer files
  copyFileSync(from, path.join(dest, file));
  copied++;
}
console.log(`pose assets: ${copied} files -> ${dest}`);
