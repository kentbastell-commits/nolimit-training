// Ported from tests/unit/api/saveWorkoutLog.test.ts. This is the most-used
// write in the product — every athlete, every session — and its failure modes
// are silent ones: orphaned rows, a session that never flips to Completed, or
// a skipped set minting a personal record it never earned.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import handler from "../../../api/saveWorkoutLog.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";

const AWID = "AW-9001";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

async function seedAssignedWorkout(overrides: Record<string, any> = {}) {
  const values = {
    assigned_workout_id: AWID,
    client_id: "CL-9001",
    session_name: "Lower Body Strength",
    completion_status: "Scheduled",
    ...overrides,
  };
  const keys = Object.keys(values);
  await pool.query(
    `insert into assigned_workouts (${keys.map((k) => `"${k}"`).join(", ")})
     values (${keys.map((_, i) => `$${i + 1}`).join(", ")})`,
    Object.values(values)
  );
}

async function save(body: Record<string, any>) {
  const res = makeRes();
  await handler(makeReq({ method: "POST", body }) as any, res as any);
  return res;
}

const oneSet = (overrides: Record<string, any> = {}) => ({
  exerciseName: "Back Squat",
  setNumber: 1,
  prescribedReps: "5",
  actualReps: 5,
  actualWeight: 100,
  completed: true,
  exerciseOrder: 1,
  ...overrides,
});

describe("api/saveWorkoutLog (postgres)", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("400s without clientId or assignedWorkoutRecordId", async () => {
    expect((await save({ logs: [] })).statusCode).toBe(400);
    expect((await save({ clientId: "CL-9001", logs: [] })).statusCode).toBe(400);
  });

  it("400s when logs is missing or not an array", async () => {
    const res = await save({ clientId: "CL-9001", assignedWorkoutRecordId: AWID });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("No logs received");
  });

  it("writes one row per set and flips the session to Completed", async () => {
    await seedClient({ client_id: "CL-9001" });
    await seedAssignedWorkout();

    const res = await save({
      clientId: "CL-9001",
      assignedWorkoutRecordId: AWID,
      workoutDate: "2026-07-26",
      logs: [oneSet(), oneSet({ setNumber: 2, actualWeight: 105 })],
    });

    expect(res.statusCode).toBe(200);
    const logged = await rows(
      "select set_number, actual_weight, client_id, assigned_workout_id from workout_logs order by set_number"
    );
    expect(logged).toHaveLength(2);
    expect(Number(logged[1].actual_weight)).toBe(105);
    // Both links resolved — an orphaned log is invisible to the coach.
    expect(logged[0].client_id).toBe("CL-9001");
    expect(logged[0].assigned_workout_id).toBe(AWID);

    const [workout] = await rows(
      "select completion_status from assigned_workouts where assigned_workout_id = $1",
      [AWID]
    );
    expect(workout.completion_status).toBe("Completed");
  });

  it("stores session RPE, duration and their product as internal load", async () => {
    await seedClient({ client_id: "CL-9001" });
    await seedAssignedWorkout();

    await save({
      clientId: "CL-9001",
      assignedWorkoutRecordId: AWID,
      workoutDate: "2026-07-26",
      sessionRpe: 8,
      sessionDurationMin: 60,
      logs: [oneSet()],
    });

    const [workout] = await rows(
      "select session_rpe, session_duration, session_load from assigned_workouts where assigned_workout_id = $1",
      [AWID]
    );
    expect(Number(workout.session_rpe)).toBe(8);
    expect(Number(workout.session_duration)).toBe(60);
    // sRPE load drives the coach's workload monitoring.
    expect(Number(workout.session_load)).toBe(480);
  });

  it("does not record reps or weight for a skipped set", async () => {
    await seedClient({ client_id: "CL-9001" });
    await seedAssignedWorkout();

    await save({
      clientId: "CL-9001",
      assignedWorkoutRecordId: AWID,
      workoutDate: "2026-07-26",
      // The player prefills reps/weight from the plan; a skipped set must not
      // bank those prefilled numbers as if the athlete had lifted them.
      logs: [oneSet({ completed: false })],
    });

    const [log] = await rows("select completed, actual_reps, actual_weight from workout_logs");
    expect(log.completed).toBe(false);
    expect(log.actual_reps).toBeNull();
    expect(log.actual_weight).toBeNull();
  });

  it("attaches the athlete's note to the session", async () => {
    await seedClient({ client_id: "CL-9001" });
    await seedAssignedWorkout();

    await save({
      clientId: "CL-9001",
      assignedWorkoutRecordId: AWID,
      workoutDate: "2026-07-26",
      submissionNote: "left knee tight on the last set",
      logs: [oneSet()],
    });

    const [workout] = await rows(
      "select client_notes from assigned_workouts where assigned_workout_id = $1",
      [AWID]
    );
    expect(workout.client_notes).toBe("left knee tight on the last set");
  });

  it("rejects a stale pre-cutover tab instead of writing orphaned rows", async () => {
    await seedClient({ client_id: "CL-9001" });

    const res = await save({
      clientId: "CL-9001",
      // A tab opened before 2026-07-21 still holds Feishu record ids, which
      // match nothing here. Saving anyway would look successful while the
      // session never completed.
      assignedWorkoutRecordId: "recABCD12345678",
      workoutDate: "2026-07-26",
      logs: [oneSet()],
    });

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/refresh/i);
    expect(await rows("select 1 from workout_logs")).toHaveLength(0);
  });

  it("gives every set a distinct id even when submitted in the same millisecond", async () => {
    await seedClient({ client_id: "CL-9001" });
    await seedAssignedWorkout();

    await save({
      clientId: "CL-9001",
      assignedWorkoutRecordId: AWID,
      workoutDate: "2026-07-26",
      logs: Array.from({ length: 12 }, (_, i) => oneSet({ setNumber: i + 1 })),
    });

    const ids = await rows("select log_id from workout_logs");
    expect(new Set(ids.map((r) => r.log_id)).size).toBe(12);
  });
});
