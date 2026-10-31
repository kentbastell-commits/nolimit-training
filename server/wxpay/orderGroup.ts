// Shared checkout-group pricing for every WeChat Pay entry point (web Native
// QR, mini program JSAPI). The amount always comes from the stored orders —
// never from any client (#22).
import {
  markOrdersPaidByWxpay,
  ordersByWxpayTradeNo,
  wxpayOrderGroup,
  type WxpayOrderRow,
} from "../db/repositories/productOrders.ts";
import { queryTransaction } from "./client.ts";
import { notifyCoach } from "../../api/_notify.ts";
import { digitalSalesPaused } from "../storePolicy.ts";
import { paymentAmountMatches } from "./paymentAmount.ts";

export type WxpayCharge =
  | { state: "not_found" }
  | { state: "already_paid" }
  | { state: "store_paused" }
  | { state: "bad_currency" }
  | { state: "nothing_to_charge" }
  | { state: "amount_mismatch" }
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
  // Read the stored product type, never a caller-provided checkout category.
  // Paid receipts and webhook/status reconciliation remain available.
  if (unpaid.some((order) => digitalSalesPaused(order.productType))) {
    return { state: "store_paused" };
  }

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
    // Never mint another trade after a failed reconciliation write. Let
    // the caller retry while preserving the existing payment identity.
    const state = await queryTransaction(existing);
    if (state.tradeState === "SUCCESS") {
      const tradeOrders = await ordersByWxpayTradeNo(existing);
      const expectedFen = Math.round(tradeOrders.reduce((sum, order) => sum + Math.max(order.amount, 0), 0) * 100);
      if (!paymentAmountMatches(state.totalFen, expectedFen)) return { state: "amount_mismatch" };
      const updated = await markOrdersPaidByWxpay(existing, state.transactionId || "", state.paidAt);
      if (updated.length) {
        void notifyCoach(
          `💰 WeChat payment confirmed for order(s) ${updated.join(", ")}`
        );
      }
      return { state: "already_paid" };
    }
  }

  const description =
    unpaid.map((order) => order.productName).filter(Boolean).join(" + ") ||
    "NX LIMIT Training program";
  return { state: "chargeable", unpaid, totalFen, description };
}
