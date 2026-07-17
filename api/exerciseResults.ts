import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DATA_BACKEND } from "../server/db/backend.ts";
import {
  listExerciseResults,
  createExerciseResults,
} from "../server/db/repositories/exerciseResults.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Feishu needs its table id; on Postgres the env var is irrelevant.
  if (DATA_BACKEND === "feishu" && !process.env.FEISHU_EXERCISE_RESULTS_TABLE_ID) {
    return res.status(500).json({ error: "Missing FEISHU_EXERCISE_RESULTS_TABLE_ID" });
  }

  try {
    if (req.method === "GET") {
      const clientId = String(req.query.clientId || "");
      const exerciseName = String(req.query.exerciseName || "");
      const results = await listExerciseResults(clientId, exerciseName);
      return res.status(200).json({ results });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const result = await createExerciseResults({
      clientId: String(req.body.clientId || ""),
      clientRecordId: req.body.clientRecordId,
      assignedWorkoutId: req.body.assignedWorkoutId,
      programId: req.body.programId,
      workoutDate: req.body.workoutDate,
      logs: Array.isArray(req.body.logs) ? req.body.logs : [],
    });

    if (result.errors.length > 0) {
      return res.status(500).json({
        error: "Some exercise results could not be created",
        ...result,
      });
    }

    return res.status(200).json({
      success: true,
      recordsCreated: result.createdRecords.length,
      createdRecords: result.createdRecords,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
