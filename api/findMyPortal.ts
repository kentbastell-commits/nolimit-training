import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DATA_BACKEND } from "../server/db/backend.ts";
import { findClientByPhoneName } from "../server/db/repositories/clients.ts";

// Portal recovery for digital clients who lost their login code: exact match
// on the Phone/WeChat they registered with, plus a fuzzy name check so a
// phone number alone can't be used to enumerate portals.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { phone, name } = req.body || {};
  if (!phone || !name)
    return res.status(400).json({ error: "phone and name required" });

  // Feishu needs its base/table config; on Postgres the env vars are irrelevant.
  if (
    DATA_BACKEND === "feishu" &&
    (!process.env.FEISHU_BASE_APP_TOKEN || !process.env.FEISHU_CLIENTS_TABLE_ID)
  ) {
    return res.status(500).json({ error: "Server not configured" });
  }

  try {
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
