import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listProgramTemplates } from "../server/db/repositories/programTemplates.ts";
import { clientHasProgramAccess } from "../server/db/repositories/clients.ts";
import { coachKeyOk, isVerifiedCoach } from "./_coachAuth.ts";
import { publishedCalendarSlots } from "../server/db/pg/calendarDrafts.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { programId, programRecordId, clientCode } = req.query;
    if (!programId && !programRecordId) {
      return res.status(400).json({ error: "Missing programId" });
    }
    // This returns the FULL paid content of a program (every week/day,
    // exercises, sets/reps) — it's the athlete's own workout player fetching
    // their assigned program, not a public preview, so it can't just be
    // coach-gated. Without proof the caller's client actually has this
    // program, anyone could pull any paid program's full content for free
    // by guessing a programId off /api/programs.
    if (!coachKeyOk(req as never)) {
      const hasAccess = await clientHasProgramAccess(
        String(clientCode || ""),
        String(programId || "")
      );
      if (!hasAccess) {
        return res.status(403).json({ error: "No access to this program" });
      }
    }
    const slots = (!isVerifiedCoach(req as never) || req.query.audience === "athlete")
      ? await publishedCalendarSlots(String(programId || programRecordId), String(clientCode || "")) : null;
    if (slots && !slots.length) return res.status(403).json({ error: "This program is not published" });
    const allTemplates = await listProgramTemplates(
      String(programId || ""),
      String(programRecordId || "")
    );
    const templates = slots ? allTemplates.filter(t => slots.some(s => s.week === Number(t.week) && s.day === Number(t.day))) : allTemplates;
    return res.status(200).json({ templates });
  } catch (error: any) {
    if (error.kind === "templatesEmpty") {
      return res.status(500).json({
        error: "No workout template records returned",
        larkResponse: error.larkResponse,
      });
    }
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
