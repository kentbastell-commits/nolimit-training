import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DATA_BACKEND } from "../server/db/backend.ts";
import { saveWorkloadLog } from "../server/db/repositories/workloadLogs.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    // Feishu needs its table id; on Postgres the env var is irrelevant.
    if (DATA_BACKEND === "feishu" && !process.env.FEISHU_WORKLOAD_LOGS_TABLE_ID) {
      return res.status(500).json({ error: "Workload table not configured" });
    }

    const { clientId } = req.body || {};
    if (!clientId) {
      return res.status(400).json({ error: "Missing clientId" });
    }

    const result = await saveWorkloadLog(req.body);
    if (!result.success) {
      return res
        .status(500)
        .json({ error: "Could not save workload log", details: result.details });
    }
    return res
      .status(200)
      .json({ success: true, logId: result.logId, updated: result.updated });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
