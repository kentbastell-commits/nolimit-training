import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ConfigError } from "../server/db/errors.ts";
import { getContentAssignments } from "../server/db/repositories/contentAssignments.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { clientId = "", clientCode = "", clientName = "" } = req.query;
    const assignments = await getContentAssignments(
      String(clientId),
      String(clientCode),
      String(clientName)
    );
    return res.status(200).json({ assignments });
  } catch (error: any) {
    if (error instanceof ConfigError) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
