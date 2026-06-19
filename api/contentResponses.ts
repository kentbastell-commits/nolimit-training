import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getContentResponses } from "../server/db/repositories/contentResponses.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const responses = await getContentResponses(
      String(req.query.clientId || ""),
      String(req.query.clientName || "")
    );
    return res.status(200).json({ responses });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
