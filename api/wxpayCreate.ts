import type { VercelRequest, VercelResponse } from "@vercel/node";
import { attachWxpayTradeNo } from "../server/db/repositories/productOrders.ts";
import {
  createNativeTransaction,
  makeOutTradeNo,
  wxpayEnabled,
} from "../server/wxpay/client.ts";
import { prepareWxpayCharge } from "../server/wxpay/orderGroup.ts";
import { STORE_PAUSED } from "../server/storePolicy.ts";

// Creates a real WeChat Pay Native (QR) transaction for a checkout's order
// group. The client supplies only the anchor orderId — the amount is computed
// server-side from the stored orders, never trusted from the request (#22).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!wxpayEnabled()) {
    return res.status(503).json({ enabled: false, error: "WeChat Pay is not enabled" });
  }

  const orderId = String(req.body?.orderId || "").trim();
  if (!orderId) return res.status(400).json({ error: "orderId required" });

  try {
    const charge = await prepareWxpayCharge(orderId);
    if (charge.state === "store_paused") return res.status(403).json(STORE_PAUSED);
    if (charge.state === "not_found") {
      return res.status(404).json({ error: "Order not found" });
    }
    if (charge.state === "already_paid") {
      return res.status(200).json({ alreadyPaid: true });
    }
    if (charge.state === "bad_currency") {
      return res.status(400).json({ error: "WeChat Pay supports CNY orders only" });
    }
    if (charge.state === "nothing_to_charge") {
      return res.status(400).json({ error: "Nothing to charge on this order" });
    }

    const tradeNo = makeOutTradeNo();
    await attachWxpayTradeNo(
      charge.unpaid.map((order) => order.orderId),
      tradeNo
    );
    const { codeUrl } = await createNativeTransaction({
      outTradeNo: tradeNo,
      description: charge.description,
      totalFen: charge.totalFen,
    });

    return res.status(200).json({
      success: true,
      tradeNo,
      codeUrl,
      amountFen: charge.totalFen,
      currency: "CNY",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ error: "WeChat Pay create failed", message });
  }
}
