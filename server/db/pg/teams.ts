import { db } from "../client.ts";
import { teams, teamMembers } from "../schema.ts";
import { str } from "./_util.ts";
import type { TeamDTO } from "../dto.ts";

export async function listTeams(): Promise<TeamDTO[]> {
  const [teamRows, memberRows] = await Promise.all([
    db.select().from(teams),
    db.select().from(teamMembers),
  ]);

  const membersByTeam = new Map<string, { clientId: string; position: string | null }[]>();
  for (const m of memberRows) {
    const list = membersByTeam.get(m.teamId) ?? [];
    list.push({ clientId: m.clientId, position: m.position });
    membersByTeam.set(m.teamId, list);
  }

  const result = teamRows.map((t): TeamDTO => {
    const members = membersByTeam.get(t.teamId) ?? [];
    const memberIds = members.map((m) => m.clientId);
    const positions: Record<string, string> = {};
    for (const m of members) if (m.position) positions[m.clientId] = m.position;
    const groups = Array.isArray(t.groups) ? (t.groups as unknown[]).map(String) : [];
    return {
      id: t.teamId,
      name: t.name || "Untitled Team",
      coach: str(t.coach),
      notes: str(t.notes),
      focus: str(t.focus),
      memberIds,
      memberCount: memberIds.length,
      positions,
      groups,
      createdTime: t.createdAt ?? 0,
    };
  });

  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}
