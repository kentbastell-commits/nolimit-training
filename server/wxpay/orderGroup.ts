// Shared checkout-group pricing for every WeChat Pay entry point (web Native
// QR, mini program JSAPI). The amount always comes from the stored orders —
// never from any client (#22).
import {
  markOrdersPaidByWxpay,
  ordersByWxpayTradeNo,
  wxpayOrderGroup,
  type WxpayOrderRow,
} from "../db/repositories/productOrders.ts";
import { closeTransaction, queryTransaction } from "./client.ts";
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
  let group = await wxpayOrderGroup(orderId);
  if (!group.length) return { state: "not_found" };
  const initialGroup = group;

  let unpaid = group.filter(
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

  // Check every prior group represented here, including a partially settled
  // checkout. Close unpaid trades before minting another payable QR.
  for (const existing of new Set(unpaid.map(order => order.wxpayTradeNo).filter(Boolean))) {
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
    } else if (state.tradeState === "NOTPAY") {
      await closeTransaction(existing);
    } else if (!["NOT_FOUND", "CLOSED", "REVOKED", "PAYERROR"].includes(state.tradeState)) {
      throw new Error("Payment is still processing; retry after confirmation");
    }
  }

  group = await wxpayOrderGroup(orderId);
  if (group.length !== initialGroup.length || group.some(order => !initialGroup.some(before =>
    before.orderId === order.orderId && before.wxpayTradeNo === order.wxpayTradeNo &&
    before.amount === order.amount && before.currency === order.currency && before.productType === order.productType))) {
    throw new Error("Checkout changed during payment preparation; refresh checkout");
  }
  unpaid = group.filter(order => order.paymentStatus.trim().toLowerCase() !== "paid");
  if (!unpaid.length) return { state: "already_paid" };
  const totalFen = unpaid.reduce((sum, order) => sum + Math.round(Math.max(order.amount, 0) * 100), 0);
  if (totalFen < 1) return { state: "nothing_to_charge" };

  const description =
    unpaid.map((order) => order.productName).filter(Boolean).join(" + ") ||
    "NX LIMIT Training program";
  return { state: "chargeable", unpaid, totalFen, description };
}
