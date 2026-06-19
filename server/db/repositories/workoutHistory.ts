import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/workoutLogs.ts";
import type { ExerciseHistoryDTO, WorkoutHistoryResult } from "../dto.ts";

// Filtering + per-exercise aggregation are backend-agnostic, so they live here.
export async function getWorkoutHistory(
  clientId = "",
  exerciseName = ""
): Promise<WorkoutHistoryResult> {
  const all =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/workoutLogs.ts")).listAllLogs()
      : await feishu.listAllLogs();

  const exFilter = exerciseName.toLowerCase();
  const logs = all
    .filter((log) => {
      const matchesClient =
        !clientId || log.clientId.includes(clientId) || log.clientRecordIds.includes(clientId);
      const matchesExercise = !exFilter || log.exerciseName.toLowerCase().includes(exFilter);
      return matchesClient && matchesExercise;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const historyByExercise = new Map<string, ExerciseHistoryDTO>();
  logs.forEach((log) => {
    const key = log.exerciseName || "Unnamed Exercise";
    const existing =
      historyByExercise.get(key) ||
      { exerciseName: key, totalSets: 0, lastDate: "", lastReps: "", lastWeight: "", bestWeight: 0, bestReps: 0 };
    const weight = Number(log.actualWeight) || 0;
    const reps = Number(log.actualReps) || 0;
    if (!existing.lastDate || log.date > existing.lastDate) {
      existing.lastDate = log.date;
      existing.lastReps = log.actualReps;
      existing.lastWeight = log.actualWeight;
    }
    existing.totalSets += 1;
    existing.bestWeight = Math.max(existing.bestWeight, weight);
    existing.bestReps = Math.max(existing.bestReps, reps);
    historyByExercise.set(key, existing);
  });

  const toNumber = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return {
    logs,
    history: Array.from(historyByExercise.values()).sort((a, b) =>
      a.exerciseName.localeCompare(b.exerciseName)
    ),
    summary: {
      totalLogs: logs.length,
      uniqueExercises: historyByExercise.size,
      bestWeight: Math.max(0, ...logs.map((l) => toNumber(l.actualWeight))),
      bestReps: Math.max(0, ...logs.map((l) => toNumber(l.actualReps))),
    },
  };
}
