import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listPrograms } from "../server/db/repositories/programs.ts";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const programs = await listPrograms();
    return res.status(200).json({ programs });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
