import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isVerifiedCoach } from "./_coachAuth.ts";
import { athleteSessionsRequired, issueAthleteSession, readAthleteSession, revokeAthleteSession, sameOriginRequest } from "../server/athleteAuth.ts";
import { db } from "../server/db/client.ts";
import { clients } from "../server/db/schema.ts";
import { eq } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") {
    const session = await readAthleteSession(req);
    return res.status(200).json(session
      ? { authenticated: true, clientCode: session.clientId, expiresAt: session.expiresAt, readOnly: session.proof === "preview" }
      : { authenticated: false, required: athleteSessionsRequired() });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!sameOriginRequest(req)) return res.status(403).json({ error: "Cross-site request refused" });
  if (req.body?.action === "logout") {
    await revokeAthleteSession(req, res);
    return res.status(200).json({ success: true });
  }
  if (req.body?.action === "preview" && isVerifiedCoach(req as never)) {
    const code = String(req.body.clientCode || "");
    const [client] = await db.select({ id: clients.clientId }).from(clients).where(eq(clients.clientId, code));
    if (!client) return res.status(404).json({ error: "Client not found" });
    return res.status(200).json({ success: true, ...await issueAthleteSession(req, res, client.id, "preview") });
  }
  return res.status(403).json({ error: "Action not permitted" });
}
