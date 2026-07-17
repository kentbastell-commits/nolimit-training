// Exercises repository — the single entry point handlers call. Dispatches to
// the active backend. The Postgres impl is loaded lazily so the Feishu path
// never pulls in pg/drizzle or opens a pool.
import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/exercises.ts";
import type { ExerciseListResult } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

export { CUE_FIELD_CANDIDATES } from "../feishu/exercises.ts";

// upsertExercise input: the raw request body of api/upsertExercise.ts.
// recordId is the Feishu record_id on Feishu; on Postgres it carries the
// business code (EX-...), which IS the row id there.
export type UpsertExerciseInput = {
  recordId?: string;
  exerciseId?: string;
  exerciseName?: string;
  videoUrl?: string;
  longVideoUrl?: string;
  category?: string;
  equipment?: string;
  movementPattern?: string;
  muscleGroup?: string;
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
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/exercises.ts")).listExercises()
      : await feishu.listExercises();

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
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/exercises.ts")).upsertExercise(input)
      : await feishu.upsertExercise(input);

  if (result.success) {
    invalidateCache("exercises");
    invalidateCache("exerciseLibraryRaw");
  }
  return result;
}
