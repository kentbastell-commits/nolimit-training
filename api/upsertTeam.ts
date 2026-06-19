import type { VercelRequest, VercelResponse } from "@vercel/node";

async function getTableFieldNames(token: string): Promise<Set<string>> {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_TEAMS_TABLE_ID}/fields?page_size=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  const names = (data?.data?.items || [])
    .map((f: any) => f.field_name || f.name)
    .filter(Boolean);
  return new Set(names);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      recordId,
      teamName,
      coach,
      memberRecordIds,
      notes,
      positions,
      focus,
      groups,
    } = req.body;

    if (!teamName && !recordId) {
      return res.status(400).json({ error: "Missing team name" });
    }
    if (!process.env.FEISHU_TEAMS_TABLE_ID) {
      return res.status(500).json({ error: "Teams table is not configured" });
    }

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
    const token = tokenData.tenant_access_token;
    if (!token) {
      return res.status(500).json({ error: "Could not get Lark token", larkResponse: tokenData });
    }

    const available = await getTableFieldNames(token);

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

    const base = `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_TEAMS_TABLE_ID}/records`;
    const url = recordId ? `${base}/${recordId}` : base;
    const response = await fetch(url, {
      method: recordId ? "PUT" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    const data = await response.json();

    if (!response.ok || data.code !== 0) {
      return res.status(500).json({
        error: recordId ? "Failed to update team" : "Failed to create team",
        larkResponse: data,
        fieldsSent: fields,
        omittedFields,
      });
    }

    return res.status(200).json({
      success: true,
      recordId: data?.data?.record?.record_id || recordId,
      omittedFields,
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
