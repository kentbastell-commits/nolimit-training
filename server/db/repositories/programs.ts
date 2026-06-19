import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/programs.ts";
import type { ProgramDTO } from "../dto.ts";

export async function listPrograms(): Promise<ProgramDTO[]> {
  if (DATA_BACKEND === "postgres") {
    const pg = await import("../pg/programs.ts");
    return pg.listPrograms();
  }
  return feishu.listPrograms();
}
