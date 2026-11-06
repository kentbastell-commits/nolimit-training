// The coach's daily briefing (server/coachBriefing.ts): every section reads
// Postgres directly and must name the right athletes for the right reasons.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDb, seedClient, seedProgram } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";
import { buildCoachBriefing, needsYou, todaySessions, watchList, yesterday } from "../../../server/coachBriefing.ts";

const DAY = 86_400_000;
// 2026-11-07 07:00 China time.
const NOW = Date.parse("2026-11-07T07:00:00+08:00");
const TODAY = Date.parse("2026-11-07T00:00:00+08:00");
const YDAY = TODAY - DAY;

async function insert(table: string, values: Record<string, any>) {
  const keys = Object.keys(values);
  await pool.query(
    `insert into ${table} (${keys.map((k) => `"${k}"`).join(", ")}) values (${keys.map((_, i) => `$${i + 1}`).join(", ")})`,
    keys.map((k) => values[k])
  );
}
const workout = (v: Record<string, any>) => insert("assigned_workouts", { program_id: "PR-1001", is_draft: false, completion_status: "Scheduled", ...v });

beforeEach(async () => {
  await resetDb();
  await seedProgram({ program_id: "PR-1001", name: "Season 1" });
  await seedClient({ client_id: "CL-1", full_name: "Chen Cong", client_type: "Online Coaching" });
  await seedClient({ client_id: "CL-2", full_name: "Bob Tan", client_type: "In-Person Training" });
  await seedClient({ client_id: "CL-3", full_name: "Digital Dan", client_type: "Digital Program" });
});

afterAll(async () => {
  await closeDb();
});

describe("TODAY", () => {
  it("lists coached athletes' published sessions and marks who will get the push", async () => {
    await workout({ assigned_workout_id: "AW-1", client_id: "CL-1", scheduled_date: TODAY, session_name: "Upper Pull", day_order: 2 });
    await workout({ assigned_workout_id: "AW-2", client_id: "CL-1", scheduled_date: TODAY, session_name: "Warmup", day_order: 1 });
    await workout({ assigned_workout_id: "AW-3", client_id: "CL-2", scheduled_date: TODAY, session_name: "Run", completion_status: "Completed" });
    await workout({ assigned_workout_id: "AW-4", client_id: "CL-2", scheduled_date: TODAY + DAY, session_name: "Tomorrow" });
    await workout({ assigned_workout_id: "AW-5", client_id: "CL-1", scheduled_date: TODAY, session_name: "Secret draft", is_draft: true });
    await workout({ assigned_workout_id: "AW-6", client_id: "CL-3", scheduled_date: TODAY, session_name: "Digital day" });
    await insert("wx_subscribe_credits", { credit_id: "WXC-1", client_id: "CL-1", template_type: "session" });

    expect(await todaySessions(TODAY)).toEqual([
      "  • Bob Tan — Run ✓ already done",
      "  • Chen Cong — Warmup + Upper Pull 📲",
    ]);
  });
});

describe("NEEDS YOU", () => {
  it("counts videos, messages, tests, unloaded paid orders and open enquiries", async () => {
    await insert("form_videos", { video_id: "FV-1", client_id: "CL-1", status: "New", submitted_at: NOW - 12 * DAY });
    await insert("form_videos", { video_id: "FV-2", client_id: "CL-1", status: "New", submitted_at: NOW - DAY });
    await insert("form_videos", { video_id: "FV-3", client_id: "CL-2", status: "Reviewed", submitted_at: NOW - 20 * DAY });
    await insert("client_messages", { message_id: "MSG-1", client_id: "CL-2", body: "hi", status: "New", created_at: NOW - 3 * DAY });
    await insert("client_messages", { message_id: "MSG-2", client_id: "CL-1", body: "ok", status: "Replied", replied_at: NOW, created_at: NOW - 5 * DAY });
    await insert("assigned_tests", { assigned_test_id: "AT-1", client_id: "CL-1", completed_at: NOW - DAY });
    await insert("assigned_tests", { assigned_test_id: "AT-2", client_id: "CL-1", completed_at: NOW - DAY, reviewed_at: NOW });
    await insert("product_orders", { order_id: "ORD-1", client_id: "CL-3", product_name: "Finger Foundation", payment_status: "Paid", fulfillment_status: "New Order", paid_at: NOW - 2 * DAY });
    await insert("product_orders", { order_id: "ORD-2", client_id: "CL-3", product_name: "Old", payment_status: "Paid", fulfillment_status: "New Order", paid_at: NOW - 90 * DAY });
    await insert("product_orders", { order_id: "ORD-3", client_id: "CL-3", product_name: "Waiting on intake", payment_status: "Paid", fulfillment_status: "Intake Required", paid_at: NOW - DAY });
    await insert("product_orders", { order_id: "ORD-4", client_id: "CL-3", product_name: "Unpaid", payment_status: "Pending", fulfillment_status: "New Order", purchased_at: NOW - DAY });
    await insert("enquiries", { enquiry_id: "ENQ-1", contact_person: "Coach Li", organization: "Guangzhou Climb", status: "New" });
    await insert("enquiries", { enquiry_id: "ENQ-2", contact_person: "Done", status: "Closed" });

    expect(await needsYou(NOW)).toEqual([
      "  🎬 2 videos from 1 athlete waiting for feedback (oldest 12 days): Chen Cong 2",
      "  💬 1 message unanswered: Bob Tan (3 days)",
      "  🧪 1 test result to review",
      "  💳 1 paid order not loaded yet: Digital Dan — Finger Foundation (2 days)",
      "  📩 1 enquiry open: Coach Li / Guangzhou Climb",
    ]);
  });

  it("is empty when nothing is waiting", async () => {
    expect(await needsYou(NOW)).toEqual([]);
  });
});

describe("YESTERDAY", () => {
  it("shows trained vs missed with RPE and notes, and flags rough check-ins", async () => {
    await workout({ assigned_workout_id: "AW-1", client_id: "CL-1", scheduled_date: YDAY, session_name: "Pull Day", completion_status: "Completed", session_rpe: 8, client_notes: "felt strong" });
    await workout({ assigned_workout_id: "AW-2", client_id: "CL-2", scheduled_date: YDAY, session_name: "Run 5k" });
    await insert("check_ins", { checkin_id: "CI-1", client_id: "CL-1", submitted_date: YDAY, readiness_score: 38, problems_pain: "左肘", problems_pain_en: "left elbow" });
    await insert("check_ins", { checkin_id: "CI-2", client_id: "CL-2", submitted_date: YDAY, readiness_score: 80 });

    expect(await yesterday(YDAY, NOW)).toEqual([
      "  ✗ Bob Tan — missed Run 5k",
      "  ✓ Chen Cong — Pull Day (RPE 8, “felt strong”)",
      "  🩺 Chen Cong check-in — readiness 38, pain: “left elbow”",
    ]);
  });
});

describe("WATCH", () => {
  it("flags missed streaks, quiet athletes and renewals, not athletes on a rest week", async () => {
    // Chen: two sessions this week, both missed, last trained 9 days ago.
    await workout({ assigned_workout_id: "AW-1", client_id: "CL-1", scheduled_date: TODAY - 9 * DAY, session_name: "Old", completion_status: "Completed" });
    await workout({ assigned_workout_id: "AW-2", client_id: "CL-1", scheduled_date: TODAY - 4 * DAY, session_name: "A" });
    await workout({ assigned_workout_id: "AW-3", client_id: "CL-1", scheduled_date: TODAY - 2 * DAY, session_name: "B" });
    // Bob: nothing scheduled, no activity for 12 days → quiet.
    await insert("check_ins", { checkin_id: "CI-1", client_id: "CL-2", submitted_date: NOW - 12 * DAY });
    // Mei: rest week (nothing scheduled) but logged in yesterday → not flagged.
    await seedClient({ client_id: "CL-4", full_name: "Mei Lin", client_type: "Online Coaching", last_login: NOW - DAY });
    await insert("subscriptions", { subscription_id: "SUB-1", client_id: "CL-4", plan: "Online Coaching", status: "Active", next_billing_date: TODAY + 3 * DAY });
    await insert("subscriptions", { subscription_id: "SUB-2", client_id: "CL-1", plan: "Online Coaching", status: "Cancelled", next_billing_date: TODAY + DAY });

    expect(await watchList(TODAY, NOW)).toEqual([
      "  💤 Bob Tan — no activity for 12 days",
      "  ⚠️ Chen Cong — missed 2 sessions this week (last trained 9 days ago)",
      "  💰 Mei Lin — Online Coaching renewal due 2026-11-10",
    ]);
  });
});

describe("buildCoachBriefing", () => {
  it("assembles the message with the quiet-day placeholders", async () => {
    const text = await buildCoachBriefing(NOW);
    expect(text).toContain("🏋️ Coach briefing — Sat 2026-11-07");
    expect(text).toContain("TODAY\n  No sessions scheduled.");
    expect(text).toContain("NEEDS YOU\n  Nothing waiting on you. 👍");
    expect(text).toContain("YESTERDAY (2026-11-06)\n  No sessions were scheduled.");
    // Three coached-or-not athletes with no activity at all: two coached → WATCH lists them.
    expect(text).toContain("WATCH\n  💤 Bob Tan — no activity for as long as we have records");
    expect(text).not.toContain("Digital Dan");
  });
});
