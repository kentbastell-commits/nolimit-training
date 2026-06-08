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
        return JSON.stringify(item);
      })
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.link) return value.link;
  if (value?.url) return value.url;

  return JSON.stringify(value);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const { programId } = req.query;

    if (!programId) {
      return res.status(400).json({
        error: "Missing programId",
      });
    }

    const tokenResponse = await fetch(
      "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: process.env.LARK_APP_ID,
          app_secret: process.env.LARK_APP_SECRET,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    const recordsResponse = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_WORKOUT_TEMPLATE_TABLE_ID}/records?page_size=500`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
        },
      }
    );

    const data = await recordsResponse.json();

    if (!data?.data?.items) {
      return res.status(500).json({
        error: "No workout template records returned",
        larkResponse: data,
      });
    }

    const templates = data.data.items
      .filter((item: any) => {
        const fields = item.fields || {};

        return (
          fieldToText(fields["Program ID"]) === String(programId)
        );
      })
      .map((item: any) => {
        const fields = item.fields || {};

        return {
          recordId: item.record_id,
          week: Number(fieldToText(fields["Week"])) || 1,
          day: Number(fieldToText(fields["Day"])) || 1,
          sessionName: fieldToText(fields["Session Name"]),
          exerciseName: fieldToText(fields["Exercise Name"]),
          exerciseId: fieldToText(fields["Exercise ID"]),
          order: Number(fieldToText(fields["Order"])) || 0,
        };
      })
      .sort((a: any, b: any) => {
        if (a.week !== b.week) {
          return a.week - b.week;
        }

        if (a.day !== b.day) {
          return a.day - b.day;
        }

        return a.order - b.order;
      });

    return res.status(200).json({
      templates,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}