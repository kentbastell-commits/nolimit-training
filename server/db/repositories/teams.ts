import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/teams.ts";
import type { TeamDTO } from "../dto.ts";

export async function listTeams(): Promise<TeamDTO[]> {
  if (DATA_BACKEND === "postgres") {
    const pg = await import("../pg/teams.ts");
    return pg.listTeams();
  }
  return feishu.listTeams();
}
