import * as pg from "../pg/workoutDetails.ts";
import type { WorkoutDetailDTO } from "../dto.ts";

export async function getWorkoutDetails(
  programId: string,
  week: string,
  day: string
): Promise<WorkoutDetailDTO[]> {
  return pg.getWorkoutDetails(programId, week, day);
}
