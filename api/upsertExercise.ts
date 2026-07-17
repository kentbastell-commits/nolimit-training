import type { VercelRequest, VercelResponse } from "@vercel/node";
import { upsertExercise } from "../server/db/repositories/exercises.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { exerciseName, archive } = req.body;

    if (!exerciseName && !archive) {
      return res.status(400).json({ error: "Missing exercise name" });
    }

    // The repository impls return the exact HTTP status + JSON body (the
    // upsert has several distinct 400/500 shapes) and handle cache
    // invalidation on success.
    const result = await upsertExercise(req.body);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
