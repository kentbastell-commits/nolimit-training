import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listAthleteMetrics } from "../server/db/repositories/athleteMetrics.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const metrics = await listAthleteMetrics({
      clientId: String(req.query.clientId || ""),
      clientRecordId: String(req.query.clientRecordId || ""),
      clientCode: String(req.query.clientCode || ""),
      clientName: String(req.query.clientName || ""),
      metricType: String(req.query.metricType || ""),
    });
    return res.status(200).json({ metrics });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
