import type { VercelRequest, VercelResponse } from "@vercel/node";
import { invalidateCache } from "./_cache.ts";
import { notifyCoach } from "./_notify.ts";

// 1:1 Online Coaching signup — the paid coaching flow (Commitment → qualifier →
// WeChat payment → post-payment questionnaire). Modelled on activateDigitalOrder
// but coaching has NO program: the order carries a term (e.g. "6 Months") as a
// product name, no Program link. Two stages:
//   stage "order"  — at "I've paid": create/find the client with the 5 qualifier
//                    fields + create one Product Orders record for the paid term.
//   stage "intake" — the post-payment questionnaire (all optional): append the
//                    answers to the client's Notes. Best-effort; the qualifier +
//                    payment are already captured, so a failure here never blocks.

function makeId(prefix: string) {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function toLarkDate(dateStr?: string) {
  if (!dateStr) return Date.now();
  return new Date(`${dateStr}T00:00:00`).getTime();
}

async function getToken() {
  const res = await fetch(
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
  const data = await res.json();
  if (!data.tenant_access_token) throw new Error("Could not get Feishu token");
  return data.tenant_access_token as string;
}

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const item = value[0];
    if (!item) return "";
    if (typeof item === "string") return item;
    if (item?.text) return item.text;
    if (item?.name) return item.name;
    return "";
  }
  if (value?.text) return value.text;
  if (value?.name) return value.name;
  return "";
}

type TableField = { field_name?: string; name?: string };

async function readResponseJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { code: -1, error: "Non-JSON response", status: response.status, body: text };
  }
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveFieldName(fields: TableField[], aliases: string[]): string | "" {
  const names = fields
    .map((field) => field.field_name || field.name)
    .filter(Boolean) as string[];
  const exact = aliases.find((alias) => names.includes(alias));
  if (exact) return exact;
  const normalizedAliases = aliases.map(normalizeFieldName);
  const match = fields.find((field) => {
    const name = field.field_name || field.name || "";
    return normalizedAliases.includes(normalizeFieldName(name));
  });
  return (match?.field_name || match?.name || "") as string;
}

// Write only when the column exists AND the value is non-empty — an empty string
// on a Number/typed column makes Feishu reject the WHOLE record.
function applyField(
  tableFields: TableField[],
  fields: Record<string, any>,
  aliases: string[],
  value: any
) {
  if (value === undefined || value === null || value === "") return;
  const name = resolveFieldName(tableFields, aliases);
  if (name) fields[name] = value;
}

function applyLink(
  tableFields: TableField[],
  fields: Record<string, any>,
  aliases: string[],
  recordId: any
) {
  if (!recordId) return;
  const name = resolveFieldName(tableFields, aliases);
  if (name) fields[name] = [String(recordId)];
}

async function getTableFields(
  token: string,
  tableId: string
): Promise<TableField[]> {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/fields?page_size=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await readResponseJson(response);
  if (!response.ok || data.code !== 0) {
    throw new Error(`Could not load fields for ${tableId}: ${JSON.stringify(data)}`);
  }
  return (data?.data?.items || []) as TableField[];
}

// Flatten the qualifier / questionnaire into a labelled text block appended to
// the client's Notes — mirrors how the coach intake has always persisted, so no
// new Feishu columns are needed to ship this.
function buildQualifierNotes(body: any): string {
  const lines = [
    "— 1:1 COACHING SIGNUP —",
    `Term: ${body.termLabel || "—"}`,
    `Sport: ${body.sport || "—"}`,
    `Preferred start: ${body.startDate || "—"}`,
    `Primary goal: ${body.goal || "—"}`,
    "",
    "— CONSENT RECORD —",
    `Privacy / Terms: accepted (${body.consentVersion || "2026-07-12"})`,
    "Mainland China / Hong Kong processing: separately accepted",
    `Recorded: ${new Date().toISOString()}`,
  ];
  return lines.join("\n");
}

function buildIntakeNotes(body: any): string {
  const lines = [
    "— TRAINING QUESTIONNAIRE —",
    `Training age: ${body.trainingAge || "—"}`,
    `Position / focus: ${body.position || "—"}`,
    `Days per week: ${body.days || "—"}`,
    `Next competition: ${body.compDate || "—"}`,
    `Injuries / limitations: ${body.injuries || "—"}`,
    `Equipment / gym: ${body.equipment || "—"}`,
    `Other notes: ${body.notes || "—"}`,
    "",
    "— SENSITIVE INFORMATION CONSENT —",
    `Health / injury information: ${body.healthConsent ? "separately accepted" : "not provided"}`,
    `Policy version: ${body.consentVersion || "2026-07-12"}`,
    `Recorded: ${new Date().toISOString()}`,
  ];
  return lines.join("\n");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  const stage = body.stage === "intake" ? "intake" : "order";

  // Reject incomplete paid orders before acquiring a Feishu token. Besides
  // being faster, this guarantees that no order can reach a write path without
  // the reference needed to reconcile the WeChat transfer.
  if (stage === "order") {
    const clientName = String(body.clientName || "").trim();
    const phone = String(body.phone || "").trim();
    const termLabel = String(body.termLabel || "").trim();
    const paymentCode = String(body.paymentCode || "").trim();
    if (!clientName || !phone || !termLabel)
      return res
        .status(400)
        .json({ error: "clientName, phone, and termLabel required" });
    if (body.privacyAccepted !== true || body.crossBorderAccepted !== true)
      return res.status(400).json({ error: "Privacy and cross-border consent required" });
    if (!/^NL-[2-9A-HJ-NP-Z]{4}$/.test(paymentCode))
      return res.status(400).json({ error: "A valid NL payment reference is required" });
  }

  const appToken = process.env.FEISHU_BASE_APP_TOKEN;
  const clientsTableId = process.env.FEISHU_CLIENTS_TABLE_ID;
  const ordersTableId =
    process.env.FEISHU_PRODUCT_ORDERS_TABLE_ID || "tbllinXYFDiUboKX";

  if (!appToken || !clientsTableId)
    return res.status(503).json({ message: "Coaching signup is not configured." });

  const base = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`;
  // "Today" in China time (UTC lags Asia/Shanghai by 8h).
  const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().split("T")[0];

  try {
    const token = await getToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // ---- stage "intake": append the post-payment questionnaire to the client ----
    if (stage === "intake") {
      const clientRecordId = String(body.clientRecordId || "");
      if (!clientRecordId)
        return res.status(400).json({ error: "clientRecordId required" });
      if (String(body.injuries || "").trim() && body.healthConsent !== true)
        return res.status(400).json({ error: "Separate health information consent required" });

      // Read current notes so we append rather than overwrite the qualifier.
      let existingNotes = "";
      try {
        const readRes = await fetch(
          `${base}/${clientsTableId}/records/${clientRecordId}`,
          { headers }
        );
        const readData = await readResponseJson(readRes);
        existingNotes = fieldToText(readData?.data?.record?.fields?.["Notes"]);
      } catch {
        /* best-effort */
      }

      const merged = [existingNotes, buildIntakeNotes(body)]
        .filter(Boolean)
        .join("\n\n");
      const updateRes = await fetch(
        `${base}/${clientsTableId}/records/${clientRecordId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            fields: { Notes: merged, "Intake Status": "Received" },
          }),
        }
      );
      const updateData = await readResponseJson(updateRes);
      const ok = updateRes.ok && updateData?.code === 0;
      invalidateCache("clients");
      if (ok) {
        void notifyCoach(
          `📝 Coaching questionnaire received\nClient: ${
            body.clientName || body.clientCode || clientRecordId
          }`
        );
      }
      return res.status(200).json({ success: ok });
    }

    // ---- stage "order": create/find client + write the pending coaching order ----
    const clientName = String(body.clientName || "").trim();
    const phone = String(body.phone || "").trim();
    const termLabel = String(body.termLabel || "").trim();
    const amountNum = Number(body.amount);

    const languagePreference =
      String(body.languagePreference || "").toLowerCase() === "chinese"
        ? "Chinese"
        : "English";
    const currency = String(body.currency || "CNY");
    const paymentCode = body.paymentCode ? String(body.paymentCode).trim() : "";

    // 1. Find existing client by phone / WeChat
    let clientRecordId = "";
    let clientCode = "";
    const searchRes = await fetch(
      `${base}/${clientsTableId}/records?page_size=10&filter=CurrentValue.[Phone/WeChat]="${encodeURIComponent(
        phone
      )}"`,
      { headers }
    );
    const searchData = await searchRes.json();
    const existing = searchData?.data?.items?.[0];
    if (existing) {
      clientRecordId = existing.record_id;
      clientCode =
        fieldToText(existing.fields?.["Client ID"]) || makeId("CL");
    }

    const qualifierNotes = buildQualifierNotes(body);

    // 2. Create the client if new, else update the key fields on the existing one
    if (!clientRecordId) {
      clientCode = makeId("CL");
      const createRes = await fetch(`${base}/${clientsTableId}/records`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          fields: {
            "Full Name": clientName,
            "Phone/WeChat": phone,
            "Client ID": clientCode,
            Source: "Store",
            "Payment Status": "Pending",
            "Intake Status": "Not Sent",
            "Subscription Status": "Active",
            "Client Type": "Online Coaching",
            "Coach Assigned": "Kent Bastell",
            "Package Type": termLabel,
            "Language Preference": languagePreference,
            "Start Date": toLarkDate(body.startDate),
            Notes: qualifierNotes,
          },
        }),
      });
      const createData = await readResponseJson(createRes);
      clientRecordId = createData?.data?.record?.record_id || "";
    } else {
      // Returning athlete buying coaching — refresh the coaching fields and
      // append the new qualifier to their notes.
      let existingNotes = fieldToText(existing.fields?.["Notes"]);
      const merged = [existingNotes, qualifierNotes].filter(Boolean).join("\n\n");
      await fetch(`${base}/${clientsTableId}/records/${clientRecordId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          fields: {
            "Subscription Status": "Active",
            "Client Type": "Online Coaching",
            "Package Type": termLabel,
            Notes: merged,
          },
        }),
      });
    }

    if (!clientRecordId)
      return res.status(500).json({ error: "Could not create or find client" });

    // 3. Create the coaching order (schema-aware; empties dropped). No Program
    // link — the term rides in Product Name.
    let orderId = "";
    let orderPersisted = false;
    let orderError: any = null;
    try {
      const orderFieldsSchema = await getTableFields(token, ordersTableId);
      const itemOrderId = makeId("ORD");
      const fields: Record<string, any> = {};
      applyField(orderFieldsSchema, fields, ["Order ID", "Order Id"], itemOrderId);
      applyLink(orderFieldsSchema, fields, ["Client ID", "Client Id"], clientRecordId);
      applyField(
        orderFieldsSchema,
        fields,
        ["Client Name", "Athlete Name", "Member Name"],
        clientName
      );
      applyField(
        orderFieldsSchema,
        fields,
        ["Product Name", "Program Name", "Purchased Program"],
        `1:1 Online Coaching — ${termLabel}`
      );
      applyField(
        orderFieldsSchema,
        fields,
        ["Product Type", "Order Type", "Type"],
        "Online Coaching"
      );
      if (
        body.amount !== undefined &&
        body.amount !== null &&
        String(body.amount).trim() !== "" &&
        Number.isFinite(amountNum)
      ) {
        applyField(orderFieldsSchema, fields, ["Amount", "Price"], amountNum);
      }
      applyField(orderFieldsSchema, fields, ["Currency"], currency);
      applyField(orderFieldsSchema, fields, ["Payment Status", "Payment"], "Pending");
      applyField(
        orderFieldsSchema,
        fields,
        ["Payment Reference", "Payment Ref", "Reference"],
        paymentCode
      );
      applyField(
        orderFieldsSchema,
        fields,
        ["Payment Provider", "Payment Method", "Provider"],
        "WeChat QR"
      );
      applyField(
        orderFieldsSchema,
        fields,
        ["Fulfillment Status", "Onboarding Status"],
        "New Order"
      );
      applyField(
        orderFieldsSchema,
        fields,
        ["Purchased At", "Purchase Date", "Order Date"],
        toLarkDate(today)
      );

      const orderRes = await fetch(`${base}/${ordersTableId}/records`, {
        method: "POST",
        headers,
        body: JSON.stringify({ fields }),
      });
      const orderData = await readResponseJson(orderRes);
      orderPersisted = orderRes.ok && orderData?.code === 0;
      if (orderPersisted) {
        orderId = itemOrderId;
      } else {
        orderError = orderData;
        console.error(
          "coachingSignup: order write failed",
          JSON.stringify({ larkResponse: orderData, fieldsSent: fields })
        );
      }
    } catch (orderErr: unknown) {
      orderError = orderErr instanceof Error ? orderErr.message : String(orderErr);
      console.error("coachingSignup: order write threw", orderError);
    }

    invalidateCache("clients");
    invalidateCache("productOrders");

    void notifyCoach(
      `⭐ New 1:1 coaching signup\n` +
        `Client: ${clientName} (${clientCode})\n` +
        `Term: ${termLabel} · ${currency} ${
          Number.isFinite(amountNum) ? amountNum.toLocaleString() : "—"
        }\n` +
        `Sport: ${body.sport || "—"}\n` +
        `Payment: PENDING — verify code ${paymentCode || "(none)"} in WeChat` +
        (orderPersisted ? "" : `\n⚠️ ORDER WRITE FAILED — check Feishu!`)
    );

    return res.status(200).json({
      success: true,
      clientCode,
      clientRecordId,
      orderId,
      orderPersisted,
      ...(orderError ? { orderError } : {}),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Coaching signup failed", message });
  }
}
