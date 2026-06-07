import type { VercelRequest, VercelResponse } from "@vercel/node";

function toNumber(value: any): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function calculateVolume(weight: any, reps: any): number {
  return toNumber(weight) * toNumber(reps);
}

function calculateDurationSeconds(time: any): number {
  return toNumber(time);
}

function calculateLoadScore(weight: any, reps: any, time: any): number {
  return calculateVolume(weight, reps) + calculateDurationSeconds(time);
}

function linkedRecord(recordIdOrCode: string) {
  if (!recordIdOrCode) return undefined;

  return [
    {
      record_id: recordIdOrCode,
    },
  ];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const {
      clientId,
      assignedWorkoutId,
      assignedWorkoutRecordId,
      workoutDate,
      logs,
    } = req.body;

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({
        error: "Missing logs array",
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
        error: "Could not get Lark token",
        details: tokenData,
      });
    }

    const records = logs.map((log: any, index: number) => {
      const volume = calculateVolume(log.actualWeight, log.actualReps);
      const durationSeconds = calculateDurationSeconds(log.actualTime);
      const loadScore = calculateLoadScore(
        log.actualWeight,
        log.actualReps,
        log.actualTime
      );

      const fields: Record<string, any> = {
        "Log ID": `LOG-${Date.now()}-${index + 1}`,

        // Linked-record fields:
        // These MUST receive actual Lark record IDs, not CL-0001 or AW-0001 text.
        "Client ID": linkedRecord(clientId),
        "Assigned Workout ID": linkedRecord(assignedWorkoutRecordId),

        // Exercise ID may be text or linked depending on your table.
        // If Exercise ID is linked, this may also need record IDs later.
        "Exercise ID": log.exerciseId,

        "Date": workoutDate,
        "Exercise Order": toNumber(log.exerciseOrder),
        "Set Number": toNumber(log.setNumber),
        "Prescribed Sets": toNumber(log.prescribedSets),
        "Prescribed Reps": log.prescribedReps,
        "Actual Reps": log.actualReps,
        "Actual Weight": toNumber(log.actualWeight),
        "Weight Unit": "kg",
        "Actual Time": toNumber(log.actualTime),
        "Time Unit": "sec",
        "Actual Distance": toNumber(log.actualDistance),
        "Distance Unit": "m",
        "RPE": toNumber(log.rpe),
        "Pain Score": toNumber(log.painScore),
        "Completed": true,
        "Athlete Notes": log.athleteNotes || "",
        "Volume": volume,
        "Duration Seconds": durationSeconds,
        "Load Score": loadScore,
      };

      Object.keys(fields).forEach((key) => {
        if (fields[key] === undefined) {
          delete fields[key];
        }
      });

      return { fields };
    });

    const createResponse = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_WORKOUT_LOGS_TABLE_ID}/records/batch_create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records }),
      }
    );

    const createData = await createResponse.json();

    if (createData.code !== 0) {
      return res.status(500).json({
        error: "Could not create workout logs",
        details: createData,
        sentRecords: records,
      });
    }

    return res.status(200).json({
      success: true,
      created: records.length,
      details: createData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}