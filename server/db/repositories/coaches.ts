import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/coaches.ts";
import type { CoachDTO, WriteResult } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

export type UpsertCoachInput = {
  recordId?: string; // Feishu record_id; the COACH-… business code on Postgres
  coachId?: string;
  name: string;
  email?: string;
  phoneWechat?: string;
  role?: string;
  status?: string;
  bio?: string;
};

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

export async function upsertCoach(input: UpsertCoachInput): Promise<WriteResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/coaches.ts")).upsertCoach(input)
      : await feishu.upsertCoach(input);
  if (result.success) invalidateCache("coaches");
  return result;
}
