import { desc, eq } from "drizzle-orm";
import { db } from "../client.ts";
import { productOrders } from "../schema.ts";
import { epochToDate, pgErrorMessage, str } from "./_util.ts";
import type { OrderDTO } from "../dto.ts";
import type {
  CreateProductOrderInput,
  UpdateProductOrderInput,
  ProductOrderWriteResult,
} from "../repositories/productOrders.ts";

type Row = typeof productOrders.$inferSelect;
type InsertRow = typeof productOrders.$inferInsert;

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
      paymentProvider: str(r.paymentProvider),
      purchasedAt: epochToDate(r.purchasedAt),
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
  if (!skip(i.clientName)) row.clientName = String(i.clientName);
  if (!skip(i.productName)) row.productName = String(i.productName);
  if (!skip(i.programId)) row.programId = String(i.programId);
  const amount = toAmount(i.amount);
  if (amount !== undefined) row.amount = amount;
  if (!skip(i.paymentReference)) row.paymentReference = String(i.paymentReference);
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
  i: UpdateProductOrderInput
): Promise<ProductOrderWriteResult> {
  const set: Partial<InsertRow> = {};
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
  if (i.paymentStatus !== undefined && i.paymentStatus !== null)
    set.paymentStatus = i.paymentStatus;
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
  omitIfProvided("Notes", i.notes);

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
    updated = await db
      .update(productOrders)
      .set(set)
      .where(eq(productOrders.orderId, i.recordId))
      .returning({ orderId: productOrders.orderId });
  } catch (e: any) {
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
