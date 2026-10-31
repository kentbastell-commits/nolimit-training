import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db, type DbExecutor } from "../client.ts";
import { productOrders, wxpayOrderAttempts } from "../schema.ts";
import { activateCoachingOrder } from "./coachingJourney.ts";
import { epochToDate, pgErrorMessage, str } from "./_util.ts";
import type { OrderDTO } from "../dto.ts";
import type {
  CreateProductOrderInput,
  UpdateProductOrderInput,
  ProductOrderWriteResult,
} from "../repositories/productOrders.ts";

type Row = typeof productOrders.$inferSelect;
type InsertRow = typeof productOrders.$inferInsert;

// SQL must agree with the normalized status used by checkout and callbacks.
// `status <> 'Paid'` excludes NULL and rewrites legacy ` paid ` receipts.
const unpaidOrder = sql`lower(btrim(coalesce(${productOrders.paymentStatus}, ''))) <> 'paid'`;

export async function listProductOrders(): Promise<OrderDTO[]> {
  const rows = await db
    .select()
    .from(productOrders)
    .orderBy(desc(productOrders.purchasedAt), productOrders.orderId);
  return rows.map(
    (r: Row): OrderDTO => ({
      recordId: r.orderId,
      orderId: r.orderId,
      clientId: str(r.clientId),
      clientName: str(r.clientName),
      email: "",
      phone: str(r.clientPhone),
      notes: str(r.orderNotes),
      productType: str(r.productType),
      programId: str(r.programId),
      productName: str(r.productName),
      amount: r.amount == null ? "" : String(Number(r.amount)),
      currency: str(r.currency),
      paymentStatus: str(r.paymentStatus),
      paymentReference: str(r.paymentReference),
      referrerCode: str(r.referrerCode),
      referralRewardsUsed: Number(r.referralRewardsUsed) || 0,
      marketingSource: str(r.marketingSource),
      marketingMedium: str(r.marketingMedium),
      campaignCode: str(r.campaignCode),
      partnerCode: str(r.partnerCode),
      staffAttributionCode: str(r.staffAttributionCode),
      marketingAttributionCode: str(r.marketingAttributionCode),
      paymentProvider: str(r.paymentProvider),
      purchasedAt: epochToDate(r.purchasedAt),
      paidAt: r.paidAt ? new Date(Number(r.paidAt)).toISOString() : "",
      accessStartDate: epochToDate(r.accessStartDate),
      accessEndDate: "",
      intakeStatus: str(r.intakeStatus),
      assignedCoach: str(r.assignCoach),
      intakeAssignmentId: "",
      onboardingStatus: "",
      fulfillmentStatus: str(r.fulfillmentStatus),
      fulfilledAt: "",
    })
  );
}

export type PaidRevenueAggregate = {
  productType: string;
  currency: string;
  grossCollected: number;
  orderCount: number;
};

/** Aggregate-only finance read for Company Operations; no customer PII leaves SQL. */
export async function paidRevenueBetween(
  start: Date,
  end: Date,
): Promise<PaidRevenueAggregate[]> {
  const rows = await db
    .select({
      productType: productOrders.productType,
      currency: productOrders.currency,
      grossCollected: sql<string>`coalesce(sum(${productOrders.amount}), 0)`,
      orderCount: sql<number>`count(*)::int`,
    })
    .from(productOrders)
    .where(
      and(
        sql`lower(coalesce(${productOrders.paymentStatus}, '')) = 'paid'`,
        gte(productOrders.purchasedAt, start.getTime()),
        lt(productOrders.purchasedAt, end.getTime()),
      ),
    )
    .groupBy(productOrders.productType, productOrders.currency);
  return rows.map((row) => ({
    productType: row.productType || "Other",
    currency: row.currency || "CNY",
    grossCollected: Number(row.grossCollected) || 0,
    orderCount: Number(row.orderCount) || 0,
  }));
}

export type PaidCampaignRevenueAggregate = {
  campaignCode: string;
  currency: string;
  grossCollected: number;
  orderCount: number;
};

/**
 * Aggregate-only attribution read for Company Operations. Customer identities,
 * contact details and coaching data never leave SQL.
 */
export async function paidRevenueByCampaignCodes(
  campaignCodes: readonly string[],
): Promise<PaidCampaignRevenueAggregate[]> {
  const codes = [...new Set(campaignCodes.map((value) => value.trim()).filter(Boolean))];
  if (!codes.length) return [];
  const rows = await db
    .select({
      campaignCode: productOrders.campaignCode,
      currency: productOrders.currency,
      grossCollected: sql<string>`coalesce(sum(${productOrders.amount}), 0)`,
      orderCount: sql<number>`count(*)::int`,
    })
    .from(productOrders)
    .where(
      and(
        sql`lower(coalesce(${productOrders.paymentStatus}, '')) = 'paid'`,
        sql`lower(coalesce(${productOrders.currency}, 'cny')) = 'cny'`,
        inArray(productOrders.campaignCode, codes),
      ),
    )
    .groupBy(productOrders.campaignCode, productOrders.currency);
  return rows.flatMap((row) =>
    row.campaignCode
      ? [{
          campaignCode: row.campaignCode,
          currency: row.currency || "CNY",
          grossCollected: Number(row.grossCollected) || 0,
          orderCount: Number(row.orderCount) || 0,
        }]
      : [],
  );
}

export type PaidCampaignOrderRow = {
  orderId: string;
  clientId: string;
  productType: string;
  productName?: string;
  amount: number;
  purchasedAt: Date;
};

/**
 * Order-level attribution read for campaign commission calculations.
 * No customer contact details leave SQL; only the business columns needed
 * for tiering, per-client caps and attribution windows are returned.
 */
export async function paidOrderRowsByCampaignCode(
  campaignCode: string,
): Promise<PaidCampaignOrderRow[]> {
  const code = String(campaignCode || "").trim();
  if (!code) return [];
  const rows = await db
    .select({
      orderId: productOrders.orderId,
      clientId: productOrders.clientId,
      productType: productOrders.productType,
      productName: productOrders.productName,
      amount: productOrders.amount,
      purchasedAt: productOrders.purchasedAt,
    })
    .from(productOrders)
    .where(
      and(
        sql`lower(coalesce(${productOrders.paymentStatus}, '')) = 'paid'`,
        sql`lower(coalesce(${productOrders.currency}, 'cny')) = 'cny'`,
        eq(productOrders.campaignCode, code),
      ),
    )
    .orderBy(productOrders.purchasedAt);
  return rows.map((r) => ({
    orderId: str(r.orderId),
    clientId: str(r.clientId),
    productType: str(r.productType),
    productName: r.productName == null ? undefined : str(r.productName),
    amount: r.amount == null ? 0 : Number(r.amount),
    purchasedAt: r.purchasedAt ? new Date(Number(r.purchasedAt)) : new Date(),
  }));
}

/* --------------------------------- writes --------------------------------- */
// Same operations as server/db/feishu/productOrders.ts, same result shapes.
// On Postgres the ORD-… business code IS the id (no Feishu record_ids), and
// the DuplexLink columns (Client ID / Program ID) are business-code FK columns.
// Columns the live Feishu table also lacks (Email, Phone, Notes, Onboarding
// Status, Access End Date, Fulfilled At, Intake Assignment ID) don't exist on
// product_orders either; provided values for them are reported in
// omittedFields exactly like the Feishu impl does.

// Field names the pg table can store, expressed as the Feishu column names the
// callers know (mirrors the availableFields list of the 400 response).
const PG_AVAILABLE_FIELDS = [
  "Order ID",
  "Client ID",
  "Client Name",
  "Product Type",
  "Program ID",
  "Product Name",
  "Amount",
  "Currency",
  "Payment Status",
  "Payment Provider",
  "Payment Reference",
  "Marketing Source",
  "Marketing Medium",
  "Campaign Code",
  "Partner Code",
  "Staff Attribution Code",
  "Marketing Attribution Code",
  "Purchased At",
  "Access Start Date",
  "Intake Status",
  "Assign Coach",
  "Fulfillment Status",
];

function makeOrderId() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${stamp}-${random}`;
}

// Same date parsing as the Feishu impl ("YYYY-MM-DD" | epoch-ms string | "--").
function toEpochMs(value?: string) {
  if (!value || value === "--") return undefined;
  if (/^\d+$/.test(value)) return Number(value);

  const [year, month, day] = value.split("-").map(Number);

  if (year && month && day) {
    return new Date(year, month - 1, day).getTime();
  }

  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

// numeric column: Drizzle wants a string; never write "" (or NaN) to it.
function toAmount(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : undefined;
}

function toAttribution(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const cleaned = String(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || undefined;
}

export async function createProductOrder(
  i: CreateProductOrderInput
): Promise<ProductOrderWriteResult> {
  const omittedFields: string[] = [];
  const nextOrderId = i.orderId || makeOrderId();

  // Mirrors the create handler's applyField: undefined/null/"" values are
  // skipped silently; a real value with no backing column is reported.
  const skip = (v: unknown) => v === undefined || v === null || v === "";
  const omitIfProvided = (alias: string, v: unknown) => {
    if (!skip(v)) omittedFields.push(alias);
  };

  const row: InsertRow = {
    orderId: nextOrderId,
    productType: i.productType || "Digital Program",
    currency: i.currency || "CNY",
    paymentStatus: i.paymentStatus || "Paid",
    paymentProvider: i.paymentProvider || "WeChat QR",
    intakeStatus: i.intakeStatus || "Not Sent",
    fulfillmentStatus: i.fulfillmentStatus || "Pending",
    purchasedAt: toEpochMs(i.purchasedAt) || Date.now(),
  };
  if (i.paidAt) {
    const paidAt = toEpochMs(i.paidAt);
    if (paidAt === undefined) return { success: false, status: 400, body: { error: "Invalid payment date" } };
    row.paidAt = paidAt;
  }
  if (!skip(i.clientName)) row.clientName = String(i.clientName);
  if (!skip(i.productName)) row.productName = String(i.productName);
  if (!skip(i.programId)) row.programId = String(i.programId);
  const amount = toAmount(i.amount);
  if (amount !== undefined) row.amount = amount;
  if (!skip(i.paymentReference)) row.paymentReference = String(i.paymentReference);
  row.marketingSource = toAttribution(i.marketingSource);
  row.marketingMedium = toAttribution(i.marketingMedium);
  row.campaignCode = toAttribution(i.campaignCode);
  row.partnerCode = toAttribution(i.partnerCode);
  row.staffAttributionCode = toAttribution(i.staffAttributionCode);
  row.marketingAttributionCode = toAttribution(i.marketingAttributionCode);
  if (!skip(i.assignedCoach)) row.assignCoach = String(i.assignedCoach);
  const accessStart = toEpochMs(i.accessStartDate);
  if (accessStart !== undefined) row.accessStartDate = accessStart;
  // Real columns since migration 0007 — these manual-order inputs were
  // decorative (collected, then silently dropped on both backends).
  if (!skip(i.phone)) row.clientPhone = String(i.phone);
  if (!skip(i.notes)) row.orderNotes = String(i.notes);

  // No product_orders column for these (the live Feishu table lacks them too).
  omitIfProvided("Email", i.email);
  // Handler always defaults this to "New Order", so it's always reported.
  omitIfProvided("Onboarding Status", i.onboardingStatus || "New Order");
  omitIfProvided("Access End Date", toEpochMs(i.accessEndDate));

  try {
    await db.insert(productOrders).values(row);
  } catch (e: any) {
    return {
      success: false,
      status: 500,
      body: { error: "Failed to create order", message: pgErrorMessage(e), omittedFields },
    };
  }

  return {
    success: true,
    status: 200,
    body: {
      success: true,
      orderId: nextOrderId,
      recordId: nextOrderId, // business code is the identity on Postgres
      omittedFields,
    },
  };
}

export async function updateProductOrder(
  i: UpdateProductOrderInput,
  options: { attachOnlyIfUnassigned?: boolean } = {}
): Promise<ProductOrderWriteResult> {
  const set: Partial<InsertRow> = {};
  if (i.paidAt !== undefined) {
    const paidAt = i.paidAt === "" ? null : toEpochMs(i.paidAt);
    if (paidAt === undefined) return { success: false, status: 400, body: { error: "Invalid payment date" } };
    set.paidAt = paidAt;
  } else if (String(i.paymentStatus || "").trim().toLowerCase() === "paid") {
    // A coach's "Mark paid" / "Verify payment" without an explicit date: the
    // confirmation is now. Never overwrite a date already recorded.
    set.paidAt = sql`coalesce(${productOrders.paidAt}, ${Date.now()})` as unknown as number;
  }
  const omittedFields: string[] = [];

  // Mirrors the update handler's applyField: only undefined/null are skipped
  // ("" clears); a provided value with no backing column is reported.
  const omitIfProvided = (alias: string, v: unknown) => {
    if (v !== undefined && v !== null) omittedFields.push(alias);
  };

  // DuplexLink on Feishu; business-code FK column here. In pg mode the
  // frontend's "record ids" ARE the business codes, so either input works.
  const clientId = i.clientCode || i.clientRecordId;
  if (clientId !== undefined && clientId !== null) set.clientId = clientId || null;
  if (i.clientName !== undefined && i.clientName !== null) set.clientName = i.clientName;
  if (i.programId !== undefined && i.programId !== null) set.programId = i.programId || null;
  if (i.programName !== undefined && i.programName !== null) set.productName = i.programName;
  if (i.intakeStatus !== undefined && i.intakeStatus !== null) set.intakeStatus = i.intakeStatus;
  if (i.fulfillmentStatus !== undefined && i.fulfillmentStatus !== null)
    set.fulfillmentStatus = i.fulfillmentStatus;
  if (i.productType !== undefined && i.productType !== null)
    set.productType = i.productType;
  if (i.paymentStatus !== undefined && i.paymentStatus !== null)
    set.paymentStatus = i.paymentStatus;
  if (i.marketingSource !== undefined && i.marketingSource !== null)
    set.marketingSource = toAttribution(i.marketingSource) || null;
  if (i.marketingMedium !== undefined && i.marketingMedium !== null)
    set.marketingMedium = toAttribution(i.marketingMedium) || null;
  if (i.campaignCode !== undefined && i.campaignCode !== null)
    set.campaignCode = toAttribution(i.campaignCode) || null;
  if (i.partnerCode !== undefined && i.partnerCode !== null)
    set.partnerCode = toAttribution(i.partnerCode) || null;
  if (i.staffAttributionCode !== undefined && i.staffAttributionCode !== null)
    set.staffAttributionCode = toAttribution(i.staffAttributionCode) || null;
  if (i.marketingAttributionCode !== undefined && i.marketingAttributionCode !== null)
    set.marketingAttributionCode = toAttribution(i.marketingAttributionCode) || null;
  // Feishu only writes the coach when the name is provided (the record id
  // alone does nothing there); mirror that exactly.
  if (i.coach !== undefined && i.coach !== null) set.assignCoach = i.coach;
  const startDate = toEpochMs(i.accessStartDate);
  if (startDate !== undefined) set.accessStartDate = startDate;

  // No product_orders column for these (the live Feishu table lacks them too).
  omitIfProvided("Intake Assignment ID", i.intakeAssignmentId);
  omitIfProvided("Onboarding Status", i.onboardingStatus);
  omitIfProvided("Access End Date", toEpochMs(i.accessEndDate));
  omitIfProvided("Fulfilled At", toEpochMs(i.fulfilledAt));
  // Real column (order_notes) — was reported as "no backing column" and
  // silently dropped (mistake #43); the pay link writes fapiao requests here.
  if (i.notes !== undefined && i.notes !== null) set.orderNotes = i.notes;

  if (Object.keys(set).length === 0) {
    return {
      success: false,
      status: 400,
      body: {
        error: "No matching product order columns found",
        omittedFields,
        availableFields: PG_AVAILABLE_FIELDS,
      },
    };
  }

  let updated: { orderId: string }[];
  try {
    updated = await db.transaction(async tx => {
      const [before] = await tx.select({ clientId: productOrders.clientId, paymentStatus: productOrders.paymentStatus })
        .from(productOrders).where(eq(productOrders.orderId, i.recordId)).for("update");
      if (options.attachOnlyIfUnassigned && before?.clientId && before.clientId !== clientId) {
        throw new Error("PAY_LINK_IDENTITY_CONFLICT");
      }
      const orders = await tx.update(productOrders).set(set)
        .where(eq(productOrders.orderId, i.recordId)).returning();
      // Includes coach-verified payment and attaching a client to an already
      // paid order. Other edits must not reactivate a paused service.
      const newlyPaid = String(i.paymentStatus || "").trim().toLowerCase() === "paid" && before?.paymentStatus?.trim().toLowerCase() !== "paid";
      const attachedClient = clientId && clientId !== before?.clientId;
      if (newlyPaid || attachedClient) {
        for (const order of orders) await activateCoachingOrder(tx, order);
      }
      return orders.map(order => ({ orderId: order.orderId }));
    });
  } catch (e: any) {
    if (e?.message === "PAY_LINK_IDENTITY_CONFLICT") return {
      success: false, status: 409, body: { error: "This payment link is already attached to an athlete" },
    };
    return {
      success: false,
      status: 500,
      body: {
        error: "Failed to update product order",
        message: pgErrorMessage(e),
        fieldsSent: set,
        omittedFields,
      },
    };
  }

  if (!updated.length) {
    return {
      success: false,
      status: 500,
      body: {
        error: "Failed to update product order",
        message: "Order not found",
        fieldsSent: set,
        omittedFields,
      },
    };
  }

  return {
    success: true,
    status: 200,
    body: {
      success: true,
      recordId: i.recordId,
      fieldsSent: set,
      omittedFields,
    },
  };
}

/* ---------------------------------------------------- WeChat Pay support */

export type WxpayOrderRow = {
  orderId: string;
  clientId: string;
  clientName: string;
  productName: string;
  productType: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  paymentReference: string;
  wxpayTradeNo: string;
  notes: string;
};

const toWxpayRow = (r: Row): WxpayOrderRow => ({
  orderId: r.orderId,
  clientId: str(r.clientId),
  clientName: str(r.clientName),
  productName: str(r.productName),
  productType: str(r.productType),
  amount: r.amount == null ? 0 : Number(r.amount),
  currency: str(r.currency),
  paymentStatus: str(r.paymentStatus),
  paymentReference: str(r.paymentReference),
  wxpayTradeNo: str(r.wxpayTradeNo),
  notes: str(r.orderNotes),
});

/**
 * Every order of the same checkout: same non-empty payment reference and
 * client. Falls back to just the anchor order when the reference is empty.
 */
export async function wxpayOrderGroup(orderId: string): Promise<WxpayOrderRow[]> {
  const anchorRows = await db
    .select()
    .from(productOrders)
    .where(eq(productOrders.orderId, orderId))
    .limit(1);
  if (!anchorRows.length) return [];
  const anchor = anchorRows[0];
  const reference = str(anchor.paymentReference);
  if (!reference || !anchor.clientId) return anchorRows.map(toWxpayRow);
  const rows = await db
    .select()
    .from(productOrders)
    .where(
      and(
        eq(productOrders.paymentReference, reference),
        anchor.clientId
          ? eq(productOrders.clientId, anchor.clientId)
          : sql`true`
      )
    );
  return rows.map(toWxpayRow);
}

export async function attachWxpayTradeNo(
  orderIds: string[],
  tradeNo: string,
  expectedFen?: number,
  expectedOrders?: Pick<WxpayOrderRow, "orderId" | "wxpayTradeNo">[]
): Promise<number> {
  if (!orderIds.length) return 0;
  if (!/^[A-Za-z0-9]{8,32}$/.test(tradeNo)) throw new Error("Invalid payment attempt");
  const ids = [...new Set(orderIds)].sort();
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`wxpay-attempt:${tradeNo}`}, 0))`);
    const orders = await tx.select().from(productOrders).where(inArray(productOrders.orderId, ids))
      .orderBy(asc(productOrders.orderId)).for("update");
    if (orders.length !== ids.length || orders.some(o => str(o.paymentStatus).trim().toLowerCase() === "paid")) {
      throw new Error("Order changed; refresh checkout before paying");
    }
    if (expectedOrders && orders.some(o => !expectedOrders.some(expected =>
      expected.orderId === o.orderId && expected.wxpayTradeNo === str(o.wxpayTradeNo)))) {
      throw new Error("Another payment attempt started; refresh checkout");
    }
    const totalFen = orders.reduce((sum, o) => sum + Math.round(Math.max(Number(o.amount) || 0, 0) * 100), 0);
    if ((expectedFen !== undefined && totalFen !== expectedFen) || orders.some(o => str(o.currency).toUpperCase() && str(o.currency).toUpperCase() !== "CNY")) {
      throw new Error("Order price changed; refresh checkout before paying");
    }
    const existing = await tx.select().from(wxpayOrderAttempts).where(eq(wxpayOrderAttempts.tradeNo, tradeNo));
    if (existing.length) {
      if (existing.map(o => o.orderId).sort().join("\n") !== ids.join("\n") ||
          existing.some(item => item.amountFen !== Math.round(Math.max(Number(orders.find(o => o.orderId === item.orderId)?.amount) || 0, 0) * 100))) {
        throw new Error("Payment attempt already belongs to another checkout");
      }
      return existing.length;
    }
    // Also capture an older worker's writes during a rolling deployment.
    await captureLegacyAttempts(tx, orders.map(o => str(o.wxpayTradeNo)).filter(Boolean));
    await tx.insert(wxpayOrderAttempts).values(orders.map(o => ({
      tradeNo, orderId: o.orderId, amountFen: Math.round(Math.max(Number(o.amount) || 0, 0) * 100), createdAt: Date.now(),
    })));
    await tx.update(productOrders).set({ wxpayTradeNo: tradeNo, paymentProvider: "WeChat Pay" })
      .where(inArray(productOrders.orderId, ids));
    return orders.length;
  });
}

async function captureLegacyAttempts(tx: DbExecutor, tradeNos: string[]) {
  if (!tradeNos.length) return;
  const recorded = await tx.select({ tradeNo: wxpayOrderAttempts.tradeNo }).from(wxpayOrderAttempts).where(inArray(wxpayOrderAttempts.tradeNo, tradeNos));
  const missing = tradeNos.filter(tradeNo => !recorded.some(row => row.tradeNo === tradeNo));
  if (!missing.length) return;
  const rows = await tx.select().from(productOrders).where(inArray(productOrders.wxpayTradeNo, missing));
  if (!rows.length) return;
  await tx.insert(wxpayOrderAttempts).values(rows.map(o => ({
    tradeNo: o.wxpayTradeNo!, orderId: o.orderId,
    amountFen: Math.round(Math.max(Number(o.amount) || 0, 0) * 100), createdAt: o.purchasedAt || Date.now(),
    transactionId: str(o.paymentStatus).trim().toLowerCase() === "paid" ? o.wxpayTransactionId : null,
    paidAt: str(o.paymentStatus).trim().toLowerCase() === "paid" ? o.paidAt : null,
  }))).onConflictDoNothing();
}

export async function ordersByWxpayTradeNo(
  tradeNo: string
): Promise<WxpayOrderRow[]> {
  const attempts = await db.select({ order: productOrders, amountFen: wxpayOrderAttempts.amountFen })
    .from(wxpayOrderAttempts).innerJoin(productOrders, eq(productOrders.orderId, wxpayOrderAttempts.orderId))
    .where(eq(wxpayOrderAttempts.tradeNo, tradeNo)).orderBy(asc(productOrders.orderId));
  if (attempts.length) return attempts.map(({ order, amountFen }) => ({ ...toWxpayRow(order), amount: amountFen / 100 }));
  const rows = await db.select().from(productOrders).where(eq(productOrders.wxpayTradeNo, tradeNo));
  return rows.map(toWxpayRow); // existing trades until migration / first write
}

/** Receipt and entitlement changes commit together, including late old-QR receipts. */
export async function confirmWxpayPayment(
  tradeNo: string,
  transactionId: string,
  paidAt?: string
): Promise<{ updated: string[]; reviewDuplicatePayment: boolean }> {
  if (!transactionId.trim()) throw new Error("Provider transaction id required");
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`wxpay-attempt:${tradeNo}`}, 0))`);
    const mapped = await tx.select({ id: wxpayOrderAttempts.orderId }).from(wxpayOrderAttempts).where(eq(wxpayOrderAttempts.tradeNo, tradeNo));
    const orders = await tx.select().from(productOrders)
      .where(mapped.length ? inArray(productOrders.orderId, mapped.map(row => row.id)) : eq(productOrders.wxpayTradeNo, tradeNo))
      .orderBy(asc(productOrders.orderId)).for("update");
    if (!orders.length) return { updated: [], reviewDuplicatePayment: false };
    await captureLegacyAttempts(tx, [tradeNo]);
    const firstReceipt = await tx.update(wxpayOrderAttempts).set({ transactionId, paidAt: toEpochMs(paidAt) || null })
      .where(and(eq(wxpayOrderAttempts.tradeNo, tradeNo), sql`coalesce(${wxpayOrderAttempts.transactionId}, '') = ''`))
      .returning({ orderId: wxpayOrderAttempts.orderId });
    const updated = await tx.update(productOrders).set({
      paymentStatus: "Paid", paymentProvider: "WeChat Pay", wxpayTransactionId: transactionId,
      // Provider completion time, not the time a delayed callback arrived.
      // https://pay.wechatpay.cn/doc/v3/merchant/4012791861
      paidAt: toEpochMs(paidAt) || null,
    }).where(and(inArray(productOrders.orderId, orders.map(o => o.orderId)), unpaidOrder)).returning();
    for (const order of updated.sort((a, b) => (a.clientId || "").localeCompare(b.clientId || ""))) {
      await activateCoachingOrder(tx, order);
    }
    return {
      updated: updated.map(row => row.orderId),
      reviewDuplicatePayment: firstReceipt.length > 0 && updated.length === 0 && orders.some(o => str(o.wxpayTransactionId) !== transactionId),
    };
  });
}

export async function markOrdersPaidByWxpay(tradeNo: string, transactionId: string, paidAt?: string): Promise<string[]> {
  return (await confirmWxpayPayment(tradeNo, transactionId, paidAt)).updated;
}
