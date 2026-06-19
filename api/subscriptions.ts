import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";

function itemToText(item: any): string {
  if (item === null || item === undefined) return "";
  if (typeof item === "string") return item;
  if (typeof item === "number") return String(item);
  if (typeof item === "boolean") return item ? "true" : "false";
  if (item.text) return String(item.text);
  if (Array.isArray(item.text_arr) && item.text_arr.length) {
    return item.text_arr.filter(Boolean).join(", ");
  }
  if (item.name) return String(item.name);
  return "";
}

function fieldToText(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.map(itemToText).filter(Boolean).join(", ");
  return itemToText(value);
}

function linkRecordIds(value: any): string[] {
  if (!value) return [];
  const ids: string[] = [];
  const collect = (v: any) => {
    if (!v) return;
    if (Array.isArray(v.record_ids)) ids.push(...v.record_ids.filter(Boolean));
    if (Array.isArray(v.link_record_ids)) ids.push(...v.link_record_ids.filter(Boolean));
  };
  if (Array.isArray(value)) value.forEach(collect);
  else collect(value);
  return Array.from(new Set(ids));
}

function dateText(value: any): string {
  const raw = fieldToText(value);
  if (!raw) return "";
  if (/^\d+$/.test(raw)) {
    const d = new Date(Number(raw));
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return raw;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const tokenResponse = await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: process.env.FEISHU_APP_ID,
          app_secret: process.env.FEISHU_APP_SECRET,
        }),
      }
    );
    const tokenData = await tokenResponse.json();

    if (!process.env.FEISHU_SUBSCRIPTIONS_TABLE_ID) {
      return res.status(200).json({ subscriptions: [] });
    }

    const items = await fetchAllBitableRecords(
      process.env.FEISHU_BASE_APP_TOKEN as string,
      process.env.FEISHU_SUBSCRIPTIONS_TABLE_ID as string,
      tokenData.tenant_access_token
    );

    const subscriptions = items.map((item: any) => {
      const f = item.fields || {};
      return {
        id: item.record_id,
        subscriptionId: fieldToText(f["Subscription ID"]),
        clientId: fieldToText(f["Client ID"]),
        clientRecordIds: linkRecordIds(f["Client ID"]),
        plan: fieldToText(f["Plan"]),
        price: Number(fieldToText(f["Price"])) || 0,
        currency: fieldToText(f["Currency"]) || "CNY",
        billingCycle: fieldToText(f["Billing Cycle"]),
        startDate: dateText(f["Start Date"]),
        nextBillingDate: dateText(f["Next Billing Date"]),
        status: fieldToText(f["Status"]) || "Active",
        coach: fieldToText(f["Coach"]),
        autoRenew: ["true", "yes", "1", "checked"].includes(
          fieldToText(f["Auto Renew"]).toLowerCase()
        ),
        paymentId: fieldToText(f["Payment ID"]),
        notes: fieldToText(f["Notes"]),
      };
    });

    return res.status(200).json({ subscriptions });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Could not fetch subscriptions", message: error.message });
  }
}
