import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { assignedWorkoutRecordId, scheduledDate } = req.body;

    if (!assignedWorkoutRecordId || !scheduledDate) {
      return res.status(400).json({
        error: "Missing assignedWorkoutRecordId or scheduledDate",
      });
    }

    const tokenResponse = await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

    const updateResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID}/records/${assignedWorkoutRecordId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            "Scheduled Date": new Date(scheduledDate).getTime(),
          },
        }),
      }
    );

    const updateData = await updateResponse.json();

    if (!updateResponse.ok || updateData.code !== 0) {
      return res.status(500).json({
        error: "Failed to update assigned workout date",
        larkResponse: updateData,
      });
    }

    return res.status(200).json({
      success: true,
      assignedWorkoutRecordId,
      scheduledDate,
      larkResponse: updateData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}