import { listRecords } from "./client.ts";
import type { AlternateExerciseDTO, WorkoutDetailDTO } from "../dto.ts";
import { getCached, setCached } from "../../../api/_cache.ts";

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.name) return item.name;
        if (item?.link) return item.link;
        if (item?.url) return item.url;
        if (item?.record_ids) return item.record_ids.join(", ");
        if (item?.link_record_ids) return item.link_record_ids.join(", ");
        return "";
      })
      .join(", ");
  }
  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.link) return value.link;
  if (value?.url) return value.url;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");
  return "";
}

function readFirstField(fields: Record<string, any>, candidates: string[]) {
  const nf = new Map(Object.keys(fields).map((f) => [f.trim().toLowerCase(), f]));
  for (const c of candidates) {
    const fieldName = nf.get(c.trim().toLowerCase()) || c;
    const value = fieldToText(fields[fieldName]);
    if (value) return value;
  }
  return "";
}

function fieldToUrl(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  const pick = (item: any) => item?.link || item?.url || item?.text || "";
  if (Array.isArray(value)) return value.map(pick).filter(Boolean)[0] || "";
  return pick(value);
}

function readFirstUrl(fields: Record<string, any>, candidates: string[]) {
  const nf = new Map(Object.keys(fields).map((f) => [f.trim().toLowerCase(), f]));
  for (const c of candidates) {
    const fieldName = nf.get(c.trim().toLowerCase()) || c;
    const value = fieldToUrl(fields[fieldName]);
    if (value) return value;
  }
  return "";
}

function readBooleanField(fields: Record<string, any>, candidates: string[]) {
  const value = readFirstField(fields, candidates).trim().toLowerCase();
  return ["true", "yes", "1", "checked", "active"].includes(value);
}

const CUE_FIELD_CANDIDATES = [
  "Professional Coaching Cues","Technical Cues","Technical Cue","Technique Cues","Technique Cue",
  "Form Instructions","Form Instruction","Form Cues","Form Cue","Instructions","Instruction",
  "Cue Notes","Cues","Exercise Notes","Coaching Notes","Coach Notes","Notes","Note","Description",
];
const CUE_CN_FIELD_CANDIDATES = [
  "Professional Coaching Cues CN","Technical Cues CN","Coaching Cues CN","Form Instructions CN",
  "Technical Instructions CN","Instructions CN","Notes CN",
];

// The coach stores alternate exercises as a JSON line in the Coaching Notes
// ("Alternate Exercises: [{exerciseRecordId, exerciseId, exerciseName}, …]").
function parseAlternateList(notes: string) {
  const match = String(notes || "").match(/Alternate Exercises:\s*(\[.*\])/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[1]);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((a: any) => ({
        exerciseRecordId: String(a?.exerciseRecordId || ""),
        exerciseId: String(a?.exerciseId || ""),
        exerciseName: String(a?.exerciseName || ""),
      }))
      .filter((a) => a.exerciseName || a.exerciseId);
  } catch {
    return [];
  }
}

// Pull the display/cue fields for an exercise out of its Exercise Library row,
// so an alternate can fully replace the programmed exercise in the player.
function buildLibraryDetail(libraryFields: Record<string, any>) {
  return {
    exerciseNameCn: readFirstField(libraryFields, ["Exercise Name CN", "Name CN"]),
    videoUrl: readFirstUrl(libraryFields, ["Short Video URL", "Video URL"]),
    videoUrlCn: readFirstUrl(libraryFields, ["Video URL CN"]),
    longVideoUrl: readFirstUrl(libraryFields, ["Long Video URL"]),
    category: fieldToText(libraryFields["Category"]),
    categoryCn: readFirstField(libraryFields, ["Category CN"]),
    equipment: fieldToText(libraryFields["Equipment"]),
    equipmentCn: readFirstField(libraryFields, ["Equipment CN"]),
    movementPattern: fieldToText(libraryFields["Movement Pattern"]),
    movementPatternCn: readFirstField(libraryFields, ["Movement Pattern CN"]),
    technicalInstructionsCn: readFirstField(libraryFields, [
      "Technical Instructions CN",
      "Form Instructions CN",
      "Instructions CN",
    ]),
    coachingCuesCn: readFirstField(libraryFields, ["Coaching Cues CN"]),
    commonMistakesCn: readFirstField(libraryFields, ["Common Mistakes CN"]),
    cueNotes: readFirstField(libraryFields, CUE_FIELD_CANDIDATES),
    cueNotesCn: readFirstField(libraryFields, CUE_CN_FIELD_CANDIDATES),
  };
}

export async function getWorkoutDetails(
  programId: string,
  week: string,
  day: string
): Promise<WorkoutDetailDTO[]> {
  // Cache-first raw scans. Both tables are shared across programs, so a warm
  // cache serves repeat opens with zero Feishu round-trips (not even a token).
  // Template writers invalidate "workoutTemplatesRaw" (prefix); exercise
  // writers invalidate "exerciseLibraryRaw".
  let templateItems = getCached<any[]>("workoutTemplatesRaw");
  let libraryItems = getCached<any[]>("exerciseLibraryRaw");

  if (!templateItems || !libraryItems) {
    const [templates, library] = await Promise.all([
      templateItems
        ? Promise.resolve(templateItems)
        : listRecords(process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID as string),
      libraryItems
        ? Promise.resolve(libraryItems)
        : listRecords(process.env.FEISHU_EXERCISE_LIBRARY_TABLE_ID as string),
    ]);
    templateItems = templates;
    libraryItems = library;
    setCached("workoutTemplatesRaw", templateItems, 10 * 60 * 1000);
    setCached("exerciseLibraryRaw", libraryItems, 10 * 60 * 1000);
  }

  const exerciseLibrary = new Map<string, Record<string, any>>();
  libraryItems.forEach((item: any) => {
    const fields = item.fields || {};
    const exerciseId = fieldToText(fields["Exercise ID"]);
    const exerciseName = fieldToText(fields["Exercise Name"]);
    if (exerciseId) exerciseLibrary.set(`id:${exerciseId}`, fields);
    if (exerciseName) exerciseLibrary.set(`name:${exerciseName.trim().toLowerCase()}`, fields);
  });

  return templateItems
    .filter((item: any) => {
      const f = item.fields || {};
      return (
        fieldToText(f["Program ID"]) === String(programId) &&
        fieldToText(f["Week"]) === String(week) &&
        fieldToText(f["Day"]) === String(day)
      );
    })
    .map((item: any) => {
      const fields = item.fields || {};
      const exerciseId = fieldToText(fields["Exercise ID"]);
      const exerciseName = fieldToText(fields["Exercise Name"]);
      const lib =
        exerciseLibrary.get(`id:${exerciseId}`) ||
        exerciseLibrary.get(`name:${exerciseName.trim().toLowerCase()}`) ||
        {};
      return {
        id: item.record_id,
        templateId: fieldToText(fields["Template ID"]),
        programId: fieldToText(fields["Program ID"]),
        sessionType: fieldToText(fields["Session Type"]),
        sessionGoal: fieldToText(fields["Session Goal"]),
        estimatedDuration: fieldToText(fields["Estimated Duration"]),
        intensity: fieldToText(fields["Intensity"]),
        exerciseId,
        exerciseName,
        exerciseNameCn:
          readFirstField(fields, ["Exercise Name CN", "Name CN"]) ||
          readFirstField(lib, ["Exercise Name CN", "Name CN"]),
        videoUrl:
          readFirstUrl(fields, ["Short Video URL", "Video URL"]) ||
          readFirstUrl(lib, ["Short Video URL", "Video URL"]),
        videoUrlCn: readFirstUrl(fields, ["Video URL CN"]) || readFirstUrl(lib, ["Video URL CN"]),
        longVideoUrl: readFirstUrl(fields, ["Long Video URL"]) || readFirstUrl(lib, ["Long Video URL"]),
        category: fieldToText(lib["Category"]),
        categoryCn: readFirstField(lib, ["Category CN"]),
        equipment: fieldToText(lib["Equipment"]),
        equipmentCn: readFirstField(lib, ["Equipment CN"]),
        movementPattern: fieldToText(lib["Movement Pattern"]),
        movementPatternCn: readFirstField(lib, ["Movement Pattern CN"]),
        technicalInstructionsCn: readFirstField(lib, [
          "Technical Instructions CN", "Form Instructions CN", "Instructions CN",
        ]),
        coachingCuesCn: readFirstField(lib, ["Coaching Cues CN"]),
        commonMistakesCn: readFirstField(lib, ["Common Mistakes CN"]),
        cueNotes: readFirstField(lib, CUE_FIELD_CANDIDATES),
        cueNotesCn: readFirstField(lib, CUE_CN_FIELD_CANDIDATES),
        order: Number(fieldToText(fields["Order"])) || 0,
        sets: fieldToText(fields["Sets"]),
        reps: fieldToText(fields["Reps"]),
        tempo: fieldToText(fields["Tempo"]),
        rest: fieldToText(fields["Rest"]),
        notes: fieldToText(fields["Coaching Notes"]),
        notesCn: readFirstField(fields, [
          "Coaching Notes CN", "Notes CN", "Technical Instructions CN", "Form Instructions CN",
        ]),
        sectionNameCn: readFirstField(fields, ["Section CN"]),
        targetSource: readFirstField(fields, ["Target Source"]),
        targetMetric: readFirstField(fields, ["Target Metric"]),
        targetPercent: readFirstField(fields, ["Target Percent"]),
        targetAdjustment: readFirstField(fields, ["Target Adjustment"]),
        autoTarget: readBooleanField(fields, ["Auto Target"]),
        displayTarget: readFirstField(fields, ["Display Target"]),
        // Resolve each alternate against the library so the player can fully
        // swap to it (video, cues, etc.) when the athlete lacks equipment.
        alternateExercises: parseAlternateList(
          fieldToText(fields["Coaching Notes"])
        ).map((alt): AlternateExerciseDTO => {
          const altLib =
            exerciseLibrary.get(`id:${alt.exerciseId}`) ||
            exerciseLibrary.get(`name:${alt.exerciseName.trim().toLowerCase()}`) ||
            {};
          return {
            exerciseRecordId: alt.exerciseRecordId,
            exerciseId: alt.exerciseId,
            exerciseName: alt.exerciseName,
            ...buildLibraryDetail(altLib),
          };
        }),
      };
    })
    .sort((a, b) => a.order - b.order);
}
