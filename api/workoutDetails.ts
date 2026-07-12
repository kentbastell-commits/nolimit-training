import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";
import { getCached, setCached } from "./_cache.ts";
import { getTenantToken } from "./_token.ts";

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
  const normalizedFields = new Map(
    Object.keys(fields).map((fieldName) => [
      fieldName.trim().toLowerCase(),
      fieldName,
    ])
  );

  for (const candidate of candidates) {
    const fieldName =
      normalizedFields.get(candidate.trim().toLowerCase()) || candidate;
    const value = fieldToText(fields[fieldName]);

    if (value) return value;
  }

  return "";
}

// Extract the actual link from a URL-field value (which is { link, text }) —
// prefer the link over the display text so video buttons get a real href.
function fieldToUrl(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  const pick = (item: any) =>
    item?.link || item?.url || item?.text || "";
  if (Array.isArray(value)) return value.map(pick).filter(Boolean)[0] || "";
  return pick(value);
}

function readFirstUrl(fields: Record<string, any>, candidates: string[]) {
  const normalizedFields = new Map(
    Object.keys(fields).map((fieldName) => [fieldName.trim().toLowerCase(), fieldName])
  );
  for (const candidate of candidates) {
    const fieldName =
      normalizedFields.get(candidate.trim().toLowerCase()) || candidate;
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
  "Professional Coaching Cues",
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
  "Notes",
  "Note",
  "Description",
];

const CUE_CN_FIELD_CANDIDATES = [
  "Professional Coaching Cues CN",
  "Technical Cues CN",
  "Coaching Cues CN",
  "Form Instructions CN",
  "Technical Instructions CN",
  "Instructions CN",
  "Notes CN",
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { programId, week, day } = req.query;

    if (!programId || !week || !day) {
      return res.status(400).json({
        error: "Missing required query params",
        required: ["programId", "week", "day"],
        received: { programId, week, day },
      });
    }

    // Cache-first, and only fetch THIS program's templates (server-side filter)
    // instead of scanning the entire templates table for all clients. The
    // exercise library is shared across programs so it stays cached whole. A
    // warm cache serves repeat opens with zero Feishu round-trips (not even a
    // token). Writers invalidate "workoutTemplatesRaw" (prefix) so per-program
    // keys clear too.
    let templateItems = getCached<any[]>("workoutTemplatesRaw");
    let libraryItems = getCached<any[]>("exerciseLibraryRaw");

    if (!templateItems || !libraryItems) {
      const token = await getTenantToken();
      const [templates, library] = await Promise.all([
        templateItems
          ? Promise.resolve(templateItems)
          : fetchAllBitableRecords(
              process.env.FEISHU_BASE_APP_TOKEN as string,
              process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID as string,
              token
            ),
        libraryItems
          ? Promise.resolve(libraryItems)
          : fetchAllBitableRecords(
              process.env.FEISHU_BASE_APP_TOKEN as string,
              process.env.FEISHU_EXERCISE_LIBRARY_TABLE_ID as string,
              token
            ),
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
      if (exerciseName) {
        exerciseLibrary.set(`name:${exerciseName.trim().toLowerCase()}`, fields);
      }
    });

    const exercises = templateItems
      .filter((item: any) => {
        const fields = item.fields || {};

        return (
          fieldToText(fields["Program ID"]) === String(programId) &&
          fieldToText(fields["Week"]) === String(week) &&
          fieldToText(fields["Day"]) === String(day)
        );
      })
      .map((item: any) => {
        const fields = item.fields || {};
        const exerciseId = fieldToText(fields["Exercise ID"]);
        const exerciseName = fieldToText(fields["Exercise Name"]);
        const libraryFields =
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
            readFirstField(libraryFields, ["Exercise Name CN", "Name CN"]),
          videoUrl:
            readFirstUrl(fields, ["Short Video URL", "Video URL"]) ||
            readFirstUrl(libraryFields, ["Short Video URL", "Video URL"]),
          videoUrlCn:
            readFirstUrl(fields, ["Video URL CN"]) ||
            readFirstUrl(libraryFields, ["Video URL CN"]),
          longVideoUrl:
            readFirstUrl(fields, ["Long Video URL"]) ||
            readFirstUrl(libraryFields, ["Long Video URL"]),
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
          order: Number(fieldToText(fields["Order"])) || 0,
          sets: fieldToText(fields["Sets"]),
          reps: fieldToText(fields["Reps"]),
          tempo: fieldToText(fields["Tempo"]),
          rest: fieldToText(fields["Rest"]),
          notes: fieldToText(fields["Coaching Notes"]),
          notesCn: readFirstField(fields, [
            "Coaching Notes CN",
            "Notes CN",
            "Technical Instructions CN",
            "Form Instructions CN",
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
          ).map((alt) => {
            const altLib =
              exerciseLibrary.get(`id:${alt.exerciseId}`) ||
              exerciseLibrary.get(
                `name:${alt.exerciseName.trim().toLowerCase()}`
              ) ||
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
      .sort((a: any, b: any) => a.order - b.order);

    return res.status(200).json({ exercises });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
