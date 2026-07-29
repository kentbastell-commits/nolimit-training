import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listWorkloadLogs } from "../server/db/repositories/workloadLogs.ts";
import { coachKeyOk } from "./_coachAuth.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const clientId = String(req.query.clientId || req.query.clientCode || "");
    // No clientId = every client's training diary (daily RPE). Coach-only,
    // same rule as clients.ts (named mistake #49).
    if (!clientId && !coachKeyOk(req as never)) {
      return res.status(401).json({ error: "Coach access key required" });
    }
    const logs = await listWorkloadLogs(clientId);
    return res.status(200).json({ logs });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Could not fetch workload logs", message: error.message });
  }
}
