// Form-video review flow (premium tier): athlete submits a video/note,
// coach replies and marks it reviewed.
import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/formVideos.ts";
import type { WriteResult } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

export type FormVideoDTO = {
  recordId: string;
  videoId: string;
  clientId: string;
  clientName: string;
  exerciseName: string;
  workoutName: string;
  videoUrl: string;
  clientNote: string;
  submittedAt: number;
  status: string;
  coachReply: string;
};

export type CreateFormVideoInput = {
  clientId: string;
  clientName?: string;
  exerciseName?: string;
  workoutName?: string;
  // Already made absolute by the handler (Feishu URL columns mangle relative
  // paths); empty string means a note-only submission.
  absoluteVideoUrl?: string;
  note?: string;
};

export type ReviewFormVideoInput = {
  recordId: string;
  coachReply?: string;
  status?: string;
};

export async function listFormVideos(): Promise<FormVideoDTO[]> {
  const cached = getCached<FormVideoDTO[]>("formVideos");
  if (cached) return cached;

  const videos =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/formVideos.ts")).listFormVideos()
      : await feishu.listFormVideos();

  setCached("formVideos", videos, 5 * 60 * 1000);
  return videos;
}

export async function createFormVideo(
  input: CreateFormVideoInput
): Promise<WriteResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/formVideos.ts")).createFormVideo(input)
      : await feishu.createFormVideo(input);
  if (result.success) invalidateCache("formVideos");
  return result;
}

export async function reviewFormVideo(
  input: ReviewFormVideoInput
): Promise<WriteResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/formVideos.ts")).reviewFormVideo(input)
      : await feishu.reviewFormVideo(input);
  if (result.success) invalidateCache("formVideos");
  return result;
}
