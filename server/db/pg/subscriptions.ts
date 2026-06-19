import { db } from "../client.ts";
import { subscriptions } from "../schema.ts";
import { epochToDate, str } from "./_util.ts";
import type { SubscriptionDTO } from "../dto.ts";

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
