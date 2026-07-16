import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/workoutDetails.ts";
import type { WorkoutDetailDTO } from "../dto.ts";

export async function getWorkoutDetails(
  programId: string,
  week: string,
  day: string
): Promise<WorkoutDetailDTO[]> {
  if (DATA_BACKEND === "postgres") {
    const pg = await import("../pg/workoutDetails.ts");
    return pg.getWorkoutDetails(programId, week, day);
  }
  return feishu.getWorkoutDetails(programId, week, day);
}
