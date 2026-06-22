import type { VercelRequest, VercelResponse } from "@vercel/node";
import { invalidateCache } from "./_cache.ts";

const COACHES_TABLE_ID =
  process.env.FEISHU_COACHES_TABLE_ID || "tblzFeZwc4Zby2cr";

function makeCoachId(name: string) {
  const prefix = name
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, "C");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `COACH-${prefix}-${random}`;
}

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
  const tokenResponse = await fetch(
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

  const tokenData = await readResponseJson(tokenResponse);

  if (!tokenData.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.tenant_access_token;
}

async function getFieldNames(token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${COACHES_TABLE_ID}/fields?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await readResponseJson(response);

  if (!response.ok || data.code !== 0) {
    throw new Error(`Could not load coaches table fields: ${JSON.stringify(data)}`);
  }

  return (data?.data?.items || [])
    .map((field: any) => field.field_name || field.name)
    .filter(Boolean);
}

function filterExistingFields(
  fields: Record<string, any>,
  availableFieldNames: string[]
) {
  const available = new Set(availableFieldNames);
  const existingFields: Record<string, any> = {};
  const omittedFields: string[] = [];

  Object.entries(fields).forEach(([fieldName, value]) => {
    if (available.has(fieldName)) {
      existingFields[fieldName] = value;
    } else {
      omittedFields.push(fieldName);
    }
  });

  return {
    existingFields,
    omittedFields,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { recordId, coachId, name, email, phoneWechat, role, status, bio } =
      req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Missing coach name" });
    }

    const token = await getTenantToken();
    const availableFields = await getFieldNames(token);
    const fields = {
      "Coach ID": coachId || makeCoachId(name),
      Name: name,
      Email: email || "",
      "Phone/WeChat": phoneWechat || "",
      Role: role || "Coach",
      Status: status || "Active",
      Bio: bio || "",
    };
    const { existingFields, omittedFields } = filterExistingFields(
      fields,
      availableFields
    );

    if (!existingFields.Name) {
      return res.status(400).json({
        error: "Coaches table is missing required columns",
        missingRequiredFields: ["Name"],
        availableFields,
        fieldsAttempted: fields,
      });
    }

    const tableUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${COACHES_TABLE_ID}/records`;
    const response = await fetch(recordId ? `${tableUrl}/${recordId}` : tableUrl, {
      method: recordId ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: existingFields }),
    });
    const data = await readResponseJson(response);

    if (!response.ok || data.code !== 0) {
      return res.status(500).json({
        error: recordId ? "Failed to update coach" : "Failed to create coach",
        larkResponse: data,
        fieldsSent: existingFields,
        omittedFields,
        availableFields,
      });
    }

    invalidateCache("coaches");
    return res.status(200).json({
      success: true,
      coachId: fields["Coach ID"],
      recordId: data?.data?.record?.record_id || recordId,
      omittedFields,
      larkResponse: data,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
