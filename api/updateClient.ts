import type { VercelRequest, VercelResponse } from "@vercel/node";
import { updateClient } from "../server/db/repositories/clients.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!req.body?.clientRecordId) {
    return res.status(400).json({ error: "Missing clientRecordId" });
  }
  try {
    const result = await updateClient(req.body);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
