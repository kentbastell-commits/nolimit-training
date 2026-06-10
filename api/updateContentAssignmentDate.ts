import type { VercelRequest, VercelResponse } from "@vercel/node";

type TableField = {
  field_name?: string;
  name?: string;
  type?: number;
  ui_type?: string;
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

function resolveFields(fields: TableField[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeFieldName);
  const seen = new Set<string>();

  return fields.filter((field) => {
    const name = field.field_name || field.name || "";
    const matches =
      aliases.includes(name) || normalizedAliases.includes(normalizeFieldName(name));

    if (!matches || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

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

function resolveScheduledDateFields(fields: TableField[]) {
  const byName = resolveFields(fields, scheduledDateAliases);
  const seen = new Set(
    byName.map((field) => field.field_name || field.name).filter(Boolean)
  );
  const byType = fields.filter((field) => {
    const fieldName = field.field_name || field.name || "";
    return isDateField(field) && !isAuditDateField(field) && !seen.has(fieldName);
  });

  return [...byName, ...byType];
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
    throw new Error(`Could not fetch assignment fields: ${JSON.stringify(data)}`);
  }

  return (data.data.items || []) as TableField[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { assignmentType, recordId, scheduledDate } = req.body || {};

    if (!assignmentType || !recordId || !scheduledDate) {
      return res.status(400).json({
        error: "Missing assignmentType, recordId, or scheduledDate",
      });
    }

    const isTest = String(assignmentType).toLowerCase().includes("test");
    const tableId = isTest
      ? process.env.FEISHU_ASSIGNED_TESTS_TABLE_ID || process.env.ASSIGNED_TESTS
      : process.env.FEISHU_ASSIGNED_FORMS_TABLE_ID || process.env.ASSIGNED_FORMS;

    if (!tableId) {
      return res.status(500).json({
        error: isTest
          ? "Missing FEISHU_ASSIGNED_TESTS_TABLE_ID"
          : "Missing FEISHU_ASSIGNED_FORMS_TABLE_ID",
      });
    }

    const token = await getTenantToken();
    const tableFields = await getTableFields(tableId, token);
    const dueDateFields = resolveScheduledDateFields(tableFields);
    const fieldNames = dueDateFields
      .map((field) => field.field_name || field.name)
      .filter(Boolean) as string[];

    if (fieldNames.length === 0) {
      return res.status(400).json({
        error: "Missing scheduled date column",
        availableFields: tableFields
          .map((field) => field.field_name || field.name)
          .filter(Boolean),
      });
    }

    const updateRecord = async (fieldName: string, value: string | number) => {
      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records/${recordId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: {
              [fieldName]: value,
            },
          }),
        }
      );

      return response.json();
    };

    const updatedFields: string[] = [];
    const failedFields: { fieldName: string; response: any }[] = [];

    for (const fieldName of fieldNames) {
      let data = await updateRecord(fieldName, toLarkDate(scheduledDate));

      if (data.code !== 0) {
        data = await updateRecord(fieldName, String(scheduledDate));
      }

      if (data.code === 0) {
        updatedFields.push(fieldName);
      } else {
        failedFields.push({ fieldName, response: data });
      }
    }

    if (updatedFields.length === 0) {
      return res.status(500).json({
        error: "Failed to update assignment date",
        attemptedFields: fieldNames,
        failedFields,
      });
    }

    return res.status(200).json({
      success: true,
      recordId,
      scheduledDate,
      updatedFields,
      failedFields,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
