import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  attachWxpayTradeNo,
  createProductOrder,
} from "../server/db/repositories/productOrders.ts";
import {
  createNativeTransaction,
  makeOutTradeNo,
  wxpayEnabled,
} from "../server/wxpay/client.ts";

// Coach-console "收款码 Collect payment": mint a fixed-amount WeChat Pay QR
// for anything sold outside the store (in-person sessions, referrals from
// friends, custom packages). Creates a Pending order so the payment lands in
// the normal Orders ledger and the signed callback flips it to Paid.
// Coach-only (listed in COACH_ONLY_HANDLERS) — the portal never needs this.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!wxpayEnabled()) {
    return res.status(503).json({ enabled: false, error: "WeChat Pay is not enabled" });
  }

  const amount = Number(req.body?.amount);
  const label = String(req.body?.label || "").trim();
  const clientName = String(req.body?.clientName || "").trim();
  const productTypeRaw = String(req.body?.productType || "").trim();
  const COLLECT_TYPES = new Set([
    "Online Coaching",
    "In-Person Training",
    "Digital Program",
    "Other",
  ]);
  const productType = COLLECT_TYPES.has(productTypeRaw) ? productTypeRaw : "Other";
  const assignCoach = String(req.body?.assignCoach || "").trim().slice(0, 80);
  if (!Number.isFinite(amount) || amount < 0.01 || amount > 100_000) {
    return res.status(400).json({ error: "amount must be between 0.01 and 100000 CNY" });
  }
  if (!label) {
    return res.status(400).json({ error: "label required" });
  }

  try {
    const created = await createProductOrder({
      clientName: clientName || label,
      productName: label.slice(0, 120),
      productType,
      amount,
      currency: "CNY",
      paymentStatus: "Pending",
      paymentProvider: "WeChat Pay",
      intakeStatus: "Not Needed",
      ...(assignCoach ? { assignedCoach: assignCoach } : {}),
    });
    if (!created.success) {
      return res.status(created.status).json(created.body);
    }
    const orderId = String(
      (created.body as { recordId?: string; orderId?: string }).recordId ||
        (created.body as { orderId?: string }).orderId ||
        ""
    );
    if (!orderId) {
      return res.status(500).json({ error: "Order created but no id returned" });
    }

    const tradeNo = makeOutTradeNo();
    await attachWxpayTradeNo([orderId], tradeNo);
    const { codeUrl } = await createNativeTransaction({
      outTradeNo: tradeNo,
      description: label.slice(0, 127),
      totalFen: Math.round(amount * 100),
    });

    return res.status(200).json({
      success: true,
      orderId,
      tradeNo,
      codeUrl,
      amountFen: Math.round(amount * 100),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ error: "Collect payment failed", message });
  }
}
