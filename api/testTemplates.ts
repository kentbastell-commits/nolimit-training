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
  if (value?.record_ids) return value.record_ids.join(", ");

  return JSON.stringify(value);
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
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
    throw new Error(`Could not fetch records: ${JSON.stringify(data)}`);
  }

  return data.data.items || [];
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
  const testTemplatesTableId =
    process.env.FEISHU_TEST_TEMPLATES_TABLE_ID || process.env.TEST_TEMPLATES;
  const testItemsTableId =
    process.env.FEISHU_TEST_ITEMS_TABLE_ID || process.env.TEST_ITEMS;

  if (!testTemplatesTableId) {
    return res.status(500).json({ error: "Missing FEISHU_TEST_TEMPLATES_TABLE_ID" });
  }

  if (!testItemsTableId) {
    return res.status(500).json({ error: "Missing FEISHU_TEST_ITEMS_TABLE_ID" });
  }

  try {
    const token = await getTenantToken();

    if (req.method === "GET") {
      const [templateRecords, itemRecords] = await Promise.all([
        getRecords(testTemplatesTableId, token),
        getRecords(testItemsTableId, token),
      ]);

      const items = itemRecords.map((item: any) => {
        const fields = item.fields || {};

        return {
          recordId: item.record_id,
          testItemId: readField(fields, ["testItemId", "Test Item ID"]),
          testTemplateId: readField(fields, [
            "testTemplateId",
            "Test Template ID",
            "Template ID",
          ]),
          order: readField(fields, ["order", "Order"]),
          testName: readField(fields, ["testName", "Test Name", "Name", "Test"]),
          metricType: readField(fields, ["metricType", "Metric Type", "Metric"]),
          unit: readField(fields, ["unit", "Unit"]),
          instructions: readField(fields, ["instructions", "Instructions"]),
        };
      });

      const tests = templateRecords.map((item: any) => {
        const fields = item.fields || {};
        const testTemplateId =
          readField(fields, ["testTemplateId", "Test Template ID", "Template ID"]) ||
          item.record_id;

        return {
          recordId: item.record_id,
          testTemplateId,
          name: readField(fields, [
            "name",
            "Name",
            "Test Template Name",
            "Template Name",
            "Title",
          ]),
          description: readField(fields, ["description", "Description"]),
          status: readField(fields, ["status", "Status"]),
          createdAt: readField(fields, ["createdAt", "Created At"]),
          items: items
            .filter(
              (testItem: any) =>
                testItem.testTemplateId && testItem.testTemplateId === testTemplateId
            )
            .sort((a: any, b: any) => Number(a.order) - Number(b.order)),
        };
      });

      return res.status(200).json({ tests });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { name, description, status, items } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing test template name" });
    }

    const testTemplateId = `TEST-${Date.now()}`;
    const templateFields = {
      testTemplateId,
      name: String(name),
      description: String(description || ""),
      status: String(status || "Active"),
      createdAt: toLarkDate(),
    };

    const templateData = await createRecord(
      testTemplatesTableId,
      token,
      templateFields
    );

    if (templateData.code !== 0) {
      return res.status(500).json({
        error: "Could not create test template",
        larkResponse: templateData,
        fieldsSent: templateFields,
      });
    }

    const testItems = Array.isArray(items) ? items : [];
    const createdItems = [];

    for (const [index, item] of testItems.entries()) {
      const itemFields = {
        testItemId: `TI-${Date.now()}-${index + 1}`,
        testTemplateId,
        order: index + 1,
        testName: String(item.testName || ""),
        metricType: String(item.metricType || "Weight"),
        unit: String(item.unit || "kg"),
        instructions: String(item.instructions || ""),
      };

      const itemData = await createRecord(
        testItemsTableId,
        token,
        itemFields
      );

      if (itemData.code !== 0) {
        return res.status(500).json({
          error: "Could not create test item",
          larkResponse: itemData,
          fieldsSent: itemFields,
        });
      }

      createdItems.push(itemData.data.record.record_id);
    }

    return res.status(200).json({
      success: true,
      testTemplateId,
      testRecordId: templateData.data.record.record_id,
      itemRecordsCreated: createdItems.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
