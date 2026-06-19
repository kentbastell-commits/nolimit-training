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
        if (item?.link_record_ids) return item.link_record_ids.join(", ");
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }
  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.value) return fieldToText(value.value);
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");
  return "";
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveFieldName(fields: any[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeFieldName);
  const match = fields.find((field) =>
    normalizedAliases.includes(
      normalizeFieldName(field.field_name || field.name || "")
    )
  );

  return match?.field_name || match?.name || "";
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

  if (data.code !== 0) return [];
  return data.data?.items || [];
}

async function getRecord(tableId: string, recordId: string, token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records/${recordId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();

  if (data.code !== 0) return null;
  return data.data?.record || data.data;
}

async function updateRecord(
  tableId: string,
  recordId: string,
  fields: Record<string, any>,
  token: string
) {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const workoutLogsTableId = process.env.FEISHU_WORKOUT_LOGS_TABLE_ID;

  if (!workoutLogsTableId) {
    return res.status(500).json({ error: "Missing workout logs table ID" });
  }

  try {
    const { recordIds = [] } = req.body || {};

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return res.status(400).json({ error: "Missing recordIds" });
    }

    const token = await getTenantToken();
    const tableFields = await getTableFields(workoutLogsTableId, token);
    const reviewFieldName = resolveFieldName(tableFields, [
      "Coach Reviewed",
      "Comment Reviewed",
      "Reviewed",
    ]);
    const notesFieldName = resolveFieldName(tableFields, [
      "Client Comment",
      "Workout Comment",
      "Athlete Notes",
      "Client Notes",
      "Notes",
      "Session Notes",
    ]);
    const results = [];

    for (const recordId of recordIds) {
      if (reviewFieldName) {
        let result = await updateRecord(
          workoutLogsTableId,
          recordId,
          { [reviewFieldName]: true },
          token
        );

        if (result.code !== 0) {
          result = await updateRecord(
            workoutLogsTableId,
            recordId,
            { [reviewFieldName]: "Reviewed" },
            token
          );
        }

        results.push(result);
        continue;
      }

      if (!notesFieldName) {
        return res.status(500).json({
          error:
            "Missing Coach Reviewed/Reviewed field and no notes field fallback was found.",
        });
      }

      const record = await getRecord(workoutLogsTableId, recordId, token);
      const currentNote = fieldToText(record?.fields?.[notesFieldName]);
      const nextNote = /\[reviewed\]/i.test(currentNote)
        ? currentNote
        : `${currentNote}\n[Reviewed]`.trim();
      const result = await updateRecord(
        workoutLogsTableId,
        recordId,
        { [notesFieldName]: nextNote },
        token
      );

      results.push(result);
    }

    const failed = results.find((result) => result.code !== 0);

    if (failed) {
      return res.status(500).json({
        error: "Could not mark workout comment reviewed",
        details: failed,
      });
    }

    return res.status(200).json({ success: true, recordsUpdated: recordIds.length });
  } catch (error: any) {
    return res.status(500).json({
      error: "Could not review workout comment",
      message: error.message,
    });
  }
}
