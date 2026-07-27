import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../server/db/client.ts";
import { wxSubscribeCredits } from "../server/db/schema.ts";

// Records one WeChat subscribe-message grant ("allow" tap in the mini
// program) = permission for exactly one future push. The morning wellness
// cron consumes these. Deliberately dumb: no auth beyond the code shape —
// the worst abuse is banking pings for yourself.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const clientId = String(req.body?.clientId || "").trim();
    if (!/^CL-\d+$/.test(clientId)) {
      return res.status(400).json({ error: "A valid clientId is required" });
    }
    const templateType =
      String(req.body?.templateType || "wellness").trim() || "wellness";

    const creditId = `WXC-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    await db.insert(wxSubscribeCredits).values({
      creditId,
      clientId,
      templateType,
      grantedAt: Date.now(),
      usedAt: null,
    });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: "Could not bank subscription", message: error.message });
  }
}
