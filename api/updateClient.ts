import type { VercelRequest, VercelResponse } from "@vercel/node";
import { updateClient } from "../server/db/repositories/clients.ts";
import { coachKeyOk } from "./_coachAuth.ts";

// clientRecordId IS the client's public code (CL-0001 style, sequential —
// the portal's own bearer credential), so without this allowlist anyone who
// knows or guesses another client's code could POST any of ~25 columns —
// paymentStatus, accessStartDate/EndDate, purchasedProgramId, coach
// assignment, notes, performance overrides — and grant themselves paid
// access or vandalize another client's record. Only the fields the portal
// itself legitimately writes (language toggle, check-in "last seen" stamp)
// are allowed without the coach key.
const PORTAL_SAFE_FIELDS = new Set([
  "clientRecordId",
  "languagePreference",
  "lastCheckInDate",
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!req.body?.clientRecordId) {
    return res.status(400).json({ error: "Missing clientRecordId" });
  }
  if (!coachKeyOk(req as never)) {
    const disallowed = Object.keys(req.body).filter(
      (k) => !PORTAL_SAFE_FIELDS.has(k)
    );
    if (disallowed.length > 0) {
      return res
        .status(401)
        .json({ error: "Coach access key required", disallowed });
    }
  }
  try {
    const result = await updateClient(req.body);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
