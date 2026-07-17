import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  updateProgram,
  hasProgramUpdateFields,
} from "../server/db/repositories/programs.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { programRecordId } = req.body || {};
    if (!programRecordId) {
      return res.status(400).json({ error: "Missing programRecordId" });
    }
    if (!hasProgramUpdateFields(req.body)) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const result = await updateProgram(req.body);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
