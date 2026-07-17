import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ConfigError } from "../server/db/errors.ts";
import { updateContentAssignmentDate } from "../server/db/repositories/contentAssignments.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { assignmentType, recordId, scheduledDate } = req.body || {};

    if (!assignmentType || !recordId || !scheduledDate) {
      return res.status(400).json({
        error: "Missing assignmentType, recordId, or scheduledDate",
      });
    }

    const result = await updateContentAssignmentDate({
      assignmentType,
      recordId,
      scheduledDate,
    });

    if (!result.success) {
      if (result.kind === "no-date-column") {
        return res.status(400).json({
          error: "Missing scheduled date column",
          availableFields: result.availableFields,
        });
      }
      return res.status(500).json({
        error: "Failed to update assignment date",
        attemptedFields: result.attemptedFields,
        failedFields: result.failedFields,
      });
    }

    return res.status(200).json({
      success: true,
      recordId,
      scheduledDate,
      updatedFields: result.updatedFields,
      failedFields: result.failedFields,
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
