import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/duplicateAssignedWorkout.ts";
import workoutsHandler from "../../../api/workouts.ts";
import detailsHandler from "../../../api/workoutDetails.ts";
import { createWorkoutTemplatesBulk } from "../../../server/db/pg/programTemplates.ts";
import { getAssignedSession, saveAssignedSession } from "../../../server/db/pg/assignedSession.ts";
import { pool } from "../../../server/db/client.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";

const session = {
  week: 2, day: 3, sessionName: "Climbing warm-up", sessionNameCn: "攀岩热身",
  exercises: [{ exerciseId: "EX-1", exerciseRecordId: "EX-1", exerciseName: "Scapular pull-up", sets: 2, reps: "8", coachingNotes: "Keep hands on the bar" }],
};
const payload = { assignedWorkoutRecordId: "AW-WILLIAM", targetClientId: "CL-JASON", scheduledDate: "2026-10-20" };
async function post(body: unknown, coach = true) {
  const res = makeRes();
  await handler(makeReq({ method: "POST", body, headers: coach ? { "x-coach-key": "clipboard-test" } : {} }) as any, res as any);
  return res;
}

beforeEach(async () => {
  vi.stubEnv("COACH_ACCESS_KEY", "clipboard-test");
  await resetDb();
  await seedClient({ client_id: "CL-WILLIAM", full_name: "William" });
  await seedClient({ client_id: "CL-JASON", full_name: "Jason" });
  await seedProgram({ built_for_client: "CL-WILLIAM", assignment_only: true });
  await pool.query("insert into exercises (exercise_id,name) values ('EX-1','Scapular pull-up'),('EX-2','Supported scapular pull-up')");
  await createWorkoutTemplatesBulk({ programId: "PR-1001", programRecordId: "PR-1001", sessions: [session] });
  await pool.query("update workout_templates set coaching_notes_cn='双手保持握杠' where program_id='PR-1001'");
  const [template] = await rows("select template_id from workout_templates");
  await pool.query("insert into exercise_alternates (alternate_id,template_id,exercise_id,exercise_name) values ('EA-1',$1,'EX-2','Supported scapular pull-up')", [template.template_id]);
  await pool.query(`insert into assigned_workouts
    (assigned_workout_id,client_id,program_id,week,day,session_name,session_name_cn,scheduled_date,completion_status,coach_notes)
    values ('AW-WILLIAM','CL-WILLIAM','PR-1001',2,3,'Climbing warm-up','攀岩热身',$1,'Scheduled','Warm up before climbing')`,
  [Date.parse("2026-10-19T00:00:00+08:00")]);
});
afterAll(async () => { vi.unstubAllEnvs(); await closeDb(); });

describe("cross-client calendar clipboard", () => {
  it("copies William's workout to Jason as an independent draft without activity or changes to William", async () => {
    await pool.query(`update assigned_workouts set completion_status='Completed', client_notes='William only', client_notes_cn='仅属于William',
      session_rpe=8,session_duration=30,session_load=240,session_avg_hr=140,session_max_hr=170,coach_reviewed=true,day_order=2
      where assigned_workout_id='AW-WILLIAM'`);
    const [before] = await rows("select * from assigned_workouts where assigned_workout_id='AW-WILLIAM'");
    const res = await post(payload);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, isDraft: true });
    const [copy] = await rows("select * from assigned_workouts where assigned_workout_id=$1", [res.body.recordId]);
    expect(copy).toMatchObject({ client_id: "CL-JASON", week: 1, day: 1, session_name: "Climbing warm-up", session_name_cn: "攀岩热身",
      coach_notes: "Warm up before climbing", completion_status: "Scheduled", is_draft: true, coach_reviewed: false,
      client_notes: null, client_notes_cn: null, session_rpe: null, session_duration: null, session_load: null,
      session_avg_hr: null, session_max_hr: null, day_order: null });
    expect(Number(copy.scheduled_date)).toBe(Date.parse("2026-10-20T00:00:00+08:00"));
    expect(copy.program_id).not.toBe("PR-1001");
    expect((await rows("select * from assigned_workouts where assigned_workout_id='AW-WILLIAM'"))[0]).toEqual(before);
    const [program] = await rows("select * from programs where program_id=$1", [copy.program_id]);
    expect(program).toMatchObject({ built_for_client: "CL-JASON", assignment_only: true, library_visible: false, public_store_visible: false });
    const original = await getAssignedSession("AW-WILLIAM"), copied = await getAssignedSession(copy.assigned_workout_id);
    expect(copied.templates[0]).toMatchObject({ reps: "8", notes: "Keep hands on the bar", notesCn: "双手保持握杠" });
    expect(copied.templates[0].setPrescriptions).toEqual(original.templates[0].setPrescriptions);
    const [newTemplate] = await rows("select template_id from workout_templates where program_id=$1", [copy.program_id]);
    const alternates = await rows("select * from exercise_alternates where template_id=$1", [newTemplate.template_id]);
    expect(alternates).toHaveLength(1);
    expect(alternates[0]).toMatchObject({ exercise_id: "EX-2" });
    expect(alternates[0].alternate_id).not.toBe("EA-1");
    await pool.query("update workout_templates set reps='99' where program_id='PR-1001'");
    expect((await getAssignedSession(copy.assigned_workout_id)).templates[0].reps).toBe("8");
    const athlete = makeRes();
    await workoutsHandler(makeReq({ query: { clientCode: "CL-JASON" } }) as any, athlete as any);
    expect(athlete.body.workouts).toEqual([]);
    const details = makeRes();
    await detailsHandler(makeReq({ query: { clientCode: "CL-JASON", programId: copy.program_id, week: "1", day: "1" } }) as any, details as any);
    expect(details.statusCode).toBe(403);
  });

  it("requires verified coach access when a destination client is specified", async () => {
    expect((await post(payload, false)).statusCode).toBe(401);
    vi.stubEnv("COACH_ACCESS_KEY", "");
    expect((await post(payload)).statusCode).toBe(401);
    expect(await rows("select * from assigned_workouts")).toHaveLength(1);
  });

  it("retains existing same-client duplication when no destination is supplied", async () => {
    const res = await post({ assignedWorkoutRecordId: "AW-WILLIAM", scheduledDate: "2026-10-20" });
    expect(res.statusCode).toBe(200);
    expect((await rows("select client_id,program_id from assigned_workouts where assigned_workout_id=$1", [res.body.recordId]))[0])
      .toMatchObject({ client_id: "CL-WILLIAM", program_id: "PR-1001" });
  });

  it("rejects an unavailable source or destination without creating a partial copy", async () => {
    expect((await post({ ...payload, targetClientId: "CL-MISSING" })).statusCode).toBe(404);
    expect((await post({ ...payload, assignedWorkoutRecordId: "AW-MISSING" })).statusCode).toBe(404);
    expect(await rows("select * from assigned_workouts")).toHaveLength(1);
    expect(await rows("select * from programs")).toHaveLength(1);
  });

  it("requires source revision review rather than silently copying different programming", async () => {
    const source = await getAssignedSession("AW-WILLIAM");
    await saveAssignedSession("AW-WILLIAM", source.version, { ...session, sessionName: "Unpublished changes" }, { draft: true });
    const before = await rows("select program_id from programs");
    const res = await post(payload);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain("private changes");
    expect(await rows("select * from assigned_workouts")).toHaveLength(1);
    expect(await rows("select program_id from programs")).toEqual(before);
  });

  it("rolls back the cloned program when its exercise content is unavailable", async () => {
    await pool.query("delete from workout_templates");
    expect((await post(payload)).statusCode).toBe(409);
    expect(await rows("select * from programs")).toHaveLength(1);
    expect(await rows("select * from assigned_workouts")).toHaveLength(1);
  });

  it("rejects malformed client IDs and impossible dates", async () => {
    expect((await post({ ...payload, targetClientId: "" })).statusCode).toBe(400);
    expect((await post({ ...payload, targetClientId: {} })).statusCode).toBe(400);
    expect((await post({ ...payload, scheduledDate: "2026-02-30" })).statusCode).toBe(400);
  });
});
