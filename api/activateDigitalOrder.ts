import type { VercelRequest, VercelResponse } from "@vercel/node";
import { invalidateCache } from "./_cache.ts";

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

// Resolve a column by any of its aliases (exact match first, then a
// punctuation/case-insensitive match) so a renamed column never silently drops.
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

// Write `value` under whichever real column matches `aliases` — but only when
// it both exists and is non-empty. An empty string on a Number/typed column
// (e.g. Amount) makes Feishu reject the WHOLE record, so empties are dropped.
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

// Two-way ("Duplex") link columns (e.g. Client ID, Program ID) reject plain
// strings — Feishu requires an array of the *linked* record_ids. Resolve the
// column and write `[recordId]`, skipping when we don't have a record id.
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const {
    clientName,
    phone,
    email,
    programId,
    programRecordId,
    programName,
    amount,
    currency,
    defaultIntakeFormId,
  } = req.body;

  if (!clientName || !phone || !programId)
    return res.status(400).json({ error: "clientName, phone, and programId required" });

  const appToken = process.env.FEISHU_BASE_APP_TOKEN;
  const clientsTableId = process.env.FEISHU_CLIENTS_TABLE_ID;
  const ordersTableId = process.env.FEISHU_PRODUCT_ORDERS_TABLE_ID || "tbllinXYFDiUboKX";
  const formsTableId = process.env.FEISHU_FORM_TEMPLATES_TABLE_ID;
  const assignedFormsTableId = process.env.FEISHU_ASSIGNED_FORMS_TABLE_ID;

  const today = new Date().toISOString().split("T")[0];

  try {
    const token = await getToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const base = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`;

    // 1. Find existing client by phone
    let clientRecordId = "";
    let clientCode = "";

    if (clientsTableId) {
      const searchRes = await fetch(
        `${base}/${clientsTableId}/records?page_size=10&filter=CurrentValue.[Phone/WeChat]="${encodeURIComponent(phone)}"`,
        { headers }
      );
      const searchData = await searchRes.json();
      const existing = searchData?.data?.items?.[0];
      if (existing) {
        clientRecordId = existing.record_id;
        clientCode =
          fieldToText(existing.fields?.["Client ID"]) ||
          fieldToText(existing.fields?.["client id"]) ||
          makeId("CL");
      }
    }

    // 2. Create client if not found
    if (!clientRecordId && clientsTableId) {
      clientCode = makeId("CL");
      const createRes = await fetch(`${base}/${clientsTableId}/records`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          fields: {
            "Full Name": clientName,
            "Phone/WeChat": phone,
            ...(email ? { Email: email } : {}),
            "Client ID": clientCode,
            Source: "Store",
            "Payment Status": "Paid",
            "Intake Status": "Not Sent",
            "Subscription Status": "Active",
            "Client Type": "Digital Program",
            "Coach Assigned": "Kent Bastell",
            "Package Type": "Active",
            "Language Preference": "Chinese",
          },
        }),
      });
      const createData = await createRes.json();
      clientRecordId = createData?.data?.record?.record_id || "";
    }

    if (!clientRecordId)
      return res.status(500).json({ error: "Could not create or find client" });

    // 3. Create product order — schema-aware so a missing column or an empty
    // value never silently fails the whole write (the old version sent
    // `Amount: ""`, which Feishu rejects on a Number column, and then ignored
    // the error — so digital orders were never actually recorded).
    const orderId = makeId("ORD");
    let orderPersisted = false;
    let orderError: any = null;
    try {
      const orderFieldsSchema = await getTableFields(token, ordersTableId);
      const fields: Record<string, any> = {};
      applyField(orderFieldsSchema, fields, ["Order ID", "Order Id"], orderId);
      // Client ID / Program ID are two-way link columns — write linked record
      // ids as arrays, not the human-readable codes.
      applyLink(orderFieldsSchema, fields, ["Client ID", "Client Id"], clientRecordId);
      applyLink(
        orderFieldsSchema,
        fields,
        ["Program ID", "Purchased Program ID", "Purchased Program Id"],
        programRecordId
      );
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
        programName
      );
      applyField(
        orderFieldsSchema,
        fields,
        ["Product Type", "Order Type", "Type"],
        "Digital Program"
      );
      // Amount is numeric — only include a real value. An empty string here was
      // a second bug that would also drop the write on this Number column.
      const amountNum = Number(amount);
      if (
        amount !== undefined &&
        amount !== null &&
        String(amount).trim() !== "" &&
        Number.isFinite(amountNum)
      ) {
        applyField(orderFieldsSchema, fields, ["Amount", "Price"], amountNum);
      }
      applyField(orderFieldsSchema, fields, ["Currency"], currency || "CNY");
      applyField(
        orderFieldsSchema,
        fields,
        ["Payment Status", "Payment"],
        "Paid"
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
        ["Intake Status", "Intake", "Questionnaire Status"],
        "Not Sent"
      );
      // Marks the order pending until autoLoadProgram flips it to "Program
      // Loaded" (which is also the dedup guard against double-loading).
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
        toLarkDate(today) || Date.now()
      );
      applyField(
        orderFieldsSchema,
        fields,
        ["Access Start Date", "Start Date", "Program Start Date"],
        toLarkDate(today)
      );

      const orderRes = await fetch(`${base}/${ordersTableId}/records`, {
        method: "POST",
        headers,
        body: JSON.stringify({ fields }),
      });
      const orderData = await readResponseJson(orderRes);
      orderPersisted = orderRes.ok && orderData?.code === 0;
      if (!orderPersisted) {
        orderError = orderData;
        console.error(
          "activateDigitalOrder: order write failed",
          JSON.stringify({ larkResponse: orderData, fieldsSent: fields })
        );
      }
    } catch (orderErr: unknown) {
      orderError = orderErr instanceof Error ? orderErr.message : String(orderErr);
      console.error("activateDigitalOrder: order write threw", orderError);
    }

    // 4. Find intake form template
    let assignmentId = "";
    if (assignedFormsTableId && formsTableId) {
      let intakeTemplateId = defaultIntakeFormId || "";
      let intakeTemplateName = "";

      if (!intakeTemplateId) {
        const tmplRes = await fetch(`${base}/${formsTableId}/records?page_size=50`, { headers });
        const tmplData = await tmplRes.json();
        const template = (tmplData?.data?.items || []).find((item: any) => {
          const type = fieldToText(item.fields?.["Type"] || item.fields?.["Template Type"]);
          return type.toLowerCase().includes("intake") || type.toLowerCase().includes("questionnaire");
        });
        if (template) {
          intakeTemplateId =
            fieldToText(template.fields?.["Form ID"]) ||
            fieldToText(template.fields?.["Template ID"]) ||
            template.record_id;
          intakeTemplateName =
            fieldToText(template.fields?.["Name"]) ||
            fieldToText(template.fields?.["Template Name"]) ||
            "Intake Form";
        }
      }

      // 5. Create intake assignment
      if (intakeTemplateId) {
        assignmentId = makeId("FA");
        await fetch(`${base}/${assignedFormsTableId}/records`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            fields: {
              "Assignment ID": assignmentId,
              "Client ID": [clientRecordId],
              "Template ID": intakeTemplateId,
              "Template Name": intakeTemplateName || "Intake Form",
              "Assignment Type": "Questionnaire",
              Status: "Pending",
              "Assigned Date": toLarkDate(today),
              "Due Date": toLarkDate(today),
            },
          }),
        });

        // Update client intake status
        await fetch(`${base}/${clientsTableId}/records/${clientRecordId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            fields: {
              "Intake Status": "Sent",
              "Purchased Program ID": programId,
              Program: programName,
            },
          }),
        });
      }
    }

    invalidateCache("clients");
    invalidateCache("productOrders");
    invalidateCache("contentAssignments");
    invalidateCache("workouts");
    return res.status(200).json({
      success: true,
      clientCode,
      clientRecordId,
      orderId,
      orderPersisted,
      ...(orderError ? { orderError } : {}),
      assignmentId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Activation failed", message });
  }
}
