import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/saveSessionToLibrary.ts";
import assignedHandler from "../../../api/assignedSession.ts";
import { assignProgram } from "../../../server/db/pg/workouts.ts";
import { getAssignedSession } from "../../../server/db/pg/assignedSession.ts";
import { getWorkoutDetails } from "../../../server/db/pg/workoutDetails.ts";
import { createWorkoutTemplatesBulk } from "../../../server/db/pg/programTemplates.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";

const instructions = "Setup\nStand tall.\n\nExecution\nPull smoothly.";
const notes = 'Section: Warmup\nLabel: A1\nCircuit: Shoulders\nFields: Reps, Time\nSet Prescriptions: [{"setNumber":1,"reps":"3","time":"10","rest":"45 sec"}]\n\n' + instructions;
const session = { week: 2, day: 3, sessionName: "Climbing Warmup 1", sessionNameCn: "攀岩热身1", sessionType: "Strength", sessionGoal: "Move well", sessionNotes: "Keep it easy", isSingleWorkout: false,
  exercises: [{ exerciseRecordId: "EX-1", exerciseId: "EX-1", exerciseName: "Shoulder Raise", sets: 1, reps: "3", rest: "45 sec", coachingNotes: notes, coachingNotesCn: "准备姿势\n站直。\n\n动作执行\n平稳上拉。" }] };
async function call(body: Record<string, unknown>, coach = true) {
  const res = makeRes(); await handler(makeReq({ method: "POST", headers: coach ? { "x-coach-key": "test-secret" } : {}, body }) as never, res as never); return res;
}
async function payload(name = session.sessionName, id = "AW-1") { return { assignedWorkoutId: id, name, requestId: randomUUID(), source: "published", version: (await getAssignedSession(id)).version }; }
beforeEach(async () => {
  vi.stubEnv("COACH_ACCESS_KEY", "test-secret"); await resetDb();
  await seedClient({ client_id: "CL-9001" }); await seedProgram({ built_for_client: "CL-9001", public_store_visible: true, product_type: "Digital Program", price: "999" });
  await rows("insert into exercises (exercise_id,name,short_video_url) values ('EX-1','Shoulder Raise','https://example.com/demo.mp4'),('EX-2','Alternative','https://example.com/alternate.mp4')");
  await createWorkoutTemplatesBulk({ programId: "PR-1001", programRecordId: "PR-1001", sessions: [session] });
  await rows("insert into assigned_workouts (assigned_workout_id,client_id,program_id,week,day,session_name,session_name_cn,completion_status,is_draft,client_notes,session_rpe) values ('AW-1','CL-9001','PR-1001',2,3,'Climbing Warmup 1','攀岩热身1','Scheduled',false,'private feedback',8)");
  const [t] = await rows("select template_id from workout_templates");
  await rows("insert into exercise_alternates (alternate_id,template_id,exercise_id,exercise_name) values ('ALT-1',$1,'EX-2','Alternative')", [t.template_id]);
});
afterAll(async () => { vi.unstubAllEnvs(); await closeDb(); });

describe("saving a calendar session to the library", () => {
  it("reuses the saved session for another client with both instruction languages intact", async () => {
    const saved = await call(await payload());
    await seedClient({ client_id: "CL-9002" });
    const assigned = await assignProgram({ targetClientIds: ["CL-9002"], programRecordId: saved.body.programId, scheduledWorkouts: [{ week: 1, day: 1, sessionName: session.sessionName, scheduledDate: "2026-10-28" }] });
    expect(assigned.success).toBe(true);
    const [destination] = await rows("select * from assigned_workouts where client_id='CL-9002'");
    const copied = await getAssignedSession(destination.assigned_workout_id);
    expect(copied.templates[0]).toMatchObject({ notes, notesCn: session.exercises[0].coachingNotesCn, sets: "1", reps: "3" });
    const details = await getWorkoutDetails(destination.program_id, "1", "1");
    expect(details[0].notes).toContain(instructions);
    expect(details[0].notesCn).toBe(session.exercises[0].coachingNotesCn);
    expect(details[0].setPrescriptions?.[0]).toMatchObject({ reps: "3", time: "10", rest: "45 sec" });
  });
  it("copies bilingual setup/execution, prescriptions, grouping, videos and alternates without changing the assignment", async () => {
    const before = await rows("select * from assigned_workouts"); const original = await rows("select * from workout_templates");
    const saved = await call(await payload()); expect(saved.statusCode).toBe(200);
    const [program] = await rows("select * from programs where program_id=$1", [saved.body.programId]);
    expect(program).toMatchObject({ name: session.sessionName, name_cn: session.sessionNameCn, product_type: "Single Workout", library_visible: true, public_store_visible: false, assignment_only: false, built_for_client: null, built_for_team: null, price: null });
    const [copy] = await rows("select * from workout_templates where program_id=$1", [saved.body.programId]);
    expect(copy).toMatchObject({ week: 1, day: 1, is_single_workout: true, coaching_notes: notes, coaching_notes_cn: session.exercises[0].coachingNotesCn, exercise_id: "EX-1" });
    const [set] = await rows("select * from set_prescriptions where template_id=$1", [copy.template_id]);
    expect(set).toMatchObject({ reps: "3", time: "10", rest: "45 sec" });
    const [alt] = await rows("select * from exercise_alternates where template_id=$1", [copy.template_id]); expect(alt.exercise_id).toBe("EX-2"); expect(alt.alternate_id).not.toBe("ALT-1");
    expect((await getWorkoutDetails(saved.body.programId, "1", "1"))[0]).toMatchObject({ videoUrl: "https://example.com/demo.mp4", notesCn: session.exercises[0].coachingNotesCn });
    expect(await rows("select * from assigned_workouts")).toEqual(before);
    expect(await rows("select * from workout_templates where program_id='PR-1001'")).toEqual(original);
    expect(await rows("select * from workout_logs")).toHaveLength(0);
  });
  it("renames the copy without carrying a stale Chinese title or changing exercise instructions", async () => {
    const res = await call(await payload("Shoulder preparation")); expect(res.statusCode).toBe(200);
    const [row] = await rows("select * from workout_templates where program_id=$1", [res.body.programId]);
    expect(row).toMatchObject({ session_name: "Shoulder preparation", session_name_cn: null, coaching_notes: notes, coaching_notes_cn: session.exercises[0].coachingNotesCn });
  });
  it("is idempotent across retries, including after the source changes", async () => {
    const input = await payload(); const first = await call(input);
    await rows("update assigned_workouts set completion_status='Completed' where assigned_workout_id='AW-1'");
    const again = await call(input); expect(again.body).toEqual(first.body);
    expect(await rows("select * from programs")).toHaveLength(2);
    expect((await call({ ...input, name: "Different" })).statusCode).toBe(409);
  });
  it("can save a completed session's prescription without copying logged results", async () => {
    await rows("update assigned_workouts set completion_status='Completed' where assigned_workout_id='AW-1'");
    const res = await call(await payload()); expect(res.statusCode).toBe(200);
    expect(await rows("select * from assigned_workouts")).toHaveLength(1);
  });
  it("rejects stale sources and unauthorized or malformed saves without leaving a partial program", async () => {
    const input = await payload(); expect((await call(input, false)).statusCode).toBe(401);
    expect((await call({ ...input, name: "  " })).statusCode).toBe(400);
    await rows("update assigned_workouts set is_draft=true where assigned_workout_id='AW-1'");
    expect((await call(input)).statusCode).toBe(409);
    expect(await rows("select * from programs")).toHaveLength(1);
  });
  it("offers an explicit choice between the published workout and its saved private revision", async () => {
    const before = await getAssignedSession("AW-1"); const response = makeRes();
    await assignedHandler(makeReq({ method: "POST", headers: { "x-coach-key": "test-secret" }, body: { assignedWorkoutId: "AW-1", version: before.version, action: "draft", session: { ...session, exercises: [{ ...session.exercises[0], coachingNotes: notes + "\nPrivate change" }] } } }) as never, response as never);
    expect(response.statusCode).toBe(200);
    const input = await payload(); const published = await call(input), draft = await call({ ...input, source: "draft", requestId: randomUUID() });
    expect(published.statusCode).toBe(200); expect(draft.statusCode).toBe(200);
    expect((await rows("select coaching_notes from workout_templates where program_id=$1", [published.body.programId]))[0].coaching_notes).toBe(notes);
    expect((await rows("select coaching_notes from workout_templates where program_id=$1", [draft.body.programId]))[0].coaching_notes).toContain("Private change");
    expect((await getAssignedSession("AW-1")).hasRevision).toBe(true);
  });
  it("snapshots library setup/execution when the session only contains builder metadata", async () => {
    await rows("update workout_templates set coaching_notes='Section: Warmup',coaching_notes_cn=null");
    await rows("update exercises set coaching_cues=$1,coaching_cues_cn=$2 where exercise_id='EX-1'", [instructions, "准备姿势\n站直。\n动作执行\n平稳上拉。"]);
    const res = await call(await payload()); expect(res.statusCode).toBe(200);
    const [copy] = await rows("select coaching_notes,coaching_notes_cn from workout_templates where program_id=$1", [res.body.programId]);
    expect(copy.coaching_notes).toBe("Section: Warmup\n\n" + instructions); expect(copy.coaching_notes_cn).toContain("准备姿势");
  });
});
