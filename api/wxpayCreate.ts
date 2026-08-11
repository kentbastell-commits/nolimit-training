import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  attachWxpayTradeNo,
  markOrdersPaidByWxpay,
  wxpayOrderGroup,
} from "../server/db/repositories/productOrders.ts";
import {
  createNativeTransaction,
  makeOutTradeNo,
  queryTransaction,
  wxpayEnabled,
} from "../server/wxpay/client.ts";
import { notifyCoach } from "./_notify.ts";

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
    const group = await wxpayOrderGroup(orderId);
    if (!group.length) return res.status(404).json({ error: "Order not found" });

    const unpaid = group.filter(
      (order) => order.paymentStatus.trim().toLowerCase() !== "paid"
    );
    if (!unpaid.length) {
      return res.status(200).json({ alreadyPaid: true });
    }

    const badCurrency = unpaid.find(
      (order) => order.currency && order.currency.toUpperCase() !== "CNY"
    );
    if (badCurrency) {
      return res.status(400).json({ error: "WeChat Pay supports CNY orders only" });
    }

    const totalFen = Math.round(
      unpaid.reduce((sum, order) => sum + (order.amount > 0 ? order.amount : 0), 0) * 100
    );
    if (totalFen < 1) {
      return res.status(400).json({ error: "Nothing to charge on this order" });
    }

    // If a transaction already exists for this group, it may have been paid
    // between page loads — settle that before minting a new QR.
    const existing = unpaid.find((order) => order.wxpayTradeNo)?.wxpayTradeNo;
    if (existing) {
      try {
        const state = await queryTransaction(existing);
        if (state.tradeState === "SUCCESS") {
          const updated = await markOrdersPaidByWxpay(
            existing,
            state.transactionId || ""
          );
          if (updated.length) {
            void notifyCoach(
              `💰 WeChat payment confirmed for order(s) ${updated.join(", ")}`
            );
          }
          return res.status(200).json({ alreadyPaid: true });
        }
      } catch {
        // Unknown/expired transaction — fall through and mint a fresh one.
      }
    }

    const tradeNo = makeOutTradeNo();
    const description =
      unpaid.map((order) => order.productName).filter(Boolean).join(" + ") ||
      "NX LIMIT Training program";
    await attachWxpayTradeNo(unpaid.map((order) => order.orderId), tradeNo);
    const { codeUrl } = await createNativeTransaction({
      outTradeNo: tradeNo,
      description,
      totalFen,
    });

    return res.status(200).json({
      success: true,
      tradeNo,
      codeUrl,
      amountFen: totalFen,
      currency: "CNY",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ error: "WeChat Pay create failed", message });
  }
}
