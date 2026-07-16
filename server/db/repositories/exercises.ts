// Exercises repository — the single entry point handlers call. Dispatches to
// the active backend. The Postgres impl is loaded lazily so the Feishu path
// never pulls in pg/drizzle or opens a pool.
import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/exercises.ts";
import type { ExerciseListResult } from "../dto.ts";
import { getCached, setCached } from "../../../api/_cache.ts";

export { CUE_FIELD_CANDIDATES } from "../feishu/exercises.ts";

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
