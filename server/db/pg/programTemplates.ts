import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "../client.ts";
import { fillTranslation } from "../translate.ts";
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

// ---- translate-on-write for athlete-visible coach text -------------------
// The coachingNotes blob mixes builder meta lines with the coach's actual
// cues; only the HUMAN lines go to the translator — a translated meta label
// would slip past the render-time strippers (their CN label list can't know
// every machine translation of "Tracking:").
const NOTE_META_LINE =
  /^(Section|Label|Superset|Circuit|Circuit Mode|Circuit Minutes|Tracking|Fields|Unilateral|Accessory|Accessory Parent|Accessory Color|Set Prescriptions|Alternate Exercises|Target[^:：]*)\s*[:：]/i;

function humanNoteText(notes: string): string {
  return String(notes || "")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !NOTE_META_LINE.test(line.trim()))
    .join("\n")
    .trim();
}

const hasCjk = (text: string) => /[一-鿿]/.test(text);
const emptyOnly = (col: any) => or(isNull(col), eq(col, ""));

// Best-effort, after the rows are committed: mirror the coach's English cue
// text and session names into the CN columns so a Chinese athlete's player
// isn't silently English. Fills EMPTY columns only; skips text that already
// contains Chinese (the coach wrote it bilingually themselves).
function fillTemplateTranslations(rows: Insert[]) {
  for (const row of rows) {
    const human = humanNoteText(String(row.coachingNotes || ""));
    if (human && !hasCjk(human)) {
      void fillTranslation(human, "zh", (zh) =>
        db
          .update(workoutTemplates)
          .set({ coachingNotesCn: zh })
          .where(
            and(
              eq(workoutTemplates.templateId, row.templateId),
              emptyOnly(workoutTemplates.coachingNotesCn)
            )
          )
      );
    }
    const sessionName = String(row.sessionName || "");
    if (sessionName && !row.sessionNameCn && !hasCjk(sessionName)) {
      void fillTranslation(sessionName, "zh", (zh) =>
        db
          .update(workoutTemplates)
          .set({ sessionNameCn: zh })
          .where(
            and(
              eq(workoutTemplates.templateId, row.templateId),
              emptyOnly(workoutTemplates.sessionNameCn)
            )
          )
      );
    }
  }
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

  fillTemplateTranslations(templateRows);

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
    if (session.testTemplateId && session.exercises.length === 0) {
      // Test day: single marker row, no exercise/meta processing. metas stays
      // aligned with templateRows for the child-table pass below.
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
      continue;
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

  fillTemplateTranslations(templateRows);

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
