import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getWorkoutHistory } from "../server/db/repositories/workoutHistory.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await getWorkoutHistory(
      String(req.query.clientId || ""),
      String(req.query.clientCode || ""),
      String(req.query.exerciseName || "")
    );
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: "Could not fetch workout history", message: error.message });
  }
}
