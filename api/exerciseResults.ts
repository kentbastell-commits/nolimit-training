import type { VercelRequest, VercelResponse } from "@vercel/node";

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
        if (item?.record_ids) return item.record_ids.join(", ");
        if (item?.link_record_ids) return item.link_record_ids.join(", ");
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");

  return JSON.stringify(value);
}

function normalizeDate(value: any) {
  const text = fieldToText(value);

  if (!text) return "";
  if (/^\d+$/.test(text)) return new Date(Number(text)).toISOString().split("T")[0];

  return text.split("T")[0].split(" ")[0];
}

function toLarkDate(value: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  return new Date(`${value}T00:00:00`).getTime();
}

function toNumberOrUndefined(value: any) {
  if (value === undefined || value === null || value === "") return undefined;
  const directNumber = Number(value);

  if (Number.isFinite(directNumber)) return directNumber;

  const match = String(value).match(/\d+(\.\d+)?/);
  if (!match) return undefined;

  const parsedNumber = Number(match[0]);
  return Number.isFinite(parsedNumber) ? parsedNumber : undefined;
}

function estimateOneRepMax(weight: number | undefined, reps: number | undefined) {
  if (!weight || !reps) return undefined;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
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
    throw new Error(`Could not get tenant token: ${JSON.stringify(data)}`);
  }

  return data.tenant_access_token;
}

async function createRecord(token: string, fields: Record<string, any>) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_EXERCISE_RESULTS_TABLE_ID}/records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  return response.json();
}

export async function createExerciseResultRecords(
  token: string,
  {
    clientId,
    clientRecordId,
    assignedWorkoutId,
    programId,
    workoutDate,
    logs,
  }: {
    clientId: string;
    clientRecordId?: string;
    assignedWorkoutId?: string;
    programId?: string;
    workoutDate: string;
    logs: any[];
  }
) {
  if (!process.env.FEISHU_EXERCISE_RESULTS_TABLE_ID) {
    return {
      createdRecords: [] as string[],
      errors: [{ error: "Missing FEISHU_EXERCISE_RESULTS_TABLE_ID" }],
    };
  }

  const createdRecords: string[] = [];
  const errors: any[] = [];

  for (const log of logs) {
    const actualReps = toNumberOrUndefined(log.actualReps);
    const targetReps = toNumberOrUndefined(log.prescribedReps);
    const weight = toNumberOrUndefined(log.actualWeight);
    const time = toNumberOrUndefined(log.actualTime);
    const distance = toNumberOrUndefined(log.actualDistance);
    const setNumber = toNumberOrUndefined(log.setNumber);
    const estimatedOneRepMax = estimateOneRepMax(weight, actualReps);
    const volume =
      weight !== undefined && actualReps !== undefined
        ? Math.round(weight * actualReps * 10) / 10
        : undefined;

    const fields: Record<string, any> = {
      "Result ID": `RES-${Date.now()}-${createdRecords.length + errors.length + 1}`,
      "Client ID": String(clientId || clientRecordId || ""),
      "Exercise ID": String(log.exerciseId || ""),
      "Exercise Name": String(log.exerciseName || ""),
      "Workout ID": String(assignedWorkoutId || ""),
      "Program ID": String(programId || ""),
      Date: toLarkDate(workoutDate),
      Notes: "",
    };

    if (clientRecordId) fields.Client = [String(clientRecordId)];
    if (setNumber !== undefined) fields["Set Number"] = setNumber;
    if (targetReps !== undefined) fields["Target Reps"] = targetReps;
    if (actualReps !== undefined) fields["Actual Reps"] = actualReps;
    if (weight !== undefined) fields.Weight = weight;
    if (time !== undefined) fields.Time = time;
    if (distance !== undefined) fields.Distance = distance;
    if (estimatedOneRepMax !== undefined) fields["Estimated 1RM"] = estimatedOneRepMax;
    if (volume !== undefined) fields.Volume = volume;

    let result = await createRecord(token, fields);

    if (result.code !== 0 && fields.Client) {
      const fallbackFields = { ...fields };
      delete fallbackFields.Client;
      result = await createRecord(token, fallbackFields);
    }

    if (result.code !== 0) {
      errors.push({ result, fields });
    } else {
      createdRecords.push(result.data.record.record_id);
    }
  }

  return { createdRecords, errors };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.FEISHU_EXERCISE_RESULTS_TABLE_ID) {
    return res.status(500).json({ error: "Missing FEISHU_EXERCISE_RESULTS_TABLE_ID" });
  }

  try {
    const token = await getTenantToken();

    if (req.method === "GET") {
      const clientId = String(req.query.clientId || "");
      const exerciseNameFilter = String(req.query.exerciseName || "").toLowerCase();
      const recordsResponse = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_EXERCISE_RESULTS_TABLE_ID}/records?page_size=500`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const recordsData = await recordsResponse.json();

      if (recordsData.code !== 0) {
        return res.status(500).json({
          error: "Could not fetch exercise results",
          larkResponse: recordsData,
        });
      }

      const results = (recordsData.data.items || [])
        .map((item: any) => {
          const fields = item.fields || {};

          return {
            recordId: item.record_id,
            resultId: fieldToText(fields["Result ID"]),
            clientId: fieldToText(fields["Client ID"] || fields.Client),
            exerciseId: fieldToText(fields["Exercise ID"]),
            exerciseName: fieldToText(fields["Exercise Name"]),
            workoutId: fieldToText(fields["Workout ID"]),
            programId: fieldToText(fields["Program ID"]),
            date: normalizeDate(fields.Date),
            setNumber: fieldToText(fields["Set Number"]),
            targetReps: fieldToText(fields["Target Reps"]),
            actualReps: fieldToText(fields["Actual Reps"]),
            weight: fieldToText(fields.Weight),
            time: fieldToText(fields.Time),
            distance: fieldToText(fields.Distance),
            estimatedOneRepMax: fieldToText(fields["Estimated 1RM"]),
            volume: fieldToText(fields.Volume),
            notes: fieldToText(fields.Notes),
          };
        })
        .filter((result: any) => {
          const matchesClient = !clientId || result.clientId.includes(clientId);
          const matchesExercise =
            !exerciseNameFilter ||
            result.exerciseName.toLowerCase().includes(exerciseNameFilter);

          return matchesClient && matchesExercise;
        })
        .sort((a: any, b: any) => b.date.localeCompare(a.date));

      return res.status(200).json({ results });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const result = await createExerciseResultRecords(token, {
      clientId: String(req.body.clientId || ""),
      clientRecordId: req.body.clientRecordId,
      assignedWorkoutId: req.body.assignedWorkoutId,
      programId: req.body.programId,
      workoutDate: req.body.workoutDate,
      logs: Array.isArray(req.body.logs) ? req.body.logs : [],
    });

    if (result.errors.length > 0) {
      return res.status(500).json({
        error: "Some exercise results could not be created",
        ...result,
      });
    }

    return res.status(200).json({
      success: true,
      recordsCreated: result.createdRecords.length,
      createdRecords: result.createdRecords,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
