import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/coaches.ts";
import type { CoachDTO } from "../dto.ts";
import { getCached, setCached } from "../../../api/_cache.ts";

export async function listCoaches(): Promise<CoachDTO[]> {
  const cached = getCached<CoachDTO[]>("coaches");
  if (cached) return cached;

  const coaches =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/coaches.ts")).listCoaches()
      : await feishu.listCoaches();

  setCached("coaches", coaches, 10 * 60 * 1000);
  return coaches;
}
