import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listExercises } from "../server/db/repositories/exercises.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // debug=1 bypasses the cache. It used to also return Feishu column
    // introspection (availableFields / cueFieldCandidates), which meant
    // nothing once the library moved to Postgres — cue notes live in a real
    // column there, so there is no alias to report.
    const debug = req.query.debug === "1";
    const { exercises } = await listExercises({ skipCache: debug });
    return res.status(200).json({ exercises });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
