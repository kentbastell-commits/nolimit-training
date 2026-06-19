import type { VercelRequest, VercelResponse } from "@vercel/node";

async function getTableFieldNames(token: string): Promise<Set<string>> {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_SUBSCRIPTIONS_TABLE_ID}/fields?page_size=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  return new Set(
    (data?.data?.items || [])
      .map((f: any) => f.field_name || f.name)
      .filter(Boolean)
  );
}

function toTimestamp(value: unknown): number | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const ms = /^\d+$/.test(raw) ? Number(raw) : new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

function makeSubscriptionId() {
  return `SUB-${Math.floor(100000 + Math.random() * 900000)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
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
    } = req.body;

    if (!process.env.FEISHU_SUBSCRIPTIONS_TABLE_ID) {
      return res.status(500).json({ error: "Subscriptions table not configured" });
    }
    if (!recordId && !clientRecordId) {
      return res.status(400).json({ error: "Missing client" });
    }

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
    const token = tokenData.tenant_access_token;
    if (!token) return res.status(500).json({ error: "Could not get Lark token" });

    const available = await getTableFieldNames(token);
    const all: Record<string, any> = {};
    if (!recordId) all["Subscription ID"] = makeSubscriptionId();
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

    const base = `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_SUBSCRIPTIONS_TABLE_ID}/records`;
    const url = recordId ? `${base}/${recordId}` : base;
    const response = await fetch(url, {
      method: recordId ? "PUT" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    const data = await response.json();
    if (!response.ok || data.code !== 0) {
      return res.status(500).json({
        error: recordId ? "Failed to update subscription" : "Failed to create subscription",
        larkResponse: data,
        fieldsSent: fields,
        omittedFields,
      });
    }
    return res.status(200).json({
      success: true,
      recordId: data?.data?.record?.record_id || recordId,
      omittedFields,
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
