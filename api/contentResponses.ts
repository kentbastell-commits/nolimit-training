import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getContentResponses } from "../server/db/repositories/contentResponses.ts";
import { ConfigError } from "../server/db/errors.ts";

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
    if (error instanceof ConfigError) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
