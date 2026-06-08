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
  for (const fieldName of candidates) {
    const value = fieldToText(fields[fieldName]);

    if (value) return value;
  }

  return "";
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

    const recordsResponse = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_EXERCISE_LIBRARY_TABLE_ID}/records?page_size=500`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
        },
      }
    );

    const data = await recordsResponse.json();

    if (!data?.data?.items) {
      return res.status(500).json({
        error: "Lark did not return exercise records",
        larkResponse: data,
      });
    }

    const exercises = data.data.items.map((item: any) => {
      const fields = item.fields || {};
      const notes = readFirstField(fields, [
        "Notes",
        "Technical Cues",
        "Technical Cue",
        "Form Instructions",
        "Form Instruction",
        "Form Cues",
        "Instructions",
        "Cue Notes",
      ]);

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

    return res.status(200).json({ exercises });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
