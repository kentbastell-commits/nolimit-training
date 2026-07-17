import type { VercelRequest, VercelResponse } from "@vercel/node";
import { upsertCoach } from "../server/db/repositories/coaches.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { name } = req.body || {};
    if (!name?.trim()) {
      return res.status(400).json({ error: "Missing coach name" });
    }
    const result = await upsertCoach(req.body);
    // A base missing the required Name column is a client-visible schema
    // problem (400), not a server failure — same split the old handler made.
    const status = result.success
      ? 200
      : result.error === "Coaches table is missing required columns"
      ? 400
      : 500;
    return res.status(status).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
