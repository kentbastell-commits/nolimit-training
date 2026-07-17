import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assignProgram } from "../server/db/repositories/workouts.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { clientRecordId, clientRecordIds, programRecordId, scheduledWorkouts } =
      req.body;

    // Accept a single client (per-athlete assign) or many (team assign).
    const targetClientIds: string[] = Array.isArray(clientRecordIds)
      ? clientRecordIds.filter(Boolean)
      : clientRecordId
      ? [clientRecordId]
      : [];

    if (targetClientIds.length === 0 || !programRecordId) {
      return res.status(400).json({
        error: "Missing client(s) or programRecordId",
      });
    }

    if (!Array.isArray(scheduledWorkouts) || scheduledWorkouts.length === 0) {
      return res.status(400).json({
        error: "No scheduled workouts provided",
      });
    }

    const result = await assignProgram({
      targetClientIds,
      programRecordId,
      scheduledWorkouts,
    });
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
