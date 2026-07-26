// Notifications repository — dispatches to the Feishu or Postgres impl.
// Reads are not cached (matches the old api/notifications.ts handler, which
// always hit Feishu directly), so writes have no cache keys to invalidate.
import * as pg from "../pg/notifications.ts";
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
  return await pg.listNotifications(clientId);
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<WriteResult> {
  return await pg.createNotification(input);
}
