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
    const tableUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_EXERCISE_LIBRARY_TABLE_ID}/records`;
    const archivedNotes = String(notes || "").startsWith("[Archived]")
      ? String(notes || "")
      : `[Archived]\n${String(notes || "")}`.trim();

    const fields: Record<string, any> = {
      "Exercise ID": exerciseId || makeExerciseId(exerciseName),
      "Exercise Name": exerciseName || "",
      Notes: archive ? archivedNotes : notes || "",
    };

    const videoField = makeUrlField(videoUrl);
    const equipmentField = makeMultiSelectField(equipment);

    if (videoField) fields["Video URL"] = videoField;
    if (category) fields.Category = category;
    if (equipmentField.length > 0) fields.Equipment = equipmentField;
    if (movementPattern) fields["Movement Pattern"] = movementPattern;

    const response = await fetch(recordId ? `${tableUrl}/${recordId}` : tableUrl, {
      method: recordId ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });

    const data = await readResponseJson(response);

    if (!response.ok || data.code !== 0) {
      return res.status(500).json({
        error: recordId ? "Failed to update exercise" : "Failed to create exercise",
        larkResponse: data,
        fieldsSent: fields,
      });
    }

    return res.status(200).json({
      success: true,
      exerciseId: fields["Exercise ID"],
      recordId: data?.data?.record?.record_id || recordId,
      archived: Boolean(archive),
      larkResponse: data,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
