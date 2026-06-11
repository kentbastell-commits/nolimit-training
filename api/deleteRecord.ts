import type { VercelRequest, VercelResponse } from "@vercel/node";

const TABLES = {
  client: "FEISHU_CLIENTS_TABLE_ID",
  exercise: "FEISHU_EXERCISE_LIBRARY_TABLE_ID",
  workout: "FEISHU_ASSIGNED_WORKOUTS_TABLE_ID",
  assignedForm: "FEISHU_ASSIGNED_FORMS_TABLE_ID",
  assignedTest: "FEISHU_ASSIGNED_TESTS_TABLE_ID",
  productOrder: "FEISHU_PRODUCT_ORDERS_TABLE_ID",
} as const;

type DeleteResource = keyof typeof TABLES;

async function readResponseJson(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      code: -1,
      error: "Non-JSON response",
      status: response.status,
      body: text,
    };
  }
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
  const data = await readResponseJson(response);

  if (!data.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(data)}`);
  }

  return data.tenant_access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { resource, recordId } = req.body || {};

    if (!resource || !recordId) {
      return res.status(400).json({ error: "Missing resource or recordId" });
    }

    if (!(resource in TABLES)) {
      return res.status(400).json({ error: "Unsupported delete resource" });
    }

    const tableEnvName = TABLES[resource as DeleteResource];
    const tableId = process.env[tableEnvName];

    if (!tableId) {
      return res.status(500).json({ error: `Missing ${tableEnvName}` });
    }

    const token = await getTenantToken();
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records/${recordId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await readResponseJson(response);

    if (!response.ok || data.code !== 0) {
      return res.status(500).json({
        error: "Failed to delete record",
        larkResponse: data,
      });
    }

    return res.status(200).json({
      success: true,
      resource,
      recordId,
      larkResponse: data,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
