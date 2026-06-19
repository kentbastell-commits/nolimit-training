import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";

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
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");

  return "";
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

// Resolve the real field name on the table, tolerant of typos/spacing (e.g. the
// "Excercise ID" column). Returns "" if no candidate exists, so the caller can
// skip fields the table doesn't have (unknown fields make Feishu reject the row).
function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function getResultsTableFields(token: string): Promise<any[]> {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_EXERCISE_RESULTS_TABLE_ID}/fields?page_size=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  return data.code === 0 ? data.data?.items || [] : [];
}

function makeFieldResolver(tableFields: any[]) {
  const byNorm = new Map(
    tableFields.map((f) => [
      normalizeFieldName(f.field_name || f.name || ""),
      f.field_name || f.name || "",
    ])
  );
  return (aliases: string[]) => {
    for (const alias of aliases) {
      const hit = byNorm.get(normalizeFieldName(alias));
      if (hit) return hit;
    }
    return "";
  };
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

  // Resolve the table's real field names once (handles the "Excercise ID" typo
  // and "Estimated 1 RM" spacing). This table is a per-exercise best/PR summary,
  // not per-set — so aggregate the sets of each exercise into one row.
  const tableFields = await getResultsTableFields(token);
  const field = makeFieldResolver(tableFields);
  const F = {
    resultId: field(["Result ID"]),
    clientLink: field(["Client ID", "Client"]),
    exerciseLink: field(["Excercise ID", "Exercise ID"]),
    exerciseName: field(["Exercise Name"]),
    date: field(["Date"]),
    bestWeight: field(["Best Weight", "Weight"]),
    bestReps: field(["Best Reps", "Actual Reps", "Reps"]),
    est1rm: field(["Estimated 1 RM", "Estimated 1RM", "Est 1RM"]),
    volume: field(["Volume"]),
    sourceWorkoutId: field(["Source Workout ID", "Workout ID"]),
  };

  // Best-effort map of Exercise ID code -> library record_id, for the link field.
  const exerciseRecordByCode = new Map<string, string>();
  if (F.exerciseLink && process.env.FEISHU_EXERCISE_LIBRARY_TABLE_ID) {
    try {
      const libraryItems = await fetchAllBitableRecords(
        process.env.FEISHU_BASE_APP_TOKEN as string,
        process.env.FEISHU_EXERCISE_LIBRARY_TABLE_ID as string,
        token
      );
      for (const item of libraryItems) {
        const code = fieldToText(item.fields?.["Exercise ID"]);
        if (code) exerciseRecordByCode.set(code, item.record_id);
      }
    } catch {
      // links are optional — skip if the library can't be read
    }
  }

  // Group the submitted sets by exercise.
  const groups = new Map<string, any[]>();
  for (const log of logs) {
    const key = String(log.exerciseId || log.exerciseName || "");
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(log);
  }

  for (const [, sets] of groups) {
    let bestWeight: number | undefined;
    let bestReps: number | undefined;
    let maxReps: number | undefined;
    let best1rm: number | undefined;
    let volume = 0;
    let exerciseName = "";
    let exerciseCode = "";

    for (const log of sets) {
      const weight = toNumberOrUndefined(log.actualWeight);
      const reps = toNumberOrUndefined(log.actualReps);
      exerciseName = log.exerciseName || exerciseName;
      exerciseCode = log.exerciseId || exerciseCode;

      if (reps !== undefined) {
        maxReps = maxReps === undefined ? reps : Math.max(maxReps, reps);
        volume += weight !== undefined ? weight * reps : reps;
      }
      if (weight !== undefined && (bestWeight === undefined || weight > bestWeight)) {
        bestWeight = weight;
        bestReps = reps; // reps performed on the heaviest set
      }
      const e1rm = estimateOneRepMax(weight, reps);
      if (e1rm !== undefined && (best1rm === undefined || e1rm > best1rm)) {
        best1rm = e1rm;
      }
    }

    // Bodyweight exercises have no weight — fall back to max reps for "Best Reps".
    if (bestReps === undefined) bestReps = maxReps;

    const fields: Record<string, any> = {};
    if (F.resultId)
      fields[F.resultId] = `RES-${Date.now()}-${createdRecords.length + errors.length + 1}`;
    if (F.exerciseName && exerciseName) fields[F.exerciseName] = exerciseName;
    if (F.date) fields[F.date] = toLarkDate(workoutDate);
    if (F.sourceWorkoutId && assignedWorkoutId)
      fields[F.sourceWorkoutId] = String(assignedWorkoutId);
    if (F.bestWeight && bestWeight !== undefined) fields[F.bestWeight] = bestWeight;
    if (F.bestReps && bestReps !== undefined) fields[F.bestReps] = bestReps;
    if (F.est1rm && best1rm !== undefined) fields[F.est1rm] = best1rm;
    if (F.volume && volume > 0) fields[F.volume] = Math.round(volume * 10) / 10;
    if (F.clientLink && clientRecordId) fields[F.clientLink] = [String(clientRecordId)];
    if (F.exerciseLink) {
      const recId = exerciseRecordByCode.get(exerciseCode);
      if (recId) fields[F.exerciseLink] = [recId];
    }

    let result = await createRecord(token, fields);

    // If a link field is rejected, retry without links rather than lose the row.
    if (result.code !== 0 && (fields[F.clientLink] || fields[F.exerciseLink])) {
      const fallback = { ...fields };
      delete fallback[F.clientLink];
      delete fallback[F.exerciseLink];
      result = await createRecord(token, fallback);
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
      const resultItems = await fetchAllBitableRecords(
        process.env.FEISHU_BASE_APP_TOKEN as string,
        process.env.FEISHU_EXERCISE_RESULTS_TABLE_ID as string,
        token
      );

      const tableFields = await getResultsTableFields(token);
      const field = makeFieldResolver(tableFields);
      const fId = field(["Result ID"]);
      const fClient = field(["Client ID", "Client"]);
      const fExercise = field(["Excercise ID", "Exercise ID"]);
      const fName = field(["Exercise Name"]);
      const fWorkout = field(["Source Workout ID", "Workout ID"]);
      const fWeight = field(["Best Weight", "Weight"]);
      const fReps = field(["Best Reps", "Actual Reps", "Reps"]);
      const f1rm = field(["Estimated 1 RM", "Estimated 1RM", "Est 1RM"]);
      const fVolume = field(["Volume"]);

      const results = resultItems
        .map((item: any) => {
          const fields = item.fields || {};

          const clientField = fields[fClient];
          const clientRecordIds = Array.isArray(clientField)
            ? clientField.flatMap(
                (x: any) => x?.record_ids || x?.link_record_ids || []
              )
            : [];

          return {
            recordId: item.record_id,
            resultId: fieldToText(fields[fId]),
            clientId: fieldToText(clientField),
            clientRecordIds,
            exerciseId: fieldToText(fields[fExercise]),
            exerciseName: fieldToText(fields[fName]),
            workoutId: fieldToText(fields[fWorkout]),
            date: normalizeDate(fields.Date),
            bestReps: fieldToText(fields[fReps]),
            bestWeight: fieldToText(fields[fWeight]),
            estimatedOneRepMax: fieldToText(fields[f1rm]),
            volume: fieldToText(fields[fVolume]),
          };
        })
        .filter((result: any) => {
          const matchesClient =
            !clientId ||
            result.clientId.includes(clientId) ||
            result.clientRecordIds.includes(clientId);
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
