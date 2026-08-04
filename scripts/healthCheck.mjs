// Unattended health monitoring for a solo operator.
//
// Kent runs this product without an ops person, so the job of this script is
// to make sure a problem reaches him BEFORE a client tells him about it, in
// language he can act on. It is deliberately dumb and dependency-free: a
// monitoring script that crashes is worse than none.
//
//   node --env-file=.env scripts/healthCheck.mjs --watch    (every 5 min)
//   node --env-file=.env scripts/healthCheck.mjs --report   (once, early AM)
//
// --watch  : is it up, is it serving, is it crash-looping? Alerts on a state
//            CHANGE only, so a sustained outage pings once, not every 5 min.
// --report : the morning digest. Always sends, even when everything is fine,
//            so silence always means "the monitor itself is broken" and never
//            "nothing happened".
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const SITE = process.env.HEALTH_SITE_URL || "https://trainnolimit.com";
const APP = process.env.HEALTH_PM2_APP || "nolimit-training";
const WEBHOOK = process.env.FEISHU_BOT_WEBHOOK_URL || "";
const STATE_FILE = "/tmp/nolimit-health-state.json";
const LOG_FILE = path.resolve(process.cwd(), "logs/client-events.jsonl");
const BACKUP_DIR = "/opt/backups/pg";

const mode = process.argv.includes("--report") ? "report" : "watch";

/* ------------------------------ plumbing ------------------------------ */

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { down: false, lastAlertTs: 0, lastRestarts: null };
  }
}
function writeState(s) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(s));
  } catch {
    /* /tmp full — not worth failing the check over */
  }
}

async function notify(text) {
  if (!WEBHOOK) {
    console.log("[no webhook configured]\n" + text);
    return;
  }
  try {
    await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msg_type: "text", content: { text } }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    console.error("notify failed:", e.message);
  }
}

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 20000 }).trim();
  } catch {
    return "";
  }
}

async function probe(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    return { ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - started, error: e.message };
  }
}

/* ------------------------------- signals ------------------------------- */

function pm2Restarts() {
  const raw = sh(`pm2 jlist`);
  try {
    const app = JSON.parse(raw).find((a) => a.name === APP);
    return app ? { restarts: app.pm2_env.restart_time, status: app.pm2_env.status } : null;
  } catch {
    return null;
  }
}

/** Client-reported problems since `sinceMs`, grouped by what actually broke. */
function telemetrySince(sinceMs) {
  let lines = [];
  try {
    lines = fs.readFileSync(LOG_FILE, "utf8").split("\n").filter(Boolean);
  } catch {
    return { crashes: [], failures: [], funnel: {}, total: 0 };
  }
  const crashes = new Map();
  const failures = new Map();
  const funnel = {};
  let total = 0;
  for (const line of lines) {
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    if (new Date(e.ts).getTime() < sinceMs) continue;
    total++;
    const where = String(e.url || "").startsWith("miniprogram:") ? "mini program" : "web";
    if (e.kind === "crash") {
      const k = `${where}: ${e.message || e.event}`;
      crashes.set(k, (crashes.get(k) || 0) + 1);
    } else if (e.kind === "api_fail") {
      const k = `${where}: ${e.message || e.event}`;
      failures.set(k, (failures.get(k) || 0) + 1);
    } else if (e.kind === "funnel") {
      funnel[e.event] = (funnel[e.event] || 0) + 1;
    }
  }
  const top = (m) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `${n}× ${k}`);
  return { crashes: top(crashes), failures: top(failures), funnel, total };
}

/**
 * Per-athlete pilot digest: for every coached athlete, what happened
 * yesterday — trained or skipped, wellness submitted, readiness. Reads the
 * public API on this box; every failure degrades to an empty section rather
 * than breaking the report.
 */
async function athleteDigest() {
  const get = async (p) => {
    const res = await fetch(`${SITE}${p}`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`${p} -> ${res.status}`);
    return res.json();
  };
  // "Yesterday" in China time — scheduled_date epochs are China midnights.
  const chinaNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" })
  );
  const y = new Date(chinaNow.getTime() - 24 * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const yKey = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;

  try {
    const { clients = [] } = await get("/api/clients");
    const coached = clients
      .filter((c) =>
        /online coaching|in[-\s]?person/i.test(String(c.clientType || ""))
      )
      .slice(0, 8);
    const lines = [];
    for (const c of coached) {
      const code = c.clientCode || c.id;
      try {
        const [{ workouts = [] }, { checkIns = [] }] = await Promise.all([
          get(`/api/workouts?clientId=${encodeURIComponent(code)}`),
          get(`/api/checkIns?clientId=${encodeURIComponent(code)}`),
        ]);
        const toKey = (ms) => {
          const d = new Date(Number(ms));
          const cn = new Date(
            d.toLocaleString("en-US", { timeZone: "Asia/Shanghai" })
          );
          return `${cn.getFullYear()}-${pad(cn.getMonth() + 1)}-${pad(cn.getDate())}`;
        };
        const yesterdays = workouts.filter(
          (w) => w.scheduledDate && toKey(w.scheduledDate) === yKey
        );
        const doneCount = yesterdays.filter((w) =>
          /complete/i.test(String(w.completionStatus || ""))
        ).length;
        const wellness = checkIns.find((ci) => ci.submittedDate === yKey);

        const parts = [];
        if (yesterdays.length === 0) parts.push("rest day");
        else if (doneCount === yesterdays.length)
          parts.push(
            `trained ✓ (${yesterdays.map((w) => w.sessionName).join(", ")})`
          );
        else
          parts.push(
            `⚠️ ${doneCount}/${yesterdays.length} sessions logged (${yesterdays
              .map((w) => w.sessionName)
              .join(", ")})`
          );
        parts.push(
          wellness
            ? `wellness ${wellness.readinessScore || "✓"}`
            : "no wellness check-in"
        );
        lines.push(`  • ${c.name || code}: ${parts.join(" · ")}`);
      } catch {
        lines.push(`  • ${c.name || code}: (could not load)`);
      }
    }
    return lines;
  } catch {
    return [];
  }
}

function backupStatus() {
  try {
    // Newest by MTIME, not by name: a one-off like "nolimit_prod-preflight"
    // sorts after every dated dump and would make a healthy backup look 5
    // days stale. A monitor that cries wolf gets ignored.
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".sql.gz"))
      .map((f) => ({ f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (!files.length) return { ok: false, detail: "no backup files at all" };
    const newest = files[0].f;
    const ageH = (Date.now() - files[0].mtime) / 3600000;
    return {
      ok: ageH < 30,
      detail: `${newest} (${ageH.toFixed(0)}h old, ${files.length} kept)`,
    };
  } catch (e) {
    return { ok: false, detail: `cannot read ${BACKUP_DIR}: ${e.message}` };
  }
}

function diskAndMemory() {
  const disk = sh(`df -h / | awk 'NR==2{print $5" used ("$4" free)"}'`);
  const mem = sh(`free -m | awk '/Mem:/{print $7"MB available of "$2"MB"}'`);
  const pct = Number(String(disk).match(/(\d+)%/)?.[1] || 0);
  return { disk, mem, diskPct: pct };
}

/* -------------------------------- modes -------------------------------- */

async function watch() {
  const state = readState();
  const site = await probe(SITE + "/");
  const api = await probe(SITE + "/api/programs");
  const pm2 = pm2Restarts();

  const problems = [];
  if (!site.ok) problems.push(`the website is not responding (${site.status || site.error})`);
  if (!api.ok) problems.push(`the API is not responding (${api.status || api.error})`);
  if (pm2 && pm2.status !== "online") problems.push(`the app process is ${pm2.status}`);

  // A climbing restart counter between two checks means crash-looping.
  if (pm2 && state.lastRestarts != null && pm2.restarts - state.lastRestarts >= 3) {
    problems.push(
      `the app restarted ${pm2.restarts - state.lastRestarts} times in 5 minutes — it is crash-looping`
    );
  }

  const down = problems.length > 0;

  // Alert on transitions only: once when it breaks, once when it recovers.
  if (down && !state.down) {
    await notify(
      `🚨 NX LIMIT is having a problem\n\n` +
        problems.map((p) => `• ${p}`).join("\n") +
        `\n\nWhat to do: wait 5 minutes for the next check — it may recover on its own. ` +
        `If a second alert follows, run:\n` +
        `ssh nolimit "pm2 logs ${APP} --lines 40 --nostream"`
    );
  } else if (!down && state.down) {
    await notify(`✅ NX LIMIT is back to normal. Site and API are responding again.`);
  }

  writeState({ ...state, down, lastRestarts: pm2 ? pm2.restarts : state.lastRestarts });
  console.log(
    `[watch] site=${site.status}/${site.ms}ms api=${api.status}/${api.ms}ms ` +
      `pm2=${pm2 ? pm2.status : "?"} restarts=${pm2 ? pm2.restarts : "?"} down=${down}`
  );
}

async function report() {
  const since = Date.now() - 24 * 3600 * 1000;
  const site = await probe(SITE + "/");
  const api = await probe(SITE + "/api/programs");
  const pm2 = pm2Restarts();
  const tel = telemetrySince(since);
  const backup = backupStatus();
  const sys = diskAndMemory();

  const lines = [`☀️ NX LIMIT — morning check ${new Date().toISOString().slice(0, 10)}`, ""];

  const healthy =
    site.ok && api.ok && pm2?.status === "online" && backup.ok && sys.diskPct < 85;
  lines.push(healthy ? "Everything is running normally." : "⚠️ Needs your attention — see below.");
  lines.push("");

  lines.push(`Website: ${site.ok ? `up (${site.ms}ms)` : `DOWN (${site.status || site.error})`}`);
  lines.push(`API: ${api.ok ? `up (${api.ms}ms)` : `DOWN (${api.status || api.error})`}`);
  lines.push(`App process: ${pm2 ? pm2.status : "unknown"}`);
  lines.push(`Backup: ${backup.ok ? "ok" : "⚠️ PROBLEM"} — ${backup.detail}`);
  lines.push(`Disk: ${sys.disk}`);
  lines.push(`Memory: ${sys.mem}`);
  lines.push("");

  const athletes = await athleteDigest();
  if (athletes.length) {
    lines.push("Your athletes yesterday:");
    lines.push(...athletes);
    lines.push("");
  }

  if (tel.crashes.length) {
    lines.push("App crashes reported by clients (last 24h):");
    tel.crashes.forEach((c) => lines.push(`  • ${c}`));
    lines.push("");
  }
  if (tel.failures.length) {
    lines.push("Things that failed for clients (last 24h):");
    tel.failures.forEach((f) => lines.push(`  • ${f}`));
    lines.push("");
  }
  if (!tel.crashes.length && !tel.failures.length) {
    lines.push("No crashes or failed actions reported by any client. 👍");
    lines.push("");
  }

  const logins =
    (tel.funnel.login_phone_name || 0) + (tel.funnel.login_wechat_onetap || 0);
  lines.push(
    `Activity: ${logins} logins, ${tel.funnel.workout_saved || 0} workouts saved, ` +
      `${tel.funnel.coaching_order_created || 0} coaching orders started.`
  );

  if (!healthy) {
    lines.push("");
    lines.push('If something says DOWN, run:  ssh nolimit "pm2 restart nolimit-training"');
  }

  await notify(lines.join("\n"));
  console.log(lines.join("\n"));
}

(mode === "report" ? report() : watch()).catch((e) => {
  // Last resort: never exit non-zero in a way that hides the reason.
  console.error("healthCheck failed:", e?.message || e);
});
