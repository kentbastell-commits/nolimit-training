import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listTeams } from "../server/db/repositories/teams.ts";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const teams = await listTeams();
    return res.status(200).json({ teams });
  } catch (error: any) {
    return res.status(500).json({ error: "Could not fetch teams", message: error.message });
  }
}
