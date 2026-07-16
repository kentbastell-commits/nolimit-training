import { listRecords } from "./client.ts";
import type { MetricDTO } from "../dto.ts";
import { ConfigError } from "../errors.ts";

// Case-insensitive field read (matches the old handler's readField).
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
        return "";
      })
      .join(", ");
  }
  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.link) return value.link;
  if (value?.url) return value.url;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");
  return "";
}

function readField(fields: Record<string, any>, candidates: string[]) {
  const normalizedFields = new Map(
    Object.keys(fields).map((f) => [f.trim().toLowerCase(), f])
  );
  for (const candidate of candidates) {
    const fieldName = normalizedFields.get(candidate.trim().toLowerCase()) || candidate;
    const value = fieldToText(fields[fieldName]);
    if (value) return value;
  }
  return "";
}

export async function listAllMetrics(): Promise<MetricDTO[]> {
  // Read env at call time (module-load capture breaks late-loaded .env + tests).
  const tableId =
    process.env.FEISHU_ATHLETE_METRICS_TABLE_ID || process.env.ATHLETE_METRICS;
  if (!tableId) {
    throw new ConfigError(
      "Missing required env var FEISHU_ATHLETE_METRICS_TABLE_ID"
    );
  }
  const records = await listRecords(tableId);
  return records.map((item: any) => {
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
  });
}
