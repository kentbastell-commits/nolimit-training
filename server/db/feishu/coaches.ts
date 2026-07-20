import { appToken, fieldText, formatDate, getTenantToken, listRecords } from "./client.ts";
import type { CoachDTO, WriteResult } from "../dto.ts";
import type { UpsertCoachInput } from "../repositories/coaches.ts";

export async function listCoaches(): Promise<CoachDTO[]> {
  // Read env at call time (module-load capture breaks late-loaded .env + tests).
  const tableId = process.env.FEISHU_COACHES_TABLE_ID || "tblzFeZwc4Zby2cr";
  const items = await listRecords(tableId);
  return items
    .map((item: any) => {
      const fields = item.fields || {};
      const name = fieldText(fields["Name"]);
      const coachId = fieldText(fields["Coach ID"]);
      const email = fieldText(fields["Email"]);
      const phoneWechat =
        fieldText(fields["Phone/WeChat"]) ||
        fieldText(fields["Phone/Wechat"]) ||
        fieldText(fields["Phone"]) ||
        fieldText(fields["Wechat"]);
      const bio = fieldText(fields["Bio"]);
      const qrCodeUrl = fieldText(fields["QR Code URL"]);
      return {
        recordId: item.record_id,
        coachId: coachId || item.record_id,
        name: name || "Unnamed Coach",
        email,
        phoneWechat,
        role: fieldText(fields["Role"]) || "Coach",
        status: fieldText(fields["Status"]) || "Active",
        bio,
        qrCodeUrl,
        createdAt: formatDate(fields["Created At"]),
        hasRealData: Boolean(name || coachId || email || phoneWechat || bio),
      };
    })
    .filter((c: any) => c.hasRealData)
    .map(({ hasRealData, ...c }: any) => c as CoachDTO);
}

/* ------------------------------- writes ---------------------------------- */

function makeCoachId(name: string) {
  const prefix = name
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, "C");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `COACH-${prefix}-${random}`;
}

// Tolerates non-JSON Feishu responses (proxy errors etc.) instead of throwing
// mid-parse — moved verbatim from the old api/upsertCoach.ts handler.
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

// Unlike the shared getFieldNames (which soft-fails to []), the coach upsert
// has always THROWN when the fields listing fails, so a Feishu outage surfaces
// as a 500 "Server error" rather than a bogus "missing columns" 400.
async function getCoachFieldNames(tableId: string, token: string): Promise<string[]> {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/fields?page_size=100`,
    { headers: { Authorization: `Bearer ${token}` } }
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

  return { existingFields, omittedFields };
}

export async function upsertCoach(input: UpsertCoachInput): Promise<WriteResult> {
  const tableId = process.env.FEISHU_COACHES_TABLE_ID || "tblzFeZwc4Zby2cr";
  const { recordId, coachId, name, email, phoneWechat, role, status, bio, qrCodeUrl } =
    input;

  const token = await getTenantToken();
  const availableFields = await getCoachFieldNames(tableId, token);
  const fields = {
    "Coach ID": coachId || makeCoachId(name),
    Name: name,
    Email: email || "",
    "Phone/WeChat": phoneWechat || "",
    Role: role || "Coach",
    Status: status || "Active",
    Bio: bio || "",
    "QR Code URL": qrCodeUrl || "",
  };
  const { existingFields, omittedFields } = filterExistingFields(fields, availableFields);

  if (!existingFields.Name) {
    return {
      success: false,
      error: "Coaches table is missing required columns",
      missingRequiredFields: ["Name"],
      availableFields,
      fieldsAttempted: fields,
    };
  }

  const tableUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/records`;
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
    return {
      success: false,
      error: recordId ? "Failed to update coach" : "Failed to create coach",
      larkResponse: data,
      fieldsSent: existingFields,
      omittedFields,
      availableFields,
    };
  }

  return {
    success: true,
    coachId: fields["Coach ID"],
    recordId: data?.data?.record?.record_id || recordId,
    omittedFields,
    larkResponse: data,
  };
}
