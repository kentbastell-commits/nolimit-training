import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "../server/db/client.ts";
import { assignedForms, assignedTests } from "../server/db/schema.ts";
import { coachKeyOk } from "./_coachAuth.ts";
import { invalidateCache } from "./_cache.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!coachKeyOk(req as never)) return res.status(401).json({ error: "Coach access key required" });
  const { assignmentId, assignmentType, reviewed = true } = req.body || {};
  if (!assignmentId || !assignmentType || typeof reviewed !== "boolean") return res.status(400).json({ error: "Missing assignment or review state" });
  try {
    const reviewedAt = reviewed ? Date.now() : null;
    const rows = /test/i.test(assignmentType)
      ? await db.update(assignedTests).set({ reviewedAt }).where(and(eq(assignedTests.assignedTestId, assignmentId), isNotNull(assignedTests.completedAt))).returning({ id: assignedTests.assignedTestId })
      : await db.update(assignedForms).set({ reviewedAt, reviewStatus: reviewed ? "Reviewed" : "Pending" }).where(and(eq(assignedForms.assignedFormId, assignmentId), isNotNull(assignedForms.completedAt))).returning({ id: assignedForms.assignedFormId });
    if (!rows.length) return res.status(404).json({ error: "Completed assignment not found" });
    invalidateCache("contentResponses");
    return res.status(200).json({ success: true, reviewedAt });
  } catch { return res.status(500).json({ error: "Could not update review state. Please retry." }); }
}
