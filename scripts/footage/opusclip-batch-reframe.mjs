// Resumable batch submitter for the 2026-08-08 square footage library.
// Keeps OpusClip processing below the account concurrency cap and delegates
// each upload/project creation to opusclip-submit-reframe.mjs.
//
// Usage:
//   node scripts/footage/opusclip-batch-reframe.mjs --dry-run
//   node scripts/footage/opusclip-batch-reframe.mjs [--max N]

import { appendFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { spawn } from "node:child_process";

const SOURCE_DIR = "C:\\Users\\kentb\\Videos\\nolimit-footage\\2026-08-08";
const MANIFEST = "C:\\Users\\kentb\\Videos\\nolimit-footage\\opusclip-16x9\\projects.ndjson";
const FAILURES = "C:\\Users\\kentb\\Videos\\nolimit-footage\\opusclip-16x9\\submission-failures.ndjson";
const SUBMITTER = new URL("./opusclip-submit-reframe.mjs", import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (m) => m.slice(1));
const API_BASE = (process.env.OPUSCLIP_API_URL || "https://api.opus.pro/api").replace(/\/+$/, "");
const COPYRIGHT_NOTICE = "Using video you don't own may violate copyright laws. By continuing, you confirm this is your own original content.";
const WORKERS = 2;
const MAX_ACTIVE_PROJECTS = 8;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const maxIndex = args.indexOf("--max");
const maxFiles = maxIndex >= 0 ? Number(args[maxIndex + 1]) : Infinity;

function isExplanation(name) {
  return /Explanation/i.test(name);
}

function isFeetPriority(name) {
  return [
    /Squat/i,
    /Jump/i,
    /Lunge/i,
    /Deadlift/i,
    /RDL/i,
    /Wall Ball/i,
    /Sled/i,
    /Farmer Carry/i,
    /Pigeon/i,
    /Calf/i,
    /Back Extension/i,
    /Hip Thrust/i,
    /Hamstring Curl/i,
    /Stability Ball/i,
    /Toe Touch/i,
    /Foam Rolling/i,
    /Half Kneel/i,
    /Assault Bike/i,
    /Erg/i,
    /KB Swing/i,
    /Side Bend/i,
    /Burpee/i,
    /Cable Tricep Extension Lateral Bias/i, // source is actually a split squat
  ].some((pattern) => pattern.test(name));
}

function completedFinalTitles() {
  if (!existsSync(MANIFEST)) return new Set();
  const records = readFileSync(MANIFEST, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  return new Set(records.map((record) => record.title).filter((title) => /_FINAL$/.test(title)));
}

async function apiUsage() {
  const response = await fetch(`${API_BASE}/api-usage?q=mine`, {
    headers: { Authorization: `Bearer ${process.env.OPUSCLIP_API_KEY}`, Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Usage check failed: ${response.status}`);
  const raw = await response.json();
  return raw.data ?? raw;
}

async function waitForProjectSlot() {
  for (;;) {
    const usage = await apiUsage();
    const active = usage.concurrent?.used ?? 0;
    if (active < MAX_ACTIVE_PROJECTS) return;
    console.log(JSON.stringify({ event: "waiting_for_slot", active, limit: usage.concurrent?.limit ?? null }));
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }
}

function runSubmitter(file, feetPriority, speech) {
  const title = `${basename(file, extname(file))}_FINAL`;
  const childArgs = [SUBMITTER, file, "--title", title];
  if (feetPriority) childArgs.push("--feet-priority");
  if (speech) childArgs.push("--speech");
  return new Promise((resolve, reject) => {
    console.log(COPYRIGHT_NOTICE);
    console.log(JSON.stringify({ event: "batch_submit_start", file, title, feet_priority: feetPriority, speech }));
    const child = spawn(process.execPath, childArgs, { stdio: "inherit", env: process.env });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`submitter exited ${code}`)));
  });
}

const finalTitles = completedFinalTitles();
const files = readdirSync(SOURCE_DIR, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(mp4|mov|m4v)$/i.test(entry.name))
  .map((entry) => join(SOURCE_DIR, entry.name))
  .filter((file) => !finalTitles.has(`${basename(file, extname(file))}_FINAL`))
  .slice(0, Number.isFinite(maxFiles) ? maxFiles : undefined);

const plan = files.map((file) => ({
  file,
  feet_priority: isFeetPriority(basename(file)),
  speech: isExplanation(basename(file)),
}));

console.log(JSON.stringify({
  event: "batch_plan",
  pending: plan.length,
  fit_layout: plan.filter((item) => item.feet_priority).length,
  auto_layout: plan.filter((item) => !item.feet_priority).length,
  speech_cleanup: plan.filter((item) => item.speech).length,
}));

if (dryRun) {
  for (const item of plan) console.log(JSON.stringify(item));
  process.exit(0);
}

let cursor = 0;
let succeeded = 0;
let failed = 0;

async function worker() {
  for (;;) {
    const index = cursor++;
    if (index >= plan.length) return;
    const item = plan[index];
    try {
      await waitForProjectSlot();
      await runSubmitter(item.file, item.feet_priority, item.speech);
      succeeded += 1;
      console.log(JSON.stringify({ event: "batch_submit_ok", completed: succeeded + failed, total: plan.length, file: item.file }));
    } catch (error) {
      failed += 1;
      const record = { at: new Date().toISOString(), file: item.file, error: error instanceof Error ? error.message : String(error) };
      appendFileSync(FAILURES, `${JSON.stringify(record)}\n`, "utf8");
      console.error(JSON.stringify({ event: "batch_submit_failed", completed: succeeded + failed, total: plan.length, ...record }));
    }
  }
}

await Promise.all(Array.from({ length: WORKERS }, worker));
console.log(JSON.stringify({ event: "batch_submit_done", succeeded, failed, total: plan.length }));
if (failed) process.exitCode = 1;
