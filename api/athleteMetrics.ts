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
        if (item?.link) return item.link;
        if (item?.url) return item.url;
        if (item?.record_ids) return item.record_ids.join(", ");
        if (item?.link_record_ids) return item.link_record_ids.join(", ");
        return JSON.stringify(item);
      })
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.link) return value.link;
  if (value?.url) return value.url;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");

  return JSON.stringify(value);
}

function readField(fields: Record<string, any>, candidates: string[]) {
  const normalizedFields = new Map(
    Object.keys(fields).map((fieldName) => [
      fieldName.trim().toLowerCase(),
      fieldName,
    ])
  );

  for (const candidate of candidates) {
    const fieldName =
      normalizedFields.get(candidate.trim().toLowerCase()) || candidate;
    const value = fieldToText(fields[fieldName]);

    if (value) return value;
  }

  return "";
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

  if (!response.ok || !data.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(data)}`);
  }

  return data.tenant_access_token;
}

async function getRecords(tableId: string, token: string) {
  const records: any[] = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({ page_size: "500" });
    if (pageToken) params.set("page_token", pageToken);

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await readResponseJson(response);

    if (!response.ok || data.code !== 0 || !data?.data?.items) {
      throw new Error(`Could not load athlete metrics: ${JSON.stringify(data)}`);
    }

    records.push(...data.data.items);
    pageToken = data.data.page_token || "";

    if (!data.data.has_more) break;
  } while (pageToken);

  return records;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const tableId =
    process.env.FEISHU_ATHLETE_METRICS_TABLE_ID || process.env.ATHLETE_METRICS;

  if (!tableId) {
    return res.status(500).json({
      error: "Missing required env var FEISHU_ATHLETE_METRICS_TABLE_ID",
    });
  }

  try {
    const clientId = String(req.query.clientId || "").trim();
    const clientRecordId = String(req.query.clientRecordId || "").trim();
    const clientCode = String(req.query.clientCode || "").trim();
    const clientName = String(req.query.clientName || "").trim();
    const metricType = String(req.query.metricType || "").trim().toLowerCase();
    const normalize = (value: string) =>
      String(value || "")
        .trim()
        .toLowerCase();
    const clientTokens = [clientId, clientRecordId, clientCode]
      .map(normalize)
      .filter(Boolean);
    const token = await getTenantToken();
    const records = await getRecords(tableId, token);

    const metrics = records
      .map((item: any) => {
        const fields = item.fields || {};

        return {
          recordId: item.record_id,
          metricId: readField(fields, ["Metric ID"]),
          clientId: readField(fields, ["Client ID"]),
          clientName: readField(fields, ["Client Name"]),
          metricType: readField(fields, ["Metric Type"]),
          metricName: readField(fields, ["Metric Name"]),
          metricValue: readField(fields, ["Metric Value", "Value"]),
          metricUnit: readField(fields, ["Metric Unit", "Unit"]),
          sourceType: readField(fields, ["Source Type"]),
          sourceRecordId: readField(fields, ["Source Record ID"]),
          sourceTestId: readField(fields, ["Source Test ID"]),
          sourceTestName: readField(fields, ["Source Test Name"]),
          calculationMethod: readField(fields, ["Calculation Method"]),
          measuredAt: readField(fields, ["Measured At", "Date", "Valid From"]),
          status: readField(fields, ["Status"]),
          notes: readField(fields, ["Notes"]),
        };
      })
      .filter((metric) => {
        if (clientTokens.length || clientName) {
          const metricClientId = normalize(metric.clientId);
          const metricClientName = normalize(metric.clientName);
          const idMatches = clientTokens.includes(metricClientId);
          const nameMatches =
            Boolean(clientName) && metricClientName === normalize(clientName);

          if (!idMatches && !nameMatches) return false;
        }

        const searchableMetric = `${metric.metricType} ${metric.metricName} ${metric.sourceTestName}`
          .trim()
          .toLowerCase();

        if (
          metricType &&
          !searchableMetric.includes(metricType)
        ) {
          return false;
        }

        return true;
      });

    return res.status(200).json({ metrics });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
