// Postgres-backed exercises read. Returns the same DTO shape as the Feishu impl
// so handlers/frontend don't change when DATA_BACKEND=postgres.
import { db } from "../client.ts";
import { exercises } from "../schema.ts";
import type { ExerciseDTO, ExerciseListResult } from "../dto.ts";

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
