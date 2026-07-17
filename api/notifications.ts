import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DATA_BACKEND } from "../server/db/backend.ts";
import {
  listNotifications,
  createNotification,
} from "../server/db/repositories/notifications.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Feishu needs its table id; on Postgres the env var is irrelevant.
  if (DATA_BACKEND === "feishu" && !process.env.FEISHU_NOTIFICATIONS_TABLE_ID) {
    return res.status(500).json({ error: "FEISHU_NOTIFICATIONS_TABLE_ID not set" });
  }

  try {
    if (req.method === "GET") {
      const clientId = req.query.clientId ? String(req.query.clientId) : undefined;
      const notifications = await listNotifications(clientId);
      return res.status(200).json({ notifications });
    }

    if (req.method === "POST") {
      const { clientId, title, body, type } = req.body || {};
      if (!clientId || !title) {
        return res.status(400).json({ error: "clientId and title are required" });
      }
      const result = await createNotification({ clientId, title, body, type });
      return res.status(result.success ? 200 : 500).json(result);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    if (err.kind === "token") {
      return res.status(500).json({ error: "Could not get Feishu token" });
    }
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
