import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../client.ts";
import { assignedWorkouts, programs, workoutLogs, workoutTemplates } from "../schema.ts";
import { listPrograms } from "./programs.ts";
import { createWorkoutTemplatesBulk } from "./programTemplates.ts";
import { listProgramTemplates, type BulkSessionInput } from "../repositories/programTemplates.ts";
import { humanTranslationText, queueTranslations } from "../contentTranslations.ts";

type Assigned = typeof assignedWorkouts.$inferSelect;
export class SessionEditError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}

async function editorFor(workout: Assigned) {
  const [allPrograms, allTemplates] = await Promise.all([
    listPrograms(), listProgramTemplates(workout.programId || ""),
  ]);
  const program = allPrograms.find(p => p.programId === workout.programId);
  const templates = allTemplates.filter(t => t.week === workout.week && t.day === workout.day);
  if (!program || !templates.length) throw new SessionEditError(404, "sessionUnavailable");
  // Translated copies can arrive asynchronously; only coach-authored source
  // data participates in the optimistic concurrency token.
  const version = createHash("sha256").update(JSON.stringify({
    id: workout.assignedWorkoutId, client: workout.clientId, program: workout.programId,
    date: workout.scheduledDate, status: workout.completionStatus,
    templates: templates.map(({ sessionNameCn: _cn, notesCn: _notesCn, ...row }) => row),
  })).digest("hex");
  return { workout, program, templates, version };
}

export async function getAssignedSession(id: string) {
  const [workout] = await db.select().from(assignedWorkouts).where(eq(assignedWorkouts.assignedWorkoutId, id));
  if (!workout) throw new SessionEditError(404, "sessionUnavailable");
  return editorFor(workout);
}

export async function saveAssignedSession(id: string, expectedVersion: string, session: BulkSessionInput) {
  const programId = `PR-AS-${randomUUID()}`;
  await db.transaction(async tx => {
    const [workout] = await tx.select().from(assignedWorkouts)
      .where(eq(assignedWorkouts.assignedWorkoutId, id)).for("update");
    if (!workout) throw new SessionEditError(404, "sessionUnavailable");
    const logs = await tx.select({ id: workoutLogs.logId }).from(workoutLogs)
      .where(eq(workoutLogs.assignedWorkoutId, id)).limit(1);
    if (workout.completionStatus === "Completed" || logs.length) {
      throw new SessionEditError(409, "sessionAlreadyStarted");
    }
    const current = await editorFor(workout);
    if (expectedVersion !== current.version) throw new SessionEditError(409, "sessionChanged");
    const originals = await tx.select().from(workoutTemplates).where(and(
      eq(workoutTemplates.programId, workout.programId!), eq(workoutTemplates.week, workout.week!), eq(workoutTemplates.day, workout.day!)
    ));
    // A private, immutable program version keeps the released mini program's
    // programId/week/day API working. Each save forks; copies and old history
    // continue to resolve their previous version. No shared template is changed.
    await tx.insert(programs).values({ programId, name: session.sessionName,
      nameCn: session.sessionNameCn || null, productType: "Single Workout",
      durationWeeks: 1, sessionsPerWeek: 1, builtForClient: workout.clientId,
      coachId: current.program.coach, status: "Active", productStatus: "Draft",
      libraryVisible: false, publicStoreVisible: false });
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
    await tx.update(assignedWorkouts).set({ programId, week: 1, day: 1,
      sessionName: session.sessionName, sessionNameCn: session.sessionNameCn || null,
      sessionType: session.sessionType || "Strength", sessionGoal: session.sessionGoal || "",
      sessionGoalCn: (workout.sessionGoal || "") === (session.sessionGoal || "") ? workout.sessionGoalCn : null,
      coachNotes: session.sessionNotes || "",
      coachNotesCn: (workout.coachNotes || "") === (session.sessionNotes || "") ? workout.coachNotesCn : null,
      intensity: session.intensity || "Moderate",
      estimatedDuration: Number(session.estimatedDuration) > 0 ? Math.round(Number(session.estimatedDuration)) : null,
    }).where(eq(assignedWorkouts.assignedWorkoutId, id));
  });
  const rows = await db.select({ id: workoutTemplates.templateId }).from(workoutTemplates).where(eq(workoutTemplates.programId, programId));
  queueTranslations("programs", [programId]);
  queueTranslations("workoutTemplates", rows.map(row => row.id));
  queueTranslations("assignedWorkouts", [id]);
  return { success: true, programId };
}
