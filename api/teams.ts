import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";

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

// Collect linked client record_ids from a Bitable link field, which may be an
// array of { record_ids: [...] } items or a single { link_record_ids: [...] }.
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

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const tokenResponse = await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: process.env.FEISHU_APP_ID,
          app_secret: process.env.FEISHU_APP_SECRET,
        }),
      }
    );
    const tokenData = await tokenResponse.json();

    if (!process.env.FEISHU_TEAMS_TABLE_ID) {
      // Table not configured yet — return empty list so the UI still renders.
      return res.status(200).json({ teams: [] });
    }

    const items = await fetchAllBitableRecords(
      process.env.FEISHU_BASE_APP_TOKEN as string,
      process.env.FEISHU_TEAMS_TABLE_ID as string,
      tokenData.tenant_access_token
    );

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
      return {
        id: item.record_id,
        name: fieldToText(fields["Team Name"]) || "Untitled Team",
        coach: fieldToText(fields["Coach"]),
        notes: fieldToText(fields["Notes"]),
        memberIds,
        memberCount: memberIds.length,
        positions,
        createdTime: item.created_time || 0,
      };
    });

    teams.sort((a: any, b: any) => a.name.localeCompare(b.name));

    return res.status(200).json({ teams });
  } catch (error: any) {
    return res.status(500).json({ error: "Could not fetch teams", message: error.message });
  }
}
