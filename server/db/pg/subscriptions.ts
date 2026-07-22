import { eq } from "drizzle-orm";
import { db } from "../client.ts";
import { subscriptions } from "../schema.ts";
import { epochToDate, pgErrorMessage, str } from "./_util.ts";
import type { SubscriptionDTO, WriteResult } from "../dto.ts";
import type { UpsertSubscriptionInput } from "../repositories/subscriptions.ts";

type Row = typeof subscriptions.$inferSelect;

export async function listSubscriptions(): Promise<SubscriptionDTO[]> {
  const rows = await db.select().from(subscriptions);
  return rows.map(
    (r: Row): SubscriptionDTO => ({
      id: r.subscriptionId,
      subscriptionId: r.subscriptionId,
      clientId: str(r.clientId),
      clientRecordIds: r.clientId ? [r.clientId] : [],
      plan: str(r.plan),
      price: Number(r.price) || 0,
      currency: str(r.currency) || "CNY",
      billingCycle: str(r.billingCycle),
      startDate: epochToDate(r.startDate),
      nextBillingDate: epochToDate(r.nextBillingDate),
      status: str(r.status) || "Active",
      coach: str(r.coach),
      autoRenew: r.autoRenew ?? false,
      paymentId: str(r.paymentId),
      notes: str(r.notes),
    })
  );
}

/* ------------------------------- writes ---------------------------------- */

// Same minting scheme as the Feishu impl (random 6-digit suffix).
function makeSubscriptionId() {
  return `SUB-${Math.floor(100000 + Math.random() * 900000)}`;
}

function toTimestamp(value: unknown): number | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const ms = /^\d+$/.test(raw) ? Number(raw) : new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

export async function upsertSubscription(
  i: UpsertSubscriptionInput
): Promise<WriteResult> {
  const set: Partial<typeof subscriptions.$inferInsert> = {};
  // Where Feishu writes the DuplexLink [record_id], pg writes the client
  // business-code FK column (frontend params carry the code in pg mode).
  if (i.clientRecordId !== undefined) set.clientId = String(i.clientRecordId);
  if (i.plan !== undefined) set.plan = i.plan;
  if (i.price !== undefined && i.price !== "") {
    const n = Number(i.price);
    // Numeric column: never write "" — a non-finite price clears the value
    // (matches Feishu, where JSON serializes NaN as null).
    set.price = Number.isFinite(n) ? String(n) : null;
  }
  if (i.currency !== undefined) set.currency = i.currency;
  if (i.billingCycle !== undefined) set.billingCycle = i.billingCycle;
  if (i.status !== undefined) set.status = i.status;
  if (i.coach !== undefined) set.coach = String(i.coach || "");
  if (i.autoRenew !== undefined) set.autoRenew = Boolean(i.autoRenew);
  if (i.paymentId !== undefined) set.paymentId = String(i.paymentId || "");
  if (i.notes !== undefined) set.notes = String(i.notes || "");
  const startTs = toTimestamp(i.startDate);
  if (startTs !== undefined) set.startDate = startTs;
  const nextTs = toTimestamp(i.nextBillingDate);
  if (nextTs !== undefined) set.nextBillingDate = nextTs;

  if (i.recordId) {
    // recordId carries the SUB-… business code on Postgres.
    if (Object.keys(set).length === 0) {
      const found = await db
        .select({ subscriptionId: subscriptions.subscriptionId })
        .from(subscriptions)
        .where(eq(subscriptions.subscriptionId, i.recordId));
      if (!found.length) {
        return {
          success: false,
          error: "Failed to update subscription",
          message: "Subscription not found",
        };
      }
      return { success: true, recordId: i.recordId, omittedFields: [] };
    }
    const r = await db
      .update(subscriptions)
      .set(set)
      .where(eq(subscriptions.subscriptionId, i.recordId))
      .returning({ subscriptionId: subscriptions.subscriptionId });
    if (!r.length) {
      return {
        success: false,
        error: "Failed to update subscription",
        message: "Subscription not found",
      };
    }
    return { success: true, recordId: i.recordId, omittedFields: [] };
  }

  const subscriptionId = makeSubscriptionId();
  try {
    await db.insert(subscriptions).values({ subscriptionId, ...set });
  } catch (e: any) {
    return {
      success: false,
      error: "Failed to create subscription",
      message: pgErrorMessage(e),
    };
  }
  return { success: true, recordId: subscriptionId, omittedFields: [] };
}
