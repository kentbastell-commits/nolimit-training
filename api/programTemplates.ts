import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listProgramTemplates } from "../server/db/repositories/programTemplates.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { programId, programRecordId } = req.query;
    if (!programId && !programRecordId) {
      return res.status(400).json({ error: "Missing programId" });
    }
    const templates = await listProgramTemplates(
      String(programId || ""),
      String(programRecordId || "")
    );
    return res.status(200).json({ templates });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
