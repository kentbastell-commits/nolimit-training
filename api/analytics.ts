import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAnalytics } from "../server/db/repositories/analytics.ts";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const result = await getAnalytics();
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: "Could not build analytics", message: error.message });
  }
}
