import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createExerciseResultRecords } from "./exerciseResults";

function toText(value: any): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

function toLarkDate(value: string): number {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  return new Date(`${value}T00:00:00`).getTime();
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
      clientCode,
      assignedWorkoutId,
      assignedWorkoutRecordId,
      programId,
      workoutDate,
      logs,
    } = req.body;

    if (!clientId || !assignedWorkoutRecordId) {
      return res.status(400).json({
        error: "Missing clientId or assignedWorkoutRecordId",
        clientId,
        assignedWorkoutRecordId,
      });
    }

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: "No logs received" });
    }

    const larkDate = toLarkDate(workoutDate);
    const createdRecords: string[] = [];

    for (const log of logs) {
      const fields: Record<string, any> = {
        "Log ID": `LOG-${Date.now()}-${createdRecords.length + 1}`,

        "Client ID": [clientId],
        "Assigned Workout ID": [assignedWorkoutRecordId],

        "Exercise Name": toText(log.exerciseName),

        "Date": larkDate,

        "Set Number": toText(log.setNumber),
        "Prescribed Sets": toText(log.prescribedSets),
        "Prescribed Reps": toText(log.prescribedReps),
        "Actual Reps": toText(log.actualReps),
        "Actual Weight": toText(log.actualWeight),
        "Weight Unit": "kg",
        "Actual Time": toText(log.actualTime),
        "Time Unit": "s",
        "Actual Distance": toText(log.actualDistance),
        "Distance Unit": "m",
        "Exercise Order": toText(log.exerciseOrder),

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
      exerciseResults: await createExerciseResultRecords(token, {
        clientId: clientCode || clientId,
        clientRecordId: clientId,
        assignedWorkoutId,
        programId,
        workoutDate,
        logs,
      }),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
