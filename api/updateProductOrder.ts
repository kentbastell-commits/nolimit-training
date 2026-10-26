import type { VercelRequest, VercelResponse } from "@vercel/node";
import { updateProductOrder } from "../server/db/repositories/productOrders.ts";
import { coachKeyOk } from "./_coachAuth.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!coachKeyOk(req as never)) return res.status(401).json({ error: "Coach access key required" });

  const body = req.body || {};

  if (!body.recordId) {
    return res.status(400).json({ error: "Missing product order recordId" });
  }

  try {
    const result = await updateProductOrder(body);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
