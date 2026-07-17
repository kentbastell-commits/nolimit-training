import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DATA_BACKEND } from "../server/db/backend.ts";
import {
  listTestTemplates,
  createTestTemplate,
  updateTestTemplate,
  deleteTestTemplate,
} from "../server/db/repositories/testTemplates.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Feishu needs its table ids; on Postgres the env vars are irrelevant.
  if (DATA_BACKEND === "feishu") {
    if (!process.env.FEISHU_TEST_TEMPLATES_TABLE_ID) {
      return res.status(500).json({ error: "Missing FEISHU_TEST_TEMPLATES_TABLE_ID" });
    }
    if (!process.env.FEISHU_TEST_ITEMS_TABLE_ID) {
      return res.status(500).json({ error: "Missing FEISHU_TEST_ITEMS_TABLE_ID" });
    }
  }

  try {
    if (req.method === "GET") {
      const result = await listTestTemplates();
      return res.status(result.status).json(result.body);
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
