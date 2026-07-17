import type { VercelRequest, VercelResponse } from "@vercel/node";
import { notifyCoach } from "./_notify.ts";
import { DATA_BACKEND } from "../server/db/backend.ts";
import { coachingSignup } from "../server/db/repositories/fulfillment.ts";

// 1:1 Online Coaching signup — the paid coaching flow (Commitment → qualifier →
// WeChat payment → post-payment questionnaire). Two stages:
//   stage "order"  — at "I've paid": create/find the client with the qualifier
//                    fields + create one Product Orders record for the paid term.
//   stage "intake" — the post-payment questionnaire (all optional): append the
//                    answers to the client's Notes. Best-effort; the qualifier +
//                    payment are already captured, so a failure here never blocks.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  const stage = body.stage === "intake" ? "intake" : "order";

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
    if (body.privacyAccepted !== true || body.crossBorderAccepted !== true)
      return res.status(400).json({ error: "Privacy and cross-border consent required" });
    if (!/^NL-[2-9A-HJ-NP-Z]{4}$/.test(paymentCode))
      return res.status(400).json({ error: "A valid NL payment reference is required" });
  }

  if (stage === "intake") {
    if (!String(body.clientRecordId || ""))
      return res.status(400).json({ error: "clientRecordId required" });
    if (String(body.injuries || "").trim() && body.healthConsent !== true)
      return res.status(400).json({ error: "Separate health information consent required" });
  }

  // Feishu needs its base/table config; on Postgres the env vars are irrelevant.
  if (
    DATA_BACKEND === "feishu" &&
    (!process.env.FEISHU_BASE_APP_TOKEN || !process.env.FEISHU_CLIENTS_TABLE_ID)
  ) {
    return res.status(503).json({ message: "Coaching signup is not configured." });
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
