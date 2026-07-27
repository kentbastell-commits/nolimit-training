import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listClients } from "../server/db/repositories/clients.ts";
import { listCoaches } from "../server/db/repositories/coaches.ts";

// The athlete-facing profile read. The mini program used to download the
// ENTIRE client list (names, phones, emails, coach notes) just to learn its
// own clientType — a PIPL problem the moment real athletes join. This
// returns only the caller's own display fields, nothing about anyone else.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const clientId = String(req.query.clientId || "").trim();
    if (!/^CL-\d+$/.test(clientId)) {
      return res.status(400).json({ error: "A valid clientId is required" });
    }

    const clients = await listClients();
    const me = clients.find((c) => c.clientCode === clientId);
    if (!me) {
      return res.status(404).json({ error: "Client not found" });
    }

    const coachName = me.coach || "";
    const coaches = coachName ? await listCoaches() : [];
    const myCoach = coaches.find(
      (c) => c.name === coachName || c.coachId === coachName
    );

    return res.status(200).json({
      profile: {
        clientCode: me.clientCode,
        name: me.name,
        clientType: me.clientType,
        languagePreference: me.languagePreference,
        purchasedProgramId: me.purchasedProgramId || "",
        coach: myCoach?.name || coachName,
        coachQrUrl: myCoach?.qrCodeUrl || "",
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Could not fetch profile", message: error.message });
  }
}
