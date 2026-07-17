import type { VercelRequest, VercelResponse } from "@vercel/node";
import { updateAssignedWorkoutDate } from "../server/db/repositories/workouts.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { assignedWorkoutRecordId, assignedWorkoutId, scheduledDate } = req.body;

    if ((!assignedWorkoutRecordId && !assignedWorkoutId) || !scheduledDate) {
      return res.status(400).json({
        error: "Missing assignedWorkoutRecordId/assignedWorkoutId or scheduledDate",
      });
    }

    const result = await updateAssignedWorkoutDate({
      assignedWorkoutRecordId,
      assignedWorkoutId,
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
