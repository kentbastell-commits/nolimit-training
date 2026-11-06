// The coach's daily briefing: one Feishu message every morning that says
// what needs Kent today, what his athletes did yesterday, and who is
// drifting — so he stops opening every athlete to find out who needs him.
//
// Reads Postgres directly (no API hop, no coach key) so it cannot regress
// the way the old API-driven digest did (CLAUDE.md #49: an unfiltered
// endpoint made every athlete line identical for months). Every section is
// independent: a failing query degrades to one "(could not load)" line.
//
// Run by scripts/coachBriefing.mjs from the 07:00 China-time cron.
import { pool } from "./db/client.ts";
import { dayStartMs, epochToDate } from "./db/pg/_util.ts";

const DAY = 24 * 3600 * 1000;
// "Coached" = someone Kent is actively programming for, same regex the
// rest of the platform uses for the premium tier.
const COACHED = `c.client_type ~* 'online coaching|in[- ]?person'`;

type Row = Record<string, any>;
const q = async (sql: string, params: unknown[] = []): Promise<Row[]> => (await pool.query(sql, params)).rows;
const name = (r: Row) => String(r.full_name || r.client_name || r.client_id || "?").trim();
const session = (r: Row) => String(r.session_name || r.session_name_cn || "session").trim();
const days = (ms: number, now: number) => Math.max(0, Math.floor((now - ms) / DAY));
const ago = (ms: number, now: number) => { const d = days(ms, now); return d === 0 ? "today" : d === 1 ? "1 day" : `${d} days`; };
const clip = (s: unknown, n = 80) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

async function section(title: string, fn: () => Promise<string[]>, empty?: string): Promise<string[]> {
  let lines: string[];
  try {
    lines = await fn();
  } catch (error: any) {
    lines = [`  (could not load: ${clip(error?.message || error, 60)})`];
  }
  if (!lines.length) {
    if (!empty) return [];
    lines = [`  ${empty}`];
  }
  return [title, ...lines, ""];
}

export async function todaySessions(todayMs: number): Promise<string[]> {
  const rows = await q(
    `select c.full_name, c.client_id, w.session_name, w.session_name_cn, w.completion_status,
            exists (select 1 from wx_subscribe_credits x where x.client_id = c.client_id and x.template_type = 'session' and x.used_at is null) as push
       from assigned_workouts w join clients c on c.client_id = w.client_id
      where w.is_draft = false and w.scheduled_date >= $1 and w.scheduled_date < $2 and ${COACHED}
      order by c.full_name, w.day_order asc nulls last, w.assigned_workout_id`,
    [todayMs, todayMs + DAY]
  );
  const byClient = new Map<string, { sessions: string[]; push: boolean; done: boolean }>();
  for (const r of rows) {
    const key = name(r);
    const cur = byClient.get(key) || { sessions: [], push: Boolean(r.push), done: true };
    cur.sessions.push(session(r));
    cur.done = cur.done && /completed/i.test(String(r.completion_status || ""));
    byClient.set(key, cur);
  }
  return [...byClient.entries()].map(([who, v]) =>
    `  • ${who} — ${v.sessions.join(" + ")}${v.done ? " ✓ already done" : v.push ? " 📲" : ""}`);
}

export async function needsYou(now: number): Promise<string[]> {
  const out: string[] = [];

  const videos = await q(
    `select coalesce(c.full_name, v.client_name, v.client_id) as full_name, count(*)::int as n, min(v.submitted_at)::bigint as oldest
       from form_videos v left join clients c on c.client_id = v.client_id
      where coalesce(v.status, '') <> 'Reviewed' group by 1 order by 2 desc`);
  if (videos.length) {
    const total = videos.reduce((s, r) => s + Number(r.n), 0);
    const oldest = Math.min(...videos.map((r) => Number(r.oldest) || now));
    out.push(`  🎬 ${plural(total, "video")} from ${plural(videos.length, "athlete")} waiting for feedback (oldest ${ago(oldest, now)}): ` +
      videos.slice(0, 5).map((r) => `${name(r)} ${r.n}`).join(", ") + (videos.length > 5 ? ", …" : ""));
  }

  const messages = await q(
    `select coalesce(c.full_name, m.client_name, m.client_id) as full_name, count(*)::int as n, min(m.created_at)::bigint as oldest
       from client_messages m left join clients c on c.client_id = m.client_id
      where coalesce(m.status, 'New') <> 'Replied' and m.replied_at is null group by 1 order by 3`);
  if (messages.length) {
    const total = messages.reduce((s, r) => s + Number(r.n), 0);
    out.push(`  💬 ${plural(total, "message")} unanswered: ` +
      messages.slice(0, 5).map((r) => `${name(r)} (${ago(Number(r.oldest), now)})`).join(", "));
  }

  const tests = await q(
    `select count(*)::int as n from assigned_tests where completed_at is not null and reviewed_at is null and is_draft = false`);
  if (Number(tests[0]?.n) > 0) out.push(`  🧪 ${plural(Number(tests[0].n), "test result")} to review`);

  const orders = await q(
    `select coalesce(c.full_name, o.client_name, o.client_id) as full_name, o.product_name, coalesce(o.paid_at, o.purchased_at)::bigint as at
       from product_orders o left join clients c on c.client_id = o.client_id
      where o.payment_status = 'Paid'
        and coalesce(o.fulfillment_status, '') not in ('Program Loaded', 'Intake Required')
        and coalesce(o.paid_at, o.purchased_at) >= $1
      order by 3`, [now - 30 * DAY]);
  if (orders.length) {
    out.push(`  💳 ${plural(orders.length, "paid order")} not loaded yet: ` +
      orders.slice(0, 5).map((r) => `${name(r)} — ${clip(r.product_name, 30)} (${ago(Number(r.at), now)})`).join("; "));
  }

  const enquiries = await q(
    `select contact_person, organization from enquiries where coalesce(status, 'New') = 'New' order by enquiry_id desc limit 5`);
  if (enquiries.length) {
    out.push(`  📩 ${plural(enquiries.length, "enquiry", "enquiries")} open: ` +
      enquiries.map((r) => clip([r.contact_person, r.organization].filter(Boolean).join(" / "), 40) || "(no name)").join(", "));
  }
  return out;
}

export async function yesterday(yMs: number, now: number): Promise<string[]> {
  const workouts = await q(
    `select c.full_name, w.session_name, w.session_name_cn, w.completion_status, w.session_rpe, w.client_notes
       from assigned_workouts w join clients c on c.client_id = w.client_id
      where w.is_draft = false and w.scheduled_date >= $1 and w.scheduled_date < $2 and ${COACHED}
      order by c.full_name, w.day_order asc nulls last`, [yMs, yMs + DAY]);
  const lines: string[] = [];
  for (const r of workouts) {
    const done = /completed/i.test(String(r.completion_status || ""));
    const extras = [r.session_rpe != null ? `RPE ${Number(r.session_rpe)}` : "", r.client_notes ? `“${clip(r.client_notes, 70)}”` : ""].filter(Boolean);
    lines.push(done
      ? `  ✓ ${name(r)} — ${session(r)}${extras.length ? ` (${extras.join(", ")})` : ""}`
      : `  ✗ ${name(r)} — missed ${session(r)}`);
  }
  const checkins = await q(
    `select coalesce(c.full_name, ci.client_name, ci.client_id) as full_name, ci.readiness_score, ci.problems_pain, ci.problems_pain_en, ci.sleep_hours
       from check_ins ci left join clients c on c.client_id = ci.client_id
      where ci.submitted_date >= $1 and ci.submitted_date < $2
        and (ci.readiness_score < 50 or coalesce(ci.problems_pain, '') <> '')
      order by ci.readiness_score nulls last`, [yMs, now]);
  for (const r of checkins) {
    const bits = [r.readiness_score != null ? `readiness ${Math.round(Number(r.readiness_score))}` : "",
      r.problems_pain ? `pain: “${clip(r.problems_pain_en || r.problems_pain, 70)}”` : ""].filter(Boolean);
    lines.push(`  🩺 ${name(r)} check-in — ${bits.join(", ")}`);
  }
  return lines;
}

export async function watchList(todayMs: number, now: number): Promise<string[]> {
  const rows = await q(
    `select c.client_id, c.full_name,
            (select max(scheduled_date) from assigned_workouts w where w.client_id = c.client_id and w.is_draft = false and w.completion_status = 'Completed' and w.scheduled_date < $1)::bigint as last_trained,
            (select count(*) from assigned_workouts w where w.client_id = c.client_id and w.is_draft = false and w.scheduled_date >= $2 and w.scheduled_date < $1 and coalesce(w.completion_status, '') <> 'Completed')::int as missed_recent,
            (select count(*) from assigned_workouts w where w.client_id = c.client_id and w.is_draft = false and w.scheduled_date >= $2 and w.scheduled_date < $1 and w.completion_status = 'Completed')::int as done_recent,
            greatest(
              (select max(scheduled_date) from assigned_workouts w where w.client_id = c.client_id and w.completion_status = 'Completed' and w.scheduled_date < $1),
              (select max(submitted_date) from check_ins ci where ci.client_id = c.client_id),
              (select max(submitted_at) from form_videos v where v.client_id = c.client_id),
              (select max(created_at) from client_messages m where m.client_id = c.client_id),
              c.last_login
            )::bigint as last_activity
       from clients c where ${COACHED} order by c.full_name`, [todayMs, todayMs - 7 * DAY]);
  const lines: string[] = [];
  for (const r of rows) {
    const missed = Number(r.missed_recent), done = Number(r.done_recent);
    if (missed >= 2 && done === 0) {
      const last = Number(r.last_trained);
      lines.push(`  ⚠️ ${name(r)} — missed ${plural(missed, "session")} this week` + (last ? ` (last trained ${ago(last, now)} ago)` : " (never logged a session)"));
    } else if (!r.last_activity || now - Number(r.last_activity) >= 7 * DAY) {
      lines.push(`  💤 ${name(r)} — no activity for ${r.last_activity ? ago(Number(r.last_activity), now) : "as long as we have records"}`);
    }
  }
  const renewals = await q(
    `select coalesce(c.full_name, s.client_id) as full_name, s.plan, s.next_billing_date::bigint as due
       from subscriptions s left join clients c on c.client_id = s.client_id
      where coalesce(s.status, 'Active') = 'Active' and s.next_billing_date is not null and s.next_billing_date < $1
      order by s.next_billing_date`, [todayMs + 7 * DAY]);
  for (const r of renewals) {
    const due = Number(r.due);
    lines.push(`  💰 ${name(r)} — ${clip(r.plan, 30) || "subscription"} renewal ${due < todayMs ? `was due ${epochToDate(due)}` : `due ${epochToDate(due)}`}`);
  }
  return lines;
}

export async function buildCoachBriefing(now = Date.now()): Promise<string> {
  const todayKey = epochToDate(now);
  const todayMs = dayStartMs(todayKey);
  const yMs = todayMs - DAY;
  const weekday = new Date(todayMs + 12 * 3600 * 1000).toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Shanghai" });
  const lines = [`🏋️ Coach briefing — ${weekday} ${todayKey}`, ""];
  lines.push(...(await section("TODAY", () => todaySessions(todayMs), "No sessions scheduled.")));
  lines.push(...(await section("NEEDS YOU", () => needsYou(now), "Nothing waiting on you. 👍")));
  lines.push(...(await section(`YESTERDAY (${epochToDate(yMs)})`, () => yesterday(yMs, now), "No sessions were scheduled.")));
  lines.push(...(await section("WATCH", () => watchList(todayMs, now))));
  lines.push("📲 = will get the 07:30 WeChat reminder (they allowed it in the mini program).");
  return lines.join("\n").trimEnd() + "\n";
}
