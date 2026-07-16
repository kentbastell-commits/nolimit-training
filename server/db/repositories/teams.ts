import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/teams.ts";
import type { TeamDTO } from "../dto.ts";
import { getCached, setCached } from "../../../api/_cache.ts";

export async function listTeams(): Promise<TeamDTO[]> {
  const cached = getCached<TeamDTO[]>("teams");
  if (cached) return cached;

  const teams =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/teams.ts")).listTeams()
      : await feishu.listTeams();

  setCached("teams", teams, 10 * 60 * 1000);
  return teams;
}
