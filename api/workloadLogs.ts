import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DATA_BACKEND } from "../server/db/backend.ts";
import { listWorkloadLogs } from "../server/db/repositories/workloadLogs.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Feishu needs its table id; on Postgres the env var is irrelevant. An
  // unconfigured table has always meant "no logs yet", not an error.
  if (DATA_BACKEND === "feishu" && !process.env.FEISHU_WORKLOAD_LOGS_TABLE_ID) {
    return res.status(200).json({ logs: [] });
  }

  try {
    const clientId = String(req.query.clientId || req.query.clientCode || "");
    const logs = await listWorkloadLogs(clientId);
    return res.status(200).json({ logs });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Could not fetch workload logs", message: error.message });
  }
}
