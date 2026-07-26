import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  listCheckIns,
  reviewCheckIn,
  createCheckIn,
} from "../server/db/repositories/checkIns.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const clientId = String(req.query.clientId || "");
      const checkIns = await listCheckIns(clientId);
      return res.status(200).json({ checkIns });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { recordId, clientId, clientRecordId } = req.body || {};

    // Coach responding to / reviewing an existing check-in (update, not create).
    if (recordId) {
      const result = await reviewCheckIn(req.body);
      return res.status(result.success ? 200 : 500).json(result);
    }

    if (!clientId && !clientRecordId) {
      return res.status(400).json({ error: "Missing clientId or clientRecordId" });
    }

    const result = await createCheckIn(req.body);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
