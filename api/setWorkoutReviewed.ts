import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setWorkoutReviewed } from "../server/db/repositories/workouts.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { assignedWorkoutRecordId, reviewed } = req.body || {};
    if (!assignedWorkoutRecordId) {
      return res.status(400).json({ error: "Missing assignedWorkoutRecordId" });
    }

    const result = await setWorkoutReviewed(assignedWorkoutRecordId, reviewed);
    if (!result.success) {
      return res
        .status(500)
        .json({ error: "Could not update review flag", details: result.details });
    }
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
