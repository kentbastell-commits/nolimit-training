import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listSubscriptions } from "../server/db/repositories/subscriptions.ts";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const subscriptions = await listSubscriptions();
    return res.status(200).json({ subscriptions });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Could not fetch subscriptions", message: error.message });
  }
}
