// Feishu impl for the formVideos domain — logic moved verbatim from
// api/formVideos.ts.
import { getTenantToken, appToken, createRecord, updateRecord } from "./client.ts";
import type {
  FormVideoDTO,
  CreateFormVideoInput,
  ReviewFormVideoInput,
} from "../repositories/formVideos.ts";
import type { WriteResult } from "../dto.ts";

const TABLE_ID = "tbleqym6RxbSw4i2"; // "Form Videos" (created 2026-07-04)

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const item = value[0];
    if (!item) return "";
    if (typeof item === "string") return item;
    // URL fields: the link is the value; text is just the display label.
    if (item?.link) return item.link;
    if (item?.text) return item.text;
    return "";
  }
  if (value?.link) return value.link;
  if (value?.text) return value.text;
  return "";
}

export async function listFormVideos(): Promise<FormVideoDTO[]> {
  const token = await getTenantToken();
  const r = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${TABLE_ID}/records?page_size=500`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const d = await r.json();
  return ((d?.data?.items || []) as any[])
    .map((item): FormVideoDTO => ({
      recordId: item.record_id,
      videoId: fieldToText(item.fields?.["Video ID"]),
      clientId: fieldToText(item.fields?.["Client ID"]),
      clientName: fieldToText(item.fields?.["Client Name"]),
      exerciseName: fieldToText(item.fields?.["Exercise Name"]),
      workoutName: fieldToText(item.fields?.["Workout Name"]),
      videoUrl: fieldToText(item.fields?.["Video URL"]),
      clientNote: fieldToText(item.fields?.["Client Note"]),
      submittedAt: Number(item.fields?.["Submitted At"]) || 0,
      status: fieldToText(item.fields?.["Status"]) || "New",
      coachReply: fieldToText(item.fields?.["Coach Reply"]),
    }))
    .sort((a, b) => b.submittedAt - a.submittedAt);
}

export async function createFormVideo(
  input: CreateFormVideoInput
): Promise<WriteResult> {
  const videoId = `FV-${Math.floor(100000 + Math.random() * 900000)}`;
  const fields: Record<string, any> = {
    "Video ID": videoId,
    "Client ID": String(input.clientId),
    "Client Name": String(input.clientName || ""),
    "Exercise Name": String(input.exerciseName || ""),
    "Workout Name": String(input.workoutName || ""),
    "Client Note": String(input.note || ""),
    "Submitted At": Date.now(),
    Status: "New",
  };
  // Omit the URL field entirely for note-only submissions (an empty value
  // would fail the whole record write).
  if (input.absoluteVideoUrl) {
    fields["Video URL"] = { link: input.absoluteVideoUrl, text: "Form video" };
  }

  const d = await createRecord(TABLE_ID, fields);
  if (d.code !== 0) {
    return { success: false, error: "Could not save video", larkResponse: d };
  }
  return { success: true, videoId };
}

export async function reviewFormVideo(
  input: ReviewFormVideoInput
): Promise<WriteResult> {
  const fields: Record<string, any> = {
    Status: String(input.status || "Reviewed"),
    "Reviewed At": Date.now(),
  };
  if (input.coachReply !== undefined) fields["Coach Reply"] = String(input.coachReply);

  const d = await updateRecord(TABLE_ID, input.recordId, fields);
  if (d.code !== 0) {
    return { success: false, error: "Could not update video", larkResponse: d };
  }
  return { success: true };
}
