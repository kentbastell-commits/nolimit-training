import type { VercelRequest, VercelResponse } from "@vercel/node";

function toLarkDate(value?: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  return new Date(`${value}T00:00:00`).getTime();
}

type TableField = {
  field_name?: string;
  name?: string;
  type?: number;
  ui_type?: string;
};

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isLinkField(field?: TableField) {
  const uiType = String(field?.ui_type || "").toLowerCase();

  return (
    field?.type === 21 ||
    uiType.includes("duplex") ||
    uiType.includes("link") ||
    uiType.includes("relation")
  );
}

function resolveField(fields: TableField[], aliases: string[]) {
  const names = fields
    .map((field) => field.field_name || field.name)
    .filter(Boolean) as string[];
  const exact = aliases.find((alias) => names.includes(alias));

  if (exact) {
    return fields.find((field) => (field.field_name || field.name) === exact);
  }

  const normalizedAliases = aliases.map(normalizeFieldName);

  return fields.find((field) => {
    const name = field.field_name || field.name || "";
    return normalizedAliases.includes(normalizeFieldName(name));
  });
}

function buildFields(
  tableFields: TableField[],
  specs: {
    aliases: string[];
    value: any;
    linkValue?: any;
    required?: boolean;
  }[]
) {
  const fields: Record<string, any> = {};
  const missingRequired: string[] = [];

  for (const spec of specs) {
    const field = resolveField(tableFields, spec.aliases);
    const fieldName = field?.field_name || field?.name;

    if (!fieldName) {
      if (spec.required) missingRequired.push(spec.aliases[0]);
      continue;
    }

    fields[fieldName] = isLinkField(field) && spec.linkValue ? spec.linkValue : spec.value;
  }

  return { fields, missingRequired };
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

async function getTableFields(tableId: string, token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/fields?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`Could not fetch assignment table fields: ${JSON.stringify(data)}`);
  }

  return (data.data.items || []) as TableField[];
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
      templateName,
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

    const tableId = isTest
      ? (assignedTestsTableId as string)
      : (assignedFormsTableId as string);
    const tableFields = await getTableFields(tableId, token);
    const assignmentId = `${isTest ? "AT" : "AF"}-${Date.now()}`;
    const { fields } = buildFields(tableFields, [
      {
        aliases: isTest
          ? [
              "Assigned Test ID",
              "Assigned Test Id",
              "assignedTestId",
              "Assignment ID",
              "Assignment Id",
              "Assigned ID",
              "Assigned Id",
              "ID",
            ]
          : [
              "Assigned Form ID",
              "Assigned Form Id",
              "assignedFormId",
              "Assignment ID",
              "Assignment Id",
              "Assigned ID",
              "Assigned Id",
              "ID",
            ],
        value: assignmentId,
      },
      {
        aliases: isTest
          ? [
              "Test Template ID",
              "Test Template Id",
              "testTemplateId",
              "Template ID",
              "Template Id",
              "Test ID",
              "Test Id",
              "Physical Test ID",
              "Physical Test Id",
              "Saved Test ID",
              "Saved Test Id",
              "Saved Item ID",
              "Saved Item Id",
              "Content ID",
              "Content Id",
            ]
          : [
              "Form ID",
              "Form Id",
              "formId",
              "Template ID",
              "Template Id",
              "Questionnaire ID",
              "Questionnaire Id",
              "Form Template ID",
              "Form Template Id",
              "Questionnaire Template ID",
              "Questionnaire Template Id",
              "Saved Form ID",
              "Saved Form Id",
              "Saved Questionnaire ID",
              "Saved Questionnaire Id",
              "Saved Item ID",
              "Saved Item Id",
              "Content ID",
              "Content Id",
            ],
        value: String(templateId),
      },
      {
        aliases: [
          "Assignment Type",
          "Type",
          "Content Type",
          "Item Type",
          "Assigned Type",
        ],
        value: String(assignmentType),
      },
      {
        aliases: isTest
          ? [
              "Saved Test",
              "Physical Test",
              "Test",
              "Test Name",
              "Template",
              "Template Name",
              "Saved Item",
              "Assignment Name",
              "Name",
            ]
          : [
              "Saved Form",
              "Saved Questionnaire",
              "Questionnaire",
              "Form",
              "Form Name",
              "Template",
              "Template Name",
              "Saved Item",
              "Assignment Name",
              "Name",
            ],
        value: String(templateName || templateId),
      },
      {
        aliases: [
          "Client",
          "Client ID",
          "Client Id",
          "clientId",
          "Client Record ID",
          "Client Record Id",
        ],
        value: String(clientId),
        linkValue: [String(clientId)],
      },
      {
        aliases: ["Client Code", "clientCode", "Athlete Code", "Athlete ID"],
        value: String(clientCode || ""),
      },
      {
        aliases: [
          "Client Name",
          "clientName",
          "Athlete",
          "Athlete Name",
          "Member",
          "Member Name",
        ],
        value: String(clientName || ""),
      },
      {
        aliases: [
          "Assigned Date",
          "assignedDate",
          "Date Assigned",
          "Start Date",
          "Date",
        ],
        value: toLarkDate(assignedDate),
      },
      {
        aliases: ["Due Date", "dueDate", "Scheduled Date", "Target Date"],
        value: toLarkDate(dueDate),
      },
      {
        aliases: ["Status", "status"],
        value: "Assigned",
      },
    ]);

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({
        error: "No matching Feishu assignment columns found",
        availableFields: tableFields
          .map((field) => field.field_name || field.name)
          .filter(Boolean),
      });
    }

    const data = await createRecord(
      tableId,
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
