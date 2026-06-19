// Feishu-backed exercises read. Logic moved verbatim from api/exercises.ts so
// behavior is identical while Feishu remains the active backend.
import { listRecords, getFieldNames } from "./client.ts";
import type { ExerciseDTO, ExerciseListResult } from "../dto.ts";

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.link) return item.link;
        if (item?.url) return item.url;
        if (item?.text) return item.text;
        if (item?.name) return item.name;
        return "";
      })
      .join(", ");
  }
  if (value?.link) return value.link;
  if (value?.url) return value.url;
  if (value?.text) return value.text;
  if (value?.name) return value.name;
  return "";
}

function readFirstField(fields: Record<string, any>, candidates: string[]) {
  const normalizedFields = new Map(
    Object.keys(fields).map((fieldName) => [fieldName.trim().toLowerCase(), fieldName])
  );
  for (const candidate of candidates) {
    const fieldName = normalizedFields.get(candidate.trim().toLowerCase()) || candidate;
    const value = fieldToText(fields[fieldName]);
    if (value) return value;
  }
  return "";
}

function readBooleanField(fields: Record<string, any>, candidates: string[]) {
  const value = readFirstField(fields, candidates).trim().toLowerCase();
  return ["true", "yes", "1", "checked", "active"].includes(value);
}

export const CUE_FIELD_CANDIDATES = [
  "Professional Coaching Cues",
  "Notes",
  "Note",
  "Technical Cues",
  "Technical Cue",
  "Technique Cues",
  "Technique Cue",
  "Form Instructions",
  "Form Instruction",
  "Form Cues",
  "Form Cue",
  "Instructions",
  "Instruction",
  "Cue Notes",
  "Cues",
  "Exercise Notes",
  "Coaching Notes",
  "Coach Notes",
  "Description",
];

export async function listExercises(): Promise<ExerciseListResult> {
  const tableId = process.env.FEISHU_EXERCISE_LIBRARY_TABLE_ID as string;
  const [records, availableFields] = await Promise.all([
    listRecords(tableId),
    getFieldNames(tableId),
  ]);

  const exercises: ExerciseDTO[] = records.map((item: any) => {
    const fields = item.fields || {};
    const notes = readFirstField(fields, CUE_FIELD_CANDIDATES);
    return {
      recordId: item.record_id,
      exerciseId: fieldToText(fields["Exercise ID"]),
      exerciseName: fieldToText(fields["Exercise Name"]),
      exerciseNameCn: readFirstField(fields, ["Exercise Name CN", "Name CN"]),
      videoUrl: readFirstField(fields, ["Short Video URL", "Video URL"]),
      videoUrlCn: readFirstField(fields, ["Video URL CN"]),
      longVideoUrl: readFirstField(fields, ["Long Video URL"]),
      category: fieldToText(fields["Category"]),
      categoryCn: readFirstField(fields, ["Category CN"]),
      equipment: fieldToText(fields["Equipment"]),
      equipmentCn: readFirstField(fields, ["Equipment CN"]),
      movementPattern: fieldToText(fields["Movement Pattern"]),
      movementPatternCn: readFirstField(fields, ["Movement Pattern CN"]),
      primaryMuscles: readFirstField(fields, ["Primary Muscles", "Primary Muscle", "Muscles"]),
      primaryMusclesCn: readFirstField(fields, ["Primary Muscles CN"]),
      technicalInstructionsCn: readFirstField(fields, [
        "Technical Instructions CN",
        "Form Instructions CN",
        "Instructions CN",
      ]),
      coachingCuesCn: readFirstField(fields, ["Coaching Cues CN", "Technical Cues CN", "Notes CN"]),
      commonMistakesCn: readFirstField(fields, ["Common Mistakes CN"]),
      notes,
      defaultMetric: readFirstField(fields, ["Default Metric", "Target Metric", "Metric"]),
      metricCategory: readFirstField(fields, ["Metric Category", "Metric Type"]),
      usesAutoTarget: readBooleanField(fields, ["Uses Auto Target", "Auto Target"]),
      status: notes.startsWith("[Archived]") ? "Archived" : "Active",
    };
  });

  return { exercises, availableFields };
}
