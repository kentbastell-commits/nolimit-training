import type { VercelRequest, VercelResponse } from "@vercel/node";
import { updateAssignedWorkoutDate } from "../server/db/repositories/workouts.ts";
import { getAssignedWorkoutClientCode } from "../server/db/pg/workouts.ts";
import { isVerifiedCoach } from "./_coachAuth.ts";

// Moves ONE assigned workout to a new date. Dual-use: the coach calendar and
// the athlete's own calendar (web portal + mini program) both call it, so it
// is not in COACH_ONLY_HANDLERS. Ownership rule for non-coach callers: when
// the body carries a clientCode, the session must belong to that athlete.
// (A keyless call with no clientCode is the documented pre-session-token gap
// — the mini program sends its code from 2026.9.18 on; older builds don't.)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { assignedWorkoutRecordId, assignedWorkoutId, scheduledDate, clientCode } =
      req.body || {};

    if ((!assignedWorkoutRecordId && !assignedWorkoutId) || !scheduledDate) {
      return res.status(400).json({
        error: "Missing assignedWorkoutRecordId/assignedWorkoutId or scheduledDate",
      });
    }

    // Enforced whenever the caller names itself and cannot PROVE it is a
    // coach — including while the coach key is not configured yet.
    const claimedCode = String(clientCode || "").trim().toLowerCase();
    if (claimedCode && !isVerifiedCoach(req as never)) {
      const owner = await getAssignedWorkoutClientCode([
        assignedWorkoutRecordId,
        assignedWorkoutId,
      ]);
      if (owner && owner.toLowerCase() !== claimedCode) {
        return res.status(403).json({
          error: "This session belongs to another athlete",
        });
      }
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
