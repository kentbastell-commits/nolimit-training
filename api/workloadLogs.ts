import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";

function fieldToText(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" ? item : item?.text || item?.name || ""
      )
      .filter(Boolean)
      .join(", ");
  }
  if (value.text) return String(value.text);
  return "";
}

function num(value: any): number {
  const n = Number(fieldToText(value));
  return Number.isFinite(n) ? n : 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const clientId = String(req.query.clientId || req.query.clientCode || "");

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

    if (!process.env.FEISHU_WORKLOAD_LOGS_TABLE_ID) {
      return res.status(200).json({ logs: [] });
    }

    const items = await fetchAllBitableRecords(
      process.env.FEISHU_BASE_APP_TOKEN as string,
      process.env.FEISHU_WORKLOAD_LOGS_TABLE_ID as string,
      tokenData.tenant_access_token
    );

    const logs = items
      .map((item: any) => {
        const f = item.fields || {};
        const logId = fieldToText(f["Log ID"]);
        return {
          recordId: item.record_id,
          logId,
          // Calendar day (YYYY-MM-DD) is the last 10 chars of the Log ID, which
          // is timezone-stable (unlike re-deriving from the stored ms).
          dateKey: logId.slice(-10),
          clientId: fieldToText(f["Client ID"]),
          date: num(f["Date"]),
          techAmRpe: num(f["Tech AM RPE"]),
          techAmMin: num(f["Tech AM Min"]),
          techPmRpe: num(f["Tech PM RPE"]),
          techPmMin: num(f["Tech PM Min"]),
          cardioRpe: num(f["Cardio RPE"]),
          cardioMin: num(f["Cardio Min"]),
          notes: fieldToText(f["Notes"]),
        };
      })
      .filter((log: any) => !clientId || log.clientId.includes(clientId));

    return res.status(200).json({ logs });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Could not fetch workload logs", message: error.message });
  }
}
