import type { VercelRequest, VercelResponse } from "@vercel/node";
import { duplicateAssignedWorkout } from "../server/db/repositories/workouts.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { assignedWorkoutRecordId, scheduledDate } = req.body || {};

    if (!assignedWorkoutRecordId || !scheduledDate) {
      return res.status(400).json({
        error: "Missing assignedWorkoutRecordId or scheduledDate",
      });
    }

    const result = await duplicateAssignedWorkout({
      assignedWorkoutRecordId,
      scheduledDate,
    });
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
