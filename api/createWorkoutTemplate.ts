import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createWorkoutTemplate } from "../server/db/repositories/programTemplates.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { programId, programRecordId, week, day, sessionName, exercises } =
      req.body || {};

    if (!programId || !programRecordId || !week || !day || !sessionName) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["programId", "programRecordId", "week", "day", "sessionName"],
        received: {
          programId,
          programRecordId,
          week,
          day,
          sessionName,
        },
      });
    }

    // A test day is a valid exercise-less session (linked test battery).
    if (
      (!Array.isArray(exercises) || exercises.length === 0) &&
      !req.body.testTemplateId
    ) {
      return res.status(400).json({
        error: "No exercises provided",
      });
    }
    if (!Array.isArray(req.body.exercises)) req.body.exercises = [];

    const result = await createWorkoutTemplate(req.body);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
