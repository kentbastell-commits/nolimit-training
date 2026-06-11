import type { VercelRequest, VercelResponse } from "@vercel/node";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { clientName, phone, email, programId, programName, amount, defaultIntakeFormId } =
    req.body;

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

    // 3. Create product order
    const orderId = makeId("ORD");
    await fetch(`${base}/${ordersTableId}/records`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fields: {
          "Order ID": orderId,
          "Client ID": clientCode,
          "Client Name": clientName,
          "Product Name": programName,
          "Program ID": programId,
          Amount: amount || "",
          "Payment Status": "Pending Payment",
          "Onboarding Status": "New Order",
          "Intake Status": "Not Sent",
          "Purchased At": toLarkDate(today),
          "Access Start Date": toLarkDate(today),
        },
      }),
    });

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

    return res.status(200).json({
      success: true,
      clientCode,
      clientRecordId,
      orderId,
      assignmentId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Activation failed", message });
  }
}
