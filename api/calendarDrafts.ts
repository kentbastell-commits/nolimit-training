import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isVerifiedCoach } from "./_coachAuth.ts";
import { CalendarDraftError, createCalendarDraft, publishCalendarDrafts, reviewCalendarDrafts } from "../server/db/pg/calendarDrafts.ts";

function validDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (!isVerifiedCoach(req as never)) return res.status(401).json({ error: "Coach access required" });
  try {
    if (req.method === "GET") {
      if (typeof req.query.clientId !== "string" || !req.query.clientId) return res.status(400).json({ error: "Client required" });
      return res.status(200).json(await reviewCalendarDrafts(req.query.clientId));
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const body = req.body || {};
    if (body.action === "publish") {
      if (typeof body.clientId !== "string" || !body.clientId || typeof body.version !== "string" || !body.version
        || !Array.isArray(body.ids) || !body.ids.length || body.ids.length > 1000
        || body.ids.some((id: unknown) => typeof id !== "string" || !id) || new Set(body.ids).size !== body.ids.length) {
        return res.status(400).json({ error: "Select drafts to publish" });
      }
      return res.status(200).json(await publishCalendarDrafts(body.clientId, body.ids, body.version));
    }
    if (body.action !== "save" || !/^[a-f\d-]{36}$/i.test(body.requestId || "")
      || !Array.isArray(body.clientIds) || !body.clientIds.length || body.clientIds.length > 100
      || body.clientIds.some((id: unknown) => typeof id !== "string" || !/^CL-[\w-]+$/.test(id))
      || !Array.isArray(body.scheduledWorkouts) || !body.scheduledWorkouts.length || body.scheduledWorkouts.length > 500
      || body.scheduledWorkouts.some((w: any) => !w || !Number.isInteger(Number(w.week)) || Number(w.week) < 1 || !Number.isInteger(Number(w.day)) || Number(w.day) < 1
        || typeof w.sessionName !== "string" || !w.sessionName.trim() || !validDate(w.scheduledDate))) return res.status(400).json({ error: "Invalid draft schedule" });
    if (!body.sourceProgramId && (typeof body.programName !== "string" || !body.programName.trim()
      || !Array.isArray(body.sessions) || !body.sessions.length || body.sessions.length > 500
      || body.sessions.some((s: any) => !s || !Array.isArray(s.exercises) || (!s.testTemplateId && !s.exercises.length) || s.exercises.length > 100))) {
      return res.status(400).json({ error: "Add sessions before saving the calendar draft" });
    }
    return res.status(200).json(await createCalendarDraft(body));
  } catch (error) {
    return res.status(error instanceof CalendarDraftError ? error.status : 500)
      .json({ error: error instanceof CalendarDraftError ? error.message : "Could not save calendar drafts. Your work is retained." });
  }
}
