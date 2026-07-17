// Exercise results (per-exercise PR/best summary rows) repository.
// The full-table read is cached under "exerciseResults" (5 min, same key/TTL
// the old api/exerciseResults.ts handler used) and filtered per request; the
// create path invalidates that key when every row landed, exactly as the old
// handler did (api/saveWorkoutLog.ts additionally invalidates it itself).
import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/exerciseResults.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

export type ExerciseResultDTO = {
  recordId: string;
  resultId: string;
  clientId: string;
  clientRecordIds: string[];
  exerciseId: string;
  exerciseName: string;
  workoutId: string;
  date: string;
  bestReps: string;
  bestWeight: string;
  estimatedOneRepMax: string;
  volume: string;
};

export type CreateExerciseResultsInput = {
  clientId: string;
  clientRecordId?: string;
  assignedWorkoutId?: string;
  programId?: string;
  workoutDate: string;
  logs: any[];
};

// Same shape the old exported createExerciseResultRecords returned (soft-fail:
// per-row errors are collected, never thrown).
export type CreateExerciseResultsResult = {
  createdRecords: string[];
  errors: any[];
};

export async function listExerciseResults(
  clientId = "",
  exerciseName = ""
): Promise<ExerciseResultDTO[]> {
  let all = getCached<ExerciseResultDTO[]>("exerciseResults");
  if (!all) {
    all =
      DATA_BACKEND === "postgres"
        ? await (await import("../pg/exerciseResults.ts")).listExerciseResults()
        : await feishu.listExerciseResults();
    setCached("exerciseResults", all, 5 * 60 * 1000);
  }

  const exerciseNameFilter = exerciseName.toLowerCase();
  return all
    .filter((result) => {
      const matchesClient =
        !clientId ||
        result.clientId.includes(clientId) ||
        result.clientRecordIds.includes(clientId);
      const matchesExercise =
        !exerciseNameFilter ||
        result.exerciseName.toLowerCase().includes(exerciseNameFilter);
      return matchesClient && matchesExercise;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function createExerciseResults(
  input: CreateExerciseResultsInput
): Promise<CreateExerciseResultsResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/exerciseResults.ts")).createExerciseResults(input)
      : await feishu.createExerciseResults(input);
  if (result.errors.length === 0) invalidateCache("exerciseResults");
  return result;
}
