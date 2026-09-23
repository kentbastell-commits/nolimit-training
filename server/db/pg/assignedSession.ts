import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../client.ts";
import { assignedWorkouts, programs, workoutLogs, workoutTemplates, sessionRevisions, sessionVersions } from "../schema.ts";
import { listPrograms } from "./programs.ts";
import { createWorkoutTemplatesBulk } from "./programTemplates.ts";
import { listProgramTemplates, type BulkSessionInput } from "../repositories/programTemplates.ts";
import { humanTranslationText, queueTranslations } from "../contentTranslations.ts";

export type SessionTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Assigned = typeof assignedWorkouts.$inferSelect;
export class SessionEditError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}

export async function editorFor(workout: Assigned) {
  const [allPrograms, allTemplates] = await Promise.all([
    listPrograms(), listProgramTemplates(workout.programId || ""),
  ]);
  const program = allPrograms.find(p => p.programId === workout.programId);
  const templates = allTemplates.filter(t => t.week === workout.week && t.day === workout.day)
    .sort((a, b) => Number(a.order) - Number(b.order) || a.recordId.localeCompare(b.recordId));
  if (!program || !templates.length) throw new SessionEditError(404, "sessionUnavailable");
  // Translated copies can arrive asynchronously; only coach-authored source
  // data participates in the optimistic concurrency token.
  const version = createHash("sha256").update(JSON.stringify({
    id: workout.assignedWorkoutId, client: workout.clientId, program: workout.programId,
    date: workout.scheduledDate, status: workout.completionStatus, isDraft: workout.isDraft,
    templates: templates.map(({ sessionNameCn: _cn, notesCn: _notesCn, ...row }) => row),
  })).digest("hex");
  return { workout, program, templates, version };
}

export async function sessionState(workout: Assigned, tx: SessionTx | typeof db = db) {
  const live = await editorFor(workout);
  const [revision] = await tx.select().from(sessionRevisions).where(eq(sessionRevisions.assignedWorkoutId, workout.assignedWorkoutId));
  const effective = revision ? await editorFor({ ...(revision.workout as Assigned), scheduledDate: workout.scheduledDate }) : live;
  const version = revision ? createHash("sha256").update(`${live.version}:${revision.revisionId}`).digest("hex") : live.version;
  return { live, revision, effective, version, conflicted: !!revision && revision.baseVersion !== live.version };
}
export async function getAssignedSession(id: string, latest = false) {
  const [workout] = await db.select().from(assignedWorkouts).where(eq(assignedWorkouts.assignedWorkoutId, id));
  if (!workout) throw new SessionEditError(404, "sessionUnavailable");
  const state = await sessionState(workout);
  return { ...(latest && state.conflicted ? state.live : state.effective), version: state.version, hasRevision: !!state.revision, conflicted: state.conflicted };
}
export async function listSessionVersions(id: string) {
  return db.select().from(sessionVersions).where(eq(sessionVersions.assignedWorkoutId, id)).orderBy(desc(sessionVersions.createdAt), desc(sessionVersions.id)).limit(50);
}
export async function discardSessionRevision(id: string, version: string) {
  await db.transaction(async tx => {
    const [workout] = await tx.select().from(assignedWorkouts).where(eq(assignedWorkouts.assignedWorkoutId, id)).for("update");
    if (!workout) throw new SessionEditError(404, "sessionUnavailable");
    const state = await sessionState(workout, tx);
    if (!state.revision || state.version !== version) throw new SessionEditError(409, "sessionChanged");
    await rememberSession(tx, state.effective, "Draft");
    await tx.delete(sessionRevisions).where(eq(sessionRevisions.assignedWorkoutId, id));
  });
  return { success: true };
}
export async function rememberSession(tx: SessionTx, snapshot: Awaited<ReturnType<typeof editorFor>>, kind: string) {
  await tx.insert(sessionVersions).values({ id: `SV-${randomUUID()}`, assignedWorkoutId: snapshot.workout.assignedWorkoutId,
    createdAt: Date.now(), kind, snapshot });
}
export async function assertUnstarted(tx: SessionTx, workout: Assigned) {
  const logs = await tx.select({ id: workoutLogs.logId }).from(workoutLogs).where(eq(workoutLogs.assignedWorkoutId, workout.assignedWorkoutId)).limit(1);
  if (workout.completionStatus === "Completed" || logs.length) throw new SessionEditError(409, "sessionAlreadyStarted");
}
export async function publishSessionRevision(tx: SessionTx, workout: Assigned) {
  const state = await sessionState(workout, tx);
  if (!state.revision || state.conflicted) throw new SessionEditError(409, "sessionChanged");
  await assertUnstarted(tx, workout);
  await rememberSession(tx, state.live, "Published");
  const { assignedWorkoutId: _id, ...changes } = state.revision.workout as Assigned;
  // Athlete activity and date always come from the current locked assignment.
  await tx.update(assignedWorkouts).set({ ...changes, scheduledDate: workout.scheduledDate,
    completionStatus: workout.completionStatus, clientNotes: workout.clientNotes, clientNotesCn: workout.clientNotesCn,
    sessionRpe: workout.sessionRpe, sessionDuration: workout.sessionDuration, sessionLoad: workout.sessionLoad,
    coachReviewed: workout.coachReviewed, isDraft: false }).where(eq(assignedWorkouts.assignedWorkoutId, workout.assignedWorkoutId));
  await tx.delete(sessionRevisions).where(eq(sessionRevisions.assignedWorkoutId, workout.assignedWorkoutId));
}

export async function saveAssignedSession(id: string, expectedVersion: string, session: BulkSessionInput, options: { draft?: boolean; reviewed?: boolean } = {}) {
  const programId = `PR-AS-${randomUUID()}`;
  await db.transaction(async tx => {
    const [workout] = await tx.select().from(assignedWorkouts)
      .where(eq(assignedWorkouts.assignedWorkoutId, id)).for("update");
    if (!workout) throw new SessionEditError(404, "sessionUnavailable");
    await assertUnstarted(tx, workout);
    const state = await sessionState(workout, tx);
    if (expectedVersion !== state.version || (state.conflicted && !options.reviewed)) throw new SessionEditError(409, "sessionChanged");
    const current = state.effective;
    await rememberSession(tx, current, state.revision || workout.isDraft ? "Draft" : "Published");
    if (state.revision && !options.draft) await rememberSession(tx, state.live, "Published");
    const originals = await tx.select().from(workoutTemplates).where(and(
      eq(workoutTemplates.programId, current.workout.programId!), eq(workoutTemplates.week, current.workout.week!), eq(workoutTemplates.day, current.workout.day!)
    ));
    // A private, immutable program version keeps the released mini program's
    // programId/week/day API working. Each save forks; copies and old history
    // continue to resolve their previous version. No shared template is changed.
    await tx.insert(programs).values({ programId, name: session.sessionName,
      nameCn: session.sessionNameCn || null, productType: "Single Workout",
      durationWeeks: 1, sessionsPerWeek: 1, builtForClient: workout.clientId,
      coachId: current.program.coach, status: "Active", productStatus: "Draft",
      libraryVisible: false, publicStoreVisible: false, assignmentOnly: true });
    const result = await createWorkoutTemplatesBulk({ programId, programRecordId: programId,
      sessions: [{ ...session, week: 1, day: 1, isSingleWorkout: true, testTemplateId: undefined }],
    }, tx);
    if (result.status !== 200) throw new SessionEditError(500, "sessionSaveFailed");
    const copies = await tx.select().from(workoutTemplates).where(eq(workoutTemplates.programId, programId));
    for (const copy of copies) {
      const original = originals.find(row => row.exerciseId === copy.exerciseId && row.exerciseOrder === copy.exerciseOrder);
      if (!original) continue;
      await tx.update(workoutTemplates).set({
        coachingNotesCn: copy.coachingNotesCn || (humanTranslationText(original.coachingNotes, "notes") === humanTranslationText(copy.coachingNotes, "notes") ? original.coachingNotesCn : null),
        sessionNotesCn: original.sessionNotes === copy.sessionNotes ? original.sessionNotesCn : null,
        sessionGoalCn: original.sessionGoal === copy.sessionGoal ? original.sessionGoalCn : null,
      }).where(eq(workoutTemplates.templateId, copy.templateId));
    }
    const changes = { programId, week: 1, day: 1,
      sessionName: session.sessionName, sessionNameCn: session.sessionNameCn || null,
      sessionType: session.sessionType || "Strength", sessionGoal: session.sessionGoal || "",
      sessionGoalCn: (workout.sessionGoal || "") === (session.sessionGoal || "") ? workout.sessionGoalCn : null,
      coachNotes: session.sessionNotes || "",
      coachNotesCn: (workout.coachNotes || "") === (session.sessionNotes || "") ? workout.coachNotesCn : null,
      intensity: session.intensity || "Moderate",
      estimatedDuration: Number(session.estimatedDuration) > 0 ? Math.round(Number(session.estimatedDuration)) : null,
    };
    if (options.draft && !workout.isDraft) {
      const revision = { assignedWorkoutId: id, revisionId: randomUUID(), baseVersion: state.live.version,
        updatedAt: Date.now(), workout: { ...workout, ...changes } };
      await tx.insert(sessionRevisions).values(revision).onConflictDoUpdate({ target: sessionRevisions.assignedWorkoutId, set: revision });
    } else {
      await tx.update(assignedWorkouts).set(changes).where(eq(assignedWorkouts.assignedWorkoutId, id));
      await tx.delete(sessionRevisions).where(eq(sessionRevisions.assignedWorkoutId, id));
    }
  });
  const rows = await db.select({ id: workoutTemplates.templateId }).from(workoutTemplates).where(eq(workoutTemplates.programId, programId));
  queueTranslations("programs", [programId]);
  queueTranslations("workoutTemplates", rows.map(row => row.id));
  queueTranslations("assignedWorkouts", [id]);
  return { success: true, programId };
}
