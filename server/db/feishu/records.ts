// Feishu impl of the generic record delete. Logic moved verbatim from
// api/deleteRecord.ts; the token/pagination/batch-delete plumbing now comes
// from the shared client helpers (drop-in equivalents).
import {
  getTenantToken,
  appToken,
  listRecords,
  batchDeleteRecords,
} from "./client.ts";
import type {
  DeleteRecordInput,
  DeleteRecordResult,
  DeleteResource,
} from "../repositories/records.ts";

const TABLES: Record<DeleteResource, string> = {
  client: "FEISHU_CLIENTS_TABLE_ID",
  exercise: "FEISHU_EXERCISE_LIBRARY_TABLE_ID",
  workout: "FEISHU_ASSIGNED_WORKOUTS_TABLE_ID",
  assignedForm: "FEISHU_ASSIGNED_FORMS_TABLE_ID",
  assignedTest: "FEISHU_ASSIGNED_TESTS_TABLE_ID",
  productOrder: "FEISHU_PRODUCT_ORDERS_TABLE_ID",
  program: "FEISHU_PROGRAMS_TABLE_ID",
  workoutTemplate: "FEISHU_WORKOUT_TEMPLATES_TABLE_ID",
  team: "FEISHU_TEAMS_TABLE_ID",
  subscription: "FEISHU_SUBSCRIPTIONS_TABLE_ID",
  // Per-row delete paths for a client's training / wellness data (also used by
  // the client-delete cascade below).
  workoutLog: "FEISHU_WORKOUT_LOGS_TABLE_ID",
  exerciseResult: "FEISHU_EXERCISE_RESULTS_TABLE_ID",
  checkIn: "FEISHU_CHECKINS_TABLE_ID",
  workloadLog: "FEISHU_WORKLOAD_LOGS_TABLE_ID",
  formResponse: "FEISHU_FORM_RESPONSES_TABLE_ID",
  testResult: "FEISHU_TEST_RESULTS_TABLE_ID",
  athleteMetric: "FEISHU_ATHLETE_METRICS_TABLE_ID",
};

const FALLBACK_TABLE_IDS: Partial<Record<DeleteResource, string>> = {
  productOrder: "tbllinXYFDiUboKX",
};

// When a client is deleted, also remove the rows they own in these tables so
// the database doesn't accumulate orphaned training/wellness records. Financial
// records (product orders, subscriptions) are intentionally left untouched.
const CLIENT_CASCADE_ENV: string[] = [
  "FEISHU_ASSIGNED_WORKOUTS_TABLE_ID",
  "FEISHU_WORKOUT_LOGS_TABLE_ID",
  "FEISHU_EXERCISE_RESULTS_TABLE_ID",
  "FEISHU_CHECKINS_TABLE_ID",
  "FEISHU_ASSIGNED_FORMS_TABLE_ID",
  "FEISHU_ASSIGNED_TESTS_TABLE_ID",
  "FEISHU_FORM_RESPONSES_TABLE_ID",
  "FEISHU_TEST_RESULTS_TABLE_ID",
  "FEISHU_WORKLOAD_LOGS_TABLE_ID",
  "FEISHU_ATHLETE_METRICS_TABLE_ID",
];

const CLIENT_ID_FIELD_CANDIDATES = [
  "Client ID",
  "Client",
  "Client Code",
];

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

// Pull the linked record ids out of a Bitable link field value.
function extractRecordIds(value: any): string[] {
  if (!value) return [];
  const out: string[] = [];
  const pushFrom = (o: any) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o.record_ids)) out.push(...o.record_ids);
    if (Array.isArray(o.link_record_ids)) out.push(...o.link_record_ids);
    if (typeof o.record_id === "string") out.push(o.record_id);
  };
  if (Array.isArray(value)) value.forEach(pushFrom);
  else pushFrom(value);
  return out;
}

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" ? item : item?.text || item?.name || ""
      )
      .join(", ");
  }
  return value?.text || value?.name || "";
}

// Does this row belong to the client we're deleting? Match the duplex link by
// record id (most reliable) or the plain-text client code.
function rowBelongsToClient(
  fields: Record<string, any>,
  clientRecordId: string,
  clientCode: string
): boolean {
  for (const fieldName of CLIENT_ID_FIELD_CANDIDATES) {
    const value = fields[fieldName];
    if (value === undefined) continue;
    if (clientRecordId && extractRecordIds(value).includes(clientRecordId)) {
      return true;
    }
    if (clientCode) {
      const tokens = fieldToText(value)
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (tokens.includes(clientCode)) return true;
    }
  }
  return false;
}

// Delete every row a client owns across their training/wellness tables.
async function cascadeDeleteClientData(
  clientRecordId: string,
  clientCode: string
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  for (const envName of CLIENT_CASCADE_ENV) {
    const tableId = process.env[envName];
    if (!tableId) continue;

    try {
      const items = await listRecords(tableId);
      const recordIds = items
        .filter((item: any) =>
          rowBelongsToClient(item.fields || {}, clientRecordId, clientCode)
        )
        .map((item: any) => item.record_id)
        .filter(Boolean);

      if (recordIds.length > 0) {
        counts[envName] = (await batchDeleteRecords(tableId, recordIds)).deleted;
      }
    } catch {
      // A single table failing shouldn't abort the whole cascade.
    }
  }

  return counts;
}

export async function deleteRecordFromTable(
  input: DeleteRecordInput
): Promise<DeleteRecordResult> {
  const { resource, recordId, clientCode } = input;

  const tableEnvName = TABLES[resource];
  const tableId = process.env[tableEnvName] || FALLBACK_TABLE_IDS[resource];

  if (!tableId) {
    return { success: false, error: `Missing ${tableEnvName}` };
  }

  const token = await getTenantToken();

  // For a client delete, capture their code first (to match child rows) so the
  // cascade still works even when the caller didn't pass it.
  let resolvedClientCode = String(clientCode || "");
  if (resource === "client" && !resolvedClientCode) {
    try {
      const getRes = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/records/${recordId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const getData = await readResponseJson(getRes);
      resolvedClientCode = fieldToText(
        getData?.data?.record?.fields?.["Client ID"]
      );
    } catch {
      // Fall back to record-id-only matching in the cascade.
    }
  }

  // Deleting a client cascades to their training/wellness rows so the database
  // doesn't keep orphaned logs/results/check-ins. This MUST run before the
  // client record is deleted — otherwise Feishu clears the rows' "Client ID"
  // link and they can no longer be matched back to the client.
  let cascade: Record<string, number> | undefined;
  if (resource === "client") {
    cascade = await cascadeDeleteClientData(recordId, resolvedClientCode);
  }

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/records/${recordId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await readResponseJson(response);

  if (!response.ok || data.code !== 0) {
    return {
      success: false,
      error: "Failed to delete record",
      larkResponse: data,
      cascade,
    };
  }

  return { success: true, larkResponse: data, cascade };
}
