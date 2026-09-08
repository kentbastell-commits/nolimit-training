// Uploads each compressed 16:9 video to production and wires it into the
// exercise library: REPLACE_EXERCISES gets ONLY its short_video_url updated
// (existing name/cues/metadata are left untouched — Kent asked to swap the
// video, not rewrite curated content); NEW_EXERCISES is a full insert with
// researched bilingual coaching cues.
import { readFileSync, existsSync } from "node:fs";
import { Client } from "pg";
import { REPLACE_EXERCISES } from "./replace-exercises-data.mjs";
import { NEW_EXERCISES } from "./new-exercises-data.mjs";

const SRC_DIR = "C:\\Users\\kentb\\Videos\\nolimit-footage\\16x9 Compressed";
const UPLOAD_BASE = "https://trainnolimit.cn";
const DRY_RUN = process.argv.includes("--dry-run");

async function uploadVideo(localPath, remoteName) {
  const body = readFileSync(localPath);
  const url = `${UPLOAD_BASE}/api/uploadFormVideoFile?kind=exercise&name=${encodeURIComponent(remoteName)}`;
  const res = await fetch(url, { method: "POST", body });
  if (!res.ok) throw new Error(`upload failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  if (!data.success || !data.url) throw new Error(`unexpected upload response: ${JSON.stringify(data)}`);
  return `${UPLOAD_BASE}${data.url}`;
}

function genExerciseId(name) {
  const letters = name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X");
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `EX-${letters}-${digits}`;
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let replaced = 0, replaceFailed = 0, created = 0, createFailed = 0;
const failures = [];

console.log(`=== REPLACE (${REPLACE_EXERCISES.length}) ===`);
for (const item of REPLACE_EXERCISES) {
  const localPath = `${SRC_DIR}\\${item.videoFile}`;
  if (!existsSync(localPath)) {
    console.log(`MISSING FILE: ${item.videoFile}`);
    replaceFailed++;
    failures.push(item.videoFile);
    continue;
  }
  try {
    if (DRY_RUN) {
      console.log(`[dry-run] would upload+attach: ${item.videoFile} -> ${item.exerciseId}`);
      continue;
    }
    const videoUrl = await uploadVideo(localPath, item.videoFile.replace(/[^\w.\-() ]/g, "_"));
    const result = await client.query(
      "UPDATE exercises SET short_video_url = $1 WHERE exercise_id = $2 RETURNING name",
      [videoUrl, item.exerciseId]
    );
    if (result.rowCount === 0) {
      console.log(`NOT FOUND IN DB: ${item.exerciseId} (${item.videoFile})`);
      replaceFailed++;
      failures.push(item.videoFile);
      continue;
    }
    console.log(`ok: ${item.exerciseId} (${result.rows[0].name}) <- ${item.videoFile}`);
    replaced++;
  } catch (error) {
    console.log(`FAIL: ${item.videoFile}: ${error.message}`);
    replaceFailed++;
    failures.push(item.videoFile);
  }
}

console.log(`\n=== CREATE (${NEW_EXERCISES.length}) ===`);
for (const ex of NEW_EXERCISES) {
  const localPath = `${SRC_DIR}\\${ex.videoFile}`;
  if (!existsSync(localPath)) {
    console.log(`MISSING FILE: ${ex.videoFile}`);
    createFailed++;
    failures.push(ex.videoFile);
    continue;
  }
  try {
    if (DRY_RUN) {
      console.log(`[dry-run] would create: ${ex.name}`);
      continue;
    }
    const videoUrl = await uploadVideo(localPath, ex.videoFile.replace(/[^\w.\-() ]/g, "_"));
    const exerciseId = genExerciseId(ex.name);
    await client.query(
      `INSERT INTO exercises (
        exercise_id, name, name_cn, category, movement_pattern, primary_muscles,
        equipment, difficulty, training_quality, default_sets, default_reps,
        default_rest, coaching_cues, coaching_cues_cn, short_video_url, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'Active')`,
      [
        exerciseId, ex.name, ex.nameCn, ex.category, ex.movementPattern,
        ex.primaryMuscles, ex.equipment, ex.difficulty, ex.trainingQuality,
        ex.defaultSets ?? null, ex.defaultReps ?? null, ex.defaultRest ?? null,
        ex.coachingCues, ex.coachingCuesCn, videoUrl,
      ]
    );
    console.log(`ok: ${exerciseId} (${ex.name})`);
    created++;
  } catch (error) {
    console.log(`FAIL: ${ex.name}: ${error.message}`);
    createFailed++;
    failures.push(ex.videoFile);
  }
}

await client.end();
console.log(
  `\nDONE: ${replaced} replaced, ${replaceFailed} replace-failed, ${created} created, ${createFailed} create-failed`
);
if (failures.length) console.log("failures:", failures.join(", "));
