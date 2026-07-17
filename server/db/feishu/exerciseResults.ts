// Feishu impl for the exercise-results domain (per-exercise PR/best summary
// rows) — logic moved verbatim from the old api/exerciseResults.ts handler.
// Field names are resolved against the live table (tolerant of the
// "Excercise ID" typo and "Estimated 1 RM" spacing); link fields are written
// as [record_id] with a retry-without-links fallback.
import { fetchAllBitableRecords } from "../../../api/_pagination.ts";
import {
  getTenantToken,
  appToken,
  createRecord,
  fieldText,
  formatDate,
} from "./client.ts";
import type {
  ExerciseResultDTO,
  CreateExerciseResultsInput,
  CreateExerciseResultsResult,
} from "../repositories/exerciseResults.ts";

function tableId(): string {
  return process.env.FEISHU_EXERCISE_RESULTS_TABLE_ID as string;
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

// Resolve the real field name on the table, tolerant of typos/spacing (e.g. the
// "Excercise ID" column). Returns "" if no candidate exists, so the caller can
// skip fields the table doesn't have (unknown fields make Feishu reject the row).
function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function getResultsTableFields(token: string): Promise<any[]> {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId()}/fields?page_size=200`,
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

export async function listExerciseResults(): Promise<ExerciseResultDTO[]> {
  const token = await getTenantToken();

  const resultItems = await fetchAllBitableRecords(appToken(), tableId(), token);

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

  return resultItems.map((item: any): ExerciseResultDTO => {
    const fields = item.fields || {};

    const clientField = fields[fClient];
    const clientRecordIds = Array.isArray(clientField)
      ? clientField.flatMap((x: any) => x?.record_ids || x?.link_record_ids || [])
      : [];

    return {
      recordId: item.record_id,
      resultId: fieldText(fields[fId]),
      clientId: fieldText(clientField),
      clientRecordIds,
      exerciseId: fieldText(fields[fExercise]),
      exerciseName: fieldText(fields[fName]),
      workoutId: fieldText(fields[fWorkout]),
      date: formatDate(fields.Date),
      bestReps: fieldText(fields[fReps]),
      bestWeight: fieldText(fields[fWeight]),
      estimatedOneRepMax: fieldText(fields[f1rm]),
      volume: fieldText(fields[fVolume]),
    };
  });
}

export async function createExerciseResults(
  input: CreateExerciseResultsInput
): Promise<CreateExerciseResultsResult> {
  const { clientRecordId, assignedWorkoutId, workoutDate, logs } = input;

  if (!process.env.FEISHU_EXERCISE_RESULTS_TABLE_ID) {
    return {
      createdRecords: [] as string[],
      errors: [{ error: "Missing FEISHU_EXERCISE_RESULTS_TABLE_ID" }],
    };
  }

  const token = await getTenantToken();

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
        appToken(),
        process.env.FEISHU_EXERCISE_LIBRARY_TABLE_ID as string,
        token
      );
      for (const item of libraryItems) {
        const code = fieldText(item.fields?.["Exercise ID"]);
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

  const fieldsToCreate: Array<Record<string, any>> = [];
  const groupList = Array.from(groups.values());

  groupList.forEach((sets, groupIndex) => {
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
    if (F.resultId) fields[F.resultId] = `RES-${Date.now()}-${groupIndex + 1}`;
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

    fieldsToCreate.push(fields);
  });

  // Create the per-exercise result rows in parallel (one per exercise, so the
  // count is small) instead of sequentially, keeping the per-row link fallback.
  const settled = await Promise.all(
    fieldsToCreate.map(async (fields) => {
      let result = await createRecord(tableId(), fields);

      // If a link field is rejected, retry without links rather than lose the row.
      if (result.code !== 0 && (fields[F.clientLink] || fields[F.exerciseLink])) {
        const fallback = { ...fields };
        delete fallback[F.clientLink];
        delete fallback[F.exerciseLink];
        result = await createRecord(tableId(), fallback);
      }

      return { result, fields };
    })
  );

  for (const { result, fields } of settled) {
    if (result.code !== 0) {
      errors.push({ result, fields });
    } else {
      createdRecords.push(result.data.record.record_id);
    }
  }

  return { createdRecords, errors };
}
