import type { VercelRequest, VercelResponse } from "@vercel/node";

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.name) return item.name;
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .join(", ");
  }
  if (value?.text) return value.text;
  if (value?.name) return value.name;
  return JSON.stringify(value);
}

async function getToken() {
  const res = await fetch(
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
  const data = await res.json();
  return data.tenant_access_token as string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const tableId = process.env.FEISHU_NOTIFICATIONS_TABLE_ID;
  const appToken = process.env.FEISHU_BASE_APP_TOKEN;

  if (!tableId) {
    return res.status(500).json({ error: "FEISHU_NOTIFICATIONS_TABLE_ID not set" });
  }

  try {
    const token = await getToken();
    if (!token) return res.status(500).json({ error: "Could not get Feishu token" });

    // GET — fetch notifications (optionally filtered by clientId)
    if (req.method === "GET") {
      const { clientId } = req.query;

      let url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=100`;
      if (clientId) {
        url += `&filter=CurrentValue.[Client ID]="${clientId}"`;
      }

      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();

      const notifications = (data?.data?.items || []).map((item: any) => {
        const f = item.fields || {};
        return {
          id: item.record_id,
          notificationId: fieldToText(f["Notifications ID"]),
          clientId: fieldToText(f["Client ID"]),
          title: fieldToText(f["Title"]),
          body: fieldToText(f["Body"]),
          type: fieldToText(f["Type"]),
          read: Boolean(f["Read"]),
          createdAt: f["Created At"]
            ? new Date(Number(fieldToText(f["Created At"]))).toISOString()
            : new Date().toISOString(),
        };
      });

      return res.status(200).json({ notifications });
    }

    // POST — create a notification
    if (req.method === "POST") {
      const { clientId, title, body, type } = req.body;

      if (!clientId || !title) {
        return res.status(400).json({ error: "clientId and title are required" });
      }

      const fields: Record<string, any> = {
        "Notifications ID": `NOTIF-${Date.now()}`,
        "Client ID": clientId,
        Title: title,
        Body: body || "",
        Type: type || "general",
        Read: false,
        "Created At": Date.now(),
      };

      const r = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fields }),
        }
      );
      const data = await r.json();

      if (data.code !== 0) {
        return res.status(500).json({ error: "Failed to create notification", larkResponse: data });
      }

      return res.status(200).json({ success: true, recordId: data?.data?.record?.record_id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
