import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/calendarDrafts.ts";
import workouts from "../../../api/workouts.ts";
import details from "../../../api/workoutDetails.ts";
import templates from "../../../api/programTemplates.ts";
import exportProgram from "../../../api/programExport.ts";
import content from "../../../api/contentAssignments.ts";
import move from "../../../api/updateAssignedProgramDate.ts";
import { createCalendarDraft, reviewCalendarDrafts, publishCalendarDrafts } from "../../../server/db/pg/calendarDrafts.ts";
import { getAssignedSession, saveAssignedSession } from "../../../server/db/pg/assignedSession.ts";
import { saveWorkoutLog } from "../../../server/db/pg/workoutLogs.ts";
import { submitContentResponse } from "../../../server/db/pg/submitAssessment.ts";
import { createWorkoutTemplatesBulk } from "../../../server/db/pg/programTemplates.ts";
import { clientHasProgramAccess } from "../../../server/db/pg/clients.ts";
import { getCoachingJourney } from "../../../server/db/pg/coachingJourney.ts";
import { duplicateAssignedWorkout } from "../../../server/db/pg/workouts.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";

const clientId = "CL-0001";
const session = { week: 1, day: 1, sessionName: "Core", sessionNotes: "Private setup and execution", exercises: [{ exerciseId: "EX-1", exerciseRecordId: "EX-1", exerciseName: "Hold", sets: 2, reps: "8", coachingNotes: 'Set Prescriptions: [{"setNumber":1,"time":"30"},{"setNumber":2,"time":"30"}]' }] };
const schedule = [{ ...session, scheduledDate: "2026-09-23" }];
const draft = (extra = {}) => createCalendarDraft({ requestId: randomUUID(), clientIds: [clientId], programName: "Private plan", sessions: [session], scheduledWorkouts: schedule, ...extra });
async function call(fn: any, query = {}, body?: any, coach = false) {
  const res = makeRes();
  (res as any).send = (html: string) => { res.body = html; return res; };
  await fn(makeReq({ method: body ? "POST" : "GET", query, body, headers: coach ? { "x-coach-key": "test-secret" } : {} }) as any, res as any);
  return res;
}
beforeEach(async () => {
  vi.stubEnv("COACH_ACCESS_KEY", "test-secret");
  await resetDb(); await seedClient({ client_id: clientId }); await seedClient({ client_id: "CL-2" }); await seedProgram();
  await pool.query("insert into exercises (exercise_id,name) values ('EX-1','Hold')");
  await createWorkoutTemplatesBulk({ programId: "PR-1001", programRecordId: "PR-1001", sessions: [session] });
});
afterAll(async () => { vi.unstubAllEnvs(); await closeDb(); });
describe("private calendar drafts", () => {
  it("is coach-only even without a configured key, and rejects invalid schedules", async () => {
    expect((await call(handler, { clientId })).statusCode).toBe(401);
    vi.stubEnv("COACH_ACCESS_KEY", "");
    expect((await call(handler, { clientId }, undefined, true)).statusCode).toBe(401);
    vi.stubEnv("COACH_ACCESS_KEY", "test-secret");
    expect((await call(handler, {}, { action: "save", clientIds: [clientId] }, true)).statusCode).toBe(400);
  });
  it("saves and publishes through the registered handler without changing the source program", async () => {
    const payload = { action: "save", requestId: randomUUID(), clientIds: [clientId], sourceProgramId: "PR-1001", scheduledWorkouts: schedule };
    expect((await call(handler, {}, { ...payload, scheduledWorkouts: [{ ...schedule[0], scheduledDate: "2026-02-31" }] }, true)).statusCode).toBe(400);
    expect((await call(handler, {}, payload, true)).body.recordsCreated).toBe(1);
    const review = await call(handler, { clientId }, undefined, true);
    expect(review.body.items).toHaveLength(1);
    expect((await call(handler, {}, { action: "publish", clientId, version: review.body.version, ids: review.body.items.map((i: any) => i.id) }, true)).body.published).toBe(1);
    expect((await rows("select reps from workout_templates where program_id='PR-1001'"))[0].reps).toBe("8");
  });
  it("populates only the coach calendar and blocks mini/web direct access, submission and moving", async () => {
    await draft();
    const [aw] = await rows("select * from assigned_workouts");
    expect((await call(workouts, { clientCode: clientId })).body.workouts).toEqual([]);
    expect((await call(workouts, { clientCode: clientId }, undefined, true)).body.workouts).toHaveLength(1);
    expect((await call(workouts, { clientCode: clientId, audience: "athlete" }, undefined, true)).body.workouts).toEqual([]);
    const query = { programId: aw.program_id, week: "1", day: "1" };
    expect((await call(details, query)).statusCode).toBe(403); // released mini sends no client code
    expect((await call(details, { ...query, clientCode: clientId })).statusCode).toBe(403);
    expect((await call(details, query, undefined, true)).body.exercises).toHaveLength(1);
    expect((await call(templates, { programId: aw.program_id, clientCode: clientId })).statusCode).toBe(403);
    expect(await clientHasProgramAccess(clientId, aw.program_id)).toBe(false);
    expect((await getCoachingJourney(clientId)).stage).not.toBe("active");
    const logged = await saveWorkoutLog({ clientId, assignedWorkoutRecordId: aw.assigned_workout_id, logs: [] } as any);
    expect(logged.success).toBe(false);
    expect(await rows("select * from workout_logs")).toHaveLength(0);
    expect((await call(move, {}, { assignedWorkoutRecordId: aw.assigned_workout_id, scheduledDate: "2026-09-24" })).statusCode).toBe(403);
    const review = await reviewCalendarDrafts(clientId);
    await publishCalendarDrafts(clientId, review.items.map(i => i.id), review.version);
    expect((await call(workouts, { clientCode: clientId })).body.workouts).toHaveLength(1); // athlete's cached read invalidated
    expect((await call(details, query)).body.exercises[0].sets).toBe("2");
    expect((await call(templates, { programId: aw.program_id, clientCode: clientId })).body.templates).toHaveLength(1);
  });
  it("publishes selected days only and never leaks other days via programTemplates", async () => {
    await draft({ sessions: [session, { ...session, day: 2, sessionName: "Later" }], scheduledWorkouts: [...schedule, { ...schedule[0], day: 2, sessionName: "Later", scheduledDate: "2026-09-25" }] });
    const all = await rows("select * from assigned_workouts order by day");
    const review = await reviewCalendarDrafts(clientId);
    await publishCalendarDrafts(clientId, [all[0].assigned_workout_id], review.version);
    const programId = all[0].program_id;
    expect((await call(templates, { programId, clientCode: clientId })).body.templates.map((t: any) => t.day)).toEqual([1]);
    expect((await call(details, { programId, week: "1", day: "2" })).statusCode).toBe(403);
    const exported = await call(exportProgram, { programId, clientCode: clientId });
    expect(exported.statusCode).toBe(200);
    expect(exported.body).not.toContain("Later");
    expect((await reviewCalendarDrafts(clientId)).items).toHaveLength(1);
  });
  it("isolates library/other athletes and retains draft status through edit and copy", async () => {
    await draft({ sourceProgramId: "PR-1001", clientIds: [clientId, "CL-2"] });
    const all = await rows("select * from assigned_workouts order by client_id");
    expect(all[0].program_id).not.toBe(all[1].program_id);
    await pool.query("update workout_templates set reps='99' where program_id='PR-1001'");
    const editor = await getAssignedSession(all[0].assigned_workout_id);
    expect(editor.templates[0].reps).toBe("8");
    const before = await reviewCalendarDrafts(clientId);
    const changed = await saveAssignedSession(all[0].assigned_workout_id, editor.version, { ...session, sessionName: "Changed" });
    expect((await rows("select is_draft from assigned_workouts where client_id=$1", [clientId]))[0].is_draft).toBe(true);
    expect((await call(details, { programId: changed.programId, week: "1", day: "1" })).statusCode).toBe(403);
    await expect(publishCalendarDrafts(clientId, before.items.map(i => i.id), before.version)).rejects.toMatchObject({ status: 409 });
    expect((await getAssignedSession(all[1].assigned_workout_id)).templates[0].reps).toBe("8");
    const copied = await duplicateAssignedWorkout({ assignedWorkoutRecordId: all[0].assigned_workout_id, scheduledDate: "2026-09-26" });
    expect((await rows("select is_draft from assigned_workouts where assigned_workout_id=$1", [copied.recordId]))[0].is_draft).toBe(true);
  });
  it("rolls back an invalid program atomically and makes duplicate save retries idempotent", async () => {
    await expect(draft({ sessions: [{ ...session, exercises: [{ ...session.exercises[0], exerciseId: "MISSING", exerciseRecordId: "MISSING" }] }] })).rejects.toBeTruthy();
    expect(await rows("select * from assigned_workouts")).toHaveLength(0);
    expect(await rows("select * from programs")).toHaveLength(1);
    const requestId = randomUUID();
    await Promise.all([draft({ requestId }), draft({ requestId })]);
    expect(await rows("select * from assigned_workouts")).toHaveLength(1);
  });
  it("keeps test days private and publishes workouts and tests in one transaction", async () => {
    await pool.query("insert into test_templates (test_template_id,name) values ('TT-1','Jump test')");
    const test = { ...session, day: 2, testTemplateId: "TT-1", exercises: [] };
    await draft({ sessions: [session, test], scheduledWorkouts: [...schedule, { ...test, scheduledDate: "2026-09-25" }] });
    const [at] = await rows("select * from assigned_tests");
    expect((await call(content, { clientId })).body.assignments).toEqual([]);
    expect((await call(content, { clientId }, undefined, true)).body.assignments[0].isDraft).toBe(true);
    const submit = await submitContentResponse({ assignmentType: "Physical Test", assignmentId: at.assigned_test_id, clientId, templateId: "TT-1", responses: [] } as any);
    expect(submit.status).toBe(403);
    const review = await reviewCalendarDrafts(clientId);
    await expect(publishCalendarDrafts("CL-2", review.items.map(i => i.id), review.version)).rejects.toMatchObject({ status: 409 });
    expect((await rows("select is_draft from assigned_tests"))[0].is_draft).toBe(true);
    await publishCalendarDrafts(clientId, review.items.map(i => i.id), review.version);
    expect((await call(content, { clientId })).body.assignments).toHaveLength(1);
    expect((await rows("select is_draft from assigned_workouts"))[0].is_draft).toBe(false);
  });
});
