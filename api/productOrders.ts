import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listProductOrders } from "../server/db/repositories/productOrders.ts";
import { coachKeyOk } from "./_coachAuth.ts";

// Product orders, two modes:
//  - ?clientCode=CL-XXXX → only that athlete's orders (what the portal needs
//    to show purchased programs). Knowing a code already opens that athlete's
//    portal, so this reveals nothing the code doesn't (the documented
//    pre-session-token gap; a real fix is portal session tokens).
//  - no code → the FULL order book (every buyer's name, phone, payment
//    status): coach-only once COACH_ACCESS_KEY is set.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const code = String(req.query?.clientCode || "").trim().toLowerCase();
    if (code) {
      const orders = await listProductOrders();
      return res.status(200).json({
        orders: orders.filter(
          (order) => String(order.clientId || "").trim().toLowerCase() === code
        ),
      });
    }
    if (!coachKeyOk(req as never)) {
      return res.status(401).json({ error: "Coach access key required" });
    }
    const orders = await listProductOrders();
    return res.status(200).json({ orders });
  } catch (error: any) {
    return res.status(500).json({ error: "Could not fetch product orders", message: error.message });
  }
}
