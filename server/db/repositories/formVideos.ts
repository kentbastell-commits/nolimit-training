// Form-video review flow (premium tier): athlete submits a video/note,
// coach replies and marks it reviewed.
import * as pg from "../pg/formVideos.ts";
import type { WriteResult } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

export type FormVideoDTO = {
  recordId: string;
  videoId: string;
  clientId: string;
  clientName: string;
  exerciseName: string;
  exerciseNameCn?: string;
  workoutName: string;
  workoutNameCn?: string;
  assignedWorkoutId?: string;
  workoutDate?: string;
  reviewedAt?: number;
  videoUrl: string;
  clientNote: string;
  clientNoteEn?: string;
  submittedAt: number;
  status: string;
  coachReply: string;
  // Translate-on-write mirror for zh athletes (may be empty).
  coachReplyCn: string;
  // Coach voice note URL (empty when the reply is text only).
  coachReplyAudioUrl: string;
};

export type CreateFormVideoInput = {
  clientId: string;
  clientName?: string;
  exerciseName?: string;
  workoutName?: string;
  assignedWorkoutId?: string;
  // Already made absolute by the handler (Feishu URL columns mangle relative
  // paths); empty string means a note-only submission.
  absoluteVideoUrl?: string;
  note?: string;
  // false = "reference only": kept in the athlete's history, never queued
  // for coach feedback (status "Reference"). Default true.
  reviewRequested?: boolean;
};

export type ReviewFormVideoInput = {
  recordId: string;
  coachReply?: string;
  status?: string;
  // null clears a previous voice note; undefined leaves it untouched.
  coachReplyAudioUrl?: string | null;
};

export async function listFormVideos(): Promise<FormVideoDTO[]> {
  const cached = getCached<FormVideoDTO[]>("formVideos");
  if (cached) return cached;

  const videos =
    await pg.listFormVideos();

  setCached("formVideos", videos, 5 * 60 * 1000);
  return videos;
}

export async function createFormVideo(
  input: CreateFormVideoInput
): Promise<WriteResult> {
  const result =
    await pg.createFormVideo(input);
  if (result.success) invalidateCache("formVideos");
  return result;
}

export async function reviewFormVideo(
  input: ReviewFormVideoInput
): Promise<WriteResult> {
  const result =
    await pg.reviewFormVideo(input);
  if (result.success) invalidateCache("formVideos");
  return result;
}
