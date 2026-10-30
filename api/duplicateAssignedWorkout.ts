import type { VercelRequest, VercelResponse } from "@vercel/node";
import { duplicateAssignedWorkout } from "../server/db/repositories/workouts.ts";
import { isVerifiedCoach } from "./_coachAuth.ts";
import { SessionEditError } from "../server/db/pg/assignedSession.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { assignedWorkoutRecordId, scheduledDate, targetClientId } = req.body || {};

    if (typeof assignedWorkoutRecordId !== "string" || !assignedWorkoutRecordId.trim()
      || typeof scheduledDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)
      || !Number.isFinite(Date.parse(scheduledDate)) || new Date(scheduledDate).toISOString().slice(0, 10) !== scheduledDate
      || (targetClientId !== undefined && (typeof targetClientId !== "string" || !/^CL-[\w-]+$/.test(targetClientId)))) {
      return res.status(400).json({
        error: "Missing assignedWorkoutRecordId or scheduledDate",
      });
    }

    if (targetClientId && !isVerifiedCoach(req as never)) {
      return res.status(401).json({ error: "Coach access required" });
    }

    const result = await duplicateAssignedWorkout({
      assignedWorkoutRecordId,
      scheduledDate,
      targetClientId,
    });
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    if (error instanceof SessionEditError) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
