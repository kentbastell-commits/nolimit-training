// Notifications repository — dispatches to the Feishu or Postgres impl.
// Reads are not cached (matches the old api/notifications.ts handler, which
// always hit Feishu directly), so writes have no cache keys to invalidate.
import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/notifications.ts";
import type { WriteResult } from "../dto.ts";

export type NotificationDTO = {
  id: string;
  notificationId: string;
  clientId: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
};

export type CreateNotificationInput = {
  clientId: string;
  title: string;
  body?: string;
  type?: string;
};

export async function listNotifications(clientId?: string): Promise<NotificationDTO[]> {
  return DATA_BACKEND === "postgres"
    ? await (await import("../pg/notifications.ts")).listNotifications(clientId)
    : await feishu.listNotifications(clientId);
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<WriteResult> {
  return DATA_BACKEND === "postgres"
    ? await (await import("../pg/notifications.ts")).createNotification(input)
    : await feishu.createNotification(input);
}
