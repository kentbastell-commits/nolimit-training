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
  it("commits exactly once for concurrent submissions and a lost-response retry", async () => {
    await seedClient();
    await seedAssignedWorkout();
    const payload = { clientId: "CL-9001", assignedWorkoutRecordId: AWID,
      assignedWorkoutId: AWID, workoutDate: "2026-09-14", logs: [oneSet()] };
    const results = await Promise.all([save(payload), save(payload), save(payload)]);
    expect(results.every((r) => r.body.success)).toBe(true);
    expect((await save(payload)).body.replayed).toBe(true);
    expect(await rows("select 1 from workout_logs")).toHaveLength(1);
    const resultsRows = await rows("select volume from exercise_results");
    expect(resultsRows).toHaveLength(1);
    expect(Number(resultsRows[0].volume)).toBe(500);
  });

  it.each(["assigned_workouts", "exercise_results"])("rolls back all writes when %s fails, then safely retries", async (table) => {
    await seedClient();
    await seedAssignedWorkout();
    await pool.query(`create or replace function audit_fail_save() returns trigger language plpgsql as $$ begin raise exception 'injected save failure'; end $$`);
    await pool.query(`create trigger audit_fail_save before ${table === "assigned_workouts" ? "update" : "insert"} on ${table} for each row execute function audit_fail_save()`);
    const payload = { clientId: "CL-9001", assignedWorkoutRecordId: AWID,
      assignedWorkoutId: AWID, workoutDate: "2026-09-14", logs: [oneSet()] };
    try {
      expect((await save(payload)).body.success).toBe(false);
      expect(await rows("select 1 from workout_logs")).toHaveLength(0);
      expect(await rows("select 1 from exercise_results")).toHaveLength(0);
      expect((await rows("select completion_status from assigned_workouts"))[0].completion_status).toBe("Scheduled");
    } finally {
      await pool.query(`drop trigger audit_fail_save on ${table}`);
      await pool.query("drop function audit_fail_save()");
    }
    expect((await save(payload)).body.success).toBe(true);
    expect(await rows("select 1 from workout_logs")).toHaveLength(1);
  });

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

  it("stores typed pace and heart rate per set, and derives pace from time and distance when blank", async () => {
    await seedClient({ client_id: "CL-9001" });
    await seedAssignedWorkout();

    await save({
      clientId: "CL-9001",
      assignedWorkoutRecordId: AWID,
      workoutDate: "2026-10-01",
      sessionAvgHr: 166,
      sessionMaxHr: 176,
      logs: [
        // Garmin interval: 6:00 for 1,400 m, pace typed as 257 s/km (4:17).
        oneSet({ exerciseName: "Track Run", actualReps: undefined, actualWeight: undefined,
          actualTime: 360, actualDistance: 1400, actualPace: 257, avgHr: 168, maxHr: 176 }),
        // Pace left blank: 360 s / 1390 m -> 259 s/km (4:19).
        oneSet({ exerciseName: "Track Run", setNumber: 2, actualReps: undefined, actualWeight: undefined,
          actualTime: 360, actualDistance: 1390, avgHr: 170 }),
        // Nonsense heart rate is dropped, not stored.
        oneSet({ exerciseName: "Track Run", setNumber: 3, actualReps: undefined, actualWeight: undefined,
          actualTime: 360, avgHr: 999 }),
      ],
    });

    const sets = await rows(
      "select set_number, actual_pace_sec_km, avg_hr, max_hr from workout_logs where assigned_workout_id = $1 order by set_number",
      [AWID]
    );
    expect(sets.map((s) => [Number(s.set_number), s.actual_pace_sec_km, s.avg_hr, s.max_hr])).toEqual([
      [1, 257, 168, 176],
      [2, 259, 170, null],
      [3, null, null, null],
    ]);
    const [workout] = await rows(
      "select session_avg_hr, session_max_hr from assigned_workouts where assigned_workout_id = $1",
      [AWID]
    );
    expect([workout.session_avg_hr, workout.session_max_hr]).toEqual([166, 176]);

    // The athlete's history hands the same numbers back for the coach and the mini program.
    const historyHandler = (await import("../../../api/workoutHistory.ts")).default;
    const res = makeRes();
    await historyHandler(makeReq({ method: "GET", query: { clientCode: "CL-9001", assignedWorkoutId: AWID } }) as any, res as any);
    const logs = (res.body.logs as any[]).sort((a, b) => Number(a.setNumber) - Number(b.setNumber));
    expect([logs[0].actualPace, logs[0].avgHr, logs[0].maxHr]).toEqual(["257", "168", "176"]);
    expect(logs[1].actualPace).toBe("259");
  });

  it("keeps the athlete's skip reason on skipped rows only, and hands it back in history", async () => {
    await seedClient({ client_id: "CL-9001" });
    await seedAssignedWorkout();
    await save({
      clientId: "CL-9001",
      assignedWorkoutRecordId: AWID,
      workoutDate: "2026-10-06",
      logs: [
        oneSet({ exerciseName: "Back Squat" }),
        oneSet({ exerciseName: "Nordic Curl", setNumber: 1, completed: false, skipReason: "pain", actualReps: 5 }),
        // A reason on a completed set is noise, not data.
        oneSet({ exerciseName: "Lunge", setNumber: 1, skipReason: "no-equipment" }),
      ],
    });
    const sets = await rows(
      "select exercise_name, completed, skip_reason, actual_reps from workout_logs where assigned_workout_id = $1 order by exercise_name",
      [AWID]
    );
    expect(sets.map((s) => [s.exercise_name, s.completed, s.skip_reason, s.actual_reps])).toEqual([
      ["Back Squat", true, null, 5],
      ["Lunge", true, null, 5],
      ["Nordic Curl", false, "pain", null],
    ]);
    const historyHandler = (await import("../../../api/workoutHistory.ts")).default;
    const res = makeRes();
    await historyHandler(makeReq({ method: "GET", query: { clientCode: "CL-9001", assignedWorkoutId: AWID } }) as any, res as any);
    const nordic = (res.body.logs as any[]).find((l) => l.exerciseName === "Nordic Curl");
    expect([nordic.completed, nordic.skipReason]).toEqual([false, "pain"]);
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
