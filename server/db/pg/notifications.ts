import { eq } from "drizzle-orm";
import { db } from "../client.ts";
import { notifications } from "../schema.ts";
import { str } from "./_util.ts";
import type { WriteResult } from "../dto.ts";
import type {
  NotificationDTO,
  CreateNotificationInput,
} from "../repositories/notifications.ts";

type Row = typeof notifications.$inferSelect;

export async function listNotifications(clientId?: string): Promise<NotificationDTO[]> {
  const rows: Row[] = clientId
    ? await db.select().from(notifications).where(eq(notifications.clientId, clientId))
    : await db.select().from(notifications);

  return rows
    .map((r: Row): NotificationDTO => ({
      id: r.notificationId, // business code is the identity on Postgres
      notificationId: str(r.notificationId),
      clientId: str(r.clientId),
      title: str(r.title),
      body: str(r.body),
      type: str(r.type),
      read: Boolean(r.read),
      createdAt:
        r.createdAt != null
          ? new Date(Number(r.createdAt)).toISOString()
          : new Date().toISOString(),
    }))
    .filter((n) =>
      Boolean(n.notificationId || n.clientId || n.title || n.body || n.type)
    );
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<WriteResult> {
  const notificationId = `NOTIF-${Date.now()}`;
  await db.insert(notifications).values({
    notificationId,
    clientId: String(input.clientId),
    title: String(input.title),
    body: input.body ? String(input.body) : "",
    type: input.type ? String(input.type) : "general",
    read: false,
    createdAt: Date.now(),
  });
  return { success: true, recordId: notificationId };
}
