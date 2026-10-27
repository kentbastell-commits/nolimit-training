import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../client.ts";
import { assignedWorkouts, calendarOperations, exerciseAlternates, exercises, programs, setPrescriptions, workoutTemplates } from "../schema.ts";
import { sessionState, SessionEditError } from "./assignedSession.ts";
import { humanTranslationText, queueTranslations } from "../contentTranslations.ts";
import { invalidateCache } from "../../../api/_cache.ts";

export type SaveSessionInput = { assignedWorkoutId: string; version: string; name: string; requestId: string; source: "published" | "draft" };

export async function saveSessionToLibrary(input: SaveSessionInput) {
  const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const result = await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`calendar-operation:${input.requestId}`}, 0))`);
    const [previous] = await tx.select().from(calendarOperations).where(eq(calendarOperations.requestId, input.requestId));
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new SessionEditError(409, "requestChanged");
      return previous.result as { success: true; programId: string; name: string; exerciseCount: number };
    }
    const [assignment] = await tx.select().from(assignedWorkouts).where(eq(assignedWorkouts.assignedWorkoutId, input.assignedWorkoutId)).for("update");
    if (!assignment) throw new SessionEditError(404, "sessionUnavailable");
    const state = await sessionState(assignment, tx);
    if (input.version !== state.version) throw new SessionEditError(409, "sessionChanged");
    if (input.source === "published" && assignment.isDraft) throw new SessionEditError(409, "sessionChanged");
    if (input.source === "draft" && !assignment.isDraft && !state.revision) throw new SessionEditError(409, "sessionChanged");
    if (input.source === "draft" && state.conflicted) throw new SessionEditError(409, "reviewRevisionFirst");
    const source = input.source === "published" ? state.live : state.effective;
    const [originalProgram] = await tx.select().from(programs).where(eq(programs.programId, source.workout.programId!));
    const originals = await tx.select().from(workoutTemplates).where(and(eq(workoutTemplates.programId, source.workout.programId!), eq(workoutTemplates.week, source.workout.week!), eq(workoutTemplates.day, source.workout.day!))).orderBy(workoutTemplates.exerciseOrder, workoutTemplates.templateId).for("share");
    if (!originalProgram || !originals.length || originals.some(row => row.testTemplateId || !row.exerciseId)) throw new SessionEditError(400, "sessionUnavailable");
    const programId = `PR-LIB-${randomUUID()}`;
    const oldName = source.workout.sessionName || originals[0].sessionName || originalProgram.name;
    const nameCn = input.name === oldName ? source.workout.sessionNameCn || originals[0].sessionNameCn || originalProgram.nameCn : null;
    await tx.insert(programs).values({ programId, name: input.name, nameCn, goal: source.workout.sessionGoal || originals[0].sessionGoal || "", goalCn: source.workout.sessionGoalCn || originals[0].sessionGoalCn,
      coachId: originalProgram.coachId, sport: originalProgram.sport, level: originalProgram.level,
      durationWeeks: 1, sessionsPerWeek: 1, productType: "Single Workout", status: "Active", productStatus: "Draft",
      libraryVisible: true, publicStoreVisible: false, assignmentOnly: false, builtForClient: null, builtForTeam: null });
    const library = await tx.select().from(exercises).where(inArray(exercises.exerciseId, originals.map(r => r.exerciseId!)));
    const templateIds: string[] = [];
    for (const row of originals) {
      const templateId = `WT-${randomUUID()}`; templateIds.push(templateId);
      const exercise = library.find(e => e.exerciseId === row.exerciseId);
      // Capture library instructions only when the session has no custom
      // instructions. Metadata and explicitly authored bilingual notes survive.
      const fallback = !humanTranslationText(row.coachingNotes, "notes") && exercise ? humanTranslationText(exercise.coachingCues || exercise.technicalCues, "notes") : "";
      const notes = fallback ? [row.coachingNotes, fallback].filter(Boolean).join("\n\n") : row.coachingNotes;
      const notesCn = row.coachingNotesCn || (fallback && exercise ? humanTranslationText(exercise.coachingCuesCn || exercise.technicalCuesCn, "notes") : null);
      await tx.insert(workoutTemplates).values({ ...row, templateId, programId, week: 1, day: 1, isSingleWorkout: true,
        sessionName: input.name, sessionNameCn: nameCn, coachingNotes: notes, coachingNotesCn: notesCn });
      const sets = await tx.select().from(setPrescriptions).where(eq(setPrescriptions.templateId, row.templateId));
      if (sets.length) await tx.insert(setPrescriptions).values(sets.map(s => ({ ...s, templateId, prescriptionId: `SP-${randomUUID()}` })));
      const alternates = await tx.select().from(exerciseAlternates).where(eq(exerciseAlternates.templateId, row.templateId));
      if (alternates.length) await tx.insert(exerciseAlternates).values(alternates.map(a => ({ ...a, templateId, alternateId: `EA-${randomUUID()}` })));
    }
    const result = { success: true as const, programId, name: input.name, exerciseCount: originals.length };
    await tx.insert(calendarOperations).values({ requestId: input.requestId, fingerprint, result, createdAt: Date.now() });
    return { ...result, templateIds };
  });
  for (const key of ["programs", "programTemplates", "workoutTemplatesRaw", "programSessionTypes", "workoutDetails"]) invalidateCache(key);
  queueTranslations("programs", [result.programId]);
  if ("templateIds" in result) queueTranslations("workoutTemplates", result.templateIds);
  return { success: true, programId: result.programId, name: result.name, exerciseCount: result.exerciseCount };
}
