// Postgres-backed exercises read + upsert. Returns the same DTO/response
// shapes as the Feishu impl so handlers/frontend don't change when
// DATA_BACKEND=postgres.
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "../client.ts";
import { exercises } from "../schema.ts";
import { fillTranslation } from "../translate.ts";
import type { ExerciseDTO, ExerciseListResult } from "../dto.ts";
import type {
  UpsertExerciseInput,
  UpsertExerciseResult,
} from "../repositories/exercises.ts";

type Row = typeof exercises.$inferSelect;

function rowToDto(r: Row): ExerciseDTO {
  const notes = r.coachingCues ?? "";
  return {
    recordId: r.exerciseId,
    exerciseId: r.exerciseId,
    exerciseName: r.name,
    exerciseNameCn: r.nameCn ?? "",
    videoUrl: r.shortVideoUrl ?? "",
    videoUrlCn: "",
    longVideoUrl: r.longVideoUrl ?? "",
    category: r.category ?? "",
    categoryCn: r.categoryCn ?? "",
    equipment: (r.equipment ?? []).join(", "),
    equipmentCn: "",
    movementPattern: r.movementPattern ?? "",
    movementPatternCn: "",
    primaryMuscles: r.primaryMuscles ?? "",
    primaryMusclesCn: r.primaryMusclesCn ?? "",
    technicalInstructionsCn: r.technicalCuesCn ?? "",
    coachingCuesCn: r.coachingCuesCn ?? "",
    commonMistakesCn: r.commonErrorsCn ?? "",
    notes,
    defaultMetric: r.defaultMetric ?? "",
    metricCategory: r.metricCategory ?? "",
    usesAutoTarget: r.useAutoTarget ?? false,
    status: r.status ?? (notes.startsWith("[Archived]") ? "Archived" : "Active"),
  };
}

export async function listExercises(): Promise<ExerciseListResult> {
  const rows = await db.select().from(exercises);
  return { exercises: rows.map(rowToDto), availableFields: [] };
}

/* ------------------------------- upsert ---------------------------------- */

// Same minting logic as the Feishu impl / old handler. Called with the same
// arguments too: an archive-only request without name or id throws here (the
// handler catches it as the same 500 "Server error" the old code produced).
function makeExerciseId(name: string) {
  const prefix = name
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "EX");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `EX-${prefix}-${random}`;
}

function makeMultiSelectField(value: string) {
  return String(value || "")
    .split(/[\/,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// The pg schema always has a cues column; report the canonical Feishu name so
// the response shape matches what the frontend saw on Feishu.
const PG_CUE_FIELD_NAME = "Professional Coaching Cues";

export async function upsertExercise(
  input: UpsertExerciseInput
): Promise<UpsertExerciseResult> {
  const {
    recordId,
    exerciseId,
    exerciseName,
    videoUrl,
    longVideoUrl,
    category,
    equipment,
    movementPattern,
    muscleGroup,
    notes,
    archive,
  } = input;

  const archivedNotes = String(notes || "").startsWith("[Archived]")
    ? String(notes || "")
    : `[Archived]\n${String(notes || "")}`.trim();

  // On Postgres the business code IS the id; recordId (frontend param) carries
  // it in pg mode. New records mint one exactly like the old handler.
  const code = recordId || exerciseId || makeExerciseId(exerciseName as string);

  const name = exerciseName || "";
  const set: Partial<typeof exercises.$inferInsert> = {
    name,
    status: archive ? "Archived" : "Active",
    coachingCues: archive ? archivedNotes : notes || "",
  };

  const shortVideo = String(videoUrl || "").trim();
  if (shortVideo) set.shortVideoUrl = shortVideo;
  const longVideo = String(longVideoUrl || "").trim();
  if (longVideo) set.longVideoUrl = longVideo;
  if (category) set.category = category;
  const equipmentList = makeMultiSelectField(equipment || "");
  if (equipmentList.length > 0) set.equipment = equipmentList;
  if (movementPattern) set.movementPattern = movementPattern;
  if (muscleGroup) set.primaryMuscles = muscleGroup;

  // Mirror the old handler's required-field value check: an empty Exercise
  // Name (only reachable on archive-only requests) was a 400 there too.
  if (!name) {
    return {
      success: false,
      status: 400,
      body: {
        error: "Exercise Library table is missing required fields",
        missingRequiredFields: ["Exercise Name"],
        availableFields: [],
        fieldsAttempted: { ...set, exerciseId: code },
      },
    };
  }

  if (recordId) {
    // Update: locate by the business code; never rewrite the primary key
    // (FK targets elsewhere reference it).
    const updated = await db
      .update(exercises)
      .set(set)
      .where(eq(exercises.exerciseId, recordId))
      .returning({ exerciseId: exercises.exerciseId });
    if (!updated.length) {
      return {
        success: false,
        status: 500,
        body: {
          error: "Failed to update exercise",
          message: `Exercise ${recordId} not found`,
          fieldsSent: set,
          omittedFields: [],
          availableFields: [],
        },
      };
    }
  } else {
    await db.insert(exercises).values({ ...set, exerciseId: code, name });
  }

  // Translate-on-write (replaces the Feishu AI formula): mirror the English
  // name and cues into the CN columns. Best-effort, fills empty only — never
  // touches curated bilingual library content.
  const emptyOnly = (col: any) => or(isNull(col), eq(col, ""));
  void fillTranslation(name, "zh", (zh) =>
    db
      .update(exercises)
      .set({ nameCn: zh })
      .where(and(eq(exercises.exerciseId, code), emptyOnly(exercises.nameCn)))
  );
  if (!archive && notes) {
    void fillTranslation(notes, "zh", (zh) =>
      db
        .update(exercises)
        .set({ coachingCuesCn: zh })
        .where(and(eq(exercises.exerciseId, code), emptyOnly(exercises.coachingCuesCn)))
    );
  }

  return {
    success: true,
    status: 200,
    body: {
      success: true,
      exerciseId: recordId ? exerciseId || recordId : code,
      recordId: code,
      archived: Boolean(archive),
      omittedFields: [],
      cueFieldName: PG_CUE_FIELD_NAME,
      availableFields: [],
      fieldsSent: set,
    },
  };
}
