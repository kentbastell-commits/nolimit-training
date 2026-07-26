import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listWorkoutComments } from "../server/db/repositories/workoutLogs.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
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
