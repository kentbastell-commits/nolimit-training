import { listRecords, getTenantToken, appToken } from "./client.ts";
import { fetchAllBitableRecords } from "../../../api/_pagination.ts";
import { createExerciseResults } from "./exerciseResults.ts";
import type { LogDTO } from "../dto.ts";
import type {
  SaveWorkoutLogInput,
  SaveWorkoutLogResult,
  CommentScanRow,
  WorkoutLogWriteResult,
} from "../repositories/workoutLogs.ts";

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
      .join(", ");
  }
  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");
  return "";
}

function extractRecordIds(value: any): string[] {
  if (!value) return [];
  const out: string[] = [];
  const pushFrom = (o: any) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o.record_ids)) out.push(...o.record_ids);
    if (Array.isArray(o.link_record_ids)) out.push(...o.link_record_ids);
    if (typeof o.record_id === "string") out.push(o.record_id);
  };
  if (Array.isArray(value)) value.forEach(pushFrom);
  else pushFrom(value);
  return out;
}

function normalizeDate(value: any) {
  const text = fieldToText(value);
  if (!text) return "";
  if (/^\d+$/.test(text)) return new Date(Number(text)).toISOString().split("T")[0];
  return text.split("T")[0].split(" ")[0];
}

export async function listAllLogs(): Promise<LogDTO[]> {
  const items = await listRecords(process.env.FEISHU_WORKOUT_LOGS_TABLE_ID as string);
  return items.map((item: any) => {
    const fields = item.fields || {};
    return {
      recordId: item.record_id,
      clientId: fieldToText(fields["Client ID"]),
      clientCode: fieldToText(fields["Client Code"]),
      clientRecordIds: extractRecordIds(fields["Client ID"]),
      exerciseName: fieldToText(fields["Exercise Name"]),
      date: normalizeDate(fields["Date"]),
      setNumber: fieldToText(fields["Set Number"]),
      prescribedReps: fieldToText(fields["Prescribed Reps"]),
      actualReps: fieldToText(fields["Actual Reps"]),
      actualWeight: fieldToText(fields["Actual Weight"]),
      actualTime: fieldToText(fields["Actual Time"]),
      actualDistance: fieldToText(fields["Actual Distance"]),
    };
  });
}

/* ------------------------------- writes ---------------------------------- */
// Logic moved verbatim from api/saveWorkoutLog.ts / api/workoutComments.ts /
// api/reviewWorkoutComment.ts.

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
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/fields?page_size=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  if (data.code !== 0) {
    return [];
  }
  const fields = data.data?.items || [];
  tableFieldsCache.set(tableId, { fields, at: Date.now() });
  return fields;
}

export async function saveWorkoutLog(
  input: SaveWorkoutLogInput
): Promise<SaveWorkoutLogResult> {
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
  } = input;

  const token = await getTenantToken();

  const larkDate = toLarkDate(workoutDate || "");
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
  // Plain-text mirror of the Client ID DuplexLink, so workout history can be
  // filtered server-side by client (a link field can't be). Only written if
  // the column exists (added by the migration script).
  const clientCodeFieldName = resolveFieldName(tableFields, [
    "Client Code",
    "ClientCode",
  ]);

  // Build every set's record first, then create them in one batch call.
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

    // A skipped set (completed === false) keeps its prescription but must
    // not store "actuals" — the player prefills reps from the plan, and
    // recording those on a set the athlete never did would fake adherence
    // data (8 reps "done" on a Completed:false row).
    const skipped = log.completed === false;
    const numberFields: Array<[string, any]> = [
      ["Prescribed Sets", log.prescribedSets],
      ["Prescribed Reps", log.prescribedReps],
      ["Actual Reps", skipped ? undefined : log.actualReps],
      ["Actual Weight", skipped ? undefined : log.actualWeight],
      ["Actual Time", skipped ? undefined : log.actualTime],
      ["Actual Distance", skipped ? undefined : log.actualDistance],
      ["Actual RPE", skipped ? undefined : log.actualRpe],
      ["Actual RIR", skipped ? undefined : log.actualRir],
      ["Exercise Order", log.exerciseOrder],
    ];
    for (const [name, raw] of numberFields) {
      const value = toNum(raw);
      if (value !== undefined) fields[name] = value;
    }

    if (notesFieldName && submissionNote) {
      fields[notesFieldName] = toText(submissionNote);
    }

    if (clientCodeFieldName && clientCode) {
      fields[clientCodeFieldName] = toText(clientCode);
    }

    return { fields };
  });

  // Feishu batch_create caps each request; chunk to stay well under the limit.
  for (let i = 0; i < recordsToCreate.length; i += 200) {
    const chunk = recordsToCreate.slice(i, i + 200);

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${workoutLogsTableId}/records/batch_create`,
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
      return {
        success: false,
        error: "Could not create workout logs",
        details: result,
        failedRecords: chunk,
        sentRecords: createdRecords,
      };
    }

    for (const record of result.data?.records || []) {
      createdRecords.push(record.record_id);
    }
  }

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
    if (sessionLoadField && rpeNum !== undefined && durNum !== undefined) {
      assignedFields[sessionLoadField] = Math.round(rpeNum * durNum);
    }

    // Fire the status update but don't await yet — it runs concurrently
    // with the exercise-results write below (they're independent).
    assignedWorkoutUpdatePromise = fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${assignedWorkoutsTableId}/records/${assignedWorkoutRecordId}`,
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
  const [assignedWorkoutUpdate, exerciseResults] = await Promise.all([
    assignedWorkoutUpdatePromise ?? Promise.resolve(null),
    createExerciseResults({
      clientId: clientCode || clientId,
      clientRecordId: clientId,
      assignedWorkoutId,
      programId,
      workoutDate: workoutDate || "",
      // Skipped sets must not mint PRs/volume from prefilled plan values.
      logs: (logs as any[]).filter((l) => l?.completed !== false),
    }),
  ]);

  return {
    success: true,
    recordsCreated: createdRecords.length,
    createdRecords,
    assignedWorkoutUpdate,
    exerciseResults,
  };
}

/* --------------------------- workout comments ----------------------------- */

function readField(fields: Record<string, any>, aliases: string[]) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(fields, alias)) {
      return fieldToText(fields[alias]);
    }
  }
  const normalizedAliases = aliases.map(normalizeFieldName);
  const matchingKey = Object.keys(fields).find((key) =>
    normalizedAliases.includes(normalizeFieldName(key))
  );
  return matchingKey ? fieldToText(fields[matchingKey]) : "";
}

// LOCAL-timezone Y-M-D, exactly as the old workoutComments handler formatted
// dates (unlike the UTC ISO used elsewhere).
function normalizeLocalDate(value: string) {
  if (!value) return "";
  if (/^\d+$/.test(value)) {
    const date = new Date(Number(value));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return value.split("T")[0].split(" ")[0];
}

// Raw workout-logs scan normalized to comment rows; the aggregation/dedupe is
// backend-agnostic and lives in the repository.
export async function scanCommentRows(): Promise<CommentScanRow[]> {
  const token = await getTenantToken();
  const items = await fetchAllBitableRecords(
    appToken(),
    process.env.FEISHU_WORKOUT_LOGS_TABLE_ID as string,
    token
  );

  return items.map((item: any): CommentScanRow => {
    const fields = item.fields || {};
    const reviewedText = readField(fields, [
      "Coach Reviewed",
      "Comment Reviewed",
      "Reviewed",
    ]).toLowerCase();
    return {
      recordId: item.record_id,
      note: readField(fields, [
        "Client Comment",
        "Workout Comment",
        "Athlete Notes",
        "Client Notes",
        "Notes",
        "Session Notes",
      ]),
      noteEn: readField(fields, [
        "Client Comment EN",
        "Athlete Notes EN",
        "Notes EN",
        "Workout Comment EN",
      ]),
      clientId: readField(fields, ["Client ID", "clientId"]),
      clientName: readField(fields, ["Client Name", "Athlete Name", "Athlete"]),
      assignedWorkoutId: readField(fields, [
        "Assigned Workout ID",
        "Assigned Workout",
        "Workout ID",
      ]),
      workoutName: readField(fields, ["Session Name", "Workout Name"]),
      exerciseName: readField(fields, ["Exercise Name", "Exercise"]),
      date: normalizeLocalDate(readField(fields, ["Date", "Workout Date"])),
      reviewedFlag:
        reviewedText === "true" ||
        reviewedText === "yes" ||
        reviewedText === "reviewed",
    };
  });
}

async function getRecord(tableId: string, recordId: string, token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/records/${recordId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  if (data.code !== 0) return null;
  return data.data?.record || data.data;
}

async function updateLogRecord(
  tableId: string,
  recordId: string,
  fields: Record<string, any>,
  token: string
) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/records/${recordId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );
  return response.json();
}

// The old reviewWorkoutComment handler fetched the layout fresh on every call
// (no cache) — keep that: a stale cached layout could silently route the
// review write to the wrong field.
async function getTableFieldsUncached(tableId: string, token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/fields?page_size=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  if (data.code !== 0) return [];
  return data.data?.items || [];
}

export async function reviewWorkoutComment(
  recordIds: string[]
): Promise<WorkoutLogWriteResult> {
  const workoutLogsTableId = process.env.FEISHU_WORKOUT_LOGS_TABLE_ID as string;
  const token = await getTenantToken();
  const tableFields = await getTableFieldsUncached(workoutLogsTableId, token);
  const reviewFieldName = resolveFieldName(tableFields, [
    "Coach Reviewed",
    "Comment Reviewed",
    "Reviewed",
  ]);
  const notesFieldName = resolveFieldName(tableFields, [
    "Client Comment",
    "Workout Comment",
    "Athlete Notes",
    "Client Notes",
    "Notes",
    "Session Notes",
  ]);
  const results: any[] = [];

  for (const recordId of recordIds) {
    if (reviewFieldName) {
      // Checkbox first; fall back to a text value if the field is text.
      let result = await updateLogRecord(
        workoutLogsTableId,
        recordId,
        { [reviewFieldName]: true },
        token
      );
      if (result.code !== 0) {
        result = await updateLogRecord(
          workoutLogsTableId,
          recordId,
          { [reviewFieldName]: "Reviewed" },
          token
        );
      }
      results.push(result);
      continue;
    }

    if (!notesFieldName) {
      return {
        success: false,
        error:
          "Missing Coach Reviewed/Reviewed field and no notes field fallback was found.",
      };
    }

    // No review column at all: append a [Reviewed] tag to the note text.
    const record = await getRecord(workoutLogsTableId, recordId, token);
    const currentNote = fieldToText(record?.fields?.[notesFieldName]);
    const nextNote = /\[reviewed\]/i.test(currentNote)
      ? currentNote
      : `${currentNote}\n[Reviewed]`.trim();
    const result = await updateLogRecord(
      workoutLogsTableId,
      recordId,
      { [notesFieldName]: nextNote },
      token
    );
    results.push(result);
  }

  const failed = results.find((result) => result.code !== 0);
  if (failed) {
    return {
      success: false,
      error: "Could not mark workout comment reviewed",
      details: failed,
    };
  }
  return { success: true, recordsUpdated: recordIds.length };
}
