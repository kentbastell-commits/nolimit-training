import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  ordersByWxpayTradeNo,
  updateProductOrder,
} from "../server/db/repositories/productOrders.ts";

// Public payment link (/pay/<tradeNo>) — the shareable alternative to the
// coach's collect-payment QR. A WeChat Pay Native QR can only be paid by a
// live camera scan; a screenshot forwarded in chat is refused by WeChat
// (Kent hit exactly this 2026-09-17). The link opens inside WeChat and runs
// the same JSAPI sheet the store uses, so nothing needs scanning.
//
//   GET  /api/payLink?tradeNo=…   → what the payer sees (amount comes from the
//                                    stored order, never the client — #22)
//   POST /api/payLink { tradeNo, title, taxId?, email? }
//                                  → files a 发票 (fapiao) request on the order
//
// Fapiao issuing itself is still manual (no e-invoice provider yet): the
// request lands in the order's notes with a marker line so it shows on the
// Coach Orders page, and a future provider integration can parse it back.

const TRADE_NO = /^[A-Za-z0-9]{8,32}$/;
const FAPIAO_MARKER = "发票 Fapiao:";

type FapiaoRequest = { title: string; taxId: string; email: string; requestedAt: string };

function parseFapiao(notes: string): FapiaoRequest | null {
  const line = notes.split(/\r?\n/).find((l) => l.startsWith(FAPIAO_MARKER));
  if (!line) return null;
  const get = (key: string) => {
    const m = line.match(new RegExp(`${key}=([^|]*)`));
    return m ? m[1].trim() : "";
  };
  return { title: get("抬头"), taxId: get("税号"), email: get("邮箱"), requestedAt: get("时间") };
}

function formatFapiao(req: Omit<FapiaoRequest, "requestedAt">): string {
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  return `${FAPIAO_MARKER} 抬头=${req.title} | 税号=${req.taxId || "-"} | 邮箱=${req.email || "-"} | 时间=${stamp} UTC`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const source = req.method === "GET" ? req.query : (req.body ?? {});
  const tradeNo = String((source as Record<string, unknown>).tradeNo || "").trim();
  if (!TRADE_NO.test(tradeNo)) {
    return res.status(400).json({ error: "tradeNo required" });
  }

  const orders = await ordersByWxpayTradeNo(tradeNo);
  if (!orders.length) return res.status(404).json({ error: "Unknown payment link" });
  const order = orders[0];
  const amount = orders.reduce((sum, o) => sum + (o.amount > 0 ? o.amount : 0), 0);
  const paid = orders.every((o) => String(o.paymentStatus || "").trim().toLowerCase() === "paid");
  const notes = String(order.notes || "");

  if (req.method === "GET") {
    return res.status(200).json({
      orderId: order.orderId,
      amount,
      currency: order.currency || "CNY",
      label: order.productName || "",
      clientName: order.clientName || "",
      paid,
      fapiao: parseFapiao(notes),
    });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const title = String(body.title || "").trim().slice(0, 120);
  const taxId = String(body.taxId || "").trim().toUpperCase().slice(0, 20);
  const email = String(body.email || "").trim().slice(0, 120);
  if (title.length < 2) {
    return res.status(400).json({ error: "title required" });
  }
  if (taxId && !/^[0-9A-Z]{15,20}$/.test(taxId)) {
    return res.status(400).json({ error: "taxId must be 15-20 letters/digits" });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "email invalid" });
  }
  // Replace an earlier request rather than stacking them.
  const kept = notes.split(/\r?\n/).filter((l) => l && !l.startsWith(FAPIAO_MARKER));
  const nextNotes = [...kept, formatFapiao({ title, taxId, email })].join("\n");
  const result = await updateProductOrder({ recordId: order.orderId, notes: nextNotes });
  if (!result.success) return res.status(result.status).json(result.body);
  return res.status(200).json({ success: true, fapiao: parseFapiao(nextNotes) });
}
