import type { VercelRequest, VercelResponse } from "@vercel/node";

type TableField = {
  field_name?: string;
  name?: string;
};

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toLarkDate(value?: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  return new Date(`${value}T00:00:00`).getTime();
}

function resolveField(fields: TableField[], aliases: string[]) {
  const exact = aliases.find((alias) =>
    fields.some((field) => (field.field_name || field.name) === alias)
  );

  if (exact) {
    return fields.find((field) => (field.field_name || field.name) === exact);
  }

  const normalizedAliases = aliases.map(normalizeFieldName);

  return fields.find((field) =>
    normalizedAliases.includes(
      normalizeFieldName(field.field_name || field.name || "")
    )
  );
}

function buildFields(
  tableFields: TableField[],
  specs: { aliases: string[]; value: any; required?: boolean }[]
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

    fields[fieldName] = spec.value;
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
    throw new Error(`Could not fetch response table fields: ${JSON.stringify(data)}`);
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

async function updateRecord(tableId: string, token: string, recordId: string, fields: Record<string, any>) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records/${recordId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  return response.json();
}

function buildCompletionFields(tableFields: TableField[]) {
  return buildFields(tableFields, [
    {
      aliases: ["Status", "status", "Completion Status"],
      value: "Completed",
    },
    {
      aliases: ["Completed At", "Completed Date", "Completd At"],
      value: Date.now(),
    },
  ]).fields;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      assignmentType,
      assignmentId,
      assignmentRecordId,
      templateId,
      clientId,
      clientName,
      responses,
    } = req.body || {};

    if (!assignmentType || !templateId || !clientId || !Array.isArray(responses)) {
      return res.status(400).json({
        error: "Missing assignmentType, templateId, clientId, or responses",
      });
    }

    const isTest = String(assignmentType).toLowerCase().includes("test");
    const tableId = isTest
      ? process.env.FEISHU_TEST_RESULTS_TABLE_ID || process.env.TEST_RESULTS
      : process.env.FEISHU_FORM_RESPONSES_TABLE_ID || process.env.FORM_RESPONSES;
    const assignmentTableId = isTest
      ? process.env.FEISHU_ASSIGNED_TESTS_TABLE_ID || process.env.ASSIGNED_TESTS
      : process.env.FEISHU_ASSIGNED_FORMS_TABLE_ID || process.env.ASSIGNED_FORMS;

    if (!tableId) {
      return res.status(500).json({
        error: isTest
          ? "Missing FEISHU_TEST_RESULTS_TABLE_ID"
          : "Missing FEISHU_FORM_RESPONSES_TABLE_ID",
      });
    }

    const token = await getTenantToken();
    const tableFields = await getTableFields(tableId, token);
    const createdRecords: string[] = [];

    for (const [index, responseItem] of responses.entries()) {
      const responseId = `${isTest ? "TR" : "FR"}-${Date.now()}-${index + 1}`;
      const { fields, missingRequired } = buildFields(tableFields, [
        {
          aliases: isTest
            ? ["Test Result ID", "Result ID", "Response ID", "ID"]
            : ["Form Response ID", "Response ID", "Result ID", "ID"],
          value: responseId,
        },
        {
          aliases: isTest
            ? ["Assigned Test ID", "Assignment ID", "Assigned ID"]
            : ["Assigned Form ID", "Assignment ID", "Assigned ID"],
          value: String(assignmentId || assignmentRecordId || ""),
        },
        {
          aliases: ["Assignment Record ID", "Record ID"],
          value: String(assignmentRecordId || ""),
        },
        {
          aliases: isTest
            ? ["Test Template ID", "Template ID", "Test ID"]
            : ["Form ID", "Template ID", "Questionnaire ID"],
          value: String(templateId),
        },
        {
          aliases: isTest
            ? ["Test Item ID", "Item ID", "Question ID"]
            : ["Question ID", "Item ID"],
          value: String(responseItem.itemId || responseItem.questionId || ""),
        },
        {
          aliases: isTest
            ? ["Test Name", "Item Name", "Question"]
            : ["Question", "Question Text", "Label"],
          value: String(responseItem.label || ""),
        },
        {
          aliases: isTest ? ["Value", "Result", "Answer"] : ["Answer", "Response"],
          value: String(responseItem.value || ""),
          required: true,
        },
        {
          aliases: ["Unit"],
          value: String(responseItem.unit || ""),
        },
        {
          aliases: ["Client ID", "clientId"],
          value: String(clientId),
        },
        {
          aliases: ["Client Name", "clientName", "Athlete Name"],
          value: String(clientName || ""),
        },
        {
          aliases: ["Submitted At", "Submitted Date", "Date"],
          value: toLarkDate(),
        },
      ]);

      if (missingRequired.length > 0) {
        return res.status(400).json({
          error: "Missing required response columns",
          missingRequired,
          availableFields: tableFields
            .map((field) => field.field_name || field.name)
            .filter(Boolean),
        });
      }

      const data = await createRecord(tableId, token, fields);

      if (data.code !== 0) {
        return res.status(500).json({
          error: "Could not submit response",
          larkResponse: data,
          fieldsSent: fields,
        });
      }

      createdRecords.push(data.data.record.record_id);
    }

    let assignmentUpdate: any = null;

    if (assignmentTableId && assignmentRecordId) {
      const assignmentTableFields = await getTableFields(assignmentTableId, token);
      const completionFields = buildCompletionFields(assignmentTableFields);

      if (Object.keys(completionFields).length > 0) {
        assignmentUpdate = await updateRecord(
          assignmentTableId,
          token,
          String(assignmentRecordId),
          completionFields
        );
      }
    }

    return res.status(200).json({
      success: true,
      recordsCreated: createdRecords.length,
      assignmentUpdate,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
