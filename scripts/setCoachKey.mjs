#!/usr/bin/env node
// Set (or change) the coach-console access key on the PRODUCTION server.
//
//   node scripts/setCoachKey.mjs
//
// Prompts for the key (typed locally, never stored in this repo or shown in a
// process list — it travels to the box over ssh stdin), writes it as
// COACH_ACCESS_KEY in /opt/nolimit-training/.env, reloads both web apps and
// the pg twin (they share that .env — CLAUDE.md #41), then proves the lock:
// a keyless coach call must 401 and a keyed one must not. Prints the one-tap
// unlock link to bookmark on each device.
//
// To turn the lock OFF again: node scripts/setCoachKey.mjs --clear
// To only CHECK the lock + get the unlock link: node scripts/setCoachKey.mjs --check
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";

const SSH_HOST = "nolimit-cn";
const SERVER_DIR = "/opt/nolimit-training";
const LIVE = "https://trainnolimit.cn";
const clear = process.argv.includes("--clear");
const checkOnly = process.argv.includes("--check");

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const out = process.stdout;
    let muted = false;
    const origWrite = out.write.bind(out);
    out.write = (chunk, ...rest) => {
      if (muted) return true;
      return origWrite(chunk, ...rest);
    };
    rl.question(question, (answer) => {
      out.write = origWrite;
      origWrite("\n");
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

function ssh(script, input) {
  const res = spawnSync("ssh", [SSH_HOST, script], {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
  });
  if (res.status !== 0) {
    throw new Error(`ssh exited ${res.status}`);
  }
  return res.stdout.trim();
}

// Node's own fetch — the first version shelled out to curl, and Windows curl
// has no /dev/null, so the probe "failed" after the key had already landed.
async function probe(key) {
  const headers = key ? { "x-coach-key": key } : {};
  try {
    const res = await fetch(`${LIVE}/api/enquiries`, { headers });
    return String(res.status);
  } catch (err) {
    return `network error (${err.message})`;
  }
}

async function main() {
  let key = "";
  if (checkOnly) {
    key = (await askHidden("Your coach access key (typing is hidden): ")).trim();
    const keyless = await probe("");
    const keyed = await probe(key);
    if (keyless !== "401") {
      console.error(`The lock is NOT active: a keyless coach call returned ${keyless}.`);
      process.exit(1);
    }
    if (keyed === "401") {
      console.error("That key is rejected by the server — not the one that was installed.");
      process.exit(1);
    }
    printSuccess(key, keyed);
    return;
  }
  if (!clear) {
    key = (await askHidden("Coach access key (typing is hidden): ")).trim();
    const again = (await askHidden("Type it once more: ")).trim();
    if (key !== again) {
      console.error("The two entries differ — nothing changed.");
      process.exit(1);
    }
    if (key.length < 8) {
      console.error("Use at least 8 characters — nothing changed.");
      process.exit(1);
    }
    if (/[\s'"\\#]/.test(key)) {
      console.error(
        "No spaces, quotes, backslashes or # in the key — nothing changed."
      );
      process.exit(1);
    }
  }

  console.log(clear ? "Removing the key on the server…" : "Writing the key on the server…");
  // The key arrives on stdin, so it never appears in a command line or a
  // shell history on either machine.
  const remote = [
    `set -e`,
    `cd ${SERVER_DIR}`,
    `IFS= read -r K || true`,
    `grep -v '^COACH_ACCESS_KEY=' .env > .env.tmp || true`,
    `if [ -n "$K" ]; then printf 'COACH_ACCESS_KEY=%s\\n' "$K" >> .env.tmp; fi`,
    `chmod --reference=.env .env.tmp && mv .env.tmp .env`,
    `pm2 reload ecosystem.config.cjs --update-env > /dev/null`,
    `pm2 restart nolimit-training-pg --update-env > /dev/null 2>&1 || true`,
    `echo done`,
  ].join(" && ");
  ssh(remote, `${key}\n`);

  console.log("Waiting for the apps to come back…");
  await new Promise((r) => setTimeout(r, 6000));

  const keyless = await probe("");
  if (clear) {
    if (keyless === "401") {
      console.error("Still locked (401) — the reload may not have picked up .env. Check pm2 logs.");
      process.exit(1);
    }
    console.log(`Lock is OFF: keyless coach call returned ${keyless}.`);
    return;
  }
  const keyed = await probe(key);
  if (keyless !== "401") {
    console.error(
      `The lock is NOT active: a keyless coach call returned ${keyless}, expected 401. Check pm2 logs.`
    );
    process.exit(1);
  }
  if (keyed === "401") {
    console.error("The key you typed is rejected by the server — retry.");
    process.exit(1);
  }
  printSuccess(key, keyed);
}

function printSuccess(key, keyed) {
  console.log(`Lock is ON: keyless → 401, with key → ${keyed}.`);
  console.log("");
  console.log("Bookmark this on every device you coach from (one tap unlocks it):");
  console.log(`  ${LIVE}/?view=coach&key=${encodeURIComponent(key)}`);
  console.log("");
  console.log("Anyone with that link gets into the coach console — keep it private.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
