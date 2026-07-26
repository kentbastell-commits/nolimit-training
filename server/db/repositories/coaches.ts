import * as pg from "../pg/coaches.ts";
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
  qrCodeUrl?: string;
};

export async function listCoaches(): Promise<CoachDTO[]> {
  const cached = getCached<CoachDTO[]>("coaches");
  if (cached) return cached;

  const coaches =
    await pg.listCoaches();

  setCached("coaches", coaches, 10 * 60 * 1000);
  return coaches;
}

export async function upsertCoach(input: UpsertCoachInput): Promise<WriteResult> {
  const result =
    await pg.upsertCoach(input);
  if (result.success) invalidateCache("coaches");
  return result;
}
