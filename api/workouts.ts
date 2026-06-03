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
    const clientCode = String(req.query.clientCode || "");

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

    if (!tokenData.tenant_access_token) {
      return res.status(500).json({
        error: "Could not get tenant access token",
        details: tokenData,
      });
    }

    const recordsResponse = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_ASSIGNED_WORKOUTS_TABLE_ID}/records?page_size=100`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
        },
      }
    );

    const recordsData = await recordsResponse.json();

    if (recordsData.code !== 0) {
      return res.status(500).json({
        error: "Could not fetch assigned workouts",
        details: recordsData,
      });
    }

    const workouts = recordsData.data.items
      .map((item: any) => {
        const fields = item.fields || {};

        return {
          id: item.record_id,
          assignedWorkoutId: fieldToText(fields["Assigned Workout ID"]),
          clientId: fieldToText(fields["Client ID"]),
          programId: fieldToText(fields["Program ID"]),
          week: fieldToText(fields["Week"]),
          day: fieldToText(fields["Day"]),
          sessionName: fieldToText(fields["Session Name"]),
          scheduledDate: fieldToText(fields["Scheduled Date"]),
          completionStatus: fieldToText(fields["Completion Status"]),
          coachNotes: fieldToText(fields["Coach Notes"]),
          clientNotes: fieldToText(fields["Client Notes"]),
          workoutLogs: fieldToText(fields["Workout Logs"]),
        };
      })
      .filter((workout: any) => {
        if (!clientCode) return true;
        return workout.clientId.includes(clientCode);
      });

    return res.status(200).json({ workouts });
  } catch (error: any) {
    return res.status(500).json({
      error: "Could not fetch workouts",
      message: error.message,
    });
  }
}