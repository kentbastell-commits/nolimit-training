import * as pg from "../pg/productOrders.ts";
import type { OrderDTO } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

// Inputs mirror the old handlers' req.body destructuring exactly.
export type CreateProductOrderInput = {
  orderId?: string;
  clientName?: string;
  email?: string;
  phone?: string;
  productType?: string;
  productName?: string;
  programId?: string;
  amount?: number | string;
  currency?: string;
  paymentStatus?: string;
  paymentProvider?: string;
  assignedCoach?: string;
  purchasedAt?: string;
  accessStartDate?: string;
  accessEndDate?: string;
  intakeStatus?: string;
  onboardingStatus?: string;
  fulfillmentStatus?: string;
  paymentReference?: string;
  referrerCode?: string;
  referralRewardsUsed?: number;
  marketingSource?: string;
  marketingMedium?: string;
  campaignCode?: string;
  partnerCode?: string;
  staffAttributionCode?: string;
  marketingAttributionCode?: string;
  notes?: string;
};

export type UpdateProductOrderInput = {
  recordId: string; // Feishu record_id; on Postgres the ORD-… business code
  clientRecordId?: string;
  clientCode?: string;
  clientName?: string;
  productType?: string;
  programId?: string;
  programName?: string;
  intakeAssignmentId?: string;
  intakeStatus?: string;
  onboardingStatus?: string;
  fulfillmentStatus?: string;
  paymentStatus?: string;
  marketingSource?: string;
  marketingMedium?: string;
  campaignCode?: string;
  partnerCode?: string;
  staffAttributionCode?: string;
  marketingAttributionCode?: string;
  accessStartDate?: string;
  accessEndDate?: string;
  fulfilledAt?: string;
  notes?: string;
  coach?: string;
  coachRecordId?: string;
};

// The old handlers had rich, distinct response bodies per outcome (400 for
// no-matching-columns, 500 with larkResponse/fieldsSent, 200 with
// omittedFields). To keep those byte-identical, the impls return the exact
// HTTP status + JSON body and the thin handler just forwards them.
export type ProductOrderWriteResult = {
  success: boolean;
  status: number;
  body: Record<string, unknown>;
};

export async function listProductOrders(): Promise<OrderDTO[]> {
  const cached = getCached<OrderDTO[]>("productOrders");
  if (cached) return cached;

  const orders =
    await pg.listProductOrders();

  setCached("productOrders", orders, 10 * 60 * 1000);
  return orders;
}

export async function paidRevenueBetween(start: Date, end: Date) {
  return pg.paidRevenueBetween(start, end);
}

export async function paidRevenueByCampaignCodes(campaignCodes: readonly string[]) {
  return pg.paidRevenueByCampaignCodes(campaignCodes);
}

export async function paidOrderRowsByCampaignCode(campaignCode: string) {
  return pg.paidOrderRowsByCampaignCode(campaignCode);
}

export type { PaidCampaignOrderRow } from "../pg/productOrders.ts";

export async function createProductOrder(
  input: CreateProductOrderInput
): Promise<ProductOrderWriteResult> {
  const result =
    await pg.createProductOrder(input);
  if (result.success) invalidateCache("productOrders");
  return result;
}

export async function updateProductOrder(
  input: UpdateProductOrderInput
): Promise<ProductOrderWriteResult> {
  const result =
    await pg.updateProductOrder(input);
  if (result.success) invalidateCache("productOrders");
  return result;
}

export type { WxpayOrderRow } from "../pg/productOrders.ts";

export async function wxpayOrderGroup(orderId: string) {
  return pg.wxpayOrderGroup(orderId);
}

export async function attachWxpayTradeNo(orderIds: string[], tradeNo: string) {
  const count = await pg.attachWxpayTradeNo(orderIds, tradeNo);
  if (count) invalidateCache("productOrders");
  return count;
}

export async function ordersByWxpayTradeNo(tradeNo: string) {
  return pg.ordersByWxpayTradeNo(tradeNo);
}

export async function markOrdersPaidByWxpay(
  tradeNo: string,
  transactionId: string
) {
  const updated = await pg.markOrdersPaidByWxpay(tradeNo, transactionId);
  if (updated.length) invalidateCache("productOrders");
  return updated;
}
