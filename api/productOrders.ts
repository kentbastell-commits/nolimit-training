import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listProductOrders } from "../server/db/repositories/productOrders.ts";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const orders = await listProductOrders();
    return res.status(200).json({ orders });
  } catch (error: any) {
    return res.status(500).json({ error: "Could not fetch product orders", message: error.message });
  }
}
