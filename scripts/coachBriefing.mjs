#!/usr/bin/env node
// Kent's daily coach briefing → Feishu (same bot webhook as the ops report).
//
//   node --import tsx --env-file=.env scripts/coachBriefing.mjs          (build + send)
//   node --import tsx --env-file=.env scripts/coachBriefing.mjs --dry    (build + print, send nothing)
//
// Cron: 07:00 China time, before the 07:30 session reminders go out, so the
// "📲" marks show who will be nudged. The ops health report (06:00) is a
// separate message and no longer carries athlete lines — one door per job.
import { pool } from "../server/db/client.ts";
import { buildCoachBriefing } from "../server/coachBriefing.ts";

const DRY = process.argv.includes("--dry");

try {
  const text = await buildCoachBriefing();
  console.log(text);
  const webhook = process.env.FEISHU_BOT_WEBHOOK_URL || "";
  if (DRY) {
    console.log("[dry run — not sent]");
  } else if (!webhook) {
    console.log("[FEISHU_BOT_WEBHOOK_URL not set — not sent]");
  } else {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msg_type: "text", content: { text } }),
      signal: AbortSignal.timeout(20000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || (body.code && body.code !== 0)) {
      console.error("coach-briefing: Feishu rejected the message", res.status, JSON.stringify(body));
      process.exitCode = 1;
    } else {
      console.log("[sent]");
    }
  }
} catch (error) {
  console.error("coach-briefing failed:", error?.message || error);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
