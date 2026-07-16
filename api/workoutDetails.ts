import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getWorkoutDetails } from "../server/db/repositories/workoutDetails.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { programId, week, day } = req.query;
    if (!programId || !week || !day) {
      return res.status(400).json({
        error: "Missing required query params",
        required: ["programId", "week", "day"],
        received: { programId, week, day },
      });
    }
    const exercises = await getWorkoutDetails(String(programId), String(week), String(day));
    return res.status(200).json({ exercises });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
