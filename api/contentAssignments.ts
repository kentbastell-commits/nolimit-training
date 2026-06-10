import type { VercelRequest, VercelResponse } from "@vercel/node";

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.name) return item.name;
        if (item?.record_ids) return item.record_ids.join(", ");
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.value) return fieldToText(value.value);
  if (value?.record_ids) return value.record_ids.join(", ");

  return JSON.stringify(value);
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

type TableField = {
  field_name?: string;
  name?: string;
  type?: number;
  ui_type?: string;
};

const scheduledDateAliases = [
  "Due Date",
  "Due date",
  "dueDate",
  "Due",
  "Deadline",
  "Scheduled Date",
  "Schedule Date",
  "Assignment Date",
  "Assigned Date",
  "assignedDate",
  "Date Assigned",
  "Assigned For",
  "Start Date",
  "Target Date",
  "Date",
];

function isDateField(field?: TableField) {
  const uiType = String(field?.ui_type || "").toLowerCase();
  return field?.type === 5 || uiType.includes("date");
}

function isAuditDateField(field?: TableField) {
  const name = normalizeFieldName(field?.field_name || field?.name || "");
  return (
    name.includes("created") ||
    name.includes("updated") ||
    name.includes("modified")
  );
}

function readField(fields: Record<string, any>, aliases: string[]) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(fields, alias)) {
      return fieldToText(fields[alias]);
    }
  }

  const normalizedAliases = aliases.map(normalizeFieldName);
  const matchingKey = Object.keys(fields).find((key) =>
    normalizedAliases.includes(normalizeFieldName(key))
  );

  return matchingKey ? fieldToText(fields[matchingKey]) : "";
}

function readFirstAvailableField(fields: Record<string, any>, fieldNames: string[]) {
  for (const fieldName of fieldNames) {
    if (Object.prototype.hasOwnProperty.call(fields, fieldName)) {
      return fieldToText(fields[fieldName]);
    }
  }

  return "";
}

function normalizeDate(value: string) {
  if (!value) return "";
  if (/^\d+$/.test(value)) {
    return new Date(Number(value)).toISOString().split("T")[0];
  }

  return value.split("T")[0].split(" ")[0];
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

async function getRecords(tableId: string, token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records?page_size=500`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`Could not fetch content assignments: ${JSON.stringify(data)}`);
  }

  return data.data.items || [];
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
    throw new Error(`Could not fetch assignment fields: ${JSON.stringify(data)}`);
  }

  return (data.data.items || []) as TableField[];
}

function getScheduledDateFieldNames(tableFields: TableField[]) {
  const normalizedAliases = scheduledDateAliases.map(normalizeFieldName);
  const names = tableFields
    .filter((field) => {
      const name = field.field_name || field.name || "";
      return (
        scheduledDateAliases.includes(name) ||
        normalizedAliases.includes(normalizeFieldName(name)) ||
        (isDateField(field) && !isAuditDateField(field))
      );
    })
    .map((field) => field.field_name || field.name)
    .filter(Boolean) as string[];

  return Array.from(new Set(names));
}

function mapAssignment(
  item: any,
  fallbackType: "Questionnaire" | "Physical Test",
  tableFields: TableField[]
) {
  const fields = item.fields || {};
  const assignedDate = normalizeDate(
    readField(fields, ["Created At", "Created Date", "Assigned At"])
  );
  const dueDate = normalizeDate(
    readField(fields, scheduledDateAliases) ||
      readFirstAvailableField(fields, getScheduledDateFieldNames(tableFields))
  );

  return {
    recordId: item.record_id,
    assignmentId:
      readField(fields, [
        "Assigned Form ID",
        "Assigned Test ID",
        "Assignment ID",
        "Assigned ID",
        "ID",
      ]) || item.record_id,
    assignmentType:
      readField(fields, ["Assignment Type", "Type", "Content Type", "Item Type"]) ||
      fallbackType,
    templateId: readField(fields, [
      "Form ID",
      "Test Template ID",
      "Template ID",
      "Questionnaire ID",
      "Saved Item ID",
      "Content ID",
    ]),
    templateName: readField(fields, [
      "Saved Questionnaire",
      "Saved Form",
      "Saved Test",
      "Questionnaire",
      "Form",
      "Physical Test",
      "Test",
      "Template Name",
      "Assignment Name",
      "Name",
    ]),
    clientId: readField(fields, [
      "Client",
      "Client ID",
      "Client Record ID",
      "clientId",
    ]),
    clientCode: readField(fields, ["Client Code", "clientCode", "Athlete Code"]),
    clientName: readField(fields, [
      "Client Name",
      "clientName",
      "Athlete",
      "Athlete Name",
      "Member Name",
    ]),
    assignedDate,
    dueDate,
    status: readField(fields, ["Status", "status"]) || "Assigned",
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const assignedFormsTableId =
    process.env.FEISHU_ASSIGNED_FORMS_TABLE_ID || process.env.ASSIGNED_FORMS;
  const assignedTestsTableId =
    process.env.FEISHU_ASSIGNED_TESTS_TABLE_ID || process.env.ASSIGNED_TESTS;

  if (!assignedFormsTableId && !assignedTestsTableId) {
    return res.status(500).json({ error: "Missing assignment table IDs" });
  }

  try {
    const token = await getTenantToken();
    const { clientId = "", clientCode = "", clientName = "" } = req.query;
    const requestedClientId = String(clientId).toLowerCase();
    const requestedClientCode = String(clientCode).toLowerCase();
    const requestedClientName = String(clientName).toLowerCase();
    const records = await Promise.all([
      assignedFormsTableId
        ? Promise.all([
            getRecords(assignedFormsTableId, token),
            getTableFields(assignedFormsTableId, token),
          ]).then(([items, tableFields]) =>
            items.map((item: any) =>
              mapAssignment(item, "Questionnaire", tableFields)
            )
          )
        : Promise.resolve([]),
      assignedTestsTableId
        ? Promise.all([
            getRecords(assignedTestsTableId, token),
            getTableFields(assignedTestsTableId, token),
          ]).then(([items, tableFields]) =>
            items.map((item: any) =>
              mapAssignment(item, "Physical Test", tableFields)
            )
          )
        : Promise.resolve([]),
    ]);

    const assignments = records
      .flat()
      .filter((assignment) => {
        if (!requestedClientId && !requestedClientCode && !requestedClientName) {
          return true;
        }

        const assignmentClientId = assignment.clientId.toLowerCase();
        const assignmentClientCode = assignment.clientCode.toLowerCase();
        const assignmentClientName = assignment.clientName.toLowerCase();

        return (
          (requestedClientId && assignmentClientId.includes(requestedClientId)) ||
          (requestedClientCode && assignmentClientCode === requestedClientCode) ||
          (requestedClientName && assignmentClientName === requestedClientName)
        );
      });

    return res.status(200).json({ assignments });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
