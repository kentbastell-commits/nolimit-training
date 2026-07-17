import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createProductOrder } from "../server/db/repositories/productOrders.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body || {};

  if (!body.clientName) {
    return res.status(400).json({ error: "Missing client name" });
  }

  if (!body.productName && !body.programId) {
    return res.status(400).json({ error: "Missing product or program" });
  }

  try {
    const result = await createProductOrder(body);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
