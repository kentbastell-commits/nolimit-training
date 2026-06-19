import type { VercelRequest, VercelResponse } from "@vercel/node";

type ScheduledWorkout = {
  templateRecordId?: string;
  week: number;
  day: number;
  sessionName: string;
  sessionNameCn?: string;
  sessionType?: string;
  sessionGoal?: string;
  estimatedDuration?: string;
  intensity?: string;
  scheduledDate: string;
};

function makeAssignedWorkoutId() {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `AW-${random}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const {
      clientRecordId,
      clientRecordIds,
      programRecordId,
      scheduledWorkouts,
    } = req.body;

    // Accept a single client (per-athlete assign) or many (team assign).
    const targetClientIds: string[] = Array.isArray(clientRecordIds)
      ? clientRecordIds.filter(Boolean)
      : clientRecordId
      ? [clientRecordId]
      : [];

    if (targetClientIds.length === 0 || !programRecordId) {
      return res.status(400).json({
        error: "Missing client(s) or programRecordId",
      });
    }

    if (!Array.isArray(scheduledWorkouts) || scheduledWorkouts.length === 0) {
      return res.status(400).json({
        error: "No scheduled workouts provided",
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
        error: "Could not get Lark tenant access token",
        larkResponse: tokenData,
      });
    }

    // One workout record per (client × scheduled workout) so a single call can
    // populate a whole team.
    const records = targetClientIds.flatMap((cid: string) =>
      scheduledWorkouts.map((workout: ScheduledWorkout) => {
        const fields: Record<string, any> = {
          "Assigned Workout ID": makeAssignedWorkoutId(),

          // Duplex link fields
          "Client ID": [cid],
          "Program ID": [programRecordId],

          Week: Number(workout.week),
          Day: Number(workout.day),
          "Session Name": workout.sessionName,
          "Session Type": workout.sessionType || "Strength",
          "Session Goal": workout.sessionGoal || "",
          Intensity: workout.intensity || "Moderate",

          // Lark date fields usually want timestamp
          "Scheduled Date": new Date(workout.scheduledDate).getTime(),

          "Completion Status": "Scheduled",
        };

        // "Estimated Duration" is a Number field — only send a real number, never
        // "" (which Feishu rejects with NumberFieldConvFail).
        const durationNumber = Number(workout.estimatedDuration);
        if (Number.isFinite(durationNumber) && durationNumber > 0) {
          fields["Estimated Duration"] = durationNumber;
        }

        if (workout.sessionNameCn) {
          fields["Session Name CN"] = workout.sessionNameCn;
        }

        return { fields };
      })
    );

    const createResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID}/records/batch_create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records,
        }),
      }
    );

    const createData = await createResponse.json();

    if (!createResponse.ok || createData.code !== 0) {
      return res.status(500).json({
        error: "Failed to assign program",
        larkResponse: createData,
        recordsSent: records,
      });
    }

    return res.status(200).json({
      success: true,
      recordsCreated: createData?.data?.records?.length || records.length,
      larkResponse: createData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
