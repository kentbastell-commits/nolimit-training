import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/assignedSession.ts";
import { createWorkoutTemplatesBulk } from "../../../server/db/pg/programTemplates.ts";
import { getWorkoutDetails } from "../../../server/db/pg/workoutDetails.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";

const exercise = { exerciseId: "EX-1", exerciseRecordId: "EX-1", exerciseName: "Hold", sets: 2, reps: "8",
  coachingNotes: 'Fields: Time\nSet Prescriptions: [{"setNumber":1,"time":"30"},{"setNumber":2,"time":"30"}]' };
const session = { week: 1, day: 1, sessionName: "Lower", sessionNameCn: "下肢训练", exercises: [exercise] };
async function call(method = "GET", body = {}, id = "AW-1") {
  const res = makeRes();
  await handler(makeReq({ method, query: { assignedWorkoutId: id }, body }) as any, res as any);
  return res;
}
beforeEach(async () => {
  await resetDb();
  await seedClient({ client_id: "CL-0001" }); await seedClient({ client_id: "CL-2" }); await seedProgram();
  await pool.query("insert into exercises (exercise_id, name) values ('EX-1', 'Hold')");
  await createWorkoutTemplatesBulk({ programId: "PR-1001", programRecordId: "PR-1001", sessions: [session] });
  await pool.query(`insert into assigned_workouts (assigned_workout_id, client_id, program_id, week, day, completion_status)
    values ('AW-1', 'CL-0001', 'PR-1001', 1, 1, 'Scheduled'), ('AW-2', 'CL-2', 'PR-1001', 1, 1, 'Scheduled'),
    ('AW-3', 'CL-0001', 'PR-1001', 1, 1, 'Completed')`);
});
afterAll(closeDb);
describe("assigned session edits", () => {
  it("reads bilingual notes into the builder and saves explicit Chinese edits to the athlete copy", async () => {
    await pool.query("update workout_templates set coaching_notes_cn='旧备注'");
    const before = await call(); expect(before.body.templates[0].notesCn).toBe("旧备注");
    const res = await call("POST", { assignedWorkoutId: "AW-1", version: before.body.version,
      session: { ...session, exercises: [{ ...exercise, coachingNotesCn: "保持底部姿势，脚掌均匀受力。" }] } });
    expect(res.statusCode).toBe(200);
    expect((await getWorkoutDetails(res.body.programId, "1", "1"))[0].notesCn).toBe("保持底部姿势，脚掌均匀受力。");
    expect((await getWorkoutDetails("PR-1001", "1", "1"))[0].notesCn).toBe("旧备注");
  });
  it("forks only this assignment, keeps library/history intact, and serves the existing mini API", async () => {
    await pool.query("update workout_templates set coaching_notes_cn='保持底部姿势，脚掌均匀受力。'");
    const before = await call();
    const res = await call("POST", { assignedWorkoutId: "AW-1", version: before.body.version,
      session: { ...session, exercises: [{ ...exercise, coachingNotes: exercise.coachingNotes.replaceAll('"30"', '"45"') }] } });
    expect(res.statusCode).toBe(200);
    const assigned = await rows("select assigned_workout_id, program_id from assigned_workouts order by assigned_workout_id");
    expect(assigned[0].program_id).toBe(res.body.programId);
    expect(assigned.slice(1).map(r => r.program_id)).toEqual(["PR-1001", "PR-1001"]);
    const original = await getWorkoutDetails("PR-1001", "1", "1");
    const changed = await getWorkoutDetails(res.body.programId, "1", "1");
    expect(original[0].setPrescriptions?.[0].time).toBe("30");
    expect(changed[0].setPrescriptions?.[0].time).toBe("45");
    expect(changed[0].notesCn).toBe("保持底部姿势，脚掌均匀受力。");
    const [hidden] = await rows("select library_visible, public_store_visible from programs where program_id=$1", [res.body.programId]);
    expect(hidden).toEqual({ library_visible: false, public_store_visible: false });
    expect((await call("POST", { assignedWorkoutId: "AW-1", version: before.body.version, session })).statusCode).toBe(409);
    expect(await rows("select * from programs")).toHaveLength(2);
  });
  it("rejects stale source edits and preserves completed or started sessions", async () => {
    const before = await call();
    await pool.query("update workout_templates set reps='12'");
    expect((await call("POST", { assignedWorkoutId: "AW-1", version: before.body.version, session })).body.error).toBe("sessionChanged");
    const completed = await call("GET", {}, "AW-3");
    expect((await call("POST", { assignedWorkoutId: "AW-3", version: completed.body.version, session })).body.error).toBe("sessionAlreadyStarted");
    await pool.query("insert into workout_logs (log_id, assigned_workout_id) values ('LOG-1','AW-1')");
    expect((await call("POST", { assignedWorkoutId: "AW-1", version: before.body.version, session })).body.error).toBe("sessionAlreadyStarted");
    expect(await rows("select * from programs")).toHaveLength(1);
  });
  it("rolls back the private program if an exercise is invalid", async () => {
    const before = await call();
    const res = await call("POST", { assignedWorkoutId: "AW-1", version: before.body.version,
      session: { ...session, exercises: [{ ...exercise, exerciseId: "MISSING", exerciseRecordId: "MISSING" }] } });
    expect(res.statusCode).toBe(500);
    expect(await rows("select * from programs")).toHaveLength(1);
    expect((await rows("select program_id from assigned_workouts where assigned_workout_id='AW-1'"))[0].program_id).toBe("PR-1001");
  });
  it("permits only one of two overlapping saves", async () => {
    const before = await call();
    const body = { assignedWorkoutId: "AW-1", version: before.body.version, session };
    const results = await Promise.all([call("POST", body), call("POST", body)]);
    expect(results.map(r => r.statusCode).sort()).toEqual([200, 409]);
    expect(await rows("select * from programs")).toHaveLength(2);
  });
  it("requires coach authorization for both reads and writes", async () => {
    vi.stubEnv("COACH_ACCESS_KEY", "test-secret");
    try { expect((await call()).statusCode).toBe(401); expect((await call("POST")).statusCode).toBe(401); }
    finally { vi.unstubAllEnvs(); }
  });
});
