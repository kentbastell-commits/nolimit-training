import type { VercelRequest, VercelResponse } from "@vercel/node";
import { saveWorkoutLog } from "../server/db/repositories/workoutLogs.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { clientId, assignedWorkoutRecordId, logs } = req.body;

    if (!clientId || !assignedWorkoutRecordId) {
      return res.status(400).json({
        error: "Missing clientId or assignedWorkoutRecordId",
        clientId,
        assignedWorkoutRecordId,
      });
    }

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: "No logs received" });
    }

    const result = await saveWorkoutLog(req.body);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
