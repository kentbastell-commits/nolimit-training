import type { VercelRequest, VercelResponse } from "@vercel/node";
import { invalidateCache } from "./_cache.ts";
import { fetchAllBitableRecords } from "./_pagination.ts";

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
        return "";
      })
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.link) return value.link;
  if (value?.url) return value.url;

  return "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { assignedWorkoutRecordId, assignedWorkoutId, scheduledDate } = req.body;

    if ((!assignedWorkoutRecordId && !assignedWorkoutId) || !scheduledDate) {
      return res.status(400).json({
        error: "Missing assignedWorkoutRecordId/assignedWorkoutId or scheduledDate",
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

    let recordId = assignedWorkoutRecordId;

    if (!String(recordId || "").startsWith("rec") && assignedWorkoutId) {
      const items = await fetchAllBitableRecords(
        process.env.FEISHU_BASE_APP_TOKEN as string,
        process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID as string,
        tokenData.tenant_access_token
      );
      const match = items.find((item: any) => {
        return fieldToText(item.fields?.["Assigned Workout ID"]) ===
          String(assignedWorkoutId);
      });

      recordId = match?.record_id || recordId;
    }

    const updateResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID}/records/${recordId}`,
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

    invalidateCache("workouts");
    invalidateCache("analytics");
    return res.status(200).json({
      success: true,
      assignedWorkoutRecordId: recordId,
      assignedWorkoutId,
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
