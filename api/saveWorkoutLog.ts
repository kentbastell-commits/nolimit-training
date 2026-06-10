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

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveFieldName(fields: any[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeFieldName);
  const match = fields.find((field) =>
    normalizedAliases.includes(
      normalizeFieldName(field.field_name || field.name || "")
    )
  );

  return match?.field_name || match?.name || "";
}

async function getTenantToken() {
  const response = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET,
      }),
    }
  );

  const data = await response.json();

  if (!data.tenant_access_token) {
    throw new Error(JSON.stringify(data));
  }

  return data.tenant_access_token;
}

async function getTableFields(tableId: string, token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/fields?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();

  if (data.code !== 0) {
    return [];
  }

  return data.data?.items || [];
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
      submissionNote,
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
    const workoutLogsTableId = process.env.FEISHU_WORKOUT_LOGS_TABLE_ID;
    const tableFields = workoutLogsTableId
      ? await getTableFields(workoutLogsTableId, token)
      : [];
    const notesFieldName = resolveFieldName(tableFields, [
      "Notes",
      "Note",
      "Client Notes",
      "Client Comment",
      "Workout Comment",
      "Athlete Notes",
      "Session Notes",
    ]);

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

      if (notesFieldName && submissionNote) {
        fields[notesFieldName] = toText(submissionNote);
      }

      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${workoutLogsTableId}/records`,
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

    let assignedWorkoutUpdate: any = null;

    if (process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID) {
      const updateResponse = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID}/records/${assignedWorkoutRecordId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: {
              "Completion Status": "Completed",
            },
          }),
        }
      );

      assignedWorkoutUpdate = await updateResponse.json();
    }

    return res.status(200).json({
      success: true,
      recordsCreated: createdRecords.length,
      createdRecords,
      assignedWorkoutUpdate,
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
