// Postgres impl for the formVideos domain. clientId is FK-enforced here
// (Feishu stores plain text): the FK is nulled when the client row doesn't
// exist so a submission always lands; clientName still carries the identity.
import { eq } from "drizzle-orm";
import { db } from "../client.ts";
import { formVideos, clients } from "../schema.ts";
import { str } from "./_util.ts";
import type {
  FormVideoDTO,
  CreateFormVideoInput,
  ReviewFormVideoInput,
} from "../repositories/formVideos.ts";
import type { WriteResult } from "../dto.ts";

export async function listFormVideos(): Promise<FormVideoDTO[]> {
  const rows = await db.select().from(formVideos);
  return rows
    .map((r): FormVideoDTO => ({
      recordId: r.videoId,
      videoId: r.videoId,
      clientId: str(r.clientId),
      clientName: str(r.clientName),
      exerciseName: str(r.exerciseName),
      workoutName: str(r.workoutName),
      videoUrl: str(r.videoUrl),
      clientNote: str(r.clientNote),
      submittedAt: r.submittedAt ?? 0,
      status: str(r.status) || "New",
      coachReply: str(r.coachReply),
    }))
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

  try {
    await db.insert(formVideos).values({
      videoId,
      clientId: clientExists ? clientCode : null,
      clientName: String(input.clientName || ""),
      exerciseName: String(input.exerciseName || ""),
      workoutName: String(input.workoutName || ""),
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
  return { success: true, videoId };
}

export async function reviewFormVideo(
  input: ReviewFormVideoInput
): Promise<WriteResult> {
  const set: Partial<typeof formVideos.$inferInsert> = {
    status: String(input.status || "Reviewed"),
    reviewedAt: Date.now(),
  };
  if (input.coachReply !== undefined) set.coachReply = String(input.coachReply);

  const updated = await db
    .update(formVideos)
    .set(set)
    .where(eq(formVideos.videoId, input.recordId))
    .returning({ videoId: formVideos.videoId });
  if (!updated.length) {
    return { success: false, error: "Could not update video", message: "Video not found" };
  }
  return { success: true };
}
