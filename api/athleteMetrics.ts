import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listAthleteMetrics } from "../server/db/repositories/athleteMetrics.ts";
import { ConfigError } from "../server/db/errors.ts";
import { coachKeyOk } from "./_coachAuth.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const clientId = String(req.query.clientId || "");
    const clientRecordId = String(req.query.clientRecordId || "");
    const clientCode = String(req.query.clientCode || "");
    const clientName = String(req.query.clientName || "");
    // No client identifier = every client's metrics (metricType alone still
    // spans every client). Coach-only, same rule as clients.ts (#49).
    if (!clientId && !clientRecordId && !clientCode && !clientName && !coachKeyOk(req as never)) {
      return res.status(401).json({ error: "Coach access key required" });
    }
    const metrics = await listAthleteMetrics({
      clientId,
      clientRecordId,
      clientCode,
      clientName,
      metricType: String(req.query.metricType || ""),
    });
    return res.status(200).json({ metrics });
  } catch (error: any) {
    if (error instanceof ConfigError) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
