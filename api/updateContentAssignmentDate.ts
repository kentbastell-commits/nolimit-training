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
    const dueDateField = resolveField(tableFields, [
      "Due Date",
      "dueDate",
      "Scheduled Date",
      "Target Date",
      "Date",
    ]);
    const fieldName = dueDateField?.field_name || dueDateField?.name;

    if (!fieldName) {
      return res.status(400).json({
        error: "Missing scheduled date column",
        availableFields: tableFields
          .map((field) => field.field_name || field.name)
          .filter(Boolean),
      });
    }

    const updateRecord = async (value: string | number) => {
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

    let data = await updateRecord(toLarkDate(scheduledDate));

    if (data.code !== 0) {
      data = await updateRecord(String(scheduledDate));
    }

    if (data.code !== 0) {
      return res.status(500).json({
        error: "Failed to update assignment date",
        larkResponse: data,
      });
    }

    return res.status(200).json({
      success: true,
      recordId,
      scheduledDate,
      larkResponse: data,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
