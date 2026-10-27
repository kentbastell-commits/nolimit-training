import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isVerifiedCoach } from "./_coachAuth.ts";
import { SessionEditError } from "../server/db/pg/assignedSession.ts";
import { saveSessionToLibrary } from "../server/db/pg/saveSessionToLibrary.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (!isVerifiedCoach(req as never)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { assignedWorkoutId, version, requestId, source } = req.body || {};
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (typeof assignedWorkoutId !== "string" || !assignedWorkoutId.trim() || assignedWorkoutId.length > 100 || typeof version !== "string" || !/^[a-f\d]{64}$/i.test(version)
    || typeof requestId !== "string" || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(requestId)
    || !name || name.length > 200 || !["published", "draft"].includes(source)) return res.status(400).json({ error: "Invalid session" });
  try { return res.status(200).json(await saveSessionToLibrary({ assignedWorkoutId, version, requestId, source, name })); }
  catch (error) { return res.status(error instanceof SessionEditError ? error.status : 500).json({ error: error instanceof SessionEditError ? error.code : "sessionSaveFailed" }); }
}
