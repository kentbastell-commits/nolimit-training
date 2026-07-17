// Generic record delete for the coach console. Table mapping, safety checks,
// the client-delete cascade, and cache invalidation live in the repository
// (server/db/repositories/records.ts) so both backends behave identically.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  deleteRecordFromTable,
  isDeleteResource,
} from "../server/db/repositories/records.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { resource, recordId, clientCode } = req.body || {};

    if (!resource || !recordId) {
      return res.status(400).json({ error: "Missing resource or recordId" });
    }

    if (!isDeleteResource(resource)) {
      return res.status(400).json({ error: "Unsupported delete resource" });
    }

    const result = await deleteRecordFromTable({ resource, recordId, clientCode });

    if (!result.success) {
      const body: Record<string, any> = {
        error: result.error || "Failed to delete record",
      };
      if (result.larkResponse !== undefined) body.larkResponse = result.larkResponse;
      return res.status(500).json(body);
    }

    return res.status(200).json({
      success: true,
      resource,
      recordId,
      cascade: result.cascade,
      larkResponse: result.larkResponse,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
