import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/workouts.ts";
import type { WorkoutDTO } from "../dto.ts";
import { getCached, setCached } from "../../../api/_cache.ts";

// The full assigned-workouts list is cached briefly (2 min — it changes often:
// assigns, completions, reviews) and filtered per request; workout writers
// invalidate "workouts".
export async function listWorkouts(clientCode = ""): Promise<WorkoutDTO[]> {
  let all = getCached<WorkoutDTO[]>("workouts");
  if (!all) {
    all =
      DATA_BACKEND === "postgres"
        ? await (await import("../pg/workouts.ts")).listAllWorkouts()
        : await feishu.listAllWorkouts();
    setCached("workouts", all, 2 * 60 * 1000);
  }
  if (!clientCode) return all;
  return all.filter((w) => w.clientId.includes(clientCode));
}
