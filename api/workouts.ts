import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listWorkouts } from "../server/db/repositories/workouts.ts";
import { coachKeyOk } from "./_coachAuth.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const clientCode = String(req.query.clientCode || "");
    // No clientCode = every client's assigned-workout schedule. Coach-only,
    // same rule as clients.ts (named mistake #49).
    if (!clientCode && !coachKeyOk(req as never)) {
      return res.status(401).json({ error: "Coach access key required" });
    }
    const workouts = await listWorkouts(clientCode);
    return res.status(200).json({ workouts });
  } catch (error: any) {
    if (error.kind === "token") {
      return res.status(500).json({ error: "Could not get tenant access token" });
    }
    return res.status(500).json({
      error: "Could not fetch assigned workouts",
      message: error.message,
    });
  }
}
