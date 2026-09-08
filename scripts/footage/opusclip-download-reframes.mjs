// Download the latest final OpusClip project for every source in the manifest.
// Waits for processing/HD export, streams files to disk, and generates review sheets.

import { copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { spawn } from "node:child_process";

const MANIFEST = "C:\\Users\\kentb\\Videos\\nolimit-footage\\opusclip-16x9\\projects.ndjson";
const OUTPUT_DIR = "C:\\Users\\kentb\\Videos\\nolimit-footage\\opusclip-16x9\\final";
const REVIEW_DIR = "C:\\Users\\kentb\\Videos\\nolimit-footage\\opusclip-16x9\\review";
const API_BASE = (process.env.OPUSCLIP_API_URL || "https://api.opus.pro/api").replace(/\/+$/, "");
const WORKERS = 2;
const POLL_MS = 30_000;
const MAX_WAIT_MS = 4 * 60 * 60 * 1000;

function apiHeaders() {
  return { Authorization: `Bearer ${process.env.OPUSCLIP_API_KEY}`, Accept: "application/json" };
}

async function api(path) {
  const response = await fetch(`${API_BASE}${path}`, { headers: apiHeaders(), signal: AbortSignal.timeout(30_000) });
  const text = await response.text();
  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status} ${text.slice(0, 300)}`);
  return text.trim() ? JSON.parse(text) : {};
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizedTitle(title) {
  return title.replace(/(?:_FIT)?_FINAL$/, "");
}

function latestFinalProjects() {
  const records = readFileSync(MANIFEST, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    })
    .filter((record) => /_FINAL$/.test(record.title || ""));
  const latest = new Map();
  for (const record of records) {
    const key = normalizedTitle(record.title);
    const previous = latest.get(key);
    if (!previous || String(record.submitted_at) > String(previous.submitted_at)) latest.set(key, record);
  }
  return [...latest.entries()].map(([title, record]) => ({ ...record, title }));
}

async function waitForExport(projectId) {
  const started = Date.now();
  for (;;) {
    const raw = await api(`/exportable-clips?q=findByProjectId&projectId=${encodeURIComponent(projectId)}`);
    const clips = Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : [];
    if (clips.length === 1) {
      const clip = clips[0];
      if (clip.uriForExport && clip.renderAsVideoFile?.pending !== true) return clip;
    } else if (clips.length > 1) {
      throw new Error(`Expected one full-length clip for ${projectId}, got ${clips.length}`);
    }
    if (Date.now() - started > MAX_WAIT_MS) throw new Error(`Timed out waiting for ${projectId}`);
    console.log(JSON.stringify({ event: "waiting_for_export", project_id: projectId, elapsed_min: Math.round((Date.now() - started) / 60000) }));
    await sleep(POLL_MS);
  }
}

async function download(url, destination) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20 * 60 * 1000) });
  if (!response.ok || !response.body) throw new Error(`Download failed: ${response.status}`);
  const stream = createWriteStream(destination);
  Readable.fromWeb(response.body).pipe(stream);
  await finished(stream);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "inherit"] });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}

function runCapture(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve(stdout) : reject(new Error(`${command} exited ${code}: ${stderr.slice(0, 300)}`)));
  });
}

async function processProject(project) {
  const safeTitle = basename(project.title);
  const destination = join(OUTPUT_DIR, `${safeTitle}_16x9_OPUSCLIP.mp4`);
  const sheet = join(REVIEW_DIR, `${safeTitle}_16x9_OPUSCLIP_sheet.jpg`);
  const projectMeta = `${destination}.project.json`;
  const sheetMeta = `${sheet}.review.json`;
  let downloadedProjectId;
  let reviewedProjectId;
  let reviewVersion;
  if (existsSync(projectMeta)) {
    try { downloadedProjectId = JSON.parse(readFileSync(projectMeta, "utf8")).project_id; } catch { /* redownload */ }
  }
  if (existsSync(sheetMeta)) {
    try {
      const review = JSON.parse(readFileSync(sheetMeta, "utf8"));
      reviewedProjectId = review.project_id;
      reviewVersion = review.version;
    } catch { /* regenerate */ }
  }
  const outputIsCurrent = existsSync(destination)
    && statSync(destination).size > 0
    && downloadedProjectId === project.project_id;
  const sheetIsCurrent = existsSync(sheet)
    && reviewedProjectId === project.project_id
    && reviewVersion === 2;
  if (outputIsCurrent && sheetIsCurrent) {
    console.log(JSON.stringify({ event: "download_skipped", project_id: project.project_id, destination }));
    return;
  }
  if (!outputIsCurrent) {
    const clip = await waitForExport(project.project_id);
    const partial = `${destination}.partial-${project.project_id}`;
    console.log(JSON.stringify({ event: "download_started", project_id: project.project_id, destination }));
    await download(clip.uriForExport, partial);
    copyFileSync(partial, destination);
    unlinkSync(partial);
    writeFileSync(projectMeta, `${JSON.stringify({ project_id: project.project_id, submitted_at: project.submitted_at })}\n`, "utf8");
    console.log(JSON.stringify({ event: "download_finished", project_id: project.project_id, destination, bytes: statSync(destination).size }));
  }
  const durationText = await runCapture("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", destination,
  ]);
  const durationSec = Number.parseFloat(durationText);
  const intervalSec = Number.isFinite(durationSec) && durationSec > 0 ? Math.max(durationSec / 20, 0.25) : 6;
  await run("ffmpeg", [
    "-v", "error", "-i", destination,
    "-vf", `fps=1/${intervalSec.toFixed(6)},scale=480:-1,tile=4x5`,
    "-frames:v", "1", "-y", sheet,
  ]);
  writeFileSync(sheetMeta, `${JSON.stringify({ project_id: project.project_id, version: 2, interval_sec: intervalSec })}\n`, "utf8");
  console.log(JSON.stringify({ event: "review_sheet_finished", project_id: project.project_id, sheet }));
}

if (!process.env.OPUSCLIP_API_KEY) throw new Error("OPUSCLIP_API_KEY is not set");
mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(REVIEW_DIR, { recursive: true });

const projects = latestFinalProjects();
console.log(JSON.stringify({ event: "download_plan", projects: projects.length }));
let cursor = 0;
let done = 0;
let failed = 0;

async function worker() {
  for (;;) {
    const index = cursor++;
    if (index >= projects.length) return;
    const project = projects[index];
    try {
      await processProject(project);
      done += 1;
      console.log(JSON.stringify({ event: "download_ok", completed: done + failed, total: projects.length, title: project.title }));
    } catch (error) {
      failed += 1;
      console.error(JSON.stringify({ event: "download_failed", completed: done + failed, total: projects.length, title: project.title, error: error instanceof Error ? error.message : String(error) }));
    }
  }
}

await Promise.all(Array.from({ length: WORKERS }, worker));
console.log(JSON.stringify({ event: "download_done", done, failed, total: projects.length }));
if (failed) process.exitCode = 1;
