// Feishu impl for the notifications domain — logic moved verbatim from the old
// api/notifications.ts handler. This table stores "Client ID" as plain text
// (the business code), NOT a duplex link, so the create writes a string.
import { fetchAllBitableRecords } from "../../../api/_pagination.ts";
import { getTenantToken, appToken, createRecord, fieldText } from "./client.ts";
import type { WriteResult } from "../dto.ts";
import type {
  NotificationDTO,
  CreateNotificationInput,
} from "../repositories/notifications.ts";

function tableId(): string {
  return process.env.FEISHU_NOTIFICATIONS_TABLE_ID as string;
}

export async function listNotifications(clientId?: string): Promise<NotificationDTO[]> {
  const token = await getTenantToken();

  const notifItems = await fetchAllBitableRecords(
    appToken(),
    tableId(),
    token,
    clientId ? { filter: `CurrentValue.[Client ID]="${clientId}"` } : {}
  );

  return notifItems
    .map((item: any): NotificationDTO => {
      const f = item.fields || {};
      return {
        id: item.record_id,
        notificationId: fieldText(f["Notifications ID"]),
        clientId: fieldText(f["Client ID"]),
        title: fieldText(f["Title"]),
        body: fieldText(f["Body"]),
        type: fieldText(f["Type"]),
        read: Boolean(f["Read"]),
        createdAt: f["Created At"]
          ? new Date(Number(fieldText(f["Created At"]))).toISOString()
          : new Date().toISOString(),
      };
    })
    .filter((notification) => {
      return Boolean(
        notification.notificationId ||
          notification.clientId ||
          notification.title ||
          notification.body ||
          notification.type
      );
    });
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<WriteResult> {
  const fields: Record<string, any> = {
    "Notifications ID": `NOTIF-${Date.now()}`,
    "Client ID": input.clientId,
    Title: input.title,
    Body: input.body || "",
    Type: input.type || "general",
    Read: false,
    "Created At": Date.now(),
  };

  const data = await createRecord(tableId(), fields);

  if (data.code !== 0) {
    return {
      success: false,
      error: "Failed to create notification",
      larkResponse: data,
    };
  }

  return { success: true, recordId: data?.data?.record?.record_id };
}
