// Ported from tests/unit/api/autoLoadProgram.test.ts. This is the step that
// turns a verified payment into a training calendar, so it is the last gate
// before someone gets what they paid for — and the gate that must not open
// for someone who hasn't.
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/autoLoadProgram.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";
import { epochToDate } from "../../../server/db/pg/_util.ts";

beforeEach(async () => {
  await resetDb();
  vi.unstubAllEnvs();
  vi.stubEnv("FEISHU_BOT_WEBHOOK_URL", "");
});

afterAll(async () => {
  await closeDb();
});

async function seedOrder(overrides: Record<string, any> = {}) {
  const values = {
    order_id: "ORD-0001",
    client_id: "CL-9001",
    client_name: "Bob Tan",
    program_id: "PR-1001",
    product_name: "Test Program",
    payment_status: "Paid",
    fulfillment_status: "Pending",
    payment_reference: "NL-2B3C",
    ...overrides,
  };
  const keys = Object.keys(values);
  await pool.query(
    `insert into product_orders (${keys.map((k) => `"${k}"`).join(", ")})
     values (${keys.map((_, i) => `$${i + 1}`).join(", ")})`,
    Object.values(values)
  );
}

async function seedTemplates(count = 3) {
  for (let i = 1; i <= count; i++) {
    await pool.query(
      `insert into workout_templates
         (template_id, program_id, week, day, session_name, session_type, exercise_name, exercise_order, sets, reps)
       values ($1, 'PR-1001', 1, $2, $3, 'Strength', 'Back Squat', 1, 3, '5')`,
      [`WT-${i}`, i, `Session ${i}`]
    );
  }
}

async function load(body: Record<string, any>) {
  const res = makeRes();
  await handler(makeReq({ method: "POST", body }) as any, res as any);
  return res;
}

describe("api/autoLoadProgram (postgres)", () => {
  it("schedules bundle phases sequentially and an independent add-on in parallel", async () => {
    await seedClient();
    await seedProgram({ program_id: "BUNDLE", bundle_program_ids: "PR-1001,PR-1002" });
    await seedProgram({ duration_weeks: 4 });
    await seedProgram({ program_id: "PR-1002", duration_weeks: 3 });
    await seedProgram({ program_id: "ADDON", duration_weeks: 2 });
    await seedTemplates(1);
    await pool.query("insert into workout_templates (template_id, program_id, week, day, session_name) values ('PHASE2', 'PR-1002', 1, 1, 'Second phase'), ('ADDT', 'ADDON', 1, 1, 'Mobility')");
    await seedOrder();
    await seedOrder({ order_id: "ORD-2", program_id: "PR-1002" });
    await seedOrder({ order_id: "ORD-B", program_id: "BUNDLE" });
    await seedOrder({ order_id: "ORD-A", program_id: "ADDON" });
    const res = await load({ clientRecordId: "CL-9001", startDate: "2026-09-14" });
    expect(res.statusCode).toBe(200);
    const calendar = await rows("select program_id, scheduled_date from assigned_workouts");
    expect(calendar).toHaveLength(3);
    expect(epochToDate(Number(calendar.find((r) => r.program_id === "PR-1002").scheduled_date))).toBe("2026-10-12");
    expect(epochToDate(Number(calendar.find((r) => r.program_id === "ADDON").scheduled_date))).toBe("2026-09-14");
    expect((await rows("select fulfillment_status from product_orders")).every((r) => r.fulfillment_status === "Program Loaded")).toBe(true);
  });

  it("keeps the chosen China date and places all five training days inside each week", async () => {
    await seedClient(); await seedProgram(); await seedTemplates(5); await seedOrder();
    expect((await load({ clientRecordId: "CL-9001", startDate: "2026-09-14" })).statusCode).toBe(200);
    const dates = (await rows("select scheduled_date from assigned_workouts order by scheduled_date"))
      .map((r) => epochToDate(Number(r.scheduled_date)));
    expect(dates).toEqual(["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-18", "2026-09-19"]);
  });

  it("creates a test assignment for a test day, alongside the workout", async () => {
    await seedClient(); await seedProgram(); await seedTemplates(2); await seedOrder();
    await pool.query("insert into test_templates (test_template_id, name) values ('TT-AUDIT', 'Jump assessment')");
    await pool.query("update workout_templates set test_template_id = 'TT-AUDIT' where template_id = 'WT-2'");
    const res = await load({ clientRecordId: "CL-9001", startDate: "2026-09-14" });
    expect(res.body.testsCreated).toBe(1);
    expect(await rows("select 1 from assigned_workouts")).toHaveLength(1);
    expect(await rows("select 1 from assigned_tests")).toHaveLength(1);
  });

  it("serializes concurrent activations for one athlete", async () => {
    await seedClient(); await seedProgram(); await seedTemplates(); await seedOrder();
    const responses = await Promise.all(Array.from({ length: 5 }, () => load({ clientRecordId: "CL-9001", startDate: "2026-09-14" })));
    expect(responses.every((r) => r.statusCode === 200)).toBe(true);
    expect(responses.filter((r) => r.body.alreadyLoaded)).toHaveLength(4);
    expect(await rows("select 1 from assigned_workouts")).toHaveLength(3);
  });

  it("rolls back calendar and access changes if the order stamp fails", async () => {
    await seedClient(); await seedProgram(); await seedTemplates(); await seedOrder();
    await pool.query(`create or replace function audit_fail_delivery() returns trigger language plpgsql as $$ begin raise exception 'injected order failure'; end $$`);
    await pool.query("create trigger audit_fail_delivery before update on product_orders for each row execute function audit_fail_delivery()");
    try {
      expect((await load({ clientRecordId: "CL-9001", startDate: "2026-09-14" })).statusCode).toBe(500);
      expect(await rows("select 1 from assigned_workouts")).toHaveLength(0);
      expect((await rows("select access_start_date from clients"))[0].access_start_date).toBeNull();
    } finally {
      await pool.query("drop trigger audit_fail_delivery on product_orders");
      await pool.query("drop function audit_fail_delivery()");
    }
    expect((await load({ clientRecordId: "CL-9001", startDate: "2026-09-14" })).statusCode).toBe(200);
    expect(await rows("select 1 from assigned_workouts")).toHaveLength(3);
  });

  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("400s without a clientRecordId", async () => {
    const res = await load({});
    expect(res.statusCode).toBe(400);
  });

  it("400s on a request with no body at all, rather than throwing", async () => {
    // Seen in production on 2026-07-24: an empty body made the destructure
    // throw out of the handler, so the caller got a 500 with a stack trace
    // instead of the 400 the validation was there to give them.
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: undefined }) as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it("404s for an unknown client", async () => {
    const res = await load({ clientRecordId: "CL-NOPE" });
    expect(res.statusCode).toBe(404);
  });

  it("reports alreadyLoaded when there is nothing pending", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });

    const res = await load({ clientRecordId: "CL-9001" });
    expect(res.statusCode).toBe(200);
    expect(res.body.alreadyLoaded).toBe(true);
  });

  it("402s and builds nothing while payment is unverified", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    await seedTemplates();
    await seedOrder({ payment_status: "Pending" });

    const res = await load({ clientRecordId: "CL-9001" });

    // #22: a buyer's claim is not authorization. Nothing unlocks until a
    // coach has matched the WeChat transfer.
    expect(res.statusCode).toBe(402);
    expect(res.body.paymentReferences).toContain("NL-2B3C");
    expect(await rows("select 1 from assigned_workouts")).toHaveLength(0);
  });

  it("does not treat 'Unpaid' as paid", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    await seedTemplates();
    await seedOrder({ payment_status: "Unpaid" });

    // The original bug was a substring check — "Unpaid".includes("paid") is
    // true, so the calendar unlocked for people who had not paid.
    const res = await load({ clientRecordId: "CL-9001" });
    expect(res.statusCode).toBe(402);
    expect(await rows("select 1 from assigned_workouts")).toHaveLength(0);
  });

  it("builds the calendar once payment is verified and marks the order loaded", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    await seedTemplates(3);
    await seedOrder({ payment_status: "Paid" });

    const res = await load({ clientRecordId: "CL-9001", startDate: "2026-08-03" });
    expect(res.statusCode).toBe(200);

    const workouts = await rows(
      "select assigned_workout_id, client_id, program_id, session_name from assigned_workouts"
    );
    expect(workouts).toHaveLength(3);
    expect(workouts.every((w) => w.client_id === "CL-9001")).toBe(true);
    expect(workouts.every((w) => w.program_id === "PR-1001")).toBe(true);

    // The order must be stamped, or the next call would build the calendar
    // a second time.
    const [order] = await rows("select fulfillment_status from product_orders");
    expect(String(order.fulfillment_status).toLowerCase()).toContain("loaded");
  });

  it("is safe to re-run — a second call does not double the calendar", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    await seedTemplates(3);
    await seedOrder({ payment_status: "Paid" });

    await load({ clientRecordId: "CL-9001", startDate: "2026-08-03" });
    const second = await load({ clientRecordId: "CL-9001", startDate: "2026-08-03" });

    expect(second.statusCode).toBe(200);
    expect(second.body.alreadyLoaded).toBe(true);
    expect(await rows("select 1 from assigned_workouts")).toHaveLength(3);
  });

  it("fails loudly when a paid program has no sessions to load", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    await seedOrder({ payment_status: "Paid" }); // no templates seeded

    const res = await load({ clientRecordId: "CL-9001" });

    // Someone has paid and there is nothing to give them. A 200 here would
    // leave the athlete staring at an empty calendar with no one alerted;
    // the 500 also fires the coach notification.
    expect(res.statusCode).toBe(500);
    expect(res.body.failures.join(" ")).toMatch(/no workout sessions/i);
    expect(await rows("select 1 from assigned_workouts")).toHaveLength(0);
  });
});
