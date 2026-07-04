import type { VercelRequest, VercelResponse } from "@vercel/node";
import { invalidateCache } from "./_cache.ts";

// Coach tooling: clone a whole program (record + all workout-template rows)
// or copy one week's sessions to another week inside the same program.
// POST { programRecordId, mode: "program" } -> new program "<name> (Copy)"
// POST { programRecordId, mode: "week", fromWeek, toWeek }

function makeId(prefix: string) {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const item = value[0];
    if (!item) return "";
    if (typeof item === "string") return item;
    if (item?.text) return item.text;
    return "";
  }
  if (value?.text) return value.text;
  return "";
}

async function getToken() {
  const res = await fetch(
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
  const data = await res.json();
  if (!data.tenant_access_token) throw new Error("Could not get Feishu token");
  return data.tenant_access_token as string;
}

// Strip computed/link junk a raw record carries that create() would reject,
// keep everything else verbatim.
function copyableTemplateFields(
  source: Record<string, any>,
  newProgramRecordId: string
) {
  const out: Record<string, any> = {};
  for (const [name, value] of Object.entries(source)) {
    if (value === null || value === undefined) continue;
    if (name === "Template ID") continue; // regenerated
    if (name === "Program ID") {
      out[name] = [newProgramRecordId];
      continue;
    }
    // Skip other link/attachment-shaped values (arrays of objects with
    // record_ids) — templates shouldn't have any besides Program ID.
    if (
      Array.isArray(value) &&
      value[0] &&
      typeof value[0] === "object" &&
      ("record_ids" in value[0] || "file_token" in value[0])
    ) {
      continue;
    }
    out[name] = value;
  }
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  const { programRecordId, mode, fromWeek, toWeek } = req.body || {};
  if (!programRecordId)
    return res.status(400).json({ error: "programRecordId required" });

  const appToken = process.env.FEISHU_BASE_APP_TOKEN;
  const programsTableId = process.env.FEISHU_PROGRAMS_TABLE_ID;
  const templatesTableId = process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID;
  if (!programsTableId || !templatesTableId)
    return res.status(500).json({ error: "Tables not configured" });

  try {
    const token = await getToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const base = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`;

    // All templates belonging to the source program.
    const tmplItems: any[] = [];
    let pt = "";
    do {
      const u = new URL(`${base}/${templatesTableId}/records`);
      u.searchParams.set("page_size", "500");
      if (pt) u.searchParams.set("page_token", pt);
      const r = await fetch(u.toString(), { headers });
      const d = await r.json();
      if (!d?.data?.items) break;
      tmplItems.push(...d.data.items);
      pt = d.data.has_more ? d.data.page_token : "";
    } while (pt);
    const sourceTemplates = tmplItems.filter((item) => {
      const pid = item.fields?.["Program ID"];
      const ids = Array.isArray(pid)
        ? pid.flatMap((o: any) => o?.record_ids || [])
        : [];
      return ids.includes(programRecordId);
    });

    if (mode === "week") {
      const from = Number(fromWeek);
      const to = Number(toWeek);
      if (!from || !to)
        return res.status(400).json({ error: "fromWeek and toWeek required" });
      const weekRows = sourceTemplates.filter(
        (item) => Number(fieldToText(item.fields?.["Week"])) === from
      );
      if (!weekRows.length)
        return res.status(404).json({ error: `No sessions in week ${from}` });
      const records = weekRows.map((item) => {
        const fields = copyableTemplateFields(item.fields, programRecordId);
        fields["Template ID"] = makeId("WT");
        fields["Week"] = to;
        return { fields };
      });
      for (let i = 0; i < records.length; i += 200) {
        const r = await fetch(`${base}/${templatesTableId}/records/batch_create`, {
          method: "POST",
          headers,
          body: JSON.stringify({ records: records.slice(i, i + 200) }),
        });
        const d = await r.json();
        if (d.code !== 0)
          return res.status(500).json({ error: "Week copy failed", larkResponse: d });
      }
      invalidateCache("programTemplates");
      invalidateCache("workoutDetails");
      return res
        .status(200)
        .json({ success: true, copied: records.length, week: to });
    }

    // mode: program — clone the record, then every template.
    const progRes = await fetch(
      `${base}/${programsTableId}/records/${programRecordId}`,
      { headers }
    );
    const progData = await progRes.json();
    const src = progData?.data?.record?.fields;
    if (!src) return res.status(404).json({ error: "Program not found" });

    const newProgramId = makeId("PR");
    const progFields: Record<string, any> = {};
    for (const [name, value] of Object.entries(src) as Array<[string, any]>) {
      if (value === null || value === undefined) continue;
      if (
        Array.isArray(value) &&
        value[0] &&
        typeof value[0] === "object" &&
        ("record_ids" in value[0] || "file_token" in value[0])
      )
        continue; // linked clients/orders/templates don't copy
      progFields[name] = value;
    }
    progFields["Program ID"] = newProgramId;
    progFields["Program Name"] = `${fieldToText(src["Program Name"]) || "Program"} (Copy)`;
    if (src["Program Name CN"])
      progFields["Program Name CN"] = `${fieldToText(src["Program Name CN"])} (副本)`;
    // Never let a fresh copy appear in the public store by accident.
    if ("Public Store Visible" in progFields)
      progFields["Public Store Visible"] = false;

    const createRes = await fetch(`${base}/${programsTableId}/records`, {
      method: "POST",
      headers,
      body: JSON.stringify({ fields: progFields }),
    });
    const createData = await createRes.json();
    if (createData.code !== 0)
      return res
        .status(500)
        .json({ error: "Program copy failed", larkResponse: createData });
    const newRecordId = createData.data.record.record_id;

    const records = sourceTemplates.map((item) => {
      const fields = copyableTemplateFields(item.fields, newRecordId);
      fields["Template ID"] = makeId("WT");
      return { fields };
    });
    let copied = 0;
    for (let i = 0; i < records.length; i += 200) {
      const r = await fetch(`${base}/${templatesTableId}/records/batch_create`, {
        method: "POST",
        headers,
        body: JSON.stringify({ records: records.slice(i, i + 200) }),
      });
      const d = await r.json();
      if (d.code === 0) copied += records.slice(i, i + 200).length;
      else
        return res.status(500).json({
          error: "Template copy failed partway",
          copied,
          larkResponse: d,
        });
    }

    invalidateCache("programs");
    invalidateCache("programTemplates");
    return res.status(200).json({
      success: true,
      newProgramId,
      newRecordId,
      sessionsCopied: copied,
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
