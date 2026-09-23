import type { VercelRequest, VercelResponse } from "@vercel/node";
import { coachKeyOk } from "./_coachAuth.ts";
import { invalidateCache } from "./_cache.ts";
import { getAssignedSession, saveAssignedSession, SessionEditError } from "../server/db/pg/assignedSession.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!coachKeyOk(req as never)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const id = req.method === "GET" ? req.query.assignedWorkoutId : req.body?.assignedWorkoutId;
  if (typeof id !== "string" || !id.trim()) return res.status(400).json({ error: "Missing assignedWorkoutId" });
  try {
    if (req.method === "GET") return res.status(200).json(await getAssignedSession(id));
    const { version, session } = req.body || {};
    if (typeof version !== "string" || !version || typeof session?.sessionName !== "string" || !session.sessionName.trim()
      || !Array.isArray(session?.exercises) || !session.exercises.length || session.exercises.length > 100
      || session.testTemplateId || session.exercises.some((ex: any) => !ex || typeof ex.exerciseId !== "string"
        || !ex.exerciseId || !Number.isFinite(Number(ex.sets)) || Number(ex.sets) < 1 || Number(ex.sets) > 100)) {
      return res.status(400).json({ error: "Invalid session" });
    }
    const result = await saveAssignedSession(id, version, session);
    for (const key of ["workouts", "programs", "workoutTemplatesRaw", "programSessionTypes"]) invalidateCache(key);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error instanceof SessionEditError ? error.status : 500)
      .json({ error: error instanceof SessionEditError ? error.code : "sessionSaveFailed" });
  }
}
