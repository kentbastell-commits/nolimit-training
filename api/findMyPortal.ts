import type { VercelRequest, VercelResponse } from "@vercel/node";
import { allowAthleteLogin, athleteSessionsRequired, issueAthleteSession, sameOriginRequest } from "../server/athleteAuth.ts";
import {
  findClientByPhoneName,
  findClientByPin,
} from "../server/db/repositories/clients.ts";

// Athlete login lookup, two shapes:
//   POST { pin }          — the simple per-athlete login code (pilot-stage
//                           easy login; exact match on clients.login_pin)
//   POST { phone, name }  — recovery path: exact phone plus fuzzy name so a
//                           phone alone can't enumerate portals.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { phone, name, pin } = req.body || {};

  try {
    res.setHeader("Cache-Control", "no-store");
    if (!sameOriginRequest(req)) return res.status(403).json({ error: "Cross-site request refused" });
    if (!await allowAthleteLogin(req, res)) return;
    if (pin) {
      const clientCode = /^CL-\d+$/i.test(String(pin).trim()) ? "" : await findClientByPin(String(pin));
      if (!clientCode) {
        return res.status(404).json({ error: "No portal found for that code" });
      }
      return res.status(200).json({ success: true, ...await issueAthleteSession(req, res, clientCode, "pin") });
    }

    if (!phone || !name)
      return res.status(400).json({ error: "phone and name required" });

    if (athleteSessionsRequired()) return res.status(401).json({
      error: "Use your coach-issued login code or verified WeChat account", code: "VERIFIED_LOGIN_REQUIRED",
    });

    const clientCode = await findClientByPhoneName(String(phone), String(name));

    if (!clientCode) {
      // Deliberately generic — do not reveal whether the phone exists.
      return res
        .status(404)
        .json({ error: "No portal found for that phone and name" });
    }

    return res.status(200).json({ success: true, clientCode });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Lookup failed", message });
  }
}
