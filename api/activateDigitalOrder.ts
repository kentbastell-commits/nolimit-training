import type { VercelRequest, VercelResponse } from "@vercel/node";
import { invalidateCache } from "./_cache.ts";
import { notifyCoach } from "./_notify.ts";

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
    paymentCode,
    addons,
    bundleItems,
    languagePreference,
    privacyAccepted,
    crossBorderAccepted,
    consentVersion,
  } = req.body;

  if (!clientName || !phone || !programId)
    return res.status(400).json({ error: "clientName, phone, and programId required" });
  if (!/^NL-[2-9A-HJ-NP-Z]{4}$/.test(String(paymentCode || "").trim()))
    return res.status(400).json({ error: "A valid NL payment reference is required" });
  if (privacyAccepted !== true || crossBorderAccepted !== true)
    return res.status(400).json({ error: "Privacy and cross-border consent required" });

  const consentRecord = [
    "— CONSENT RECORD —",
    `Privacy / Terms: accepted (${consentVersion || "2026-07-12"})`,
    "Mainland China / Hong Kong processing: separately accepted",
    `Recorded: ${new Date().toISOString()}`,
  ].join("\n");

  // Full cart: the main program plus any joint/mobility add-ons bought with it.
  // Each item becomes its own order so autoLoadProgram fulfils every purchase
  // (previously add-ons were charged for but never registered or loaded).
  const cartItems: Array<{
    programId: string;
    programRecordId?: string;
    programName?: string;
    amount?: unknown;
  }> = [
    { programId, programRecordId, programName, amount },
    ...(Array.isArray(addons)
      ? addons
          .filter((item: any) => item && item.programId)
          .map((item: any) => ({
            programId: String(item.programId),
            programRecordId: item.programRecordId
              ? String(item.programRecordId)
              : undefined,
            programName: item.programName ? String(item.programName) : undefined,
            amount: item.amount,
          }))
      : []),
    // Bundle members: an order each so the buyer owns every included program,
    // but with NO amount — the bundle line above carries the single charge.
    ...(Array.isArray(bundleItems)
      ? bundleItems
          .filter((item: any) => item && item.programId)
          .map((item: any) => ({
            programId: String(item.programId),
            programRecordId: item.programRecordId
              ? String(item.programRecordId)
              : undefined,
            programName: item.programName ? String(item.programName) : undefined,
            amount: undefined,
          }))
      : []),
  ];

  const appToken = process.env.FEISHU_BASE_APP_TOKEN;
  const clientsTableId = process.env.FEISHU_CLIENTS_TABLE_ID;
  const ordersTableId = process.env.FEISHU_PRODUCT_ORDERS_TABLE_ID || "tbllinXYFDiUboKX";
  const formsTableId = process.env.FEISHU_FORM_TEMPLATES_TABLE_ID;
  const assignedFormsTableId = process.env.FEISHU_ASSIGNED_FORMS_TABLE_ID;

  // "Today" in China time — the UTC date lags Asia/Shanghai by 8h, so early-
  // morning CST purchases used to stamp yesterday's date on orders/access.
  const today = new Date(Date.now() + 8 * 3600 * 1000)
    .toISOString()
    .split("T")[0];

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
    let existingClientNotes = "";

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
        existingClientNotes = fieldToText(existing.fields?.["Notes"]);
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
            "Payment Status": "Pending",
            "Intake Status": "Not Sent",
            "Subscription Status": "Active",
            "Client Type": "Digital Program",
            "Coach Assigned": "Kent Bastell",
            "Package Type": "Active",
            // Portal opens in the language the buyer shopped in.
            "Language Preference":
              String(languagePreference || "").toLowerCase() === "english"
                ? "English"
                : "Chinese",
            Notes: consentRecord,
          },
        }),
      });
      const createData = await createRes.json();
      clientRecordId = createData?.data?.record?.record_id || "";
    }

    if (!clientRecordId)
      return res.status(500).json({ error: "Could not create or find client" });

    await fetch(`${base}/${clientsTableId}/records/${clientRecordId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        fields: {
          Notes: [existingClientNotes, consentRecord].filter(Boolean).join("\n\n"),
        },
      }),
    });

    // 3. Create one product order per cart item — schema-aware so a missing
    // column or an empty value never silently fails the whole write (the old
    // version sent `Amount: ""`, which Feishu rejects on a Number column, and
    // then ignored the error — so digital orders were never actually recorded).
    //
    // Payment Status starts at "Pending": the buyer confirms they paid, and the
    // coach one-tap-verifies against the payment code they put in the WeChat
    // transfer note. The intake portal opens immediately, but
    // autoLoadProgram keeps the paid training plan locked until verification.
    const orderIds: string[] = [];
    let orderId = "";
    let orderPersisted = false;
    let orderError: any = null;
    const orderFieldsSchema = await getTableFields(token, ordersTableId);

    for (const item of cartItems) {
    try {
      const itemOrderId = makeId("ORD");
      const fields: Record<string, any> = {};
      applyField(orderFieldsSchema, fields, ["Order ID", "Order Id"], itemOrderId);
      // Client ID / Program ID are two-way link columns — write linked record
      // ids as arrays, not the human-readable codes.
      applyLink(orderFieldsSchema, fields, ["Client ID", "Client Id"], clientRecordId);
      applyLink(
        orderFieldsSchema,
        fields,
        ["Program ID", "Purchased Program ID", "Purchased Program Id"],
        item.programRecordId
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
        item.programName
      );
      applyField(
        orderFieldsSchema,
        fields,
        ["Product Type", "Order Type", "Type"],
        "Digital Program"
      );
      // Amount is numeric — only include a real value. An empty string here was
      // a second bug that would also drop the write on this Number column.
      const amountNum = Number(item.amount);
      if (
        item.amount !== undefined &&
        item.amount !== null &&
        String(item.amount).trim() !== "" &&
        Number.isFinite(amountNum)
      ) {
        applyField(orderFieldsSchema, fields, ["Amount", "Price"], amountNum);
      }
      applyField(orderFieldsSchema, fields, ["Currency"], currency || "CNY");
      applyField(
        orderFieldsSchema,
        fields,
        ["Payment Status", "Payment"],
        "Pending"
      );
      applyField(
        orderFieldsSchema,
        fields,
        ["Payment Reference", "Payment Ref", "Reference"],
        paymentCode ? String(paymentCode) : ""
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
      applyField(orderFieldsSchema, fields, ["Notes", "Internal Notes"], consentRecord);

      const orderRes = await fetch(`${base}/${ordersTableId}/records`, {
        method: "POST",
        headers,
        body: JSON.stringify({ fields }),
      });
      const orderData = await readResponseJson(orderRes);
      const itemPersisted = orderRes.ok && orderData?.code === 0;
      if (itemPersisted) {
        orderIds.push(itemOrderId);
        if (!orderId) orderId = itemOrderId; // main order = first cart item
        orderPersisted = true;
      } else {
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
    } // end cart loop

    // 4. Find intake form template
    let assignmentId = "";
    let intakeAssigned = false;
    if (assignedFormsTableId && formsTableId) {
      let intakeTemplateId = defaultIntakeFormId || "";

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
        }
      }

      // 5. Create intake assignment — schema-aware against the REAL Assigned
      // Forms columns (Assigned Forms ID / Form ID / Client ID+Code as text /
      // Status "Assigned"), and the response is CHECKED: the old version wrote
      // non-existent columns (Assignment ID, Template ID, Due Date) and never
      // read the result, so every self-serve intake silently failed and the
      // buyer landed in an empty portal with nothing to tap.
      if (intakeTemplateId) {
        assignmentId = makeId("FA");
        const assignedFormsSchema = await getTableFields(
          token,
          assignedFormsTableId
        );
        const assignmentFields: Record<string, any> = {};
        applyField(
          assignedFormsSchema,
          assignmentFields,
          ["Assigned Forms ID", "Assigned Form ID", "Assignment ID"],
          assignmentId
        );
        applyField(
          assignedFormsSchema,
          assignmentFields,
          ["Form ID", "Template ID"],
          String(intakeTemplateId)
        );
        applyField(
          assignedFormsSchema,
          assignmentFields,
          ["Client ID", "Client Id"],
          clientCode
        );
        applyField(
          assignedFormsSchema,
          assignmentFields,
          ["Client Code", "Athlete Code"],
          clientCode
        );
        applyField(
          assignedFormsSchema,
          assignmentFields,
          ["Assigned Date", "Created At"],
          toLarkDate(today)
        );
        applyField(assignedFormsSchema, assignmentFields, ["Status"], "Assigned");

        const assignRes = await fetch(`${base}/${assignedFormsTableId}/records`, {
          method: "POST",
          headers,
          body: JSON.stringify({ fields: assignmentFields }),
        });
        const assignData = await readResponseJson(assignRes);
        intakeAssigned = assignRes.ok && assignData?.code === 0;
        if (!intakeAssigned) {
          assignmentId = "";
          console.error(
            "activateDigitalOrder: intake assignment failed",
            JSON.stringify({ larkResponse: assignData, fieldsSent: assignmentFields })
          );
          void notifyCoach(
            `⚠️ Intake assignment FAILED for ${clientName} (${clientCode}) — assign it manually from the coach app.`
          );
        }

        // Update client intake status. (No "Program" text column exists on
        // the clients table — writing it made Feishu reject this whole PUT
        // silently, losing Intake Status too. The program link itself is set
        // by autoLoadProgram once the workouts are created.)
        const clientStatusRes = await fetch(
          `${base}/${clientsTableId}/records/${clientRecordId}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({
              fields: {
                "Intake Status": intakeAssigned ? "Sent" : "Not Sent",
                "Purchased Program ID": programId,
              },
            }),
          }
        );
        const clientStatusData = await readResponseJson(clientStatusRes);
        if (!clientStatusRes.ok || clientStatusData?.code !== 0) {
          console.error(
            "activateDigitalOrder: client intake-status update failed (non-fatal)",
            JSON.stringify({ larkResponse: clientStatusData })
          );
        }
      }
    }

    invalidateCache("clients");
    invalidateCache("productOrders");
    invalidateCache("contentAssignments");
    invalidateCache("workouts");

    const itemsSummary = cartItems
      .map((item) => item.programName || item.programId)
      .join(" + ");
    void notifyCoach(
      `🛒 New store order\n` +
        `Client: ${clientName} (${clientCode})\n` +
        `Items: ${itemsSummary}\n` +
        `Payment: PENDING — verify code ${paymentCode || "(none)"} in WeChat` +
        (orderPersisted ? "" : `\n⚠️ ORDER WRITE FAILED — check Feishu!`)
    );

    return res.status(200).json({
      success: true,
      clientCode,
      clientRecordId,
      orderId,
      orderIds,
      orderPersisted,
      ...(orderError ? { orderError } : {}),
      assignmentId,
      intakeAssigned,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Activation failed", message });
  }
}
