import {
  createRecord,
  fieldText,
  formatDate,
  getFieldNames,
  getTenantToken,
  linkRecordIds,
  listRecords,
  updateRecord,
} from "./client.ts";
import type { SubscriptionDTO, WriteResult } from "../dto.ts";
import type { UpsertSubscriptionInput } from "../repositories/subscriptions.ts";

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

/* ------------------------------- writes ---------------------------------- */

function toTimestamp(value: unknown): number | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const ms = /^\d+$/.test(raw) ? Number(raw) : new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

function makeSubscriptionId() {
  return `SUB-${Math.floor(100000 + Math.random() * 900000)}`;
}

export async function upsertSubscription(
  input: UpsertSubscriptionInput
): Promise<WriteResult> {
  const {
    recordId,
    clientRecordId,
    plan,
    price,
    currency,
    billingCycle,
    startDate,
    nextBillingDate,
    status,
    coach,
    autoRenew,
    paymentId,
    notes,
  } = input;

  if (!process.env.FEISHU_SUBSCRIPTIONS_TABLE_ID) {
    return { success: false, error: "Subscriptions table not configured" };
  }

  try {
    await getTenantToken();
  } catch (e: any) {
    // Legacy body: the old handler reported a bare error on token failure.
    if (e?.kind === "token") {
      return { success: false, error: "Could not get Lark token" };
    }
    throw e;
  }

  const tableId = process.env.FEISHU_SUBSCRIPTIONS_TABLE_ID as string;
  const available = new Set(await getFieldNames(tableId));

  const all: Record<string, any> = {};
  if (!recordId) all["Subscription ID"] = makeSubscriptionId();
  // DuplexLink column: [record_id] array, never a bare string.
  if (clientRecordId !== undefined) all["Client ID"] = [clientRecordId];
  if (plan !== undefined) all["Plan"] = plan;
  if (price !== undefined && price !== "") all["Price"] = Number(price);
  if (currency !== undefined) all["Currency"] = currency;
  if (billingCycle !== undefined) all["Billing Cycle"] = billingCycle;
  if (status !== undefined) all["Status"] = status;
  if (coach !== undefined) all["Coach"] = String(coach || "");
  if (autoRenew !== undefined) all["Auto Renew"] = Boolean(autoRenew);
  if (paymentId !== undefined) all["Payment ID"] = String(paymentId || "");
  if (notes !== undefined) all["Notes"] = String(notes || "");
  const startTs = toTimestamp(startDate);
  if (startTs !== undefined) all["Start Date"] = startTs;
  const nextTs = toTimestamp(nextBillingDate);
  if (nextTs !== undefined) all["Next Billing Date"] = nextTs;

  const fields: Record<string, any> = {};
  const omittedFields: string[] = [];
  Object.entries(all).forEach(([k, v]) => {
    if (available.has(k)) fields[k] = v;
    else omittedFields.push(k);
  });

  const data = recordId
    ? await updateRecord(tableId, recordId, fields)
    : await createRecord(tableId, fields);

  if (data.code !== 0) {
    return {
      success: false,
      error: recordId ? "Failed to update subscription" : "Failed to create subscription",
      larkResponse: data,
      fieldsSent: fields,
      omittedFields,
    };
  }

  return {
    success: true,
    recordId: data?.data?.record?.record_id || recordId,
    omittedFields,
  };
}
