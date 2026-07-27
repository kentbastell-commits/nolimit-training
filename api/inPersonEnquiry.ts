import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createEnquiry } from "../server/db/repositories/enquiries.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { contactPerson, contact, privacyAccepted } =
      req.body || {};

    if (!contactPerson || !contact) {
      return res
        .status(400)
        .json({ error: "Please add a contact person and a way to reach you." });
    }
    // Cross-border consent retired 2026-07-28 (mainland cutover 07-27).
    if (privacyAccepted !== true) {
      return res.status(400).json({ error: "Privacy consent required" });
    }

    const result = await createEnquiry(req.body);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
