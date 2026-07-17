import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/subscriptions.ts";
import type { SubscriptionDTO, WriteResult } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

export type UpsertSubscriptionInput = {
  recordId?: string; // Feishu record_id; the SUB-… business code on Postgres
  // Feishu backend: client record_id (DuplexLink). Postgres backend: CL-… code.
  clientRecordId?: string;
  plan?: string;
  price?: number | string;
  currency?: string;
  billingCycle?: string;
  startDate?: unknown;
  nextBillingDate?: unknown;
  status?: string;
  coach?: string;
  autoRenew?: unknown;
  paymentId?: string;
  notes?: string;
};

export async function listSubscriptions(): Promise<SubscriptionDTO[]> {
  const cached = getCached<SubscriptionDTO[]>("subscriptions");
  if (cached) return cached;

  const subscriptions =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/subscriptions.ts")).listSubscriptions()
      : await feishu.listSubscriptions();

  setCached("subscriptions", subscriptions, 10 * 60 * 1000);
  return subscriptions;
}

export async function upsertSubscription(
  input: UpsertSubscriptionInput
): Promise<WriteResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/subscriptions.ts")).upsertSubscription(input)
      : await feishu.upsertSubscription(input);
  if (result.success) invalidateCache("subscriptions");
  return result;
}
