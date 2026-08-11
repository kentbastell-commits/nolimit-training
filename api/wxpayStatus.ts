import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  markOrdersPaidByWxpay,
  ordersByWxpayTradeNo,
} from "../server/db/repositories/productOrders.ts";
import { queryTransaction, wxpayConfig } from "../server/wxpay/client.ts";
import { notifyCoach } from "./_notify.ts";

// Poll endpoint for the checkout page: has this trade been paid yet?
// The signed callback (wxpayNotify) is the primary confirmation path; this
// additionally self-heals by querying WeChat directly (throttled) so a missed
// callback can't strand a paid customer on "waiting".
const lastActiveQuery = new Map<string, number>();
const ACTIVE_QUERY_MIN_INTERVAL_MS = 8_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const tradeNo = String(req.query.tradeNo || "").trim();
  if (!/^[A-Za-z0-9]{8,32}$/.test(tradeNo)) {
    return res.status(400).json({ error: "tradeNo required" });
  }

  try {
    const orders = await ordersByWxpayTradeNo(tradeNo);
    if (!orders.length) return res.status(404).json({ error: "Unknown trade" });

    const paid = orders.every(
      (order) => order.paymentStatus.trim().toLowerCase() === "paid"
    );
    if (paid) return res.status(200).json({ paid: true });

    // Self-heal: ask WeChat directly, at most once per interval per trade.
    if (wxpayConfig()) {
      const last = lastActiveQuery.get(tradeNo) || 0;
      if (Date.now() - last >= ACTIVE_QUERY_MIN_INTERVAL_MS) {
        lastActiveQuery.set(tradeNo, Date.now());
        if (lastActiveQuery.size > 500) {
          const cutoff = Date.now() - 30 * 60_000;
          for (const [key, at] of lastActiveQuery) {
            if (at < cutoff) lastActiveQuery.delete(key);
          }
        }
        try {
          const state = await queryTransaction(tradeNo);
          if (state.tradeState === "SUCCESS") {
            const expectedFen = Math.round(
              orders.reduce(
                (sum, order) => sum + (order.amount > 0 ? order.amount : 0),
                0
              ) * 100
            );
            if (state.totalFen !== undefined && state.totalFen !== expectedFen) {
              void notifyCoach(
                `⚠️ WeChat payment amount mismatch on ${tradeNo}: paid ` +
                  `${state.totalFen} fen, expected ${expectedFen} fen. Order NOT auto-unlocked.`
              );
              return res.status(200).json({ paid: false, tradeState: "AMOUNT_MISMATCH" });
            }
            const updated = await markOrdersPaidByWxpay(
              tradeNo,
              state.transactionId || ""
            );
            if (updated.length) {
              const buyer = orders[0]?.clientName || orders[0]?.clientId || "";
              void notifyCoach(
                `💰 WeChat payment received: ¥${(expectedFen / 100).toFixed(2)} ` +
                  `from ${buyer} — order(s) ${updated.join(", ")} unlocked.`
              );
            }
            return res.status(200).json({ paid: true });
          }
          return res.status(200).json({ paid: false, tradeState: state.tradeState });
        } catch {
          // WeChat unreachable — fall through to the DB answer.
        }
      }
    }
    return res.status(200).json({ paid: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Status check failed", message });
  }
}
