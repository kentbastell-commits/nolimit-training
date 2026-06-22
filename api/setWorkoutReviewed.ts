import type { VercelRequest, VercelResponse } from "@vercel/node";
import { invalidateCache } from "./_cache.ts";

async function getTenantToken() {
  const response = await fetch(
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
  const data = await response.json();
  if (!data.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(data)}`);
  }
  return data.tenant_access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { assignedWorkoutRecordId, reviewed } = req.body || {};
    if (!assignedWorkoutRecordId) {
      return res.status(400).json({ error: "Missing assignedWorkoutRecordId" });
    }
    const token = await getTenantToken();
    const app = process.env.FEISHU_BASE_APP_TOKEN;
    const table = process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID;

    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${app}/tables/${table}/records/${assignedWorkoutRecordId}`;
    // "Coach Reviewed" is a checkbox field (boolean).
    let result = await (
      await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: { "Coach Reviewed": Boolean(reviewed) },
        }),
      })
    ).json();

    // Fall back to a text value if the field happens to be text, not checkbox.
    if (result.code !== 0) {
      result = await (
        await fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: { "Coach Reviewed": reviewed ? "Reviewed" : "" },
          }),
        })
      ).json();
    }

    if (result.code !== 0) {
      return res
        .status(500)
        .json({ error: "Could not update review flag", details: result });
    }
    invalidateCache("workouts");
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
