import { eq } from "drizzle-orm";
import { db } from "../client.ts";
import { teams, teamMembers } from "../schema.ts";
import { str } from "./_util.ts";
import type { TeamDTO, WriteResult } from "../dto.ts";
import type { UpsertTeamInput } from "../repositories/teams.ts";

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

/* ------------------------------- writes ---------------------------------- */

// Teams have no Feishu business code (ETL kept the record_id as PK), so new
// pg-native teams mint their own opaque id.
function makeTeamId() {
  return `TEAM-${Date.now().toString(36)}${Math.floor(1000 + Math.random() * 9000)}`;
}

// On Postgres, member ids and the positions map are keyed by CLIENT BUSINESS
// CODES (CL-0001…) — the same convention the pg read impl returns — never by
// Feishu record_ids. team_members is the derived source of truth for reads;
// teams.positions/groups jsonb are kept in sync for parity with the ETL shape.
export async function upsertTeam(i: UpsertTeamInput): Promise<WriteResult> {
  const memberIds = Array.isArray(i.memberRecordIds)
    ? Array.from(new Set(i.memberRecordIds.filter(Boolean).map(String)))
    : undefined;
  const positionsMap: Record<string, string> | undefined =
    i.positions !== undefined ? { ...(i.positions || {}) } : undefined;

  const set: Partial<typeof teams.$inferInsert> = {};
  if (i.teamName !== undefined) set.name = String(i.teamName);
  if (i.coach !== undefined) set.coach = String(i.coach || "");
  if (i.notes !== undefined) set.notes = String(i.notes || "");
  if (i.focus !== undefined) set.focus = String(i.focus || "");
  if (positionsMap !== undefined) set.positions = positionsMap;
  if (i.groups !== undefined) {
    set.groups = Array.isArray(i.groups) ? i.groups.map(String).filter(Boolean) : [];
  }

  if (i.recordId) {
    const teamId = i.recordId;
    return db.transaction(async (tx): Promise<WriteResult> => {
      const existing = await tx
        .select({ teamId: teams.teamId })
        .from(teams)
        .where(eq(teams.teamId, teamId));
      if (!existing.length) {
        return { success: false, error: "Failed to update team", message: "Team not found" };
      }
      if (Object.keys(set).length) {
        await tx.update(teams).set(set).where(eq(teams.teamId, teamId));
      }
      // Rebuild the derived team_members rows whenever members or positions
      // change; a field the caller didn't send keeps its current value
      // (matches Feishu, where Members and Positions are independent columns).
      if (memberIds !== undefined || positionsMap !== undefined) {
        const current = await tx
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.teamId, teamId));
        const ids =
          memberIds ?? Array.from(new Set(current.map((m) => m.clientId)));
        const posMap: Record<string, string> = {};
        if (positionsMap !== undefined) Object.assign(posMap, positionsMap);
        else for (const m of current) if (m.position) posMap[m.clientId] = m.position;
        await tx.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
        if (ids.length) {
          await tx.insert(teamMembers).values(
            ids.map((clientId) => ({
              teamId,
              clientId,
              position: posMap[clientId] ?? null,
            }))
          );
        }
      }
      return { success: true, recordId: teamId, omittedFields: [] };
    });
  }

  const teamId = makeTeamId();
  await db.transaction(async (tx) => {
    await tx.insert(teams).values({
      teamId,
      name: i.teamName !== undefined ? String(i.teamName) : "",
      coach: i.coach !== undefined ? String(i.coach || "") : null,
      notes: i.notes !== undefined ? String(i.notes || "") : null,
      focus: i.focus !== undefined ? String(i.focus || "") : null,
      positions: positionsMap ?? {},
      groups:
        i.groups !== undefined && Array.isArray(i.groups)
          ? i.groups.map(String).filter(Boolean)
          : [],
      createdAt: Date.now(),
    });
    if (memberIds && memberIds.length) {
      const posMap = positionsMap ?? {};
      await tx.insert(teamMembers).values(
        memberIds.map((clientId) => ({
          teamId,
          clientId,
          position: posMap[clientId] ?? null,
        }))
      );
    }
  });
  return { success: true, recordId: teamId, omittedFields: [] };
}
