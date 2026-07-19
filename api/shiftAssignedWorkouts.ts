import type { VercelRequest, VercelResponse } from "@vercel/node";
import { shiftAssignedWorkoutDates } from "../server/db/repositories/workouts.ts";

// Client-facing bulk reschedule: shift every not-yet-completed workout
// scheduled on/after fromDate by N days (athlete customizing their plan).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { clientCode, fromDate, days, includeCompleted } = req.body || {};

    if (!clientCode || !fromDate) {
      return res.status(400).json({ error: "Missing clientCode or fromDate" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fromDate)) || Number.isNaN(new Date(fromDate).getTime())) {
      return res.status(400).json({ error: "fromDate must be YYYY-MM-DD" });
    }
    const shiftDays = Number(days);
    if (!Number.isInteger(shiftDays) || shiftDays === 0 || Math.abs(shiftDays) > 30) {
      return res.status(400).json({ error: "days must be a non-zero integer within ±30" });
    }

    const result = await shiftAssignedWorkoutDates({
      clientCode: String(clientCode),
      fromDate: String(fromDate),
      days: shiftDays,
      includeCompleted: Boolean(includeCompleted),
    });
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
