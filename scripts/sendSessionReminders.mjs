#!/usr/bin/env node
// Morning "you have a session today" WeChat push (训练提醒 subscribe message).
//
//   node --import tsx --env-file=.env scripts/sendSessionReminders.mjs          (send)
//   node --import tsx --env-file=.env scripts/sendSessionReminders.mjs --dry    (list targets, send nothing)
//   node --import tsx --env-file=.env scripts/sendSessionReminders.mjs --list   (print the templates WeChat knows — verifies ids + field codes)
//   node --import tsx --env-file=.env scripts/sendSessionReminders.mjs --test CL-0001  (push today's reminder to ONE athlete now; still needs a banked grant)
//
// Runs from the server cron at 07:30 China time. Needs `--import tsx`
// because the sender lives in server/wechat/subscribe.ts and is shared
// with the coach-reply push, so there is exactly one WeChat send path.
//
// Safe-by-default: without WECHAT_MINI_APPID/SECRET it exits having sent
// nothing; every push consumes a grant the athlete tapped "allow" for, so
// nobody can be messaged who did not ask to be.
import { pool } from "../server/db/client.ts";
import { getMiniAccessToken } from "../server/wechat/miniPhone.ts";
import {
  SUBSCRIBE_TEMPLATES,
  isSubscribeConfigured,
  listSessionReminderTargets,
  pushToClient,
  sessionReminderValues,
} from "../server/wechat/subscribe.ts";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const LIST = args.includes("--list");
const TEST = args.includes("--test") ? String(args[args.indexOf("--test") + 1] || "") : "";

function chinaDayStartMs() {
  const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  return { today, dayStartMs: Date.parse(`${today}T00:00:00+08:00`) };
}

try {
  if (!isSubscribeConfigured()) {
    console.log("session-reminder: WECHAT_MINI_APPID/SECRET not set — nothing to do");
    process.exit(0);
  }

  if (LIST) {
    const token = await getMiniAccessToken();
    const res = await fetch(`https://api.weixin.qq.com/wxaapi/newtmpl/gettemplate?access_token=${encodeURIComponent(token)}`);
    const body = await res.json();
    if (body.errcode) {
      console.error("session-reminder: gettemplate failed", body.errcode, body.errmsg);
      process.exit(1);
    }
    for (const t of body.data || []) {
      const known = Object.entries(SUBSCRIBE_TEMPLATES).find(([, v]) => v.id === t.priTmplId);
      console.log(`${t.priTmplId}  ${t.title}  ${known ? `(code: ${known[0]}, expects ${known[1].fields.join("/")})` : "(not used by the app)"}`);
      console.log(`    ${String(t.content || "").replace(/\n/g, " | ")}`);
    }
    process.exit(0);
  }

  const { today, dayStartMs } = chinaDayStartMs();
  let targets = await listSessionReminderTargets(dayStartMs);
  if (TEST) {
    targets = targets.filter((t) => t.clientId === TEST);
    if (!targets.length) {
      console.log(`session-reminder: ${TEST} has no published uncompleted session today, no WeChat identity, or no banked grant — nothing to test`);
      process.exit(0);
    }
  }
  console.log(`session-reminder: ${targets.length} athlete(s) due on ${today}${DRY ? " (dry run)" : ""}`);
  for (const t of targets) console.log(`  ${t.clientId}  ${t.sessionName || t.sessionNameCn || "(unnamed session)"}`);
  if (DRY || !targets.length) process.exit(0);

  const tally = {};
  for (const t of targets) {
    const outcome = await pushToClient({ clientId: t.clientId, kind: "session", values: sessionReminderValues(t, dayStartMs) });
    tally[outcome] = (tally[outcome] || 0) + 1;
    console.log(`  ${t.clientId} → ${outcome}`);
  }
  console.log(`session-reminder: ${JSON.stringify(tally)}`);
  process.exit(0);
} finally {
  await pool.end().catch(() => {});
}
