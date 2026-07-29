import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getWorkoutHistory } from "../server/db/repositories/workoutHistory.ts";
import { coachKeyOk } from "./_coachAuth.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const clientId = String(req.query.clientId || "");
    const clientCode = String(req.query.clientCode || "");
    // No clientId/clientCode = every client's logged sets/reps/weights.
    // Coach-only, same rule as clients.ts (named mistake #49).
    if (!clientId && !clientCode && !coachKeyOk(req as never)) {
      return res.status(401).json({ error: "Coach access key required" });
    }
    const result = await getWorkoutHistory(
      clientId,
      clientCode,
      String(req.query.exerciseName || "")
    );
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: "Could not fetch workout history", message: error.message });
  }
}
