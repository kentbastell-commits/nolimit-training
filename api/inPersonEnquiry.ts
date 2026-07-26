import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createEnquiry } from "../server/db/repositories/enquiries.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { contactPerson, contact, privacyAccepted, crossBorderAccepted } =
      req.body || {};

    if (!contactPerson || !contact) {
      return res
        .status(400)
        .json({ error: "Please add a contact person and a way to reach you." });
    }
    if (privacyAccepted !== true || crossBorderAccepted !== true) {
      return res.status(400).json({ error: "Privacy and cross-border consent required" });
    }

    const result = await createEnquiry(req.body);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
