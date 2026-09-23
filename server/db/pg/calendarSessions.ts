import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../client.ts";
import { assignedWorkouts, calendarOperations, exerciseAlternates, programs, sessionRevisions, setPrescriptions, workoutLogs, workoutTemplates } from "../schema.ts";
import { assertUnstarted, editorFor, rememberSession, SessionEditError, type SessionTx } from "./assignedSession.ts";
import { dayStartMs } from "./_util.ts";
import { invalidateCalendar } from "./calendarDrafts.ts";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
type Assigned = typeof assignedWorkouts.$inferSelect;
function token(row: Assigned) {
  const { sessionNameCn, sessionGoalCn, coachNotesCn, clientNotesCn, ...source } = row;
  return hash(source);
}
export async function reviewCalendarSessions(clientId: string) {
  const workouts = await db.select().from(assignedWorkouts).where(eq(assignedWorkouts.clientId, clientId)).orderBy(assignedWorkouts.scheduledDate, assignedWorkouts.assignedWorkoutId);
  const ids = workouts.map(w => w.assignedWorkoutId);
  const logs = ids.length ? await db.select({ id: workoutLogs.assignedWorkoutId }).from(workoutLogs).where(inArray(workoutLogs.assignedWorkoutId, ids)) : [];
  const revisions = ids.length ? await db.select({ id: sessionRevisions.assignedWorkoutId }).from(sessionRevisions).where(inArray(sessionRevisions.assignedWorkoutId, ids)) : [];
  return { items: workouts.map(w => ({ id: w.assignedWorkoutId, name: w.sessionName || "Workout", nameCn: w.sessionNameCn,
    date: w.scheduledDate, draft: w.isDraft, hasRevision: revisions.some(r => r.id === w.assignedWorkoutId),
    locked: w.completionStatus === "Completed" || logs.some(l => l.id === w.assignedWorkoutId), version: token(w) })) };
}
async function cloneSession(tx: SessionTx, source: Assigned) {
  const [program] = await tx.select().from(programs).where(eq(programs.programId, source.programId!));
  if (!program) throw new SessionEditError(409, "sessionUnavailable");
  const programId = `PR-CP-${randomUUID()}`;
  await tx.insert(programs).values({ ...program, programId, name: source.sessionName || program.name,
    builtForClient: source.clientId, builtForTeam: null, assignmentOnly: true, libraryVisible: false, publicStoreVisible: false,
    durationWeeks: 1, sessionsPerWeek: 1, productType: "Single Workout", productStatus: "Draft" });
  const templates = await tx.select().from(workoutTemplates).where(and(eq(workoutTemplates.programId, source.programId!), eq(workoutTemplates.week, source.week!), eq(workoutTemplates.day, source.day!)));
  if (!templates.length) throw new SessionEditError(409, "sessionUnavailable");
  for (const row of templates) {
    const templateId = `WT-${randomUUID()}`;
    await tx.insert(workoutTemplates).values({ ...row, templateId, programId, week: 1, day: 1 });
    const sets = await tx.select().from(setPrescriptions).where(eq(setPrescriptions.templateId, row.templateId));
    if (sets.length) await tx.insert(setPrescriptions).values(sets.map(s => ({ ...s, templateId, prescriptionId: `SP-${randomUUID()}` })));
    const alternates = await tx.select().from(exerciseAlternates).where(eq(exerciseAlternates.templateId, row.templateId));
    if (alternates.length) await tx.insert(exerciseAlternates).values(alternates.map(a => ({ ...a, templateId, alternateId: `EA-${randomUUID()}` })));
  }
  return programId;
}
export async function applyCalendarSessions(input: { clientId: string; requestId: string; action: "move" | "copy"; items: { id: string; version: string; date: string }[] }) {
  const fingerprint = hash(input);
  const result = await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`calendar-operation:${input.requestId}`}, 0))`);
    const [previous] = await tx.select().from(calendarOperations).where(eq(calendarOperations.requestId, input.requestId));
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new SessionEditError(409, "requestChanged");
      return previous.result;
    }
    const ids = input.items.map(i => i.id);
    const rows = await tx.select().from(assignedWorkouts).where(and(eq(assignedWorkouts.clientId, input.clientId), inArray(assignedWorkouts.assignedWorkoutId, ids))).orderBy(assignedWorkouts.assignedWorkoutId).for("update");
    if (rows.length !== ids.length) throw new SessionEditError(409, "sessionUnavailable");
    const changed: string[] = [];
    for (const row of rows) {
      const item = input.items.find(i => i.id === row.assignedWorkoutId)!;
      if (item.version !== token(row)) throw new SessionEditError(409, "sessionChanged");
      await assertUnstarted(tx, row);
      const [revision] = await tx.select().from(sessionRevisions).where(eq(sessionRevisions.assignedWorkoutId, row.assignedWorkoutId));
      // A pending revision must be explicitly reviewed before changing its dates
      // or copying it; never silently choose between the live and private plans.
      if (revision) throw new SessionEditError(409, "reviewRevisionFirst");
      if (input.action === "move") {
        await rememberSession(tx, await editorFor(row), row.isDraft ? "Draft" : "Published");
        await tx.update(assignedWorkouts).set({ scheduledDate: dayStartMs(item.date) }).where(eq(assignedWorkouts.assignedWorkoutId, row.assignedWorkoutId));
        changed.push(row.assignedWorkoutId);
      } else {
        const programId = await cloneSession(tx, row), id = `AW-${randomUUID()}`;
        await tx.insert(assignedWorkouts).values({ assignedWorkoutId: id, clientId: row.clientId, programId, week: 1, day: 1,
          sessionName: row.sessionName, sessionNameCn: row.sessionNameCn, sessionType: row.sessionType,
          sessionGoal: row.sessionGoal, sessionGoalCn: row.sessionGoalCn, coachNotes: row.coachNotes, coachNotesCn: row.coachNotesCn,
          intensity: row.intensity, estimatedDuration: row.estimatedDuration, scheduledDate: dayStartMs(item.date),
          completionStatus: "Scheduled", isDraft: true });
        changed.push(id);
      }
    }
    const result = { success: true, ids: changed };
    await tx.insert(calendarOperations).values({ requestId: input.requestId, fingerprint, result, createdAt: Date.now() });
    return result;
  });
  invalidateCalendar(); return result;
}
