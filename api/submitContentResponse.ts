import type { VercelRequest, VercelResponse } from "@vercel/node";
import { notifyCoach } from "./_notify.ts";
import { ConfigError } from "../server/db/errors.ts";
import { submitContentResponse } from "../server/db/repositories/contentResponses.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { assignmentType, templateId, clientId, clientName, responses } =
      req.body || {};

    if (!assignmentType || !templateId || !clientId || !Array.isArray(responses)) {
      return res.status(400).json({
        error: "Missing assignmentType, templateId, clientId, or responses",
      });
    }

    const result = await submitContentResponse(req.body);

    if (
      result.status === 200 &&
      String(assignmentType).toLowerCase().includes("questionnaire")
    ) {
      void notifyCoach(
        `📋 Intake completed by ${clientName || clientId}\n` +
          `Their program will auto-load now — check the Review queue for their answers.`
      );
    }

    return res.status(result.status).json(result.body);
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
