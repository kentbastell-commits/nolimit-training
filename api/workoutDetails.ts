import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getWorkoutDetails } from "../server/db/repositories/workoutDetails.ts";
import { clientHasProgramAccess } from "../server/db/repositories/clients.ts";
import { coachKeyOk } from "./_coachAuth.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { programId, week, day, clientCode } = req.query;
    if (!programId || !week || !day) {
      return res.status(400).json({
        error: "Missing required query params",
        required: ["programId", "week", "day"],
        received: { programId, week, day },
      });
    }
    // Same paid-content-for-free risk as programTemplates.ts — require proof
    // the caller's client actually has this program before serving exercise
    // content for it.
    if (!coachKeyOk(req as never)) {
      const hasAccess = await clientHasProgramAccess(
        String(clientCode || ""),
        String(programId)
      );
      if (!hasAccess) {
        return res.status(403).json({ error: "No access to this program" });
      }
    }
    const exercises = await getWorkoutDetails(String(programId), String(week), String(day));
    return res.status(200).json({ exercises });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
