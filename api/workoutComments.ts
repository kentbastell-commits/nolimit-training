import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listWorkoutComments } from "../server/db/repositories/workoutLogs.ts";
import { coachKeyOk } from "./_coachAuth.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { clientId = "", clientName = "" } = req.query;
    // No client filter = every client's workout comments. Coach-only, same
    // rule as clients.ts (named mistake #49).
    if (!clientId && !clientName && !coachKeyOk(req as never)) {
      return res.status(401).json({ error: "Coach access key required" });
    }
    const comments = await listWorkoutComments(String(clientId), String(clientName));
    return res.status(200).json({ comments });
  } catch (error: any) {
    return res.status(500).json({
      error: "Could not fetch workout comments",
      message: error.message,
    });
  }
}
