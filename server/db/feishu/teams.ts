import { createRecord, getFieldNames, getTenantToken, listRecords, updateRecord } from "./client.ts";
import type { TeamDTO, WriteResult } from "../dto.ts";
import type { UpsertTeamInput } from "../repositories/teams.ts";

function itemToText(item: any): string {
  if (item === null || item === undefined) return "";
  if (typeof item === "string") return item;
  if (typeof item === "number") return String(item);
  if (item.text) return String(item.text);
  if (Array.isArray(item.text_arr) && item.text_arr.length) {
    return item.text_arr.filter(Boolean).join(", ");
  }
  if (item.name) return String(item.name);
  return "";
}

function fieldToText(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(itemToText).filter(Boolean).join(", ");
  return itemToText(value);
}

function linkRecordIds(value: any): string[] {
  if (!value) return [];
  const ids: string[] = [];
  const collect = (v: any) => {
    if (!v) return;
    if (Array.isArray(v.record_ids)) ids.push(...v.record_ids.filter(Boolean));
    if (Array.isArray(v.link_record_ids)) ids.push(...v.link_record_ids.filter(Boolean));
  };
  if (Array.isArray(value)) value.forEach(collect);
  else collect(value);
  return Array.from(new Set(ids));
}

export async function listTeams(): Promise<TeamDTO[]> {
  if (!process.env.FEISHU_TEAMS_TABLE_ID) return [];
  const items = await listRecords(process.env.FEISHU_TEAMS_TABLE_ID as string);
  const teams = items.map((item: any) => {
    const fields = item.fields || {};
    const memberIds = linkRecordIds(fields["Members"]);
    let positions: Record<string, string> = {};
    try {
      const raw = fieldToText(fields["Positions"]);
      if (raw) positions = JSON.parse(raw) || {};
    } catch {
      positions = {};
    }
    let groups: string[] = [];
    try {
      const raw = fieldToText(fields["Groups"]);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) groups = parsed.map((x) => String(x)).filter(Boolean);
      }
    } catch {
      groups = [];
    }
    return {
      id: item.record_id,
      name: fieldToText(fields["Team Name"]) || "Untitled Team",
      coach: fieldToText(fields["Coach"]),
      notes: fieldToText(fields["Notes"]),
      focus: fieldToText(fields["Focus"]),
      memberIds,
      memberCount: memberIds.length,
      positions,
      groups,
      createdTime:
        Number(fieldToText(fields["Created Time"])) || item.created_time || 0,
    };
  });
  teams.sort((a, b) => a.name.localeCompare(b.name));
  return teams;
}

/* ------------------------------- writes ---------------------------------- */

export async function upsertTeam(input: UpsertTeamInput): Promise<WriteResult> {
  const { recordId, teamName, coach, memberRecordIds, notes, positions, focus, groups } =
    input;

  if (!process.env.FEISHU_TEAMS_TABLE_ID) {
    return { success: false, error: "Teams table is not configured" };
  }

  try {
    await getTenantToken();
  } catch (e: any) {
    // Legacy body: the old handler surfaced the raw token payload on failure.
    if (e?.kind === "token") {
      return { success: false, error: "Could not get Lark token", larkResponse: e.larkResponse };
    }
    throw e;
  }

  const available = await getFieldNames(process.env.FEISHU_TEAMS_TABLE_ID as string).then(
    (names) => new Set(names)
  );

  const allFields: Record<string, any> = {};
  if (teamName !== undefined) allFields["Team Name"] = String(teamName);
  if (coach !== undefined) allFields["Coach"] = String(coach || "");
  if (notes !== undefined) allFields["Notes"] = String(notes || "");
  if (focus !== undefined) allFields["Focus"] = String(focus || "");
  if (Array.isArray(memberRecordIds)) {
    // Link field accepts an array of linked record ids (empty array clears it).
    allFields["Members"] = memberRecordIds.filter(Boolean);
  }
  if (positions !== undefined) {
    // Per-member position/subgroup map, stored as JSON text.
    allFields["Positions"] = JSON.stringify(positions || {});
  }
  if (groups !== undefined) {
    // Defined group/position labels for this team, stored as JSON array.
    allFields["Groups"] = JSON.stringify(Array.isArray(groups) ? groups : []);
  }

  const fields: Record<string, any> = {};
  const omittedFields: string[] = [];
  Object.entries(allFields).forEach(([k, v]) => {
    if (available.has(k)) fields[k] = v;
    else omittedFields.push(k);
  });

  const tableId = process.env.FEISHU_TEAMS_TABLE_ID as string;
  const data = recordId
    ? await updateRecord(tableId, recordId, fields)
    : await createRecord(tableId, fields);

  if (data.code !== 0) {
    return {
      success: false,
      error: recordId ? "Failed to update team" : "Failed to create team",
      larkResponse: data,
      fieldsSent: fields,
      omittedFields,
    };
  }

  return {
    success: true,
    recordId: data?.data?.record?.record_id || recordId,
    omittedFields,
  };
}
