import type { VercelRequest, VercelResponse } from "@vercel/node";
import { notifyCoach } from "./_notify.ts";
import { coachingSignup } from "../server/db/repositories/fulfillment.ts";

// 1:1 Online Coaching signup — the paid coaching flow (Commitment → qualifier →
// WeChat payment → post-payment questionnaire). Three stages:
//   stage "order"  — on LEAVING the qualifier, before the QR is shown: create
//                    the client + a Pending order marked "Awaiting Payment".
//                    Creating it first means a transfer can never land against
//                    a reference that exists nowhere, and it matches the shape
//                    WeChat Pay needs later (order → prepay → callback).
//   stage "claim"  — at "I've paid": move the existing order into the coach's
//                    queue and ping them. Payment Status stays Pending — a
//                    buyer's claim is not verification (#22).
//   stage "intake" — the post-payment questionnaire (all optional): append the
//                    answers to the client's Notes. Best-effort; the qualifier +
//                    payment are already captured, so a failure here never blocks.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  const stage =
    body.stage === "intake" ? "intake" : body.stage === "claim" ? "claim" : "order";

  // Reject incomplete paid orders before any write. This guarantees no order
  // can reach a write path without the reference needed to reconcile the
  // WeChat transfer.
  if (stage === "order") {
    const clientName = String(body.clientName || "").trim();
    const phone = String(body.phone || "").trim();
    const termLabel = String(body.termLabel || "").trim();
    const paymentCode = String(body.paymentCode || "").trim();
    if (!clientName || !phone || !termLabel)
      return res
        .status(400)
        .json({ error: "clientName, phone, and termLabel required" });
    // Cross-border consent retired 2026-07-28 (mainland cutover 07-27);
    // old clients may still send it — accepted, ignored, never required.
    if (body.privacyAccepted !== true)
      return res.status(400).json({ error: "Privacy consent required" });
    if (!/^NL-[2-9A-HJ-NP-Z]{4}$/.test(paymentCode))
      return res.status(400).json({ error: "A valid NL payment reference is required" });
  }

  if (stage === "claim") {
    if (!String(body.orderId || "").trim())
      return res.status(400).json({ error: "orderId required" });
  }

  if (stage === "intake") {
    if (!String(body.clientRecordId || ""))
      return res.status(400).json({ error: "clientRecordId required" });
    if (String(body.injuries || "").trim() && body.healthConsent !== true)
      return res.status(400).json({ error: "Separate health information consent required" });
  }

  try {
    const result = await coachingSignup(body);
    for (const notice of result.notices) void notifyCoach(notice);
    return res.status(result.status).json(result.body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Coaching signup failed", message });
  }
}
