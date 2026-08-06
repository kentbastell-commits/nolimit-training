import type { VercelRequest, VercelResponse } from "@vercel/node";
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
    if (pin) {
      const clientCode = await findClientByPin(String(pin));
      if (!clientCode) {
        return res.status(404).json({ error: "No portal found for that code" });
      }
      return res.status(200).json({ success: true, clientCode });
    }

    if (!phone || !name)
      return res.status(400).json({ error: "phone and name required" });

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
