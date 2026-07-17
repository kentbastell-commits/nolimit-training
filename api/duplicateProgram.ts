import type { VercelRequest, VercelResponse } from "@vercel/node";
import { duplicateProgram } from "../server/db/repositories/programs.ts";

// Coach tooling: clone a whole program (record + all workout-template rows)
// or copy one week's sessions to another week inside the same program.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { programRecordId, mode, fromWeek, toWeek } = req.body || {};
    if (!programRecordId) {
      return res.status(400).json({ error: "programRecordId required" });
    }

    const result = await duplicateProgram({ programRecordId, mode, fromWeek, toWeek });
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
