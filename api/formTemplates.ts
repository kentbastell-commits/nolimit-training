import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  listFormTemplates,
  createFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
} from "../server/db/repositories/formTemplates.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const result = await listFormTemplates();
      return res.status(result.status).json(result.body);
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
