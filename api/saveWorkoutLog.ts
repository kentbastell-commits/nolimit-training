import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createExerciseResultRecords } from "./exerciseResults";

function toText(value: any): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

// Coerce to a number for Feishu Number fields; undefined for blank/non-numeric
// so the field is omitted (Feishu rejects "" on Number fields).
function toNum(value: any): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const direct = Number(value);
  if (Number.isFinite(direct)) return direct;
  const match = String(value).match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
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
      sessionRpe,
      sessionDurationMin,
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

        // Set Number is a Text field; the rest are Number fields — only send
        // them when numeric so blanks (e.g. cardio with no reps) don't trip
        // NumberFieldConvFail and fail the whole record.
        "Set Number": toText(log.setNumber),
        "Weight Unit": "kg",
        "Time Unit": "s",
        "Distance Unit": "m",

        "Completed": true,
      };

      const numberFields: Array<[string, any]> = [
        ["Prescribed Sets", log.prescribedSets],
        ["Prescribed Reps", log.prescribedReps],
        ["Actual Reps", log.actualReps],
        ["Actual Weight", log.actualWeight],
        ["Actual Time", log.actualTime],
        ["Actual Distance", log.actualDistance],
        ["Exercise Order", log.exerciseOrder],
      ];
      for (const [name, raw] of numberFields) {
        const value = toNum(raw);
        if (value !== undefined) fields[name] = value;
      }

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
      const assignedWorkoutFields = await getTableFields(
        process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID,
        token
      );
      const assignedClientNotesField = resolveFieldName(assignedWorkoutFields, [
        "Client Notes",
        "Client Comment",
        "Workout Comment",
        "Athlete Notes",
      ]);
      const sessionRpeField = resolveFieldName(assignedWorkoutFields, [
        "Session RPE",
        "RPE",
      ]);
      const sessionDurationField = resolveFieldName(assignedWorkoutFields, [
        "Session Duration",
      ]);
      const sessionLoadField = resolveFieldName(assignedWorkoutFields, [
        "Session Load",
      ]);
      const assignedFields: Record<string, any> = {
        "Completion Status": "Completed",
      };

      if (assignedClientNotesField && submissionNote) {
        assignedFields[assignedClientNotesField] = toText(submissionNote);
      }

      // Internal training load = session RPE × duration (sRPE method). External
      // load (tonnage) is derived from the per-set logs above.
      const rpeNum = toNum(sessionRpe);
      const durNum = toNum(sessionDurationMin);
      if (sessionRpeField && rpeNum !== undefined) {
        assignedFields[sessionRpeField] = rpeNum;
      }
      if (sessionDurationField && durNum !== undefined) {
        assignedFields[sessionDurationField] = durNum;
      }
      if (
        sessionLoadField &&
        rpeNum !== undefined &&
        durNum !== undefined
      ) {
        assignedFields[sessionLoadField] = Math.round(rpeNum * durNum);
      }

      const updateResponse = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID}/records/${assignedWorkoutRecordId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fields: assignedFields }),
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
