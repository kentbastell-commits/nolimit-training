import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/workouts.ts";
import type { WorkoutDTO } from "../dto.ts";

export async function listWorkouts(clientCode = ""): Promise<WorkoutDTO[]> {
  const all =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/workouts.ts")).listAllWorkouts()
      : await feishu.listAllWorkouts();
  if (!clientCode) return all;
  return all.filter((w) => w.clientId.includes(clientCode));
}
