import type { VercelRequest, VercelResponse } from "@vercel/node";
import { referralQuote } from "../server/db/repositories/referrals.ts";

// Quote the referral discount a checkout would get. Purely informational —
// activateDigitalOrder recomputes the same quote server-side when ordering.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const quote = await referralQuote({
      buyerCode: String(req.query.clientCode || ""),
      referrerCode: String(req.query.referrerCode || ""),
    });
    return res.status(200).json(quote);
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
