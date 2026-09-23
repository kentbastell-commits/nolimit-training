import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isVerifiedCoach } from "./_coachAuth.ts";
import { applyCalendarSessions, reviewCalendarSessions } from "../server/db/pg/calendarSessions.ts";
import { SessionEditError } from "../server/db/pg/assignedSession.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (!isVerifiedCoach(req as never)) return res.status(401).json({ error: "Coach access required" });
  try {
    if (req.method === "GET" && typeof req.query.clientId === "string" && req.query.clientId) return res.status(200).json(await reviewCalendarSessions(req.query.clientId));
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const b = req.body;
    if (!b || typeof b.clientId !== "string" || !b.clientId || !/^[a-f\d-]{36}$/i.test(b.requestId || "")
      || !["move", "copy"].includes(b.action) || !Array.isArray(b.items) || !b.items.length || b.items.length > 100
      || new Set(b.items.map((i: any) => i?.id)).size !== b.items.length
      || b.items.some((i: any) => !i || typeof i.id !== "string" || !i.id || typeof i.version !== "string" || !i.version
        || typeof i.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(i.date) || !Number.isFinite(Date.parse(i.date)) || new Date(i.date).toISOString().slice(0, 10) !== i.date)) {
      return res.status(400).json({ error: "Invalid calendar selection" });
    }
    return res.status(200).json(await applyCalendarSessions(b));
  } catch (error) {
    return res.status(error instanceof SessionEditError ? error.status : 500).json({ error: error instanceof SessionEditError ? error.code : "calendarSaveFailed" });
  }
}
