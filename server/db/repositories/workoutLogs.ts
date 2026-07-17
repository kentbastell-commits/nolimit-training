// Workout-log writes + the comments view built on the logs table.
// saveWorkoutLog is the athlete's "Finish Workout" tap: per-set log rows, the
// assigned workout marked Completed (with sRPE load), and per-exercise result
// rows — all moved from api/saveWorkoutLog.ts. Comments are notes on log rows,
// aggregated per workout+date+note (from api/workoutComments.ts).
import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/workoutLogs.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

export type WorkoutLogWriteResult = { success: boolean; [key: string]: unknown };

export type SaveWorkoutLogInput = {
  // Feishu backend: client record_id (DuplexLink target). Postgres: CL-… code.
  clientId: string;
  clientCode?: string;
  assignedWorkoutId?: string;
  // Feishu record_id of the assigned workout; the AW-… code on Postgres.
  assignedWorkoutRecordId: string;
  programId?: string;
  workoutDate?: string;
  logs: any[];
  submissionNote?: string;
  sessionRpe?: any;
  sessionDurationMin?: any;
};

export type SaveWorkoutLogResult = {
  success: boolean;
  recordsCreated?: number;
  createdRecords?: string[];
  assignedWorkoutUpdate?: any;
  exerciseResults?: any;
  error?: string;
  details?: any;
  failedRecords?: any[];
  sentRecords?: any[];
};

// One raw log row normalized for the comments view; aggregation is shared.
export type CommentScanRow = {
  recordId: string;
  note: string; // raw note text (may carry a trailing [Reviewed] tag)
  noteEn: string;
  clientId: string;
  clientName: string; // "" on Postgres (no name column on logs)
  assignedWorkoutId: string;
  workoutName: string;
  exerciseName: string;
  date: string; // local-timezone YYYY-MM-DD
  reviewedFlag: boolean; // from the reviewed column only, not the note tag
};

export type WorkoutCommentDTO = {
  key: string;
  recordIds: string[];
  clientId: string;
  clientName: string;
  assignedWorkoutId: string;
  workoutName: string;
  exerciseNames: string[];
  date: string;
  note: string;
  noteEn: string;
  reviewed: boolean;
};

export async function saveWorkoutLog(
  input: SaveWorkoutLogInput
): Promise<SaveWorkoutLogResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/workoutLogs.ts")).saveWorkoutLog(input)
      : await feishu.saveWorkoutLog(input);
  if (result.success) {
    // New logs change every history/analytics view; drop the cached scans.
    invalidateCache("workoutLogs");
    invalidateCache("exerciseResults");
    invalidateCache("workouts");
    invalidateCache("workoutComments");
    invalidateCache("analytics");
  }
  return result;
}

// The raw scan is the slow part and is cached (5 min, key shared with the old
// handler); the aggregation below is cheap and runs per request.
export async function listWorkoutComments(
  clientIdFilter = "",
  clientNameFilter = ""
): Promise<WorkoutCommentDTO[]> {
  let rows = getCached<CommentScanRow[]>("workoutComments");
  if (!rows) {
    rows =
      DATA_BACKEND === "postgres"
        ? await (await import("../pg/workoutLogs.ts")).scanCommentRows()
        : await feishu.scanCommentRows();
    setCached("workoutComments", rows, 5 * 60 * 1000);
  }

  const requestedClientId = clientIdFilter.toLowerCase();
  const requestedClientName = clientNameFilter.toLowerCase();
  const commentMap = new Map<string, WorkoutCommentDTO>();

  for (const row of rows) {
    const cleanNote = row.note.replace(/\n?\[Reviewed\]\s*$/i, "").trim();
    if (!cleanNote) continue;

    const logClientId = row.clientId.toLowerCase();
    const logClientName = row.clientName.toLowerCase();
    const clientIdMatches =
      Boolean(requestedClientId) &&
      (logClientId.includes(requestedClientId) ||
        logClientName.includes(requestedClientId));
    const clientNameMatches =
      Boolean(requestedClientName) && logClientName.includes(requestedClientName);
    if (
      (requestedClientId || requestedClientName) &&
      !clientIdMatches &&
      !clientNameMatches
    ) {
      continue;
    }

    const reviewed = row.reviewedFlag || /\[reviewed\]/i.test(row.note);
    const key = `${row.assignedWorkoutId || "workout"}-${row.date}-${cleanNote}`;
    const existing = commentMap.get(key);

    if (existing) {
      existing.recordIds.push(row.recordId);
      existing.exerciseNames = Array.from(
        new Set([...existing.exerciseNames, row.exerciseName].filter(Boolean))
      );
      existing.reviewed = existing.reviewed && reviewed;
      continue;
    }

    commentMap.set(key, {
      key,
      recordIds: [row.recordId],
      clientId: row.clientId,
      clientName: row.clientName,
      assignedWorkoutId: row.assignedWorkoutId,
      workoutName: row.workoutName,
      exerciseNames: [row.exerciseName].filter(Boolean),
      date: row.date,
      note: cleanNote,
      noteEn: row.noteEn,
      reviewed,
    });
  }

  return Array.from(commentMap.values()).sort((a, b) =>
    String(b.date).localeCompare(String(a.date))
  );
}

export async function reviewWorkoutComment(
  recordIds: string[]
): Promise<WorkoutLogWriteResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/workoutLogs.ts")).reviewWorkoutComment(recordIds)
      : await feishu.reviewWorkoutComment(recordIds);
  if (result.success) invalidateCache("workoutComments");
  return result;
}
