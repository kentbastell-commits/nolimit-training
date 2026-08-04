// Ported from tests/unit/api/{shiftAssignedWorkouts,updateAssignedProgramDate,
// duplicateAssignedWorkout}.test.ts. These back the athlete's own rescheduling
// (the mini program's replan sheet and the portal calendar), so the property
// that matters most is that a bulk shift never touches sessions the athlete
// has already completed — that would rewrite training history.
//
// NOTE ON DATES: every writer now converts "YYYY-MM-DD" through
// dayStartMs() — the start of that day in China time, the exact inverse of
// epochToDate. Assertions are expressed as deltas wherever possible so they
// test behaviour rather than the machine's timezone.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import shiftHandler from "../../../api/shiftAssignedWorkouts.ts";
import updateDateHandler from "../../../api/updateAssignedProgramDate.ts";
import duplicateHandler from "../../../api/duplicateAssignedWorkout.ts";
import reorderHandler from "../../../api/reorderAssignedWorkouts.ts";
import workoutsHandler from "../../../api/workouts.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";

const DAY = 86400000;
/** Plain UTC midnight — used only to seed rows at a known instant. */
const utcMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
/** The canonical stored value for a date: the start of that day in China time. */
const dayStart = (date: string) => Date.parse(`${date}T00:00:00Z`) - 8 * 3600 * 1000;

beforeEach(async () => {
  await resetDb();
  await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });
});

afterAll(async () => {
  await closeDb();
});

async function seedWorkout(id: string, at: number, overrides: Record<string, any> = {}) {
  const values = {
    assigned_workout_id: id,
    client_id: "CL-9001",
    session_name: `Session ${id}`,
    scheduled_date: at,
    completion_status: "Scheduled",
    week: 1,
    day: 1,
    ...overrides,
  };
  const keys = Object.keys(values);
  await pool.query(
    `insert into assigned_workouts (${keys.map((k) => `"${k}"`).join(", ")})
     values (${keys.map((_, i) => `$${i + 1}`).join(", ")})`,
    Object.values(values)
  );
}

async function post(handler: any, body: Record<string, any>) {
  const res = makeRes();
  await handler(makeReq({ method: "POST", body }) as any, res as any);
  return res;
}

/** Scheduled epoch by workout id. */
async function dates(): Promise<Record<string, number>> {
  const found = await rows("select assigned_workout_id, scheduled_date from assigned_workouts");
  return Object.fromEntries(found.map((r) => [r.assigned_workout_id, Number(r.scheduled_date)]));
}

describe("api/reorderAssignedWorkouts (postgres)", () => {
  async function get(handler: any, query: Record<string, any>) {
    const res = makeRes();
    await handler(makeReq({ method: "GET", query }) as any, res as any);
    return res;
  }

  it("rejects non-POST with 405 and 400s on empty/malformed orders", async () => {
    const res = makeRes();
    await reorderHandler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect((await post(reorderHandler, {})).statusCode).toBe(400);
    expect((await post(reorderHandler, { orders: [] })).statusCode).toBe(400);
    expect(
      (await post(reorderHandler, { orders: [{ assignedWorkoutId: "AW-1" }] }))
        .statusCode
    ).toBe(400);
  });

  it("persists the coach's within-day order and the list honors it", async () => {
    // Two workouts on the same date; API order starts as AW id order.
    const at = dayStart("2026-08-06");
    await seedWorkout("AW-1", at, { session_name: "Activation" });
    await seedWorkout("AW-2", at, { session_name: "Warmup" });

    // Coach drags Warmup above Activation.
    const res = await post(reorderHandler, {
      orders: [
        { assignedWorkoutId: "AW-2", dayOrder: 1 },
        { assignedWorkoutId: "AW-1", dayOrder: 2 },
      ],
    });
    expect(res.statusCode).toBe(200);

    // The workouts list — what the portal and mini program consume — must
    // return the coach's order, Warmup first.
    const list = await get(workoutsHandler, { clientCode: "CL-9001" });
    expect(
      list.body.workouts.map((w: any) => w.assignedWorkoutId)
    ).toEqual(["AW-2", "AW-1"]);
  });

  it("sorts unordered rows after deliberately placed ones", async () => {
    const at = dayStart("2026-08-06");
    await seedWorkout("AW-1", at, { session_name: "Placed", day_order: 1 });
    await seedWorkout("AW-0", at, { session_name: "Fresh assign" }); // no order

    const list = await (async () => {
      const res = makeRes();
      await workoutsHandler(
        makeReq({ method: "GET", query: { clientCode: "CL-9001" } }) as any,
        res as any
      );
      return res;
    })();
    expect(
      list.body.workouts.map((w: any) => w.assignedWorkoutId)
    ).toEqual(["AW-1", "AW-0"]);
  });
});

describe("api/shiftAssignedWorkouts (postgres)", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await shiftHandler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("400s on a missing client or date", async () => {
    expect((await post(shiftHandler, { days: 3 })).statusCode).toBe(400);
    expect((await post(shiftHandler, { clientCode: "CL-9001", days: 3 })).statusCode).toBe(400);
  });

  it("400s on a malformed fromDate", async () => {
    const res = await post(shiftHandler, {
      clientCode: "CL-9001",
      fromDate: "03/08/2026",
      days: 3,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("fromDate must be YYYY-MM-DD");
  });

  it("400s on a zero or out-of-range shift", async () => {
    const base = { clientCode: "CL-9001", fromDate: "2026-08-03" };
    expect((await post(shiftHandler, { ...base, days: 0 })).statusCode).toBe(400);
    expect((await post(shiftHandler, { ...base, days: 31 })).statusCode).toBe(400);
    expect((await post(shiftHandler, { ...base, days: 1.5 })).statusCode).toBe(400);
  });

  it("moves the session on the from-date itself, however it was written", async () => {
    // The bug this pins: writers used two different date conversions. A
    // calendar built by autoLoadProgram stored China-midnight while the shift
    // boundary computed UTC-midnight, which on the production (UTC+8) server
    // put the stored value 8 hours BEFORE the boundary. "Move everything from
    // 3 August" then silently skipped 3 August's own session — the first one
    // the athlete was trying to move.
    const chinaMidnight = Date.parse("2026-08-03T00:00:00Z") - 8 * 3600 * 1000;
    const utcMidnight = Date.parse("2026-08-03T00:00:00Z");
    await seedWorkout("AW-china", chinaMidnight);
    await seedWorkout("AW-utc", utcMidnight);

    const res = await post(shiftHandler, {
      clientCode: "CL-9001",
      fromDate: "2026-08-03",
      days: 7,
    });
    expect(res.statusCode).toBe(200);

    const after = await dates();
    // Both representations of "3 August" must move.
    expect(after["AW-china"] - chinaMidnight).toBe(7 * DAY);
    expect(after["AW-utc"] - utcMidnight).toBe(7 * DAY);
  });

  it("moves every later session by exactly the requested number of days", async () => {
    const a = utcMs("2026-08-03");
    const b = utcMs("2026-08-05");
    await seedWorkout("AW-1", a);
    await seedWorkout("AW-2", b);

    const res = await post(shiftHandler, {
      clientCode: "CL-9001",
      fromDate: "2026-08-03",
      days: 7,
    });
    expect(res.statusCode).toBe(200);

    const after = await dates();
    expect(after["AW-1"] - a).toBe(7 * DAY);
    expect(after["AW-2"] - b).toBe(7 * DAY);
  });

  it("shifts backwards on a negative delta", async () => {
    const a = utcMs("2026-08-10");
    await seedWorkout("AW-1", a);

    await post(shiftHandler, { clientCode: "CL-9001", fromDate: "2026-08-03", days: -3 });

    expect((await dates())["AW-1"] - a).toBe(-3 * DAY);
  });

  it("leaves sessions before fromDate alone", async () => {
    const before = utcMs("2026-08-01");
    const after = utcMs("2026-08-05");
    await seedWorkout("AW-1", before);
    await seedWorkout("AW-2", after);

    await post(shiftHandler, { clientCode: "CL-9001", fromDate: "2026-08-03", days: 7 });

    const now = await dates();
    expect(now["AW-1"]).toBe(before); // untouched
    expect(now["AW-2"] - after).toBe(7 * DAY);
  });

  it("never moves a completed session", async () => {
    const done = utcMs("2026-08-03");
    const todo = utcMs("2026-08-04");
    await seedWorkout("AW-1", done, { completion_status: "Completed" });
    await seedWorkout("AW-2", todo);

    await post(shiftHandler, { clientCode: "CL-9001", fromDate: "2026-08-03", days: 7 });

    const now = await dates();
    // Moving a finished session would rewrite the athlete's training history
    // and desync it from the logs already attached to that date.
    expect(now["AW-1"]).toBe(done);
    expect(now["AW-2"] - todo).toBe(7 * DAY);
  });

  it("moves a completed session only when explicitly asked", async () => {
    const done = utcMs("2026-08-03");
    await seedWorkout("AW-1", done, { completion_status: "Completed" });

    await post(shiftHandler, {
      clientCode: "CL-9001",
      fromDate: "2026-08-03",
      days: 7,
      includeCompleted: true,
    });

    expect((await dates())["AW-1"] - done).toBe(7 * DAY);
  });

  it("does not touch another athlete's calendar", async () => {
    await seedClient({ client_id: "CL-9002", full_name: "Mei Lin" });
    const mine = utcMs("2026-08-03");
    const theirs = utcMs("2026-08-03");
    await seedWorkout("AW-1", mine);
    await seedWorkout("AW-2", theirs, { client_id: "CL-9002" });

    await post(shiftHandler, { clientCode: "CL-9001", fromDate: "2026-08-03", days: 7 });

    const now = await dates();
    expect(now["AW-1"] - mine).toBe(7 * DAY);
    expect(now["AW-2"]).toBe(theirs);
  });
});

describe("api/updateAssignedProgramDate (postgres)", () => {
  it("400s without an id or a date", async () => {
    expect((await post(updateDateHandler, { scheduledDate: "2026-08-05" })).statusCode).toBe(400);
    expect((await post(updateDateHandler, { assignedWorkoutId: "AW-1" })).statusCode).toBe(400);
  });

  it("moves a single session and leaves its neighbour alone", async () => {
    const neighbour = utcMs("2026-08-05");
    await seedWorkout("AW-1", utcMs("2026-08-03"));
    await seedWorkout("AW-2", neighbour);

    const res = await post(updateDateHandler, {
      assignedWorkoutId: "AW-1",
      scheduledDate: "2026-08-06",
    });
    expect(res.statusCode).toBe(200);

    const now = await dates();
    // One convention now: every writer stores the start of the China day, the
    // exact inverse of how epochToDate renders it back.
    expect(now["AW-1"]).toBe(dayStart("2026-08-06"));
    expect(now["AW-2"]).toBe(neighbour);
  });
});

describe("api/duplicateAssignedWorkout (postgres)", () => {
  it("400s without an id or a date", async () => {
    expect((await post(duplicateHandler, { scheduledDate: "2026-08-05" })).statusCode).toBe(400);
    expect((await post(duplicateHandler, { assignedWorkoutRecordId: "AW-1" })).statusCode).toBe(400);
  });

  it("copies a session to a new date, leaving the original in place", async () => {
    const original = utcMs("2026-08-03");
    await seedWorkout("AW-1", original, { session_name: "Lower Body" });

    const res = await post(duplicateHandler, {
      assignedWorkoutRecordId: "AW-1",
      scheduledDate: "2026-08-06",
    });
    expect(res.statusCode).toBe(200);

    const after = await rows(
      "select assigned_workout_id, session_name, scheduled_date, completion_status from assigned_workouts"
    );
    expect(after).toHaveLength(2);

    const source = after.find((r) => r.assigned_workout_id === "AW-1")!;
    const copy = after.find((r) => r.assigned_workout_id !== "AW-1")!;
    expect(Number(source.scheduled_date)).toBe(original);
    expect(copy.session_name).toBe("Lower Body");
    // A copy is new work, so it must not inherit a completed state.
    expect(String(copy.completion_status || "")).not.toMatch(/^completed$/i);
  });
});
