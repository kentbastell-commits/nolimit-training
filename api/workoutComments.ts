import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DATA_BACKEND } from "../server/db/backend.ts";
import { listWorkoutComments } from "../server/db/repositories/workoutLogs.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Feishu needs its table id; on Postgres the env var is irrelevant.
  if (DATA_BACKEND === "feishu" && !process.env.FEISHU_WORKOUT_LOGS_TABLE_ID) {
    return res.status(500).json({ error: "Missing workout logs table ID" });
  }

  try {
    const { clientId = "", clientName = "" } = req.query;
    const comments = await listWorkoutComments(String(clientId), String(clientName));
    return res.status(200).json({ comments });
  } catch (error: any) {
    return res.status(500).json({
      error: "Could not fetch workout comments",
      message: error.message,
    });
  }
}
