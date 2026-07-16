import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listPrograms } from "../server/db/repositories/programs.ts";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const programs = await listPrograms();
    return res.status(200).json({ programs });
  } catch (error: any) {
    if (error.kind === "token") {
      return res.status(500).json({
        error: "Could not get Lark tenant access token",
        larkResponse: error.larkResponse,
      });
    }
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
