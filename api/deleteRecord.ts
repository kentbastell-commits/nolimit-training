import type { VercelRequest, VercelResponse } from "@vercel/node";
import { invalidateCache } from "./_cache.ts";
import { fetchAllBitableRecords } from "./_pagination.ts";

const TABLES = {
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
} as const;

type DeleteResource = keyof typeof TABLES;

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

// Feishu batch_delete caps each request; chunk to stay under the limit.
async function batchDeleteRecords(
  tableId: string,
  token: string,
  recordIds: string[]
): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < recordIds.length; i += 100) {
    const chunk = recordIds.slice(i, i + 100);
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records/batch_delete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records: chunk }),
      }
    );
    const data = await readResponseJson(response);
    if (response.ok && data.code === 0) deleted += chunk.length;
  }
  return deleted;
}

// Delete every row a client owns across their training/wellness tables.
async function cascadeDeleteClientData(
  token: string,
  clientRecordId: string,
  clientCode: string
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  for (const envName of CLIENT_CASCADE_ENV) {
    const tableId = process.env[envName];
    if (!tableId) continue;

    try {
      const items = await fetchAllBitableRecords(
        process.env.FEISHU_BASE_APP_TOKEN as string,
        tableId,
        token
      );
      const recordIds = items
        .filter((item: any) =>
          rowBelongsToClient(item.fields || {}, clientRecordId, clientCode)
        )
        .map((item: any) => item.record_id)
        .filter(Boolean);

      if (recordIds.length > 0) {
        counts[envName] = await batchDeleteRecords(tableId, token, recordIds);
      }
    } catch {
      // A single table failing shouldn't abort the whole cascade.
    }
  }

  return counts;
}

const CACHE_KEYS_BY_RESOURCE: Partial<Record<DeleteResource, string[]>> = {
  exercise: ["exercises", "exerciseLibraryRaw"],
  program: ["programs"],
  workoutTemplate: ["programs", "workoutTemplatesRaw"],
  client: ["clients"],
  team: ["teams"],
  productOrder: ["productOrders"],
  subscription: ["subscriptions"],
  workout: ["workouts"],
  assignedForm: ["contentAssignments"],
  assignedTest: ["contentAssignments"],
  workoutLog: ["workoutLogs", "workoutComments"],
  exerciseResult: ["exerciseResults"],
  checkIn: ["checkIns"],
  workloadLog: ["workloadLogs"],
  formResponse: ["contentResponses"],
  testResult: ["contentResponses"],
  athleteMetric: ["athleteMetrics"],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { resource, recordId, clientCode } = req.body || {};

    if (!resource || !recordId) {
      return res.status(400).json({ error: "Missing resource or recordId" });
    }

    if (!(resource in TABLES)) {
      return res.status(400).json({ error: "Unsupported delete resource" });
    }

    const tableEnvName = TABLES[resource as DeleteResource];
    const tableId =
      process.env[tableEnvName] ||
      FALLBACK_TABLE_IDS[resource as DeleteResource];

    if (!tableId) {
      return res.status(500).json({ error: `Missing ${tableEnvName}` });
    }

    const token = await getTenantToken();

    // For a client delete, capture their code first (to match child rows) so the
    // cascade still works even when the caller didn't pass it.
    let resolvedClientCode = String(clientCode || "");
    if (resource === "client" && !resolvedClientCode) {
      try {
        const getRes = await fetch(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records/${recordId}`,
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

    // Deleting a client cascades to their training/wellness rows so the
    // database doesn't keep orphaned logs/results/check-ins.
    let cascade: Record<string, number> | undefined;
    if (resource === "client") {
      cascade = await cascadeDeleteClientData(
        token,
        recordId,
        resolvedClientCode
      );
      [
        "workouts",
        "workoutLogs",
        "workoutComments",
        "exerciseResults",
        "checkIns",
        "contentAssignments",
        "contentResponses",
        "athleteMetrics",
        "workloadLogs",
        "analytics",
      ].forEach((key) => invalidateCache(key));
    }

    // Keep cached lists fresh after a delete.
    const cacheKeys = CACHE_KEYS_BY_RESOURCE[resource as DeleteResource] || [];
    cacheKeys.forEach((key) => invalidateCache(key));

    return res.status(200).json({
      success: true,
      resource,
      recordId,
      cascade,
      larkResponse: data,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
