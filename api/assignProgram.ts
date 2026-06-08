import type { VercelRequest, VercelResponse } from "@vercel/node";

type ScheduledWorkout = {
  templateRecordId?: string;
  week: number;
  day: number;
  sessionName: string;
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
      programRecordId,
      scheduledWorkouts,
    } = req.body;

    if (!clientRecordId || !programRecordId) {
      return res.status(400).json({
        error: "Missing clientRecordId or programRecordId",
      });
    }

    if (!Array.isArray(scheduledWorkouts) || scheduledWorkouts.length === 0) {
      return res.status(400).json({
        error: "No scheduled workouts provided",
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

    if (!tokenData.tenant_access_token) {
      return res.status(500).json({
        error: "Could not get Lark tenant access token",
        larkResponse: tokenData,
      });
    }

    const records = scheduledWorkouts.map((workout: ScheduledWorkout) => ({
      fields: {
        "Assigned Workout ID": makeAssignedWorkoutId(),

        // Duplex link fields
        "Client ID": [clientRecordId],
        "Program ID": [programRecordId],

        Week: Number(workout.week),
        Day: Number(workout.day),
        "Session Name": workout.sessionName,

        // Lark date fields usually want timestamp
        "Scheduled Date": new Date(workout.scheduledDate).getTime(),

        "Completion Status": "Scheduled",
      },
    }));

    const createResponse = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_ASSIGNED_WORKOUTS_TABLE_ID}/records/batch_create`,
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