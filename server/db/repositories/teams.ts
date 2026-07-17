import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/teams.ts";
import type { TeamDTO, WriteResult } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

export type UpsertTeamInput = {
  recordId?: string; // Feishu record_id; the team_id (Feishu-era record_id or TEAM-…) on Postgres
  teamName?: string;
  coach?: string;
  // Feishu backend: member record_ids (DuplexLink array). Postgres backend:
  // client business codes (CL-…), same convention the pg read impl returns.
  memberRecordIds?: unknown;
  notes?: string;
  positions?: Record<string, string> | null;
  focus?: string;
  groups?: unknown;
};

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

export async function upsertTeam(input: UpsertTeamInput): Promise<WriteResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/teams.ts")).upsertTeam(input)
      : await feishu.upsertTeam(input);
  if (result.success) invalidateCache("teams");
  return result;
}
