import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listWorkloadLogs } from "../server/db/repositories/workloadLogs.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
