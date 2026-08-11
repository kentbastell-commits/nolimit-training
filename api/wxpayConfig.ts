import type { VercelRequest, VercelResponse } from "@vercel/node";
import { wxpayEnabled } from "../server/wxpay/client.ts";

// Feature probe for the store checkout: tells the client whether real
// WeChat Pay is switched on. Safe to expose — reveals only a boolean.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  return res.status(200).json({ enabled: wxpayEnabled() });
}
