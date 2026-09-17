import * as pg from "../pg/workoutLogs.ts";
import type { ExerciseHistoryDTO, LogDTO, WorkoutHistoryResult } from "../dto.ts";
import { getCachedOrLoad } from "../../../api/_cache.ts";

// Filtering + per-exercise aggregation are backend-agnostic, so they live here.
// Logs are cached per client (5 min) so repeat views (workout player, history
// page) are instant; workout-log writers invalidate the "workoutLogs" prefix.
export async function getWorkoutHistory(
  clientId = "",
  clientCode = "",
  exerciseName = "",
  assignedWorkoutId = ""
): Promise<WorkoutHistoryResult> {
  const cacheKey = `workoutLogs:${JSON.stringify([clientId, clientCode, assignedWorkoutId])}`;
  const clientLogs = await getCachedOrLoad<LogDTO[]>(cacheKey, 5 * 60 * 1000,
    () => pg.listAllLogs(clientId, clientCode, assignedWorkoutId));

  const exFilter = exerciseName.toLowerCase();
  const logs = clientLogs
    .filter((log) => !exFilter || log.exerciseName.toLowerCase().includes(exFilter))
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
      bestWeight: logs.reduce((best, l) => Math.max(best, toNumber(l.actualWeight)), 0),
      bestReps: logs.reduce((best, l) => Math.max(best, toNumber(l.actualReps)), 0),
    },
  };
}
