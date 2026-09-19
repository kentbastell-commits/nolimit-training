import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  ordersByWxpayTradeNo,
  updateProductOrder,
  wxpayOrderGroup,
} from "../server/db/repositories/productOrders.ts";
import { verifyPayLinkKey } from "../server/wxpay/client.ts";
import { createClient, findClientByPhoneName } from "../server/db/repositories/clients.ts";
import { inviteCodeDataUrl, makeInviteToken } from "../server/wechat/invite.ts";
import { ensureIntakeOnSignup } from "../server/db/pg/coachingJourney.ts";

// Public payment link (/pay/<tradeNo>) — the shareable alternative to the
// coach's collect-payment QR. A WeChat Pay Native QR can only be paid by a
// live camera scan; a screenshot forwarded in chat is refused by WeChat
// (Kent hit exactly this 2026-09-17). The link opens inside WeChat and runs
// the same JSAPI sheet the store uses, so nothing needs scanning.
//
//   GET  /api/payLink?tradeNo=…   → what the payer sees (amount comes from the
//                                    stored order, never the client — #22)
//   POST /api/payLink { key, action:"identify", name, phone, email? }
//                                  → creates (or finds by phone+name) the client
//                                    and attaches the order, so a stranger who
//                                    pays from a social-media link gets an
//                                    account without Kent linking anything
//   POST /api/payLink { key, title, taxId?, email? }
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
  // `key` is the signed order key from wxpayCollect (stable across trade
  // re-mints); `tradeNo` is accepted only for links sent before keys existed.
  const key = String((source as Record<string, unknown>).key || "").trim();
  const tradeNo = String((source as Record<string, unknown>).tradeNo || "").trim();
  let orders;
  if (key) {
    const orderId = verifyPayLinkKey(key);
    if (!orderId) return res.status(404).json({ error: "Unknown payment link" });
    orders = await wxpayOrderGroup(orderId);
  } else {
    if (!TRADE_NO.test(tradeNo)) {
      return res.status(400).json({ error: "key or tradeNo required" });
    }
    orders = await ordersByWxpayTradeNo(tradeNo);
  }
  if (!orders.length) return res.status(404).json({ error: "Unknown payment link" });
  const order = orders[0];
  const amount = orders.reduce((sum, o) => sum + (o.amount > 0 ? o.amount : 0), 0);
  const paid = orders.every((o) => String(o.paymentStatus || "").trim().toLowerCase() === "paid");
  const notes = String(order.notes || "");

  if (req.method === "GET") {
    // Paid + attached to a client → the page shows THAT athlete's personal
    // invite code (scan/long-press → bound to this account), which the payer
    // may forward to whoever will actually train (a parent to a child).
    // Best-effort: a WeChat hiccup must never break the paid page.
    let inviteImage = "";
    if (paid && order.clientId) {
      try {
        inviteImage = await inviteCodeDataUrl(makeInviteToken(String(order.clientId)));
      } catch {
        inviteImage = "";
      }
    }
    return res.status(200).json({
      orderId: order.orderId,
      amount,
      currency: order.currency || "CNY",
      label: order.productName || "",
      clientName: order.clientName || "",
      paid,
      // No client attached yet → the page asks for name + phone before paying.
      needsIdentity: !order.clientId,
      // The payer's own account code, for the "your account is ready" step.
      clientCode: order.clientId || "",
      inviteImage,
      fapiao: parseFapiao(notes),
    });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (String(body.action || "") === "identify") {
    const name = String(body.name || "").trim().replace(/\s+/g, " ").slice(0, 60);
    const phone = String(body.phone || "").replace(/[\s-]/g, "").slice(0, 20);
    const email = String(body.email || "").trim().slice(0, 120);
    if (name.length < 2) return res.status(400).json({ error: "name required" });
    if (!/^(\+?\d{7,15})$/.test(phone)) return res.status(400).json({ error: "phone invalid" });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "email invalid" });
    }
    let clientCode = await findClientByPhoneName(phone, name);
    if (!clientCode) {
      // A coaching payment creates a COACHED profile (Extras tab, wellness,
      // "coach is building your plan"), so the coach never has to fix the
      // type by hand after a self-serve pay link.
      const orderType = String(order.productType || "").trim();
      const coachedType =
        orderType === "Online Coaching" || orderType === "In-Person Training" ? orderType : "";
      const created = await createClient({
        name,
        phone,
        ...(email ? { email } : {}),
        ...(coachedType ? { clientType: coachedType } : {}),
        source: "Pay link",
        paymentStatus: "Pending",
        intakeStatus: "Not Sent",
        subscriptionStatus: "Active",
      });
      clientCode = String((created as { recordId?: string }).recordId || (created as { clientId?: string }).clientId || "");
      if (!created.success || !clientCode) {
        return res.status(500).json({ error: "Could not create the account" });
      }
      // New athlete: the intake questionnaire waits for them in the app.
      await ensureIntakeOnSignup(clientCode).catch(() => {});
    }
    const attached = await updateProductOrder({ recordId: order.orderId, clientCode, clientName: name });
    if (!attached.success) return res.status(attached.status).json(attached.body);
    return res.status(200).json({ success: true, clientCode, needsIdentity: false });
  }
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
