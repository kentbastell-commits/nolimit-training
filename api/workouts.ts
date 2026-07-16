import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listWorkouts } from "../server/db/repositories/workouts.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const workouts = await listWorkouts(String(req.query.clientCode || ""));
    return res.status(200).json({ workouts });
  } catch (error: any) {
    if (error.kind === "token") {
      return res.status(500).json({ error: "Could not get tenant access token" });
    }
    return res.status(500).json({
      error: "Could not fetch assigned workouts",
      message: error.message,
    });
  }
}
