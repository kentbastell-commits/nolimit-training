import { fieldText, formatDate, linkRecordIds, listRecords } from "./client.ts";
import type { SubscriptionDTO } from "../dto.ts";

export async function listSubscriptions(): Promise<SubscriptionDTO[]> {
  if (!process.env.FEISHU_SUBSCRIPTIONS_TABLE_ID) return [];
  const items = await listRecords(process.env.FEISHU_SUBSCRIPTIONS_TABLE_ID as string);
  return items
    .filter((item: any) => {
      // Drop empty/placeholder rows (Feishu seeds blank rows on table create).
      const f = item.fields || {};
      const hasClient = linkRecordIds(f["Client ID"]).length > 0;
      const hasPlan = !!fieldText(f["Plan"]);
      const hasPrice = (Number(fieldText(f["Price"])) || 0) > 0;
      return hasClient || hasPlan || hasPrice;
    })
    .map((item: any) => {
      const f = item.fields || {};
      return {
        id: item.record_id,
        subscriptionId: fieldText(f["Subscription ID"]),
        clientId: fieldText(f["Client ID"]),
        clientRecordIds: linkRecordIds(f["Client ID"]),
        plan: fieldText(f["Plan"]),
        price: Number(fieldText(f["Price"])) || 0,
        currency: fieldText(f["Currency"]) || "CNY",
        billingCycle: fieldText(f["Billing Cycle"]),
        startDate: formatDate(f["Start Date"]),
        nextBillingDate: formatDate(f["Next Billing Date"]),
        status: fieldText(f["Status"]) || "Active",
        coach: fieldText(f["Coach"]),
        autoRenew: ["true", "yes", "1", "checked"].includes(
          fieldText(f["Auto Renew"]).toLowerCase()
        ),
        paymentId: fieldText(f["Payment ID"]),
        notes: fieldText(f["Notes"]),
      };
    });
}
