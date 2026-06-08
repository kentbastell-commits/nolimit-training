import type { VercelRequest, VercelResponse } from "@vercel/node";

function fieldToText(value: any): string {
  if (!value) return "";

  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.link) return item.link;
        if (item?.url) return item.url;
        if (item?.text) return item.text;
        if (item?.name) return item.name;
        return JSON.stringify(item);
      })
      .join(", ");
  }

  if (value?.link) return value.link;
  if (value?.url) return value.url;
  if (value?.text) return value.text;
  if (value?.name) return value.name;

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

async function getFieldNames(token: string) {
  const response = await fetch(
    `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_EXERCISE_LIBRARY_TABLE_ID}/fields?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await readResponseJson(response);

  if (!response.ok || data.code !== 0) {
    return [];
  }

  return (data?.data?.items || [])
    .map((field: any) => field.field_name || field.name)
    .filter(Boolean);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const tokenResponse = await fetch(
      "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: process.env.LARK_APP_ID,
          app_secret: process.env.LARK_APP_SECRET,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    const token = tokenData.tenant_access_token;
    const [recordsResponse, availableFields] = await Promise.all([
      fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_EXERCISE_LIBRARY_TABLE_ID}/records?page_size=500`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
      ),
      getFieldNames(token),
    ]);

    const data = await readResponseJson(recordsResponse);

    if (!data?.data?.items) {
      return res.status(500).json({
        error: "Lark did not return exercise records",
        larkResponse: data,
      });
    }

    const exercises = data.data.items.map((item: any) => {
      const fields = item.fields || {};
      const notes = readFirstField(fields, CUE_FIELD_CANDIDATES);

      return {
        recordId: item.record_id,
        exerciseId: fieldToText(fields["Exercise ID"]),
        exerciseName: fieldToText(fields["Exercise Name"]),
        videoUrl: fieldToText(fields["Video URL"]),
        category: fieldToText(fields["Category"]),
        equipment: fieldToText(fields["Equipment"]),
        movementPattern: fieldToText(fields["Movement Pattern"]),
        notes,
        status: notes.startsWith("[Archived]")
          ? "Archived"
          : "Active",
      };
    });

    const debugPayload =
      req.query.debug === "1"
        ? {
            availableFields,
            cueFieldCandidates: CUE_FIELD_CANDIDATES,
          }
        : {};

    return res.status(200).json({ exercises, ...debugPayload });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
