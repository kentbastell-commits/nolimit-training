import type { VercelRequest, VercelResponse } from "@vercel/node";
import { notifyCoach } from "./_notify.ts";
import { activateDigitalOrder } from "../server/db/repositories/fulfillment.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { clientName, phone, programId, paymentCode, privacyAccepted, crossBorderAccepted } =
    req.body || {};

  if (!clientName || !phone || !programId)
    return res.status(400).json({ error: "clientName, phone, and programId required" });
  if (!/^NL-[2-9A-HJ-NP-Z]{4}$/.test(String(paymentCode || "").trim()))
    return res.status(400).json({ error: "A valid NL payment reference is required" });
  if (privacyAccepted !== true || crossBorderAccepted !== true)
    return res.status(400).json({ error: "Privacy and cross-border consent required" });

  try {
    const result = await activateDigitalOrder(req.body);
    for (const notice of result.notices) void notifyCoach(notice);
    return res.status(result.status).json(result.body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Activation failed", message });
  }
}
