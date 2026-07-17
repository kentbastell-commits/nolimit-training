import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DATA_BACKEND } from "../server/db/backend.ts";
import { reviewWorkoutComment } from "../server/db/repositories/workoutLogs.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Feishu needs its table id; on Postgres the env var is irrelevant.
  if (DATA_BACKEND === "feishu" && !process.env.FEISHU_WORKOUT_LOGS_TABLE_ID) {
    return res.status(500).json({ error: "Missing workout logs table ID" });
  }

  try {
    const { recordIds = [] } = req.body || {};

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return res.status(400).json({ error: "Missing recordIds" });
    }

    const result = await reviewWorkoutComment(recordIds);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: "Could not review workout comment",
      message: error.message,
    });
  }
}
