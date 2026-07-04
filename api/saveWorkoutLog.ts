import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createExerciseResultRecords } from "./exerciseResults";
import { invalidateCache } from "./_cache.ts";
import { getTenantToken } from "./_token.ts";

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

// Feishu tenant token now comes from the shared in-memory cache (./_token.ts).

// Table layouts change ~never; cache them in-process so each submit skips two
// Feishu round-trips (they were fetched fresh on every single workout save).
const tableFieldsCache = new Map<string, { fields: any[]; at: number }>();
const TABLE_FIELDS_TTL_MS = 10 * 60 * 1000;

async function getTableFields(tableId: string, token: string) {
  const cached = tableFieldsCache.get(tableId);
  if (cached && Date.now() - cached.at < TABLE_FIELDS_TTL_MS) {
    return cached.fields;
  }
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

  const fields = data.data?.items || [];
  tableFieldsCache.set(tableId, { fields, at: Date.now() });
  return fields;
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
    const assignedWorkoutsTableId = process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID;
    // Both table layouts in one parallel round-trip (cached after first call).
    const [tableFields, assignedWorkoutFields] = await Promise.all([
      workoutLogsTableId
        ? getTableFields(workoutLogsTableId, token)
        : Promise.resolve([]),
      assignedWorkoutsTableId
        ? getTableFields(assignedWorkoutsTableId, token)
        : Promise.resolve([]),
    ]);
    const notesFieldName = resolveFieldName(tableFields, [
      "Notes",
      "Note",
      "Client Notes",
      "Client Comment",
      "Workout Comment",
      "Athlete Notes",
      "Session Notes",
    ]);

    // Build every set's record first, then create them in one batch call.
    // (Previously this POSTed one record per set sequentially — a 20-set
    // workout meant ~20 round-trips on the client's "Finish Workout" tap.)
    const recordsToCreate = logs.map((log: any, index: number) => {
      const fields: Record<string, any> = {
        "Log ID": `LOG-${Date.now()}-${index + 1}`,

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

        // Per-set truth from the player (✓ or typed value). Older clients that
        // don't send the flag keep the historical "all done" behavior.
        "Completed": log.completed === false ? false : true,
      };

      const numberFields: Array<[string, any]> = [
        ["Prescribed Sets", log.prescribedSets],
        ["Prescribed Reps", log.prescribedReps],
        ["Actual Reps", log.actualReps],
        ["Actual Weight", log.actualWeight],
        ["Actual Time", log.actualTime],
        ["Actual Distance", log.actualDistance],
        ["Actual RPE", log.actualRpe],
        ["Actual RIR", log.actualRir],
        ["Exercise Order", log.exerciseOrder],
      ];
      for (const [name, raw] of numberFields) {
        const value = toNum(raw);
        if (value !== undefined) fields[name] = value;
      }

      if (notesFieldName && submissionNote) {
        fields[notesFieldName] = toText(submissionNote);
      }

      return { fields };
    });

    // Feishu batch_create caps each request; chunk to stay well under the limit.
    for (let i = 0; i < recordsToCreate.length; i += 200) {
      const chunk = recordsToCreate.slice(i, i + 200);

      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${workoutLogsTableId}/records/batch_create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ records: chunk }),
        }
      );

      const result = await response.json();

      if (result.code !== 0) {
        return res.status(500).json({
          error: "Could not create workout logs",
          details: result,
          failedRecords: chunk,
          sentRecords: createdRecords,
        });
      }

      for (const record of result.data?.records || []) {
        createdRecords.push(record.record_id);
      }
    }

    let assignedWorkoutUpdate: any = null;
    let assignedWorkoutUpdatePromise: Promise<any> | null = null;

    if (assignedWorkoutsTableId) {
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

      // Fire the status update but don't await yet — it runs concurrently
      // with the exercise-results write below (they're independent).
      assignedWorkoutUpdatePromise = fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${assignedWorkoutsTableId}/records/${assignedWorkoutRecordId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fields: assignedFields }),
        }
      ).then((r) => r.json());
    }

    // Run the two remaining writes in parallel — previously sequential, which
    // was a big part of the athlete's post-submit wait.
    const [assignedWorkoutResult, exerciseResults] = await Promise.all([
      assignedWorkoutUpdatePromise ?? Promise.resolve(null),
      createExerciseResultRecords(token, {
        clientId: clientCode || clientId,
        clientRecordId: clientId,
        assignedWorkoutId,
        programId,
        workoutDate,
        logs,
      }),
    ]);
    assignedWorkoutUpdate = assignedWorkoutResult;

    // New logs change every client's history view; drop the cached scan.
    invalidateCache("workoutLogs");
    invalidateCache("exerciseResults");
    invalidateCache("workouts");
    invalidateCache("workoutComments");
    invalidateCache("analytics");

    return res.status(200).json({
      success: true,
      recordsCreated: createdRecords.length,
      createdRecords,
      assignedWorkoutUpdate,
      exerciseResults,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
