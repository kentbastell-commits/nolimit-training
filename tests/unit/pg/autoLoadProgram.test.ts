// Ported from tests/unit/api/autoLoadProgram.test.ts. This is the step that
// turns a verified payment into a training calendar, so it is the last gate
// before someone gets what they paid for — and the gate that must not open
// for someone who hasn't.
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/autoLoadProgram.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";

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
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("400s without a clientRecordId", async () => {
    const res = await load({});
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
