import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../client.ts";
import { assignedTests, assignedWorkouts, programs, workoutTemplates, setPrescriptions, exerciseAlternates, testTemplates } from "../schema.ts";
import { createWorkoutTemplatesBulk } from "./programTemplates.ts";
import { dayStartMs } from "./_util.ts";
import { queueTranslations } from "../contentTranslations.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import type { BulkSessionInput } from "../repositories/programTemplates.ts";
import type { ScheduledWorkoutInput } from "../repositories/workouts.ts";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class CalendarDraftError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export function invalidateCalendar() {
  for (const key of ["workouts", "contentAssignments", "analytics", "programs", "workoutTemplatesRaw", "programSessionTypes"]) invalidateCache(key);
}

// Each assignment gets its own immutable source. Editing a library template or
// another athlete's plan cannot reveal unfinished work through a shared program.
export async function createCalendarDraft(input: {
  requestId: string; clientIds: string[]; sourceProgramId?: string;
  programName?: string; sessions?: BulkSessionInput[];
  scheduledWorkouts: ScheduledWorkoutInput[];
}) {
  const createdPrograms: string[] = [];
  const result = await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`calendar-draft:${input.requestId}`}, 0))`);
    let count = 0;
    for (const clientId of [...new Set(input.clientIds)]) {
      const programId = `PR-CD-${input.requestId}-${clientId}`;
      const [exists] = await tx.select().from(programs).where(eq(programs.programId, programId));
      // Stable request identity makes a retry after a lost response harmless.
      if (exists) { count += input.scheduledWorkouts.length; continue; }
      if (input.sourceProgramId) {
        const [source] = await tx.select().from(programs).where(eq(programs.programId, input.sourceProgramId));
        if (!source) throw new CalendarDraftError(404, "Program unavailable");
        await tx.insert(programs).values({ ...source, programId, builtForClient: clientId, builtForTeam: null,
          assignmentOnly: true, libraryVisible: false, publicStoreVisible: false, productStatus: "Draft" });
        const templates = await tx.select().from(workoutTemplates).where(eq(workoutTemplates.programId, input.sourceProgramId));
        for (const row of templates) {
          const templateId = `WT-${randomUUID()}`;
          await tx.insert(workoutTemplates).values({ ...row, templateId, programId });
          const sets = await tx.select().from(setPrescriptions).where(eq(setPrescriptions.templateId, row.templateId));
          if (sets.length) await tx.insert(setPrescriptions).values(sets.map(s => ({ ...s, templateId, prescriptionId: `SP-${randomUUID()}` })));
          const alternates = await tx.select().from(exerciseAlternates).where(eq(exerciseAlternates.templateId, row.templateId));
          if (alternates.length) await tx.insert(exerciseAlternates).values(alternates.map(a => ({ ...a, templateId, alternateId: `EA-${randomUUID()}` })));
        }
      } else {
        await tx.insert(programs).values({ programId, name: input.programName!, builtForClient: clientId,
          productType: input.sessions?.length === 1 ? "Single Workout" : "Online Coaching",
          assignmentOnly: true, libraryVisible: false, publicStoreVisible: false, productStatus: "Draft" });
        const saved = await createWorkoutTemplatesBulk({ programId, programRecordId: programId, sessions: input.sessions! }, tx);
        if (saved.status !== 200) throw new CalendarDraftError(400, "Could not save draft exercises");
      }
      const templates = await tx.select().from(workoutTemplates).where(eq(workoutTemplates.programId, programId));
      for (const w of input.scheduledWorkouts) {
        if (!templates.some(t => t.week === Number(w.week) && t.day === Number(w.day))) throw new CalendarDraftError(400, "A scheduled session is missing its exercises");
        if (w.testTemplateId) {
          await tx.insert(assignedTests).values({ assignedTestId: `AT-${randomUUID()}`, clientId, clientCode: clientId,
            testTemplateId: w.testTemplateId, assignedDate: dayStartMs(w.scheduledDate), isDraft: true });
        } else {
          await tx.insert(assignedWorkouts).values({ assignedWorkoutId: `AW-${randomUUID()}`, clientId, programId,
            week: Number(w.week), day: Number(w.day), sessionName: w.sessionName, sessionNameCn: w.sessionNameCn || null,
            sessionType: w.sessionType || "Strength", sessionGoal: w.sessionGoal || "", coachNotes: w.sessionNotes || "",
            estimatedDuration: Number(w.estimatedDuration) > 0 ? Math.round(Number(w.estimatedDuration)) : null,
            intensity: w.intensity || "Moderate", scheduledDate: dayStartMs(w.scheduledDate), completionStatus: "Scheduled", isDraft: true });
        }
        count++;
      }
      createdPrograms.push(programId);
    }
    return { success: true, recordsCreated: count };
  });
  if (createdPrograms.length) {
    const templates = await db.select({ id: workoutTemplates.templateId }).from(workoutTemplates).where(inArray(workoutTemplates.programId, createdPrograms));
    queueTranslations("programs", createdPrograms);
    queueTranslations("workoutTemplates", templates.map(t => t.id));
    const workouts = await db.select({ id: assignedWorkouts.assignedWorkoutId }).from(assignedWorkouts).where(inArray(assignedWorkouts.programId, createdPrograms));
    queueTranslations("assignedWorkouts", workouts.map(w => w.id));
  }
  invalidateCalendar();
  return result;
}

const revision = (row: unknown) => createHash("sha256").update(JSON.stringify(row)).digest("hex");
async function draftRows(clientId: string, tx: Tx | typeof db = db, lock = false) {
  const wq = tx.select().from(assignedWorkouts).where(and(eq(assignedWorkouts.clientId, clientId), eq(assignedWorkouts.isDraft, true))).orderBy(assignedWorkouts.assignedWorkoutId);
  const tq = tx.select().from(assignedTests).where(and(eq(assignedTests.clientId, clientId), eq(assignedTests.isDraft, true))).orderBy(assignedTests.assignedTestId);
  const workouts = await (lock ? wq.for("update") : wq);
  const tests = await (lock ? tq.for("update") : tq);
  // Translations arriving in the background do not invalidate a coach's review.
  return { workouts, tests, version: revision({ workouts: workouts.map(({ sessionNameCn, sessionGoalCn, coachNotesCn, clientNotesCn, ...row }) => row), tests }) };
}
export async function reviewCalendarDrafts(clientId: string) {
  const { workouts, tests, version } = await draftRows(clientId);
  const testIds = tests.map(t => t.testTemplateId).filter((id): id is string => !!id);
  const testNames = testIds.length ? await db.select({ id: testTemplates.testTemplateId, name: testTemplates.name }).from(testTemplates).where(inArray(testTemplates.testTemplateId, testIds)) : [];
  return { version, items: [
    ...workouts.map(w => ({ id: w.assignedWorkoutId, type: "workout", name: w.sessionName || "Workout", date: w.scheduledDate })),
    ...tests.map(t => ({ id: t.assignedTestId, type: "test", name: testNames.find(n => n.id === t.testTemplateId)?.name || "Physical test", date: t.assignedDate })),
  ].sort((a, b) => Number(a.date) - Number(b.date)) };
}
export async function publishCalendarDrafts(clientId: string, ids: string[], version: string) {
  const published = await db.transaction(async tx => {
    const current = await draftRows(clientId, tx, true);
    if (current.version !== version) throw new CalendarDraftError(409, "The calendar changed. Review the latest drafts before publishing.");
    const workoutIds = current.workouts.filter(w => ids.includes(w.assignedWorkoutId)).map(w => w.assignedWorkoutId);
    const testIds = current.tests.filter(t => ids.includes(t.assignedTestId)).map(t => t.assignedTestId);
    if (workoutIds.length + testIds.length !== ids.length) throw new CalendarDraftError(409, "A selected draft is no longer available.");
    if (workoutIds.length) await tx.update(assignedWorkouts).set({ isDraft: false }).where(inArray(assignedWorkouts.assignedWorkoutId, workoutIds));
    if (testIds.length) await tx.update(assignedTests).set({ isDraft: false }).where(inArray(assignedTests.assignedTestId, testIds));
    return ids.length;
  });
  invalidateCalendar();
  return { success: true, published };
}

// null = ordinary legacy/store program; [] = private, no published days.
// The old mini program sends program/week/day without clientCode, so keep that
// contract while refusing *every* unpublished day, including guessed URLs.
export async function publishedCalendarSlots(programId: string, clientCode = "") {
  const [program] = await db.select({ restricted: programs.assignmentOnly }).from(programs).where(eq(programs.programId, programId));
  if (!program?.restricted) return null;
  return db.select({ week: assignedWorkouts.week, day: assignedWorkouts.day }).from(assignedWorkouts).where(and(
    eq(assignedWorkouts.programId, programId), eq(assignedWorkouts.isDraft, false),
    clientCode ? eq(assignedWorkouts.clientId, clientCode) : undefined));
}
export async function hasDraftWorkout(ids: unknown[]) {
  const candidates = ids.filter((id): id is string => typeof id === "string" && Boolean(id));
  if (!candidates.length) return false;
  const rows = await db.select({ id: assignedWorkouts.assignedWorkoutId }).from(assignedWorkouts)
    .where(and(inArray(assignedWorkouts.assignedWorkoutId, candidates), eq(assignedWorkouts.isDraft, true))).limit(1);
  return rows.length > 0;
}
