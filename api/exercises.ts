import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listExercises, CUE_FIELD_CANDIDATES } from "../server/db/repositories/exercises.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { exercises, availableFields } = await listExercises();
    const debugPayload =
      req.query.debug === "1"
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
