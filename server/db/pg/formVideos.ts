// Postgres impl for the formVideos domain. clientId is FK-enforced here
// (Feishu stores plain text): the FK is nulled when the client row doesn't
// exist so a submission always lands; clientName still carries the identity.
import { eq, inArray } from "drizzle-orm";
import { db } from "../client.ts";
import { formVideos, clients, assignedWorkouts } from "../schema.ts";
import { resolveVideoSession, videoDay } from "../../../src/videoSessionGrouping.ts";
import { str } from "./_util.ts";
import { queueTranslations } from "../contentTranslations.ts";
import type {
  FormVideoDTO,
  CreateFormVideoInput,
  ReviewFormVideoInput,
} from "../repositories/formVideos.ts";
import type { WriteResult } from "../dto.ts";

export async function listFormVideos(): Promise<FormVideoDTO[]> {
  const rows = await db.select().from(formVideos);
  const clientIds = [...new Set(rows.map(row => row.clientId).filter((id): id is string => !!id))];
  const assignments = clientIds.length ? await db.select().from(assignedWorkouts).where(inArray(assignedWorkouts.clientId, clientIds)) : [];
  return rows
    .map((r): FormVideoDTO => ({
      recordId: r.videoId,
      videoId: r.videoId,
      clientId: str(r.clientId),
      clientName: str(r.clientName),
      exerciseName: str(r.exerciseName),
      workoutName: str(r.workoutName),
      workoutNameCn: str(r.workoutNameCn),
      assignedWorkoutId: str(r.assignedWorkoutId),
      workoutDate: str(r.workoutDate),
      reviewedAt: r.reviewedAt ?? 0,
      videoUrl: str(r.videoUrl),
      clientNote: str(r.clientNote),
      clientNoteEn: str(r.clientNoteEn),
      submittedAt: r.submittedAt ?? 0,
      status: str(r.status) || "New",
      coachReply: str(r.coachReply),
      coachReplyCn: str(r.coachReplyCn),
    }))
    .map(video => resolveVideoSession(video, assignments))
    .sort((a, b) => b.submittedAt - a.submittedAt);
}

export async function createFormVideo(
  input: CreateFormVideoInput
): Promise<WriteResult> {
  const videoId = `FV-${Math.floor(100000 + Math.random() * 900000)}`;
  const clientCode = String(input.clientId);
  const clientExists =
    (
      await db
        .select({ id: clients.clientId })
        .from(clients)
        .where(eq(clients.clientId, clientCode))
    ).length > 0;

  const assignmentId = String(input.assignedWorkoutId || "").trim();
  const [found] = assignmentId
    ? await db.select().from(assignedWorkouts).where(eq(assignedWorkouts.assignedWorkoutId, assignmentId))
    : [];
  // Another athlete's session id is a forged request — refuse it. A session
  // that no longer EXISTS is a stale tab (coach re-assigned or deleted it
  // while the athlete was filming) and must not lose the clip: the FILE is
  // already uploaded by the time this metadata POST arrives. Keep the video,
  // drop the dead link — the review queue still groups it by the free-text
  // workout name and day. (Rejecting cost the athlete a generic error and an
  // orphaned file.)
  if (found && found.clientId !== clientCode) return { success: false, error: "Invalid workout" };
  const assignment = found;
  try {
    await db.insert(formVideos).values({
      videoId,
      clientId: clientExists ? clientCode : null,
      clientName: String(input.clientName || ""),
      exerciseName: String(input.exerciseName || ""),
      workoutName: assignment?.sessionName || String(input.workoutName || ""),
      assignedWorkoutId: assignment?.assignedWorkoutId || null,
      workoutDate: assignment ? videoDay(assignment.scheduledDate) : null,
      workoutNameCn: assignment?.sessionNameCn || null,
      videoUrl: input.absoluteVideoUrl || null,
      clientNote: String(input.note || ""),
      submittedAt: Date.now(),
      status: "New",
    });
  } catch (e: any) {
    return {
      success: false,
      error: "Could not save video",
      message: e?.message || String(e),
    };
  }
  queueTranslations("formVideos", [videoId]);
  return { success: true, videoId };
}

export async function reviewFormVideo(
  input: ReviewFormVideoInput
): Promise<WriteResult> {
  const set: Partial<typeof formVideos.$inferInsert> = {
    status: String(input.status || "Reviewed"),
    reviewedAt: Date.now(),
  };
  if (input.coachReply !== undefined) {
    set.coachReply = String(input.coachReply);
    // A new reply replaces the old mirror; the fill below rebuilds it.
    set.coachReplyCn = null;
  }

  const updated = await db
    .update(formVideos)
    .set(set)
    .where(eq(formVideos.videoId, input.recordId))
    .returning({ videoId: formVideos.videoId });
  if (!updated.length) {
    return { success: false, error: "Could not update video", message: "Video not found" };
  }

  queueTranslations("formVideos", [input.recordId]);
  return { success: true };
}
