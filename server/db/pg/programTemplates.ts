import { inArray } from "drizzle-orm";
import { db } from "../client.ts";
import {
  workoutTemplates,
  setPrescriptions,
  exerciseAlternates,
  exercises,
} from "../schema.ts";
import { str } from "./_util.ts";
import { parseTemplateMeta, toNum } from "../templateMeta.ts";
import type { ParsedMeta, ProgramExerciseInput } from "../templateMeta.ts";
import type { TemplateRow } from "../dto.ts";
import type {
  HandlerResult,
  CreateWorkoutTemplateInput,
} from "../repositories/programTemplates.ts";

type Row = typeof workoutTemplates.$inferSelect;

export async function listAllTemplateRows(): Promise<TemplateRow[]> {
  const rows = await db.select().from(workoutTemplates);
  return rows.map(
    (r: Row): TemplateRow => ({
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
    exercises: exerciseInputs,
  } = input;

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

  // Child tables: best-effort, reported but never fail the main save.
  await extendKnownWithAlternates(known, metas);
  const setRows: (typeof setPrescriptions.$inferInsert)[] = [];
  const altRows: (typeof exerciseAlternates.$inferInsert)[] = [];

  templateRows.forEach((row, index) => {
    const meta = metas[index];
    if (!meta) return;

    meta.setPrescriptions.forEach((set) => {
      const rest = toNum(set.rest);
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
        rest: rest === undefined ? null : String(rest),
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
  sessions: Array<Omit<CreateWorkoutTemplateInput, "programId" | "programRecordId">>;
}): Promise<HandlerResult> {
  const { programRecordId, sessions } = input;

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

  await extendKnownWithAlternates(known, metas);
  const setRows: (typeof setPrescriptions.$inferInsert)[] = [];
  const altRows: (typeof exerciseAlternates.$inferInsert)[] = [];
  templateRows.forEach((row, index) => {
    const meta = metas[index];
    if (!meta) return;
    meta.setPrescriptions.forEach((set) => {
      const rest = toNum(set.rest);
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
        rest: rest === undefined ? null : String(rest),
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
