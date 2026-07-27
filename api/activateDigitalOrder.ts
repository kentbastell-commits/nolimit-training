import type { VercelRequest, VercelResponse } from "@vercel/node";
import { notifyCoach } from "./_notify.ts";
import { activateDigitalOrder } from "../server/db/repositories/fulfillment.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { clientName, phone, programId, paymentCode, privacyAccepted } =
    req.body || {};

  if (!clientName || !phone || !programId)
    return res.status(400).json({ error: "clientName, phone, and programId required" });
  if (!/^NL-[2-9A-HJ-NP-Z]{4}$/.test(String(paymentCode || "").trim()))
    return res.status(400).json({ error: "A valid NL payment reference is required" });
  // crossBorderAccepted is no longer required (2026-07-28): data storage
  // moved to mainland China on 2026-07-27, so routine processing no longer
  // crosses the border. Older clients may still send the field; it is
  // accepted and ignored rather than rejected.
  if (privacyAccepted !== true)
    return res.status(400).json({ error: "Privacy consent required" });

  try {
    const result = await activateDigitalOrder(req.body);
    for (const notice of result.notices) void notifyCoach(notice);
    return res.status(result.status).json(result.body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Activation failed", message });
  }
}
