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
        if (item?.record_ids) return item.record_ids.join(", ");
        if (item?.link_record_ids) return item.link_record_ids.join(", ");
        return JSON.stringify(item);
      })
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");

  return JSON.stringify(value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { week, day } = req.query;

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
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_WORKOUT_TEMPLATE_TABLE_ID}/records?page_size=100`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
        },
      }
    );

    const data = await recordsResponse.json();

    if (!data?.data?.items) {
      return res.status(500).json({
        error: "Lark did not return workout template records",
        larkResponse: data,
      });
    }

    const exercises = data.data.items
      .filter((item: any) => {
        const fields = item.fields || {};

        return (
          fieldToText(fields["Week"]) === String(week) &&
          fieldToText(fields["Day"]) === String(day)
        );
      })
      .map((item: any) => {
        const fields = item.fields || {};

        return {
          id: item.record_id,
          templateId: fieldToText(fields["Template ID"]),
          exerciseId: fieldToText(fields["Exercise ID"]),
          exerciseName: fieldToText(fields["Exercise Name"]),
          order: Number(fieldToText(fields["Order"])) || 0,
          sets: fieldToText(fields["Sets"]),
          reps: fieldToText(fields["Reps"]),
          tempo: fieldToText(fields["Tempo"]),
          rest: fieldToText(fields["Rest"]),
          notes: fieldToText(fields["Coaching Notes"]),
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