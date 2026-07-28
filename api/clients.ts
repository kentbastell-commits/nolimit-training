import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listClients } from "../server/db/repositories/clients.ts";
import { coachKeyOk } from "./_coachAuth.ts";

// Two modes:
//  - ?code=CL-XXXX → that one client's row (what the athlete portal needs —
//    knowing a code already opens that athlete's portal, so this reveals
//    nothing the link didn't).
//  - no code → the FULL roster, coach-only once COACH_ACCESS_KEY is set.
//    Named mistake #49: the full list (names, phones, emails, notes) must
//    never be servable to an athlete-facing client.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const code = String(req.query.code || "").trim().toLowerCase();
    const clients = await listClients();

    if (code) {
      const match = clients.filter(
        (c) => c.clientCode.toLowerCase() === code || c.id.toLowerCase() === code
      );
      return res.status(200).json({ clients: match });
    }

    if (!coachKeyOk(req as never)) {
      return res.status(401).json({ error: "Coach access key required" });
    }
    return res.status(200).json({ clients });
  } catch (error: any) {
    return res.status(500).json({ error: "Could not fetch clients", message: error.message });
  }
}
