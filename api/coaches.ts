import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listCoaches } from "../server/db/repositories/coaches.ts";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const coaches = await listCoaches();
    return res.status(200).json({ coaches });
  } catch (error: any) {
    return res.status(500).json({ error: "Could not fetch coaches", message: error.message });
  }
}
