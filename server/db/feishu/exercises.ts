// Feishu-backed exercises read + upsert. Logic moved verbatim from
// api/exercises.ts and api/upsertExercise.ts so behavior is identical while
// Feishu remains the active backend.
import { listRecords, getFieldNames, getTenantToken, appToken } from "./client.ts";
import type { ExerciseDTO, ExerciseListResult } from "../dto.ts";
import type {
  UpsertExerciseInput,
  UpsertExerciseResult,
} from "../repositories/exercises.ts";

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

/* ------------------------------- upsert ----------------------------------
 * Moved verbatim from api/upsertExercise.ts. The impl decides HTTP status +
 * exact JSON body (several distinct 400 shapes existed), the handler just
 * relays them, and the repository invalidates caches on success. */

export function makeExerciseId(name: string) {
  const prefix = name
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "EX");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `EX-${prefix}-${random}`;
}

async function readResponseJson(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      code: -1,
      error: "Non-JSON response",
      status: response.status,
      body: text,
    };
  }
}

function makeMultiSelectField(value: string) {
  return String(value || "")
    .split(/[\/,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// Typed field introspection (name + column type). The shared getFieldNames()
// returns names only, and the upsert needs types to shape URL vs Text values.
async function getExerciseFieldInfo(token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${process.env.FEISHU_EXERCISE_LIBRARY_TABLE_ID}/fields?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await readResponseJson(response);

  if (!response.ok || data.code !== 0) {
    throw new Error(`Could not load exercise table fields: ${JSON.stringify(data)}`);
  }

  const items = (data?.data?.items || []) as any[];
  const names = items
    .map((field: any) => field.field_name || field.name)
    .filter(Boolean);
  const typeByName = new Map<string, number>(
    items
      .filter((field: any) => field.field_name || field.name)
      .map((field: any) => [field.field_name || field.name, field.type])
  );
  return { names, typeByName };
}

// Build a value for a URL(15) or Text(1) field; returns undefined for empty or
// for unsupported field types (e.g. an Attachment field) so we never send a
// value Feishu will reject.
function videoFieldValue(value: unknown, type: number | undefined) {
  const clean = String(value || "").trim();
  if (!clean) return undefined;
  if (type === 15) return { link: clean, text: clean };
  if (type === 1) return clean;
  return undefined;
}

function filterExistingFields(
  fields: Record<string, any>,
  availableFieldNames: string[]
) {
  const available = new Set(availableFieldNames);
  const existingFields: Record<string, any> = {};
  const omittedFields: string[] = [];

  Object.entries(fields).forEach(([fieldName, value]) => {
    if (available.has(fieldName)) {
      existingFields[fieldName] = value;
    } else {
      omittedFields.push(fieldName);
    }
  });

  return {
    existingFields,
    omittedFields,
  };
}

function findFirstField(availableFieldNames: string[], candidates: string[]) {
  const normalizedFields = new Map(
    availableFieldNames.map((fieldName) => [
      fieldName.trim().toLowerCase(),
      fieldName,
    ])
  );

  for (const candidate of candidates) {
    const match = normalizedFields.get(candidate.trim().toLowerCase());

    if (match) return match;
  }

  return undefined;
}

export async function upsertExercise(
  input: UpsertExerciseInput
): Promise<UpsertExerciseResult> {
  const {
    recordId,
    exerciseId,
    exerciseName,
    videoUrl,
    longVideoUrl,
    category,
    equipment,
    movementPattern,
    muscleGroup,
    notes,
    archive,
  } = input;

  const token = await getTenantToken();
  const tableUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${process.env.FEISHU_EXERCISE_LIBRARY_TABLE_ID}/records`;
  const fieldInfo = await getExerciseFieldInfo(token);
  const availableFields = fieldInfo.names;
  const typeByName = fieldInfo.typeByName;
  const cueFieldName = findFirstField(availableFields, CUE_FIELD_CANDIDATES);
  const hasNotesToSave = notes !== undefined && String(notes).trim() !== "";

  if (hasNotesToSave && !cueFieldName) {
    return {
      success: false,
      status: 400,
      body: {
        error: "Exercise Library table is missing a technical cues field",
        message:
          "Add a text field named Professional Coaching Cues, Technical Cues, or Notes to the Lark Exercise Library table, then save again.",
        recommendedFields: ["Professional Coaching Cues", "Technical Cues", "Notes"],
        cueFieldCandidates: CUE_FIELD_CANDIDATES,
        availableFields,
      },
    };
  }

  const archivedNotes = String(notes || "").startsWith("[Archived]")
    ? String(notes || "")
    : `[Archived]\n${String(notes || "")}`.trim();

  const fields: Record<string, any> = {
    // exerciseName can be undefined on an archive-only request; the original
    // handler let makeExerciseId throw in that case (caught -> 500 Server
    // error), so keep the same runtime behavior rather than masking it.
    "Exercise ID": exerciseId || makeExerciseId(exerciseName as string),
    "Exercise Name": exerciseName || "",
    Status: archive ? "Archived" : "Active",
  };

  if (cueFieldName) {
    fields[cueFieldName] = archive ? archivedNotes : notes || "";
  }

  const equipmentField = makeMultiSelectField(equipment || "");

  // Short video: the field was renamed "Video URL" -> "Short Video URL"; write
  // to whichever exists, honoring its column type. Long video only if its
  // column is URL/Text (skip silently if it's e.g. an Attachment field).
  const shortVideoFieldName =
    ["Short Video URL", "Video URL"].find((name) => typeByName.has(name)) || "";
  if (shortVideoFieldName) {
    const value = videoFieldValue(videoUrl, typeByName.get(shortVideoFieldName));
    if (value !== undefined) fields[shortVideoFieldName] = value;
  }
  if (typeByName.has("Long Video URL")) {
    const value = videoFieldValue(longVideoUrl, typeByName.get("Long Video URL"));
    if (value !== undefined) fields["Long Video URL"] = value;
  }
  if (category) fields.Category = category;
  if (equipmentField.length > 0) fields.Equipment = equipmentField;
  if (movementPattern) fields["Movement Pattern"] = movementPattern;
  if (muscleGroup) fields["Primary Muscles"] = muscleGroup;

  const { existingFields, omittedFields } = filterExistingFields(
    fields,
    availableFields
  );
  const missingRequiredFields = ["Exercise ID", "Exercise Name"].filter(
    (fieldName) => !existingFields[fieldName]
  );

  if (missingRequiredFields.length > 0) {
    return {
      success: false,
      status: 400,
      body: {
        error: "Exercise Library table is missing required fields",
        missingRequiredFields,
        availableFields,
        fieldsAttempted: fields,
      },
    };
  }

  const response = await fetch(recordId ? `${tableUrl}/${recordId}` : tableUrl, {
    method: recordId ? "PUT" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: existingFields }),
  });

  const data = await readResponseJson(response);

  if (!response.ok || data.code !== 0) {
    return {
      success: false,
      status: 500,
      body: {
        error: recordId ? "Failed to update exercise" : "Failed to create exercise",
        larkResponse: data,
        fieldsSent: existingFields,
        omittedFields,
        availableFields,
      },
    };
  }

  return {
    success: true,
    status: 200,
    body: {
      success: true,
      exerciseId: fields["Exercise ID"],
      recordId: data?.data?.record?.record_id || recordId,
      archived: Boolean(archive),
      omittedFields,
      cueFieldName,
      availableFields,
      fieldsSent: existingFields,
      larkResponse: data,
    },
  };
}
