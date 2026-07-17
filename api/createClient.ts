import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "../server/db/repositories/clients.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!req.body?.name) {
    return res.status(400).json({ error: "Missing client name" });
  }
  try {
    const result = await createClient(req.body);
    return res.status(result.success ? 200 : 500).json(result);
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
