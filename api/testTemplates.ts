import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  listTestTemplates,
  createTestTemplate,
  updateTestTemplate,
  deleteTestTemplate,
} from "../server/db/repositories/testTemplates.ts";
import { coachKeyOk } from "./_coachAuth.ts";

// Dual-use: athletes GET the test batteries they are assigned; only coaches
// create/edit/delete them (writes were ungated until 2026-10-29).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const result = await listTestTemplates();
      return res.status(result.status).json(result.body);
    }
    if (!coachKeyOk(req as never)) {
      return res.status(401).json({ error: "Coach access key required" });
    }

    if (req.method === "DELETE") {
      const { recordId, testTemplateId } = req.body || {};
      if (!recordId) {
        return res.status(400).json({ error: "Missing test template record ID" });
      }
      const result = await deleteTestTemplate({ recordId, testTemplateId });
      return res.status(result.status).json(result.body);
    }

    if (req.method === "PUT") {
      const { recordId, testTemplateId, name } = req.body || {};
      if (!recordId || !testTemplateId) {
        return res.status(400).json({ error: "Missing test template IDs" });
      }
      if (!name) {
        return res.status(400).json({ error: "Missing test template name" });
      }
      const result = await updateTestTemplate(req.body);
      return res.status(result.status).json(result.body);
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { name } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: "Missing test template name" });
    }
    const result = await createTestTemplate(req.body);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
