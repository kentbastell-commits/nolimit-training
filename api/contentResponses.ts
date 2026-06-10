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

function normalizeDate(value: string) {
  if (!value) return "";
  if (/^\d+$/.test(value)) {
    const date = new Date(Number(value));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return value.split("T")[0].split(" ")[0];
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

async function getRecords(tableId: string, token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records?page_size=500`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await readResponseJson(response);

  if (data.code !== 0) {
    throw new Error(`Could not fetch content responses: ${JSON.stringify(data)}`);
  }

  return data.data.items || [];
}

function mapResponse(item: any, responseType: "Questionnaire" | "Physical Test") {
  const fields = item.fields || {};
  const clientId = readField(fields, ["Client ID", "clientId"]);
  const clientName = readField(fields, [
    "Client Name",
    "clientName",
    "Athlete Name",
    "Athlete",
  ]);
  const assignmentId = readField(fields, [
    "Assigned Form ID",
    "Assigned Test ID",
    "Assignment ID",
    "Assigned ID",
  ]);
  const assignmentRecordId = readField(fields, ["Assignment Record ID", "Record ID"]);
  const templateId = readField(fields, [
    "Form ID",
    "Test Template ID",
    "Template ID",
    "Questionnaire ID",
    "Test ID",
  ]);
  const itemId = readField(fields, ["Question ID", "Test Item ID", "Item ID"]);
  const label = readField(fields, [
    "Question",
    "Question Text",
    "Label",
    "Test Name",
    "Item Name",
  ]);
  const answer = readField(fields, ["Answer", "Response", "Value", "Result"]);
  const unit = readField(fields, ["Unit"]);
  const submittedAt = normalizeDate(
    readField(fields, ["Submitted At", "Submitted Date", "Date", "Completed At"])
  );

  return {
    recordId: item.record_id,
    responseType,
    responseId: readField(fields, [
      "Form Response ID",
      "Test Result ID",
      "Response ID",
      "Result ID",
      "ID",
    ]),
    assignmentId,
    assignmentRecordId,
    templateId,
    itemId,
    label,
    answer,
    unit,
    clientId,
    clientName,
    submittedAt,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const formResponsesTableId =
    process.env.FEISHU_FORM_RESPONSES_TABLE_ID || process.env.FORM_RESPONSES;
  const testResultsTableId =
    process.env.FEISHU_TEST_RESULTS_TABLE_ID || process.env.TEST_RESULTS;

  if (!formResponsesTableId && !testResultsTableId) {
    return res.status(500).json({ error: "Missing response table IDs" });
  }

  try {
    const token = await getTenantToken();
    const { clientId = "", clientName = "" } = req.query;
    const requestedClientId = String(clientId).toLowerCase();
    const requestedClientName = String(clientName).toLowerCase();
    const records = await Promise.all([
      formResponsesTableId
        ? getRecords(formResponsesTableId, token).then((items) =>
            items.map((item: any) => mapResponse(item, "Questionnaire"))
          )
        : Promise.resolve([]),
      testResultsTableId
        ? getRecords(testResultsTableId, token).then((items) =>
            items.map((item: any) => mapResponse(item, "Physical Test"))
          )
        : Promise.resolve([]),
    ]);

    const responses = records
      .flat()
      .filter((item) => {
        if (!requestedClientId && !requestedClientName) return true;
        return (
          (requestedClientId && item.clientId.toLowerCase().includes(requestedClientId)) ||
          (requestedClientName && item.clientName.toLowerCase() === requestedClientName)
        );
      })
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

    return res.status(200).json({ responses });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
