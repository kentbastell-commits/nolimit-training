import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/subscriptions.ts";
import type { SubscriptionDTO } from "../dto.ts";

export async function listSubscriptions(): Promise<SubscriptionDTO[]> {
  if (DATA_BACKEND === "postgres") {
    const pg = await import("../pg/subscriptions.ts");
    return pg.listSubscriptions();
  }
  return feishu.listSubscriptions();
}
