import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getContentResponses } from "../server/db/repositories/contentResponses.ts";
import { ConfigError } from "../server/db/errors.ts";
import { coachKeyOk } from "./_coachAuth.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const clientId = String(req.query.clientId || "");
    const clientName = String(req.query.clientName || "");
    // No client filter = every client's questionnaire/test answers.
    // Coach-only, same rule as clients.ts (named mistake #49).
    if (!clientId && !clientName && !coachKeyOk(req as never)) {
      return res.status(401).json({ error: "Coach access key required" });
    }
    const responses = await getContentResponses(clientId, clientName);
    return res.status(200).json({ responses });
  } catch (error: any) {
    if (error instanceof ConfigError) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
