import type { VercelRequest, VercelResponse } from "@vercel/node";
import { recordLogin } from "../server/db/repositories/clients.ts";

// Stamp a client's last-login when the athlete opens their portal. Soft-fails
// (always 200) so a transient error never breaks the portal.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { clientRecordId, clientCode } = req.body || {};
  if (!clientRecordId && !clientCode) {
    return res.status(400).json({ error: "Missing clientRecordId or clientCode" });
  }
  try {
    const result = await recordLogin(clientRecordId, clientCode);
    if (!result.success && result.error === "Client not found") {
      return res.status(404).json({ error: "Client not found" });
    }
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(200).json({ success: false, message: error.message });
  }
}
