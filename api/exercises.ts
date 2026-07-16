import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listExercises, CUE_FIELD_CANDIDATES } from "../server/db/repositories/exercises.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const debug = req.query.debug === "1";
    // debug=1 bypasses the cache so field introspection always hits the backend.
    const { exercises, availableFields } = await listExercises({ skipCache: debug });
    const debugPayload = debug
      ? { availableFields, cueFieldCandidates: CUE_FIELD_CANDIDATES }
      : {};
    return res.status(200).json({ exercises, ...debugPayload });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
