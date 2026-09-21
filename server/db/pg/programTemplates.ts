import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { db } from "../client.ts";
import { queueTranslations } from "../contentTranslations.ts";
import {
  workoutTemplates,
  setPrescriptions,
  exerciseAlternates,
  exercises,
  assignedWorkouts,
} from "../schema.ts";
import { str } from "./_util.ts";
import { parseTemplateMeta, toNum } from "../templateMeta.ts";
import type { ParsedMeta, ProgramExerciseInput } from "../templateMeta.ts";
import type { SetPrescriptionDTO, TemplateRow } from "../dto.ts";
import type {
  HandlerResult,
  CreateWorkoutTemplateInput,
} from "../repositories/programTemplates.ts";

type Row = typeof workoutTemplates.$inferSelect;

/** Per-set rows grouped by template, as string DTOs (blank for null). */
export async function listSetPrescriptionsByTemplate(
  templateIds?: string[]
): Promise<Map<string, SetPrescriptionDTO[]>> {
  const rows =
    templateIds && templateIds.length
      ? await db.select().from(setPrescriptions).where(inArray(setPrescriptions.templateId, templateIds))
      : templateIds
        ? []
        : await db.select().from(setPrescriptions);
  const byTemplate = new Map<string, SetPrescriptionDTO[]>();
  for (const s of rows) {
    const key = str(s.templateId);
    if (!key) continue;
    const list = byTemplate.get(key) || [];
    list.push({
      setNumber: Number(s.setNumber) || list.length + 1,
      reps: str(s.reps),
      load: str(s.load),
      percent: s.percent == null ? "" : String(s.percent),
      percentMas: s.percentMas == null ? "" : String(s.percentMas),
      intensityMode: str(s.intensityMode),
      intensityValue: str(s.intensityValue),
      tempo: str(s.tempo),
      rest: str(s.rest),
      rpe: str(s.rpe),
      rir: str(s.rir),
      time: str(s.time),
      distance: str(s.distance),
    });
    byTemplate.set(key, list);
  }
  for (const list of byTemplate.values()) list.sort((a, b) => a.setNumber - b.setNumber);
  return byTemplate;
}

export async function listAllTemplateRows(): Promise<TemplateRow[]> {
  const [rows, sets] = await Promise.all([
    db.select().from(workoutTemplates),
    listSetPrescriptionsByTemplate(),
  ]);
  return rows.map(
    (r: Row): TemplateRow => ({
      setPrescriptions: sets.get(r.templateId) || [],
      targetSource: str(r.targetSource),
      targetMetric: str(r.targetMetric),
      targetPercent: r.targetPercent == null ? "" : String(r.targetPercent),
      targetAdjustment: r.targetAdjustment == null ? "" : String(r.targetAdjustment),
      autoTarget: r.autoTarget ?? false,
      displayTarget: str(r.displayTarget),
      recordId: r.templateId,
      programId: str(r.programId),
      programRecordIds: r.programId ? [r.programId] : [],
      week: r.week ?? 1,
      day: r.day ?? 1,
      sessionName: str(r.sessionName),
      sessionNameCn: str(r.sessionNameCn),
      sessionType: str(r.sessionType),
      sessionGoal: str(r.sessionGoal),
      sessionNotes: str(r.sessionNotes),
      estimatedDuration: str(r.estimatedDuration),
      intensity: str(r.intensity),
      isSingleWorkout: r.isSingleWorkout ?? false,
      testTemplateId: str(r.testTemplateId),
      exerciseName: str(r.exerciseName),
      exerciseId: str(r.exerciseId),
      // No record ids on Postgres — the business code IS the identifier.
      exerciseRecordId: str(r.exerciseId),
      order: r.exerciseOrder ?? 0,
      sets: str(r.sets),
      reps: str(r.reps),
      tempo: str(r.tempo),
      rest: str(r.rest),
      notes: str(r.coachingNotes),
    })
  );
}

/* ---------------------------------- writes -------------------------------- */
// Postgres impl of createWorkoutTemplate: one template row per exercise plus
// the parsed set-prescription / alternate child rows. Same semantics as the
// Feishu impl — child writes are best-effort and never fail the main save.
// On this backend programRecordId / exerciseRecordId carry business codes.

type Insert = typeof workoutTemplates.$inferInsert;

// Feishu used WT-<6 random digits> (no uniqueness constraint there); this is a
// PRIMARY KEY here, so add a unique timestamp+counter suffix.
let mintCounter = 0;
function mintId(prefix: string) {
  mintCounter += 1;
  return `${prefix}-${Date.now()}-${mintCounter}`;
}

function fillTemplateTranslations(rows: Insert[]) {
  queueTranslations("workoutTemplates", rows.map((r) => r.templateId));
}

// Alternates parsed from coaching notes aren't in the top-level exercise
// list, so the `known` FK-validation set must be extended with their codes
// too — otherwise every alternate's exercise link is silently written NULL
// on each builder save.
async function extendKnownWithAlternates(
  knownSet: Set<string>,
  parsed: ParsedMeta[]
) {
  const altCodes = Array.from(
    new Set(
      parsed
        .flatMap((m) => m.alternates)
        .flatMap((a) => [a.exerciseRecordId, a.exerciseId])
        .filter(Boolean)
        .map(String)
    )
  ).filter((c) => !knownSet.has(c));
  if (!altCodes.length) return;
  const rows = await db
    .select({ id: exercises.exerciseId })
    .from(exercises)
    .where(inArray(exercises.exerciseId, altCodes));
  for (const r of rows) knownSet.add(r.id);
}

// A test day carries no exercises — it is stored as ONE marker row whose
// test_template_id links the session to a test battery. Readers already
// tolerate exercise-less rows (they create the session and skip the exercise).
function buildTestMarkerRow(
  input: Pick<
    CreateWorkoutTemplateInput,
    | "programRecordId"
    | "week"
    | "day"
    | "sessionName"
    | "sessionNameCn"
    | "sessionType"
    | "sessionGoal"
    | "sessionNotes"
    | "intensity"
    | "isSingleWorkout"
  > & { testTemplateId: string }
): Insert {
  return {
    templateId: mintId("WT"),
    programId: input.programRecordId,
    testTemplateId: input.testTemplateId,
    week: Number(input.week),
    day: Number(input.day),
    sessionName: input.sessionName,
    sessionNameCn: String(input.sessionNameCn || ""),
    sessionType: String(input.sessionType || "Test"),
    sessionGoal: String(input.sessionGoal || ""),
    sessionNotes: String(input.sessionNotes || ""),
    intensity: String(input.intensity || "Moderate"),
    isSingleWorkout: Boolean(input.isSingleWorkout),
    status: "Active",
  };
}

export async function createWorkoutTemplate(
  input: CreateWorkoutTemplateInput
): Promise<HandlerResult> {
  const {
    programId,
    programRecordId,
    week,
    day,
    sessionName,
    sessionNameCn,
    sessionType,
    sessionGoal,
    sessionNotes,
    estimatedDuration,
    intensity,
    isSingleWorkout,
    testTemplateId,
    exercises: exerciseInputs,
  } = input;

  if (testTemplateId && exerciseInputs.length === 0) {
    const markerRow = buildTestMarkerRow({
      programRecordId,
      week,
      day,
      sessionName,
      sessionNameCn,
      sessionType,
      sessionGoal,
      sessionNotes,
      intensity,
      isSingleWorkout,
      testTemplateId: String(testTemplateId),
    });
    try {
      await db.insert(workoutTemplates).values([markerRow]);
    } catch (e: any) {
      return {
        status: 500,
        body: {
          error: "Failed to create workout template records",
          message: e?.message || String(e),
        },
      };
    }
    fillTemplateTranslations([markerRow]);
    return {
      status: 200,
      body: {
        success: true,
        recordsCreated: 1,
        programId,
        programRecordId,
        childWrites: {},
      },
    };
  }
  if (testTemplateId) {
    // Test day that also has exercises: keep the battery marker alongside
    // the exercise rows written below (best-effort; the exercises are the
    // main save).
    try {
      await db.insert(workoutTemplates).values([
        buildTestMarkerRow({
          programRecordId,
          week,
          day,
          sessionName,
          sessionNameCn,
          sessionType,
          sessionGoal,
          sessionNotes,
          intensity,
          isSingleWorkout,
          testTemplateId: String(testTemplateId),
        }),
      ]);
    } catch (e: any) {
      console.error("createWorkoutTemplate: test marker failed", e?.message || e);
    }
  }

  // Validate every exercise reference against the library in one query. The
  // FK is enforced here, and the Feishu impl throws the same message when a
  // lookup fails — the handler turns it into the legacy 500 "Server error".
  const codes = Array.from(
    new Set(
      exerciseInputs
        .flatMap((e: ProgramExerciseInput) => [e.exerciseRecordId, e.exerciseId])
        .filter(Boolean)
        .map(String)
    )
  );
  const known = new Set(
    codes.length
      ? (
          await db
            .select({ id: exercises.exerciseId })
            .from(exercises)
            .where(inArray(exercises.exerciseId, codes))
        ).map((r) => r.id)
      : []
  );

  const metas: ParsedMeta[] = [];
  const templateRows: Insert[] = exerciseInputs.map(
    (exercise: ProgramExerciseInput, index: number) => {
      const exerciseLinkId =
        (exercise.exerciseRecordId && known.has(String(exercise.exerciseRecordId))
          ? String(exercise.exerciseRecordId)
          : "") ||
        (exercise.exerciseId && known.has(String(exercise.exerciseId))
          ? String(exercise.exerciseId)
          : "");
      if (!exerciseLinkId) {
        throw new Error(
          `Exercise not found in Exercise Library: ${exercise.exerciseId}`
        );
      }

      const meta = parseTemplateMeta(exercise.coachingNotes || "");
      metas.push(meta);

      const durationNumber = Number(estimatedDuration);

      const row: Insert = {
        templateId: mintId("WT"),
        programId: programRecordId,
        exerciseId: exerciseLinkId,
        week: Number(week),
        day: Number(day),
        sessionName,
        sessionNameCn: String(sessionNameCn || ""),
        sessionType: String(sessionType || "Strength"),
        sessionGoal: String(sessionGoal || ""),
        sessionNotes: String(sessionNotes || ""),
        intensity: String(intensity || "Moderate"),
        isSingleWorkout: Boolean(isSingleWorkout),
        exerciseName: exercise.exerciseName || "",
        exerciseOrder: Number(exercise.order) || index + 1,
        sets: Number(exercise.sets) || 1,
        reps: String(exercise.reps || ""),
        tempo: String(exercise.tempo || ""),
        rest: String(exercise.rest || ""),
        coachingNotes: String(exercise.coachingNotes || ""),
        status: String(exercise.status || "Active"),
        isUnilateral: meta.isUnilateral,
        isAccessory: meta.isAccessory,
        sectionName: meta.sectionName || null,
        exerciseLabel: meta.exerciseLabel || null,
        groupType: meta.groupType || null,
        groupName: meta.groupName || null,
        trackingType: meta.trackingType || null,
        accessoryParent: meta.accessoryParent || null,
        accessoryColor: meta.accessoryColor || null,
        // Auto-target: the columns existed since the pg cutover but were
        // never written, so the library's "uses auto target" flags were dead
        // by the time a program was saved.
        targetSource: exercise.targetSource ? String(exercise.targetSource) : null,
        targetMetric: exercise.targetMetric ? String(exercise.targetMetric) : null,
        targetPercent: toNum(exercise.targetPercent) ?? null,
        targetAdjustment: toNum(exercise.targetAdjustment) ?? null,
        autoTarget: exercise.autoTarget === undefined ? null : Boolean(exercise.autoTarget),
        displayTarget: exercise.displayTarget ? String(exercise.displayTarget) : null,
        estimatedDuration:
          Number.isFinite(durationNumber) && durationNumber > 0
            ? Math.round(durationNumber)
            : null,
      };
      return row;
    }
  );

  try {
    await db.insert(workoutTemplates).values(templateRows);
  } catch (e: any) {
    return {
      status: 500,
      body: {
        error: "Failed to create workout template records",
        message: e?.message || String(e),
      },
    };
  }

  fillTemplateTranslations(templateRows);

  // Child tables: best-effort, reported but never fail the main save.
  await extendKnownWithAlternates(known, metas);
  const setRows: (typeof setPrescriptions.$inferInsert)[] = [];
  const altRows: (typeof exerciseAlternates.$inferInsert)[] = [];

  templateRows.forEach((row, index) => {
    const meta = metas[index];
    if (!meta) return;

    meta.setPrescriptions.forEach((set) => {
      setRows.push({
        prescriptionId: mintId("SP"),
        templateId: row.templateId,
        setNumber: set.setNumber,
        reps: set.reps || null,
        load: set.load || null,
        intensityValue: set.intensityValue || null,
        tempo: set.tempo || null,
        intensityMode: set.intensityMode || null,
        percent: toNum(set.percent) ?? null,
        percentMas: toNum(set.percentMas) ?? null,
        // Kept verbatim with its unit — this table is read back now.
        rest: set.rest || null,
        rpe: set.rpe || null,
        rir: set.rir || null,
        time: set.time || null,
        distance: set.distance || null,
      });
    });

    meta.alternates.forEach((alt) => {
      const altCode =
        (alt.exerciseRecordId && known.has(alt.exerciseRecordId)
          ? alt.exerciseRecordId
          : "") ||
        (alt.exerciseId && known.has(alt.exerciseId) ? alt.exerciseId : "");
      altRows.push({
        alternateId: mintId("ALT"),
        templateId: row.templateId,
        exerciseName: alt.exerciseName || null,
        exerciseId: altCode || null,
      });
    });
  });

  const childWrites: Record<string, any> = {};

  if (setRows.length > 0) {
    try {
      await db.insert(setPrescriptions).values(setRows);
      childWrites.setPrescriptions = { created: setRows.length, errors: [] };
    } catch (e: any) {
      childWrites.setPrescriptions = {
        created: 0,
        errors: [{ message: e?.message || String(e) }],
      };
    }
  }

  if (altRows.length > 0) {
    try {
      await db.insert(exerciseAlternates).values(altRows);
      childWrites.alternates = { created: altRows.length, errors: [] };
    } catch (e: any) {
      childWrites.alternates = {
        created: 0,
        errors: [{ message: e?.message || String(e) }],
      };
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      recordsCreated: templateRows.length,
      programId,
      programRecordId,
      childWrites,
    },
  };
}

// Bulk (whole-program) save — Postgres. pg writes are local/fast so this just
// aggregates every session's rows into 3 inserts (templates, set-prescriptions,
// alternates). Same per-row semantics as createWorkoutTemplate above.
export async function createWorkoutTemplatesBulk(input: {
  programId: string;
  programRecordId: string;
  // In-place edit: atomically swap the program's existing template rows for
  // the new set in one transaction. Children go with them via ON DELETE
  // CASCADE. This replaces the client-orchestrated capture-then-delete dance,
  // which duplicated the whole program when two saves overlapped (each wrote
  // a fresh copy while both deleted only the ORIGINAL rows — PR-1759 live).
  replaceExisting?: boolean;
  sessions: Array<Omit<CreateWorkoutTemplateInput, "programId" | "programRecordId">>;
}): Promise<HandlerResult> {
  const { programRecordId } = input;
  // One session per calendar day. If the client sends the same week/day
  // twice (a stale committed copy plus the live edit — PR-4418, 2026-09-19),
  // the LAST one is the coach's current version; writing both doubled every
  // exercise in the athlete's session. Single-workout programs and placed
  // test days are exempt (tests sit beside a session on the same day).
  const slotOf = (s: { week: unknown; day: unknown; isSingleWorkout?: unknown; testTemplateId?: string }) =>
    s.isSingleWorkout || s.testTemplateId ? "" : `${Number(s.week)}|${Number(s.day)}`;
  const lastForSlot = new Map<string, number>();
  input.sessions.forEach((s, i) => {
    const key = slotOf(s);
    if (key) lastForSlot.set(key, i);
  });
  const sessions = input.sessions.filter((s, index) => {
    const key = slotOf(s);
    return !key || lastForSlot.get(key) === index;
  });

  const allExercises = sessions.flatMap((s) => s.exercises);
  const codes = Array.from(
    new Set(
      allExercises
        .flatMap((e: ProgramExerciseInput) => [e.exerciseRecordId, e.exerciseId])
        .filter(Boolean)
        .map(String)
    )
  );
  const known = new Set(
    codes.length
      ? (
          await db
            .select({ id: exercises.exerciseId })
            .from(exercises)
            .where(inArray(exercises.exerciseId, codes))
        ).map((r) => r.id)
      : []
  );

  const metas: ParsedMeta[] = [];
  const templateRows: Insert[] = [];
  for (const session of sessions) {
    if (session.testTemplateId) {
      // Test day: a marker row carries the battery. A test day may ALSO hold
      // exercises (coach added a warm-up to a testing day) — those follow as
      // normal rows on the same week/day; the marker is never dropped. metas
      // stays aligned with templateRows for the child-table pass below.
      templateRows.push(
        buildTestMarkerRow({
          programRecordId,
          week: session.week,
          day: session.day,
          sessionName: session.sessionName,
          sessionNameCn: session.sessionNameCn,
          sessionType: session.sessionType,
          sessionGoal: session.sessionGoal,
          sessionNotes: session.sessionNotes,
          intensity: session.intensity,
          isSingleWorkout: session.isSingleWorkout,
          testTemplateId: String(session.testTemplateId),
        })
      );
      metas.push(parseTemplateMeta(""));
      if (session.exercises.length === 0) continue;
    }
    session.exercises.forEach((exercise: ProgramExerciseInput, index: number) => {
      const exerciseLinkId =
        (exercise.exerciseRecordId && known.has(String(exercise.exerciseRecordId))
          ? String(exercise.exerciseRecordId)
          : "") ||
        (exercise.exerciseId && known.has(String(exercise.exerciseId))
          ? String(exercise.exerciseId)
          : "");
      if (!exerciseLinkId) {
        throw new Error(`Exercise not found in Exercise Library: ${exercise.exerciseId}`);
      }
      const meta = parseTemplateMeta(exercise.coachingNotes || "");
      metas.push(meta);
      const durationNumber = Number(session.estimatedDuration);
      templateRows.push({
        templateId: mintId("WT"),
        programId: programRecordId,
        exerciseId: exerciseLinkId,
        week: Number(session.week),
        day: Number(session.day),
        sessionName: session.sessionName,
        sessionNameCn: String(session.sessionNameCn || ""),
        sessionType: String(session.sessionType || "Strength"),
        sessionGoal: String(session.sessionGoal || ""),
        sessionNotes: String(session.sessionNotes || ""),
        intensity: String(session.intensity || "Moderate"),
        isSingleWorkout: Boolean(session.isSingleWorkout),
        exerciseName: exercise.exerciseName || "",
        exerciseOrder: Number(exercise.order) || index + 1,
        sets: Number(exercise.sets) || 1,
        reps: String(exercise.reps || ""),
        tempo: String(exercise.tempo || ""),
        rest: String(exercise.rest || ""),
        coachingNotes: String(exercise.coachingNotes || ""),
        status: String(exercise.status || "Active"),
        isUnilateral: meta.isUnilateral,
        isAccessory: meta.isAccessory,
        sectionName: meta.sectionName || null,
        exerciseLabel: meta.exerciseLabel || null,
        groupType: meta.groupType || null,
        groupName: meta.groupName || null,
        trackingType: meta.trackingType || null,
        accessoryParent: meta.accessoryParent || null,
        accessoryColor: meta.accessoryColor || null,
        // Auto-target: the columns existed since the pg cutover but were
        // never written, so the library's "uses auto target" flags were dead
        // by the time a program was saved.
        targetSource: exercise.targetSource ? String(exercise.targetSource) : null,
        targetMetric: exercise.targetMetric ? String(exercise.targetMetric) : null,
        targetPercent: toNum(exercise.targetPercent) ?? null,
        targetAdjustment: toNum(exercise.targetAdjustment) ?? null,
        autoTarget: exercise.autoTarget === undefined ? null : Boolean(exercise.autoTarget),
        displayTarget: exercise.displayTarget ? String(exercise.displayTarget) : null,
        estimatedDuration:
          Number.isFinite(durationNumber) && durationNumber > 0
            ? Math.round(durationNumber)
            : null,
      });
    });
  }

  if (templateRows.length === 0) {
    return { status: 200, body: { success: true, recordsCreated: 0, sessionsSaved: 0, childWrites: {} } };
  }

  try {
    if (input.replaceExisting) {
      await db.transaction(async (tx) => {
        await tx
          .delete(workoutTemplates)
          .where(eq(workoutTemplates.programId, programRecordId));
        await tx.insert(workoutTemplates).values(templateRows);
        // An athlete's calendar shows assigned_workouts.session_name — a
        // COPY taken at assign time. Exercises are read live from the
        // templates, so an in-place edit updated the workout's content but
        // the calendar kept the old name ("still says Sunday's program").
        // Keep not-yet-completed assigned copies in step, per week/day.
        const bySlot = new Map<string, (typeof templateRows)[number]>();
        for (const row of templateRows) {
          // Single workouts are week 1 / day 1 rows too (a renamed one-off
          // calendar session is the reported case); only test-day markers
          // carry no session of their own.
          if (row.testTemplateId) continue;
          const key = `${row.week}|${row.day}`;
          if (!bySlot.has(key)) bySlot.set(key, row);
        }
        for (const row of bySlot.values()) {
          await tx
            .update(assignedWorkouts)
            .set({
              sessionName: row.sessionName,
              sessionNameCn: row.sessionNameCn || null,
              sessionType: row.sessionType,
              sessionGoal: row.sessionGoal,
              intensity: row.intensity,
              estimatedDuration: row.estimatedDuration ?? null,
            })
            .where(
              and(
                eq(assignedWorkouts.programId, input.programId || programRecordId),
                eq(assignedWorkouts.week, Number(row.week)),
                eq(assignedWorkouts.day, Number(row.day)),
                or(
                  isNull(assignedWorkouts.completionStatus),
                  ne(assignedWorkouts.completionStatus, "Completed")
                )
              )
            );
        }
      });
    } else {
      await db.insert(workoutTemplates).values(templateRows);
    }
  } catch (e: any) {
    return {
      status: 500,
      body: {
        error: "Failed to create workout template records",
        message: e?.message || String(e),
      },
    };
  }

  fillTemplateTranslations(templateRows);

  await extendKnownWithAlternates(known, metas);
  const setRows: (typeof setPrescriptions.$inferInsert)[] = [];
  const altRows: (typeof exerciseAlternates.$inferInsert)[] = [];
  templateRows.forEach((row, index) => {
    const meta = metas[index];
    if (!meta) return;
    meta.setPrescriptions.forEach((set) => {
      setRows.push({
        prescriptionId: mintId("SP"),
        templateId: row.templateId,
        setNumber: set.setNumber,
        reps: set.reps || null,
        load: set.load || null,
        intensityValue: set.intensityValue || null,
        tempo: set.tempo || null,
        intensityMode: set.intensityMode || null,
        percent: toNum(set.percent) ?? null,
        percentMas: toNum(set.percentMas) ?? null,
        // Kept verbatim with its unit — this table is read back now.
        rest: set.rest || null,
        rpe: set.rpe || null,
        rir: set.rir || null,
        time: set.time || null,
        distance: set.distance || null,
      });
    });
    meta.alternates.forEach((alt) => {
      const altCode =
        (alt.exerciseRecordId && known.has(alt.exerciseRecordId) ? alt.exerciseRecordId : "") ||
        (alt.exerciseId && known.has(alt.exerciseId) ? alt.exerciseId : "");
      altRows.push({
        alternateId: mintId("ALT"),
        templateId: row.templateId,
        exerciseName: alt.exerciseName || null,
        exerciseId: altCode || null,
      });
    });
  });

  const childWrites: Record<string, any> = {};
  if (setRows.length > 0) {
    try {
      await db.insert(setPrescriptions).values(setRows);
      childWrites.setPrescriptions = { created: setRows.length, errors: [] };
    } catch (e: any) {
      childWrites.setPrescriptions = { created: 0, errors: [{ message: e?.message || String(e) }] };
    }
  }
  if (altRows.length > 0) {
    try {
      await db.insert(exerciseAlternates).values(altRows);
      childWrites.alternates = { created: altRows.length, errors: [] };
    } catch (e: any) {
      childWrites.alternates = { created: 0, errors: [{ message: e?.message || String(e) }] };
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      recordsCreated: templateRows.length,
      sessionsSaved: sessions.length,
      childWrites,
    },
  };
}
