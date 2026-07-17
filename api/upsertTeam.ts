import type { VercelRequest, VercelResponse } from "@vercel/node";
import { upsertTeam } from "../server/db/repositories/teams.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { recordId, teamName } = req.body || {};
    if (!teamName && !recordId) {
      return res.status(400).json({ error: "Missing team name" });
    }
    const result = await upsertTeam(req.body);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
