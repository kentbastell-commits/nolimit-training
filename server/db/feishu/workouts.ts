import { listRecords } from "./client.ts";
import type { WorkoutDTO } from "../dto.ts";

// Verbatim from api/workouts.ts: returns "" for empty links so an unresolved
// relation never leaks a raw JSON blob (the data-integrity fix).
function itemToText(item: any): string {
  if (item === null || item === undefined) return "";
  if (typeof item === "string") return item;
  if (typeof item === "number") return String(item);
  if (typeof item === "boolean") return item ? "true" : "false";
  if (item.text) return String(item.text);
  if (Array.isArray(item.text_arr) && item.text_arr.length) {
    return item.text_arr.filter(Boolean).join(", ");
  }
  if (item.name) return String(item.name);
  if (item.value !== undefined) return fieldToText(item.value);
  if (Array.isArray(item.record_ids) && item.record_ids.length) {
    return item.record_ids.join(", ");
  }
  if (Array.isArray(item.link_record_ids) && item.link_record_ids.length) {
    return item.link_record_ids.join(", ");
  }
  return "";
}

function fieldToText(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.map(itemToText).filter(Boolean).join(", ");
  return itemToText(value);
}

function readFirstField(fields: Record<string, any>, candidates: string[]) {
  const normalizedFields = new Map(
    Object.keys(fields).map((f) => [f.trim().toLowerCase(), f])
  );
  for (const candidate of candidates) {
    const fieldName = normalizedFields.get(candidate.trim().toLowerCase()) || candidate;
    const value = fieldToText(fields[fieldName]);
    if (value) return value;
  }
  return "";
}

export async function listAllWorkouts(): Promise<WorkoutDTO[]> {
  const items = await listRecords(process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID as string);
  return items.map((item: any) => {
    const fields = item.fields || {};
    return {
      id: item.record_id,
      assignedWorkoutId: fieldToText(fields["Assigned Workout ID"]),
      clientId: fieldToText(fields["Client ID"]),
      programId: fieldToText(fields["Program ID"]),
      week: fieldToText(fields["Week"]),
      day: fieldToText(fields["Day"]),
      sessionName: fieldToText(fields["Session Name"]),
      sessionNameCn: readFirstField(fields, ["Session Name CN", "Name CN"]),
      sessionType: fieldToText(fields["Session Type"]),
      sessionGoal: fieldToText(fields["Session Goal"]),
      estimatedDuration: fieldToText(fields["Estimated Duration"]),
      intensity: fieldToText(fields["Intensity"]),
      scheduledDate: fieldToText(fields["Scheduled Date"]),
      completionStatus: fieldToText(fields["Completion Status"]),
      coachNotes: fieldToText(fields["Coach Notes"]),
      coachNotesCn: readFirstField(fields, ["Coach Notes CN", "Notes CN"]),
      clientNotes: fieldToText(fields["Client Notes"]),
      workoutLogs: fieldToText(fields["Workout Logs"]),
      // Internal-load metrics (coach-only) captured at workout finish.
      sessionRpe: fieldToText(fields["Session RPE"]),
      sessionDuration: fieldToText(fields["Session Duration"]),
      sessionLoad: fieldToText(fields["Session Load"]),
      coachReviewed: /^(true|reviewed|yes|1)$/i.test(
        fieldToText(fields["Coach Reviewed"])
      ),
    };
  });
}
