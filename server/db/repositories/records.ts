// Generic record delete (the coach console's "delete this row" endpoint).
// Maps a caller-named resource to its table, deletes the record, and — for
// clients — cascades to the training/wellness rows they own. Financial records
// (product orders, subscriptions) are intentionally left untouched by the
// cascade on both backends.
import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/records.ts";
import { invalidateCache } from "../../../api/_cache.ts";

// Resources the generic delete endpoint may touch. Anything else is refused
// with "Unsupported delete resource" (same on both backends).
export const DELETE_RESOURCES = [
  "client",
  "exercise",
  "workout",
  "assignedForm",
  "assignedTest",
  "productOrder",
  "program",
  "workoutTemplate",
  "team",
  "subscription",
  // Per-row delete paths for a client's training / wellness data (also used by
  // the client-delete cascade).
  "workoutLog",
  "exerciseResult",
  "checkIn",
  "workloadLog",
  "formResponse",
  "testResult",
  "athleteMetric",
] as const;

export type DeleteResource = (typeof DELETE_RESOURCES)[number];

export function isDeleteResource(value: unknown): value is DeleteResource {
  return (DELETE_RESOURCES as readonly unknown[]).includes(value);
}

export type DeleteRecordInput = {
  resource: DeleteResource;
  // Feishu record_id; on Postgres the business code IS the id.
  recordId: string;
  // Optional CL- code so a client delete can match child rows by code too.
  clientCode?: string;
};

export type DeleteRecordResult = {
  success: boolean;
  error?: string;
  // Per-table deleted-row counts from the client cascade (client deletes only,
  // keyed by the FEISHU_*_TABLE_ID env names on both backends so the response
  // shape is identical). Present — possibly {} — whenever the cascade ran,
  // even if the parent delete then failed: those child rows are already gone.
  cascade?: Record<string, number>;
  larkResponse?: any;
};

// Keep cached lists fresh after a delete (moved verbatim from the handler).
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

// Everything the client-delete cascade can touch (moved verbatim from the
// handler, which invalidated these right after the cascade ran).
const CLIENT_CASCADE_CACHE_KEYS = [
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
];

export async function deleteRecordFromTable(
  input: DeleteRecordInput
): Promise<DeleteRecordResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/records.ts")).deleteRecordFromTable(input)
      : await feishu.deleteRecordFromTable(input);

  // The cascade deletes child rows BEFORE the parent record, so those caches
  // must be dropped whenever the cascade ran — even when the parent delete
  // itself failed (matches the old handler's ordering).
  if (input.resource === "client" && result.cascade !== undefined) {
    CLIENT_CASCADE_CACHE_KEYS.forEach((key) => invalidateCache(key));
  }

  if (result.success) {
    const cacheKeys = CACHE_KEYS_BY_RESOURCE[input.resource] || [];
    cacheKeys.forEach((key) => invalidateCache(key));
  }

  return result;
}
