import type { VercelRequest, VercelResponse } from "@vercel/node";

function fieldToText(value: any): string {
  if (!value) return "";

  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

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
        return JSON.stringify(item);
      })
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.link) return value.link;
  if (value?.url) return value.url;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");

  return JSON.stringify(value);
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

    const tokenResponse = await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: process.env.FEISHU_APP_ID,
          app_secret: process.env.FEISHU_APP_SECRET,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.tenant_access_token) {
      return res.status(500).json({
        error: "Could not get Lark tenant token",
        larkResponse: tokenData,
      });
    }

    const [recordsResponse, libraryResponse] = await Promise.all([
      fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID}/records?page_size=500`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.tenant_access_token}`,
          },
        }
      ),
      fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_EXERCISE_LIBRARY_TABLE_ID}/records?page_size=500`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.tenant_access_token}`,
          },
        }
      ),
    ]);

    const data = await recordsResponse.json();
    const libraryData = await libraryResponse.json();

    if (!data?.data?.items) {
      return res.status(500).json({
        error: "Lark did not return workout template records",
        larkResponse: data,
      });
    }

    const exerciseLibrary = new Map<string, Record<string, any>>();
    (libraryData?.data?.items || []).forEach((item: any) => {
      const fields = item.fields || {};
      const exerciseId = fieldToText(fields["Exercise ID"]);
      const exerciseName = fieldToText(fields["Exercise Name"]);

      if (exerciseId) exerciseLibrary.set(`id:${exerciseId}`, fields);
      if (exerciseName) {
        exerciseLibrary.set(`name:${exerciseName.trim().toLowerCase()}`, fields);
      }
    });

    const exercises = data.data.items
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
            fieldToText(fields["Video URL"]) ||
            fieldToText(libraryFields["Video URL"]),
          videoUrlCn:
            readFirstField(fields, ["Video URL CN"]) ||
            readFirstField(libraryFields, ["Video URL CN"]),
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
