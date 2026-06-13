import type { VercelRequest, VercelResponse } from "@vercel/node";

function makeExerciseId(name: string) {
  const prefix = name
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "EX");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `EX-${prefix}-${random}`;
}

async function getTenantToken() {
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

  const tokenData = await readResponseJson(tokenResponse);

  if (!tokenData.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.tenant_access_token;
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

function makeUrlField(value: string) {
  const clean = String(value || "").trim();

  if (!clean) return "";

  return {
    link: clean,
    text: clean,
  };
}

function makeMultiSelectField(value: string) {
  return String(value || "")
    .split(/[\/,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function getFieldNames(token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_EXERCISE_LIBRARY_TABLE_ID}/fields?page_size=100`,
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

  return (data?.data?.items || [])
    .map((field: any) => field.field_name || field.name)
    .filter(Boolean);
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

const CUE_FIELD_CANDIDATES = [
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      recordId,
      exerciseId,
      exerciseName,
      videoUrl,
      category,
      equipment,
      movementPattern,
      notes,
      archive,
    } = req.body;

    if (!exerciseName && !archive) {
      return res.status(400).json({ error: "Missing exercise name" });
    }

    const token = await getTenantToken();
    const tableUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_EXERCISE_LIBRARY_TABLE_ID}/records`;
    const availableFields = await getFieldNames(token);
    const cueFieldName = findFirstField(availableFields, CUE_FIELD_CANDIDATES);
    const hasNotesToSave = notes !== undefined && String(notes).trim() !== "";

    if (hasNotesToSave && !cueFieldName) {
      return res.status(400).json({
        error: "Exercise Library table is missing a technical cues field",
        message:
          "Add a text field named Professional Coaching Cues, Technical Cues, or Notes to the Lark Exercise Library table, then save again.",
        recommendedFields: ["Professional Coaching Cues", "Technical Cues", "Notes"],
        cueFieldCandidates: CUE_FIELD_CANDIDATES,
        availableFields,
      });
    }

    const archivedNotes = String(notes || "").startsWith("[Archived]")
      ? String(notes || "")
      : `[Archived]\n${String(notes || "")}`.trim();

    const fields: Record<string, any> = {
      "Exercise ID": exerciseId || makeExerciseId(exerciseName),
      "Exercise Name": exerciseName || "",
      Status: archive ? "Archived" : "Active",
    };

    if (cueFieldName) {
      fields[cueFieldName] = archive ? archivedNotes : notes || "";
    }

    const videoField = makeUrlField(videoUrl);
    const equipmentField = makeMultiSelectField(equipment);

    if (videoField) fields["Video URL"] = videoField;
    if (category) fields.Category = category;
    if (equipmentField.length > 0) fields.Equipment = equipmentField;
    if (movementPattern) fields["Movement Pattern"] = movementPattern;

    const { existingFields, omittedFields } = filterExistingFields(
      fields,
      availableFields
    );
    const missingRequiredFields = ["Exercise ID", "Exercise Name"].filter(
      (fieldName) => !existingFields[fieldName]
    );

    if (missingRequiredFields.length > 0) {
      return res.status(400).json({
        error: "Exercise Library table is missing required fields",
        missingRequiredFields,
        availableFields,
        fieldsAttempted: fields,
      });
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
      return res.status(500).json({
        error: recordId ? "Failed to update exercise" : "Failed to create exercise",
        larkResponse: data,
        fieldsSent: existingFields,
        omittedFields,
        availableFields,
      });
    }

    return res.status(200).json({
      success: true,
      exerciseId: fields["Exercise ID"],
      recordId: data?.data?.record?.record_id || recordId,
      archived: Boolean(archive),
      omittedFields,
      cueFieldName,
      availableFields,
      fieldsSent: existingFields,
      larkResponse: data,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
