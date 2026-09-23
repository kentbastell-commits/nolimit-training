import { randomUUID } from "node:crypto";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../client.ts";
import { workoutLogs, assignedWorkouts, clients, exercises } from "../schema.ts";
import { queueTranslations } from "../contentTranslations.ts";
import { createExerciseResults } from "./exerciseResults.ts";
import { epochToDate, str } from "./_util.ts";
import type { LogDTO } from "../dto.ts";
import type {
  SaveWorkoutLogInput,
  SaveWorkoutLogResult,
  CommentScanRow,
  WorkoutLogWriteResult,
} from "../repositories/workoutLogs.ts";

type Row = typeof workoutLogs.$inferSelect;

export async function listAllLogs(clientId = "", clientCode = "", assignedWorkoutId = ""): Promise<LogDTO[]> {
  const codes = [...new Set([clientId, clientCode].filter(Boolean))];
  const rows = await db.select().from(workoutLogs).where(and(codes.length
    ? or(inArray(workoutLogs.clientId, codes), inArray(workoutLogs.clientCode, codes))
    : undefined, assignedWorkoutId ? eq(workoutLogs.assignedWorkoutId, assignedWorkoutId) : undefined));
  // Localize a completed snapshot by its saved name, without replacing it with
  // today's prescription. General history reads keep their existing query cost.
  const savedName = (name: unknown) => str(name).replace(/ - (Left|Right)$/, "");
  const names = assignedWorkoutId ? [...new Set(rows.map((r) => savedName(r.exerciseName)).filter(Boolean))] : [];
  const library = names.length ? await db.select({ name: exercises.name, nameCn: exercises.nameCn })
    .from(exercises).where(inArray(exercises.name, names)) : [];
  const chineseNames = new Map(library.map((e) => [e.name, str(e.nameCn)]));
  return rows.map(
    (r: Row): LogDTO => ({
      recordId: r.logId,
      exerciseId: str(r.exerciseId),
      assignedWorkoutId: str(r.assignedWorkoutId), completed: r.completed !== false, athleteNotes: str(r.athleteNotes),
      clientId: str(r.clientId),
      // Prefer the stored plain-text code; client_id already holds the
      // business code on Postgres anyway.
      clientCode: str(r.clientCode) || str(r.clientId),
      clientRecordIds: r.clientId ? [r.clientId] : [],
      exerciseName: str(r.exerciseName),
      date: epochToDate(r.date),
      setNumber: str(r.setNumber),
      prescribedReps: str(r.prescribedReps),
      actualReps: str(r.actualReps),
      actualWeight: str(r.actualWeight),
      actualTime: str(r.actualTime),
      actualDistance: str(r.actualDistance),
      ...(assignedWorkoutId ? {
        exerciseNameCn: chineseNames.get(savedName(r.exerciseName)) || "",
        assignedWorkoutId: str(r.assignedWorkoutId), completed: r.completed !== false,
        exerciseOrder: r.exerciseOrder || 0, prescribedSets: str(r.prescribedSets),
        actualRpe: str(r.actualRpe), actualRir: str(r.actualRir), athleteNotes: str(r.athleteNotes),
      } : {}),
    })
  );
}

/* ------------------------------- writes ---------------------------------- */
// Same semantics as the Feishu impl: per-set log rows, assigned workout marked
// Completed with sRPE load metrics, per-exercise results aggregated. On this
// backend clientId/assignedWorkoutRecordId carry business codes (CL-…, AW-…).

type Insert = typeof workoutLogs.$inferInsert;

function toText(value: any): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

function toNum(value: any): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const direct = Number(value);
  if (Number.isFinite(direct)) return direct;
  const match = String(value).match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toEpoch(value: string): number {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  return new Date(`${value}T00:00:00`).getTime();
}

function intOrNull(value: any): number | null {
  const n = toNum(value);
  return n === undefined ? null : Math.round(n);
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

  const epochDate = toEpoch(workoutDate || "");
  const code = String(clientCode || clientId);

  let result: SaveWorkoutLogResult;
  try {
    result = await db.transaction(async (tx): Promise<SaveWorkoutLogResult> => {

      // The FK is enforced here (Feishu just accepts a dead link) — write the
      // client reference only when the row exists so a submit can never bounce.
      const clientExists =
        (
          await tx
            .select({ id: clients.clientId })
            .from(clients)
            .where(eq(clients.clientId, code))
        ).length > 0;
      // Ownership, not just existence: without the clientId match, one client
      // could submit logs against ANOTHER client's assignedWorkoutRecordId and
      // flip that other athlete's workout to Completed / overwrite its notes.
      const [assignedWorkoutRow] = await tx
        .select({ clientId: assignedWorkouts.clientId, completionStatus: assignedWorkouts.completionStatus })
        .from(assignedWorkouts)
        .where(eq(assignedWorkouts.assignedWorkoutId, String(assignedWorkoutRecordId)))
        .limit(1)
        .for("update");
      const workoutExists = Boolean(assignedWorkoutRow) && assignedWorkoutRow.clientId === code;

      // Stale-tab guard (cutover 2026-07-21): a browser tab opened pre-migration
      // still holds Feishu record ids ("rec..."). Under pg those match nothing —
      // without this check the save would "succeed" with orphaned rows (null
      // client/workout links) and the workout never flips to Completed. Fail
      // loudly instead so the athlete refreshes and resubmits against real ids.
      const looksLikeFeishuId = (v: unknown) => /^rec[A-Za-z0-9]{8,}$/.test(String(v || ""));
      if (
        (!workoutExists && looksLikeFeishuId(assignedWorkoutRecordId)) ||
        (!clientExists && looksLikeFeishuId(code))
      ) {
        return {
          success: false,
          error:
            "This session was opened before a system upgrade. Please refresh the page and submit your workout again — your entries are safe in the form.",
        };
      }

      if (!clientExists || !workoutExists) {
        return { success: false, error: "This workout is no longer available. Refresh your calendar and try again; your entries have not been cleared." };
      }
      // The assigned-workout primary key is the durable submission identity.
      // Lock it before inspecting completion so concurrent requests and retries
      // after a lost response acknowledge the first commit without adding sets.
      if (assignedWorkoutRow.completionStatus === "Completed") {
        const saved = await tx.select({ id: workoutLogs.logId }).from(workoutLogs)
          .where(eq(workoutLogs.assignedWorkoutId, String(assignedWorkoutRecordId)));
        return { success: true, replayed: true, recordsCreated: 0,
          createdRecords: saved.map((r) => r.id), assignedWorkoutUpdate: { code: 0, updated: 0 } };
      }

      const rows: Insert[] = logs.map((log: any, index: number) => {
        const skipped = log.completed === false;
        const actualTimeNum = skipped ? undefined : toNum(log.actualTime);
        return {
          // Random component: two same-millisecond submits (e.g. athlete
          // double-tap) collide on the PK without it.
          logId: `LOG-${randomUUID()}-${index + 1}`,
          clientId: clientExists ? code : null,
          clientCode: code,
          assignedWorkoutId: workoutExists ? String(assignedWorkoutRecordId) : null,
          exerciseName: toText(log.exerciseName) || null,
          date: epochDate,
          setNumber: intOrNull(log.setNumber),
          prescribedSets: intOrNull(log.prescribedSets),
          prescribedReps:
            log.prescribedReps === undefined || log.prescribedReps === null
              ? null
              : toText(log.prescribedReps),
          actualReps: skipped ? null : intOrNull(log.actualReps),
          actualWeight: skipped ? null : toNum(log.actualWeight) ?? null,
          actualRpe: skipped ? null : toNum(log.actualRpe) ?? null,
          actualRir: skipped ? null : toNum(log.actualRir) ?? null,
          weightUnit: "kg",
          actualTime: actualTimeNum === undefined ? null : String(actualTimeNum),
          timeUnit: "s",
          actualDistance: skipped ? null : toNum(log.actualDistance) ?? null,
          distanceUnit: "m",
          completed: log.completed === false ? false : true,
          athleteNotes: submissionNote ? toText(submissionNote) : null,
          exerciseOrder: intOrNull(log.exerciseOrder),
        };
      });

      if (rows.length) await tx.insert(workoutLogs).values(rows);
      const createdRecords = rows.map((r) => r.logId);

      // Mark the assigned workout completed + store the sRPE internal-load metrics.
      let assignedWorkoutUpdate: any = null;
      if (workoutExists) {
        const set: Partial<typeof assignedWorkouts.$inferInsert> = {
          completionStatus: "Completed",
        };
        if (submissionNote) set.clientNotes = toText(submissionNote);
        const rpeNum = toNum(sessionRpe);
        const durNum = toNum(sessionDurationMin);
        if (rpeNum !== undefined) set.sessionRpe = rpeNum;
        if (durNum !== undefined) set.sessionDuration = Math.round(durNum);
        if (rpeNum !== undefined && durNum !== undefined) {
          set.sessionLoad = Math.round(rpeNum * durNum);
        }
        const updated = await tx
          .update(assignedWorkouts)
          .set(set)
          .where(eq(assignedWorkouts.assignedWorkoutId, String(assignedWorkoutRecordId)))
          .returning({ assignedWorkoutId: assignedWorkouts.assignedWorkoutId });
        assignedWorkoutUpdate = { code: 0, updated: updated.length };
      }

      const exerciseResults = await createExerciseResults({
        clientId: code,
        clientRecordId: code,
        assignedWorkoutId: assignedWorkoutId || String(assignedWorkoutRecordId),
        programId,
        workoutDate: workoutDate || "",
        // Skipped sets must not mint PRs/volume from prefilled plan values.
        logs: (logs as any[]).filter((l) => l?.completed !== false),
      }, tx);

      return {
        success: true,
        recordsCreated: createdRecords.length,
        createdRecords,
        assignedWorkoutUpdate,
        exerciseResults,
      };
    });
  } catch (e: any) {
    return { success: false, error: "Could not save workout. Your entries are safe to retry.",
      details: { message: e?.message || String(e) } };
  }
  const createdRecords = result.replayed ? [] : result.createdRecords || [];

  queueTranslations("workoutLogs", createdRecords);

  return result;
}

/* --------------------------- workout comments ----------------------------- */

// LOCAL-timezone Y-M-D, matching the old workoutComments handler's formatting.
function normalizeLocalDate(ms: number | null | undefined): string {
  if (ms == null) return "";
  const date = new Date(Number(ms));
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function scanCommentRows(): Promise<CommentScanRow[]> {
  // Session name comes from the assigned workout (on Feishu it was a lookup
  // column on the log row itself). There is no client-name column on pg logs;
  // comment filtering matches by client code instead.
  const rows = await db
    .select({
      log: workoutLogs,
      sessionName: assignedWorkouts.sessionName,
    })
    .from(workoutLogs)
    .leftJoin(
      assignedWorkouts,
      eq(workoutLogs.assignedWorkoutId, assignedWorkouts.assignedWorkoutId)
    );

  return rows.map(({ log, sessionName }): CommentScanRow => ({
    recordId: log.logId,
    note: str(log.athleteNotes),
    noteEn: str(log.athleteNotesEn),
    clientId: str(log.clientCode) || str(log.clientId),
    clientName: "",
    assignedWorkoutId: str(log.assignedWorkoutId),
    workoutName: str(sessionName),
    exerciseName: str(log.exerciseName),
    date: normalizeLocalDate(log.date),
    reviewedFlag: log.coachReviewed === true,
  }));
}

export async function reviewWorkoutComment(
  recordIds: string[]
): Promise<WorkoutLogWriteResult> {
  const updated = await db
    .update(workoutLogs)
    .set({ coachReviewed: true })
    .where(inArray(workoutLogs.logId, recordIds))
    .returning({ logId: workoutLogs.logId });

  if (updated.length < recordIds.length) {
    return {
      success: false,
      error: "Could not mark workout comment reviewed",
      details: { requested: recordIds.length, updated: updated.length },
    };
  }
  return { success: true, recordsUpdated: recordIds.length };
}
