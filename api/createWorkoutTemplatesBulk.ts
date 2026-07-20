import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createWorkoutTemplatesBulk } from "../server/db/repositories/programTemplates.ts";

// Whole-program save: one call carrying every session, so the builder doesn't
// fire N per-session requests. Same auth/shape rules as createWorkoutTemplate,
// just an array of sessions.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { programId, programRecordId, sessions } = req.body || {};

    if (!programId || !programRecordId) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["programId", "programRecordId", "sessions"],
      });
    }

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ error: "No sessions provided" });
    }

    // Reject a malformed session early rather than mid-batch.
    for (const s of sessions) {
      if (!s || s.week === undefined || s.day === undefined || !s.sessionName) {
        return res.status(400).json({
          error: "Each session needs week, day, and sessionName",
        });
      }
      if (!Array.isArray(s.exercises) || s.exercises.length === 0) {
        return res.status(400).json({
          error: `Session "${s.sessionName}" has no exercises`,
        });
      }
    }

    const result = await createWorkoutTemplatesBulk(req.body);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
