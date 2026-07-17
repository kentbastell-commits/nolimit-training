import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createProgram } from "../server/db/repositories/programs.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { programName } = req.body || {};
    if (!programName) {
      return res.status(400).json({
        error: "Missing Program Name",
      });
    }

    const result = await createProgram(req.body);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
