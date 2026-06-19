import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/coaches.ts";
import type { CoachDTO } from "../dto.ts";

export async function listCoaches(): Promise<CoachDTO[]> {
  if (DATA_BACKEND === "postgres") {
    const pg = await import("../pg/coaches.ts");
    return pg.listCoaches();
  }
  return feishu.listCoaches();
}
