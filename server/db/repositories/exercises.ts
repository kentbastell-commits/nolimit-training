// Exercises repository — the single entry point handlers call. Dispatches to
// the active backend. The Postgres impl is loaded lazily so the Feishu path
// never pulls in pg/drizzle or opens a pool.
import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/exercises.ts";
import type { ExerciseListResult } from "../dto.ts";

export { CUE_FIELD_CANDIDATES } from "../feishu/exercises.ts";

export async function listExercises(): Promise<ExerciseListResult> {
  if (DATA_BACKEND === "postgres") {
    const pg = await import("../pg/exercises.ts");
    return pg.listExercises();
  }
  return feishu.listExercises();
}
