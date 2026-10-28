import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  listFormTemplates,
  createFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
} from "../server/db/repositories/formTemplates.ts";
import { coachKeyOk } from "./_coachAuth.ts";

// Dual-use handler: the athlete portal and the mini program GET the template
// list (intake forms), so it can't live in COACH_ONLY_HANDLERS. The writes
// are coach-only — until 2026-10-29 they were open to anyone, so an
// unauthenticated DELETE could remove the intake questionnaire.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const result = await listFormTemplates();
      return res.status(result.status).json(result.body);
    }
    if (!coachKeyOk(req as never)) {
      return res.status(401).json({ error: "Coach access key required" });
    }

    if (req.method === "DELETE") {
      const { recordId, formId } = req.body || {};
      if (!recordId) {
        return res.status(400).json({ error: "Missing form template record ID" });
      }
      const result = await deleteFormTemplate({ recordId, formId });
      return res.status(result.status).json(result.body);
    }

    if (req.method === "PUT") {
      const { recordId, formId, name } = req.body || {};
      if (!recordId || !formId) {
        return res.status(400).json({ error: "Missing form template IDs" });
      }
      if (!name) {
        return res.status(400).json({ error: "Missing form name" });
      }
      const result = await updateFormTemplate(req.body);
      return res.status(result.status).json(result.body);
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { name } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: "Missing form name" });
    }
    const result = await createFormTemplate(req.body);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
