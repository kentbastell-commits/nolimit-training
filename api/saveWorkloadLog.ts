import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";

function toMs(value: any): number {
  if (value === undefined || value === null || value === "") return Date.now();
  if (typeof value === "number") return value;
  if (/^\d+$/.test(String(value))) return Number(value);
  const ms = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function n(value: any): number {
  const v = Number(value);
  return Number.isFinite(v) ? v : 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
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
    const token = tokenData.tenant_access_token;
    const app = process.env.FEISHU_BASE_APP_TOKEN as string;
    const table = process.env.FEISHU_WORKLOAD_LOGS_TABLE_ID as string;

    if (!table) {
      return res.status(500).json({ error: "Workload table not configured" });
    }

    const { clientId, date } = req.body || {};
    if (!clientId) {
      return res.status(400).json({ error: "Missing clientId" });
    }

    const ms = toMs(date);
    const logId = `${clientId}-${dayKey(ms)}`;

    const fields: Record<string, any> = {
      "Log ID": logId,
      "Client ID": clientId,
      Date: ms,
      "Tech AM RPE": n(req.body.techAmRpe),
      "Tech AM Min": n(req.body.techAmMin),
      "Tech PM RPE": n(req.body.techPmRpe),
      "Tech PM Min": n(req.body.techPmMin),
      "Cardio RPE": n(req.body.cardioRpe),
      "Cardio Min": n(req.body.cardioMin),
      Notes: String(req.body.notes || ""),
    };

    // Upsert by Log ID (one row per client per day).
    const existing = await fetchAllBitableRecords(app, table, token);
    const match = existing.find(
      (item: any) => (item.fields?.["Log ID"] || "") === logId
    );

    const base = `https://open.feishu.cn/open-apis/bitable/v1/apps/${app}/tables/${table}/records`;
    const response = match
      ? await fetch(`${base}/${match.record_id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fields }),
        })
      : await fetch(base, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fields }),
        });

    const result = await response.json();
    if (result.code !== 0) {
      return res
        .status(500)
        .json({ error: "Could not save workload log", details: result });
    }

    return res
      .status(200)
      .json({ success: true, logId, updated: Boolean(match) });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
