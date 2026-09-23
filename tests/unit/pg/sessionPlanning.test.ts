import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { discardSessionRevision, getAssignedSession, listSessionVersions, saveAssignedSession } from "../../../server/db/pg/assignedSession.ts";
import { reviewCalendarDrafts, publishCalendarDrafts, publishedCalendarSlots } from "../../../server/db/pg/calendarDrafts.ts";
import { applyCalendarSessions, reviewCalendarSessions } from "../../../server/db/pg/calendarSessions.ts";
import handler from "../../../api/calendarSessions.ts";
import sessionHandler from "../../../api/assignedSession.ts";
import detailsHandler from "../../../api/workoutDetails.ts";
import { createWorkoutTemplatesBulk } from "../../../server/db/pg/programTemplates.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";

const clientId = "CL-0001";
const session = { week: 1, day: 1, sessionName: "Core", sessionNotes: "Two rounds", exercises: [{ exerciseId: "EX-1", exerciseRecordId: "EX-1", exerciseName: "Hold", sets: 2, reps: "8", coachingNotes: 'Group Type: Circuit\nGroup Name: A\nSet Prescriptions: [{"setNumber":1,"time":"30","rest":"45"},{"setNumber":2,"time":"45","rest":"60"}]' }] };
beforeEach(async () => {
  vi.stubEnv("COACH_ACCESS_KEY", "test-secret"); await resetDb();
  await seedClient({ client_id: clientId }); await seedClient({ client_id: "CL-2" }); await seedProgram();
  await pool.query("insert into exercises (exercise_id,name) values ('EX-1','Hold')");
  await createWorkoutTemplatesBulk({ programId: "PR-1001", programRecordId: "PR-1001", sessions: [session] });
  await pool.query(`insert into assigned_workouts (assigned_workout_id,client_id,program_id,week,day,session_name,completion_status,scheduled_date)
    values ('AW-1',$1,'PR-1001',1,1,'Core','Scheduled',1790092800000),('AW-2',$1,'PR-1001',1,1,'Core','Scheduled',1790265600000),('AW-other','CL-2','PR-1001',1,1,'Core','Scheduled',1790265600000)`, [clientId]);
});
afterAll(async () => { vi.unstubAllEnvs(); await closeDb(); });
const liveRow = async () => (await rows("select program_id,session_name from assigned_workouts where assigned_workout_id='AW-1'"))[0];
async function change(draft = true) {
  const before = await getAssignedSession("AW-1");
  return saveAssignedSession("AW-1", before.version, { ...session, sessionName: "Changed core" }, { draft });
}
async function operation(action: "move" | "copy" = "copy") {
  const review = await reviewCalendarSessions(clientId);
  return { clientId, requestId: randomUUID(), action, items: review.items.map((i, idx) => ({ id: i.id, version: i.version, date: `2026-10-${idx + 10}` })) };
}
describe("saved versions and private revisions", () => {
  it("does not invalidate a review when translations change PostgreSQL row order", async () => {
    await createWorkoutTemplatesBulk({ programId: "PR-1001", programRecordId: "PR-1001", sessions: [{ ...session, exercises: [session.exercises[0], { ...session.exercises[0], order: 2 }] }] });
    const before = await getAssignedSession("AW-1");
    await pool.query("update workout_templates set coaching_notes_cn='Translated' where template_id=$1", [before.templates[0].recordId]);
    expect((await getAssignedSession("AW-1")).version).toBe(before.version);
  });
  it("keeps the live plan intact, hides private program URLs and publishes reviewed content", async () => {
    const saved = await change(); expect((await liveRow()).program_id).toBe("PR-1001");
    const editor = await getAssignedSession("AW-1"); expect(editor.hasRevision).toBe(true); expect(editor.templates[0].sessionName).toBe("Changed core");
    expect(await publishedCalendarSlots(saved.programId)).toEqual([]);
    const res = makeRes(); await detailsHandler(makeReq({ query: { programId: saved.programId, week: "1", day: "1" } }) as any, res as any); expect(res.statusCode).toBe(403);
    const review = await reviewCalendarDrafts(clientId);
    expect(review.items[0].id).toBe("revision:AW-1");
    const snapshot = (review.items[0] as any).snapshot;
    expect(snapshot.templates[0].setPrescriptions.map((s: any) => s.time)).toEqual(["30", "45"]);
    await publishCalendarDrafts(clientId, [review.items[0].id], review.version);
    expect((await liveRow()).program_id).toBe(saved.programId); expect(await publishedCalendarSlots(saved.programId)).toHaveLength(1);
    expect((await getAssignedSession("AW-1")).hasRevision).toBe(false);
    expect((await rows("select program_id from assigned_workouts where assigned_workout_id='AW-2'"))[0].program_id).toBe("PR-1001");
    const history = await listSessionVersions("AW-1"); expect(history.length).toBeGreaterThanOrEqual(1);
    await pool.query("update workout_templates set reps='99' where program_id='PR-1001'");
    expect((history[0].snapshot as any).templates[0].reps).toBe("8");
  });
  it("rejects stale reviews and started sessions without partially publishing", async () => {
    await change(); const review = await reviewCalendarDrafts(clientId);
    await change(); await expect(publishCalendarDrafts(clientId, [review.items[0].id], review.version)).rejects.toMatchObject({ status: 409 });
    const latest = await reviewCalendarDrafts(clientId);
    await pool.query("insert into workout_logs (log_id,assigned_workout_id) values ('LOG-1','AW-1')");
    await expect(publishCalendarDrafts(clientId, [latest.items[0].id], latest.version)).rejects.toMatchObject({ status: 409 });
    expect((await liveRow()).program_id).toBe("PR-1001");
  });
  it("requires an explicit reviewed merge when live content changes under a revision", async () => {
    await change(); await pool.query("update workout_templates set reps='12' where program_id='PR-1001'");
    const stale = await getAssignedSession("AW-1"); expect(stale.conflicted).toBe(true);
    await expect(saveAssignedSession("AW-1", stale.version, session, { draft: true })).rejects.toMatchObject({ code: "sessionChanged" });
    const latest = await getAssignedSession("AW-1", true); expect(latest.templates[0].reps).toBe("12");
    await saveAssignedSession("AW-1", latest.version, session, { draft: true, reviewed: true });
    expect((await getAssignedSession("AW-1")).conflicted).toBe(false);
  });
  it("requires positive coach authorization for history and revisions even when key is unset", async () => {
    vi.stubEnv("COACH_ACCESS_KEY", ""); const res = makeRes();
    await sessionHandler(makeReq({ query: { assignedWorkoutId: "AW-1", history: "1" } }) as any, res as any); expect(res.statusCode).toBe(401);
  });
  it("discards only the reviewed revision and retains it in saved history", async () => {
    await change(); const old = await getAssignedSession("AW-1"); await change();
    await expect(discardSessionRevision("AW-1", old.version)).rejects.toMatchObject({ code: "sessionChanged" });
    const latest = await getAssignedSession("AW-1"); await discardSessionRevision("AW-1", latest.version);
    expect((await getAssignedSession("AW-1")).hasRevision).toBe(false);
    expect((await liveRow()).program_id).toBe("PR-1001");
    expect((await listSessionVersions("AW-1")).some(v => (v.snapshot as any).templates[0].sessionName === "Changed core")).toBe(true);
  });
});
describe("calendar move/copy", () => {
  it("copies both sessions atomically as private independent drafts and retries idempotently", async () => {
    const input = await operation(); const first = await applyCalendarSessions(input); const retry = await applyCalendarSessions(input);
    expect(retry).toEqual(first); expect(await rows("select * from assigned_workouts where client_id=$1", [clientId])).toHaveLength(4);
    const copies = await rows("select * from assigned_workouts where is_draft=true"); expect(copies).toHaveLength(2); expect(copies.every(c => c.program_id !== "PR-1001")).toBe(true);
    for (const c of copies) { const editor = await getAssignedSession(c.assigned_workout_id); expect(editor.templates[0].setPrescriptions.map(s => s.time)).toEqual(["30", "45"]); }
    await expect(applyCalendarSessions({ ...input, action: "move" })).rejects.toMatchObject({ code: "requestChanged" });
  });
  it("moves all dates together and refuses stale or cross-athlete selections", async () => {
    const input = await operation("move"); await applyCalendarSessions(input);
    const moved = await rows("select scheduled_date from assigned_workouts where client_id=$1 order by assigned_workout_id", [clientId]);
    expect(moved.map(r => new Date(Number(r.scheduled_date)).toISOString())).toEqual(["2026-10-09T16:00:00.000Z", "2026-10-10T16:00:00.000Z"]);
    await expect(applyCalendarSessions({ ...input, requestId: randomUUID() })).rejects.toMatchObject({ code: "sessionChanged" });
    const other = await operation(); other.items[1].id = "AW-other";
    await expect(applyCalendarSessions(other)).rejects.toMatchObject({ status: 409 });
  });
  it("rolls back earlier changes if any selected session starts or has a private revision", async () => {
    const input = await operation("move");
    await pool.query("insert into workout_logs (log_id,assigned_workout_id) values ('LOG-2','AW-2')");
    await expect(applyCalendarSessions(input)).rejects.toMatchObject({ code: "sessionAlreadyStarted" });
    expect((await rows("select scheduled_date from assigned_workouts where assigned_workout_id='AW-1'"))[0].scheduled_date).toBe("1790092800000");
    expect(await rows("select * from session_versions")).toHaveLength(0);
    await pool.query("delete from workout_logs"); await change();
    await expect(applyCalendarSessions(await operation())).rejects.toMatchObject({ code: "reviewRevisionFirst" });
  });
  it("checks authorization and rejects impossible dates at the API boundary", async () => {
    const unauthorized = makeRes(); await handler(makeReq({ query: { clientId } }) as any, unauthorized as any); expect(unauthorized.statusCode).toBe(401);
    const bad = await operation(); bad.items[0].date = "2026-02-31"; const res = makeRes();
    await handler(makeReq({ method: "POST", body: bad, headers: { "x-coach-key": "test-secret" } }) as any, res as any); expect(res.statusCode).toBe(400);
  });
});
