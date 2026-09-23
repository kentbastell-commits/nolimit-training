import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getWorkoutDetails } from "../server/db/repositories/workoutDetails.ts";
import {
  clientHasProgramAccess,
  programIsPaidContent,
} from "../server/db/repositories/clients.ts";
import { coachKeyOk, isVerifiedCoach } from "./_coachAuth.ts";
import { publishedCalendarSlots } from "../server/db/pg/calendarDrafts.ts";

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
    if (!isVerifiedCoach(req as never) || req.query.audience === "athlete") {
      const slots = await publishedCalendarSlots(String(programId), String(clientCode || ""));
      if (slots && !slots.some(s => s.week === Number(week) && s.day === Number(day))) {
        return res.status(403).json({ error: "This session is not published" });
      }
    }
    // Same paid-content-for-free risk as programTemplates.ts — require proof
    // the caller's client actually has this program before serving exercise
    // content for it.
    if (!coachKeyOk(req as never)) {
      const hasAccess = await clientHasProgramAccess(
        String(clientCode || ""),
        String(programId)
      );
      // Coached (non-store) programs are readable without a code: the
      // released mini program sends none, and the day the coach lock went
      // on every athlete's workout became a 403. Paid store content still
      // needs the athlete's proof of purchase/assignment.
      if (!hasAccess && (await programIsPaidContent(String(programId)))) {
        return res.status(403).json({ error: "No access to this program" });
      }
    }
    const exercises = await getWorkoutDetails(String(programId), String(week), String(day));
    return res.status(200).json({ exercises });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
