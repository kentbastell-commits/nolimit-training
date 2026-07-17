import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ConfigError } from "../server/db/errors.ts";
import { assignContent } from "../server/db/repositories/contentAssignments.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { assignmentType, templateId, clientId } = req.body || {};

    if (!assignmentType || !templateId || !clientId) {
      return res.status(400).json({
        error: "Missing assignmentType, templateId, or clientId",
      });
    }

    const result = await assignContent(req.body);

    if (!result.success) {
      if (result.kind === "no-columns") {
        return res.status(400).json({
          error: "No matching Feishu assignment columns found",
          availableFields: result.availableFields,
        });
      }
      return res.status(500).json({
        error: "Could not create assignment",
        larkResponse: result.larkResponse,
        fieldsSent: result.fieldsSent,
      });
    }

    return res.status(200).json({
      success: true,
      recordId: result.recordId,
      larkResponse: result.larkResponse,
    });
  } catch (error: any) {
    if (error instanceof ConfigError) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
