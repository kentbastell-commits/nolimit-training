import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/programs.ts";
import type { ProgramDTO } from "../dto.ts";
import { getCached, setCached } from "../../../api/_cache.ts";

export async function listPrograms(): Promise<ProgramDTO[]> {
  const cached = getCached<ProgramDTO[]>("programs");
  if (cached) return cached;

  const programs =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/programs.ts")).listPrograms()
      : await feishu.listPrograms();

  setCached("programs", programs, 10 * 60 * 1000);
  return programs;
}
