import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/subscriptions.ts";
import type { SubscriptionDTO } from "../dto.ts";
import { getCached, setCached } from "../../../api/_cache.ts";

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
