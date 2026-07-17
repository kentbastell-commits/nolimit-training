import type { VercelRequest, VercelResponse } from "@vercel/node";
import { notifyCoach } from "./_notify.ts";
import { autoLoadProgram } from "../server/db/repositories/fulfillment.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { clientRecordId, startDate } = req.body;
  if (!clientRecordId)
    return res.status(400).json({ error: "clientRecordId required" });

  try {
    const result = await autoLoadProgram({ clientRecordId, startDate });
    if (result.notice) void notifyCoach(result.notice);
    return res.status(result.status).json(result.body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    void notifyCoach(`⚠️ Program auto-load crashed: ${message}`);
    return res.status(500).json({ error: "Auto-load failed", message });
  }
}
