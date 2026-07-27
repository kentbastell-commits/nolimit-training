import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  listClientMessages,
  createClientMessage,
  replyToClientMessage,
} from "../server/db/repositories/clientMessages.ts";
import { ConfigError } from "../server/db/errors.ts";
import { notifyCoach } from "./_notify.ts";

// The athlete's "写给教练" loop — mail, not chat. POST without a messageId
// creates a new message from the athlete; POST with one records the coach's
// reply. GET lists (athlete: own history; coach: the queue).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const messages = await listClientMessages({
        clientId: String(req.query.clientId || ""),
        status: String(req.query.status || ""),
      });
      return res.status(200).json({ messages });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body || {};

    // Coach reply branch.
    if (body.messageId) {
      const reply = String(body.coachReply || "").trim();
      if (!reply) {
        return res.status(400).json({ error: "coachReply is required" });
      }
      const ok = await replyToClientMessage(String(body.messageId), reply.slice(0, 2000));
      if (!ok) return res.status(404).json({ error: "Message not found" });
      return res.status(200).json({ success: true });
    }

    // Athlete new-message branch.
    const clientId = String(body.clientId || "").trim();
    const text = String(body.body || "").trim();
    if (!/^CL-\d+$/.test(clientId)) {
      return res.status(400).json({ error: "A valid clientId is required" });
    }
    if (!text) {
      return res.status(400).json({ error: "Message body is required" });
    }
    const messageId = await createClientMessage({
      clientId,
      clientName: String(body.clientName || ""),
      body: text.slice(0, 1000),
    });
    // Reaches Kent's phone within seconds — the whole point of the loop.
    await notifyCoach(
      `💬 留言 from ${body.clientName || clientId}:\n${text.slice(0, 300)}\n\nReply in the coach console → Review → 留言.`
    );
    return res.status(200).json({ success: true, messageId });
  } catch (error: any) {
    if (error instanceof ConfigError) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
