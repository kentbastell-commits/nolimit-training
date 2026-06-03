import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const { programId, week, day } = req.query;

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

    const accessToken = tokenData.tenant_access_token;

    const response = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_WORKOUT_TEMPLATE_TABLE_ID}/records`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    const exercises = data.data.items
      .filter((item: any) => {
        const fields = item.fields;

        return (
          String(fields["Program ID"]) === String(programId) &&
          String(fields["Week"]) === String(week) &&
          String(fields["Day"]) === String(day)
        );
      })
      .map((item: any) => ({
        exerciseId: item.fields["Exercise ID"] || "",
        exerciseName: item.fields["Exercise Name"] || "",
        sets: item.fields["Sets"] || "",
        reps: item.fields["Reps"] || "",
        tempo: item.fields["Tempo"] || "",
        rest: item.fields["Rest"] || "",
        notes: item.fields["Coaching Notes"] || "",
        order: item.fields["Order"] || 0,
      }))
      .sort((a: any, b: any) => a.order - b.order);

    return res.status(200).json({
      exercises,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message,
    });
  }
}