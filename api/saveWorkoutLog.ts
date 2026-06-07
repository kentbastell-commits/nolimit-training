import type { VercelRequest, VercelResponse } from "@vercel/node";

async function getTenantToken() {
  const response = await fetch(
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

  const data = await response.json();

  if (!data.tenant_access_token) {
    throw new Error(JSON.stringify(data));
  }

  return data.tenant_access_token;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const token = await getTenantToken();

    const {
      clientId,
      assignedWorkoutId,
      assignedWorkoutRecordId,
      workoutDate,
      logs,
    } = req.body;

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({
        error: "No logs received",
      });
    }

    const createdRecords = [];

    for (const log of logs) {
      const fields = {
        "Client ID": clientId,
        "Assigned Workout ID": assignedWorkoutId,
        "Exercise ID": log.exerciseId || "",
        "Exercise Name": log.exerciseName || "",
        "Date": workoutDate,

        "Set Number": Number(log.setNumber || 0),
        "Prescribed Sets": Number(log.prescribedSets || 0),

        "Prescribed Reps": String(log.prescribedReps || ""),
        "Actual Reps": String(log.actualReps || ""),

        "Actual Weight": Number(log.actualWeight || 0),
        "Weight Unit": "kg",

        "Actual Time": String(log.actualTime || ""),
        "Time Unit": "s",

        "Actual Distance": String(log.actualDistance || ""),
        "Distance Unit": "m",

        "Athlete Notes": log.athleteNotes || "",
        "Exercise Order": Number(log.exerciseOrder || 0),

        "Completed": true,
      };

      const response = await fetch(
        `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_WORKOUT_LOGS_TABLE_ID}/records`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields,
          }),
        }
      );

      const result = await response.json();

      if (result.code !== 0) {
        return res.status(500).json({
          error: "Could not create workout logs",
          details: result,
          failedRecord: fields,
          sentRecords: createdRecords,
        });
      }

      createdRecords.push(result.data.record.record_id);
    }

    return res.status(200).json({
      success: true,
      recordsCreated: createdRecords.length,
      createdRecords,
      assignedWorkoutRecordId,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message,
    });
  }
}