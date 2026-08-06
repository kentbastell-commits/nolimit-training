// Exercises repository — the single entry point handlers call.
import * as pg from "../pg/exercises.ts";
import type { ExerciseListResult } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

// upsertExercise input: the raw request body of api/upsertExercise.ts.
// recordId carries the business code (EX-...), which IS the row id.
export type UpsertExerciseInput = {
  recordId?: string;
  exerciseId?: string;
  exerciseName?: string;
  // Patch-style like the other optional fields: undefined leaves the CN
  // column untouched; explicit "" clears it.
  exerciseNameCn?: string;
  videoUrl?: string;
  longVideoUrl?: string;
  category?: string;
  categoryCn?: string;
  equipment?: string;
  movementPattern?: string;
  muscleGroup?: string;
  targetMuscles?: string[];
  // Context labels (Climbing Specific / Accessory / Rehab/Prehab / Finger/Grip).
  tags?: string[];
  notes?: string;
  archive?: boolean;
};

// The upsert has several distinct 400/500 response bodies (missing cues
// column, missing required fields, write failure), so the impls return the
// exact HTTP status + JSON body and the handler relays them unchanged.
export type UpsertExerciseResult = {
  success: boolean;
  status: number;
  body: Record<string, unknown>;
};

// The library is read constantly and written rarely; cache the mapped list for
// 10 min under "exercises" (other endpoints, e.g. testLibrary, read this warm
// key for name resolution). Exercise writers invalidate it. skipCache serves
// the ?debug=1 introspection path, which must always hit the backend.
export async function listExercises(
  opts: { skipCache?: boolean } = {}
): Promise<ExerciseListResult> {
  if (!opts.skipCache) {
    const cached = getCached<ExerciseListResult["exercises"]>("exercises");
    if (cached) return { exercises: cached, availableFields: [] };
  }

  const result =
    await pg.listExercises();

  if (!opts.skipCache) {
    setCached("exercises", result.exercises, 10 * 60 * 1000);
  }
  return result;
}

// Create or update an exercise library record. On success both the mapped
// list ("exercises") and the raw library used by workout-detail enrichment
// ("exerciseLibraryRaw") must drop, same as the old handler did — the two
// keys don't share a prefix, so both invalidations are required.
export async function upsertExercise(
  input: UpsertExerciseInput
): Promise<UpsertExerciseResult> {
  const result =
    await pg.upsertExercise(input);

  if (result.success) {
    invalidateCache("exercises");
    invalidateCache("exerciseLibraryRaw");
  }
  return result;
}
