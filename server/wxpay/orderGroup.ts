// Shared checkout-group pricing for every WeChat Pay entry point (web Native
// QR, mini program JSAPI). The amount always comes from the stored orders —
// never from any client (#22).
import {
  markOrdersPaidByWxpay,
  wxpayOrderGroup,
  type WxpayOrderRow,
} from "../db/repositories/productOrders.ts";
import { queryTransaction } from "./client.ts";
import { notifyCoach } from "../../api/_notify.ts";

export type WxpayCharge =
  | { state: "not_found" }
  | { state: "already_paid" }
  | { state: "bad_currency" }
  | { state: "nothing_to_charge" }
  | {
      state: "chargeable";
      unpaid: WxpayOrderRow[];
      totalFen: number;
      description: string;
    };

export async function prepareWxpayCharge(orderId: string): Promise<WxpayCharge> {
  const group = await wxpayOrderGroup(orderId);
  if (!group.length) return { state: "not_found" };

  const unpaid = group.filter(
    (order) => order.paymentStatus.trim().toLowerCase() !== "paid"
  );
  if (!unpaid.length) return { state: "already_paid" };

  if (unpaid.some((order) => order.currency && order.currency.toUpperCase() !== "CNY")) {
    return { state: "bad_currency" };
  }

  const totalFen = Math.round(
    unpaid.reduce((sum, order) => sum + (order.amount > 0 ? order.amount : 0), 0) * 100
  );
  if (totalFen < 1) return { state: "nothing_to_charge" };

  // A transaction may already exist and have been paid between page loads —
  // settle it before minting a new one.
  const existing = unpaid.find((order) => order.wxpayTradeNo)?.wxpayTradeNo;
  if (existing) {
    try {
      const state = await queryTransaction(existing);
      if (state.tradeState === "SUCCESS") {
        const updated = await markOrdersPaidByWxpay(existing, state.transactionId || "");
        if (updated.length) {
          void notifyCoach(
            `💰 WeChat payment confirmed for order(s) ${updated.join(", ")}`
          );
        }
        return { state: "already_paid" };
      }
    } catch {
      // Unknown/expired transaction — mint a fresh one.
    }
  }

  const description =
    unpaid.map((order) => order.productName).filter(Boolean).join(" + ") ||
    "NX LIMIT Training program";
  return { state: "chargeable", unpaid, totalFen, description };
}
