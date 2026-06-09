import type { VercelRequest, VercelResponse } from "@vercel/node";

function toLarkDate(value?: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  return new Date(`${value}T00:00:00`).getTime();
}

async function getTenantToken() {
  const response = await fetch(
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
  const data = await response.json();

  if (!data.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(data)}`);
  }

  return data.tenant_access_token;
}

async function createRecord(tableId: string, token: string, fields: Record<string, any>) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  return response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      assignmentType,
      templateId,
      clientId,
      clientCode,
      clientName,
      assignedDate,
      dueDate,
    } = req.body;

    if (!assignmentType || !templateId || !clientId) {
      return res.status(400).json({
        error: "Missing assignmentType, templateId, or clientId",
      });
    }

    const token = await getTenantToken();
    const isTest = String(assignmentType).toLowerCase().includes("test");
    const assignedTestsTableId =
      process.env.FEISHU_ASSIGNED_TESTS_TABLE_ID || process.env.ASSIGNED_TESTS;
    const assignedFormsTableId =
      process.env.FEISHU_ASSIGNED_FORMS_TABLE_ID || process.env.ASSIGNED_FORMS;

    if (isTest && !assignedTestsTableId) {
      return res.status(500).json({ error: "Missing FEISHU_ASSIGNED_TESTS_TABLE_ID" });
    }

    if (!isTest && !assignedFormsTableId) {
      return res.status(500).json({ error: "Missing FEISHU_ASSIGNED_FORMS_TABLE_ID" });
    }

    const fields = isTest
      ? {
          assignedTestId: `AT-${Date.now()}`,
          testTemplateId: String(templateId),
          clientId: String(clientId),
          clientCode: String(clientCode || ""),
          clientName: String(clientName || ""),
          assignedDate: toLarkDate(assignedDate),
          dueDate: toLarkDate(dueDate),
          status: "Assigned",
        }
      : {
          assignedFormId: `AF-${Date.now()}`,
          formId: String(templateId),
          clientId: String(clientId),
          clientCode: String(clientCode || ""),
          clientName: String(clientName || ""),
          assignedDate: toLarkDate(assignedDate),
          dueDate: toLarkDate(dueDate),
          status: "Assigned",
        };

    const data = await createRecord(
      isTest ? (assignedTestsTableId as string) : (assignedFormsTableId as string),
      token,
      fields
    );

    if (data.code !== 0) {
      return res.status(500).json({
        error: "Could not create assignment",
        larkResponse: data,
        fieldsSent: fields,
      });
    }

    return res.status(200).json({
      success: true,
      recordId: data.data.record.record_id,
      larkResponse: data,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
