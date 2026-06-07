import type { VercelRequest, VercelResponse } from "@vercel/node";

function toNumber(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function linkedRecord(recordId: string) {
  return [{ record_id: recordId }];
}

async function getTenantToken() {
  const response = await fetch(
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
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = await getTenantToken();

    const {
      clientId,
      assignedWorkoutRecordId,
      workoutDate,
      logs,
    } = req.body;

    if (!clientId || !assignedWorkoutRecordId) {
      return res.status(400).json({
        error: "Missing linked record IDs",
        clientId,
        assignedWorkoutRecordId,
      });
    }

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: "No logs received" });
    }

    const createdRecords: string[] = [];

    for (const log of logs) {
      const actualWeight = toNumber(log.actualWeight);
      const actualReps = toNumber(log.actualReps);
      const actualTime = toNumber(log.actualTime);
      const actualDistance = toNumber(log.actualDistance);

      const volume = actualWeight * actualReps;
      const durationSeconds = actualTime;
      const loadScore = volume + durationSeconds;

      const fields: Record<string, any> = {
        "Log ID": `LOG-${Date.now()}-${createdRecords.length + 1}`,

        "Client ID": linkedRecord(clientId),
        "Assigned Workout ID": linkedRecord(assignedWorkoutRecordId),

        "Exercise ID": String(log.exerciseId || ""),
        "Date": workoutDate,

        "Set Number": toNumber(log.setNumber),
        "Prescribed Sets": toNumber(log.prescribedSets),
        "Prescribed Reps": String(log.prescribedReps || ""),
        "Actual Reps": String(log.actualReps || ""),

        "Actual Weight": actualWeight,
        "Weight Unit": "kg",

        "Actual Time": actualTime,
        "Time Unit": "s",

        "Actual Distance": actualDistance,
        "Distance Unit": "m",

        "RPE": toNumber(log.rpe),
        "Pain Score": toNumber(log.painScore),

        "Athlete Notes": String(log.athleteNotes || ""),
        "Exercise Order": toNumber(log.exerciseOrder),
        "Completed": true,

        "Volume": volume,
        "Duration Seconds": durationSeconds,
        "Load Score": loadScore,
      };

      const response = await fetch(
        `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_WORKOUT_LOGS_TABLE_ID}/records`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fields }),
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
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}