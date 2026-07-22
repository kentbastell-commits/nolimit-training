// Postgres impl for the exercise-results domain (per-exercise PR/best summary
// rows). Mirrors the Feishu impl: sets are grouped per exercise and aggregated
// into one row (best weight, reps on the heaviest set, Epley 1RM, volume).
// Where Feishu writes link fields with a retry-without-links fallback, pg
// validates the FK target exists and simply omits the reference otherwise —
// same outcome: the row always lands, the link is best-effort.
import { eq, inArray } from "drizzle-orm";
import { db } from "../client.ts";
import { exerciseResults, exercises, clients } from "../schema.ts";
import { epochToDate, str } from "./_util.ts";
import type {
  ExerciseResultDTO,
  CreateExerciseResultsInput,
  CreateExerciseResultsResult,
} from "../repositories/exerciseResults.ts";

type Row = typeof exerciseResults.$inferSelect;

export async function listExerciseResults(): Promise<ExerciseResultDTO[]> {
  const rows = await db.select().from(exerciseResults);
  return rows.map((r: Row): ExerciseResultDTO => ({
    recordId: r.resultId, // business code is the identity on Postgres
    resultId: r.resultId,
    clientId: str(r.clientId),
    clientRecordIds: r.clientId ? [r.clientId] : [],
    exerciseId: str(r.exerciseId),
    exerciseName: str(r.exerciseName),
    workoutId: str(r.sourceWorkoutId),
    date: epochToDate(r.date),
    bestReps: str(r.bestReps),
    bestWeight: str(r.bestWeight),
    estimatedOneRepMax: str(r.estimated1rm),
    volume: str(r.volume),
  }));
}

function toEpoch(value: string) {
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

export async function createExerciseResults(
  input: CreateExerciseResultsInput
): Promise<CreateExerciseResultsResult> {
  const { clientRecordId, assignedWorkoutId, workoutDate, logs } = input;

  const createdRecords: string[] = [];
  const errors: any[] = [];

  // Group the submitted sets by exercise (same keying as Feishu).
  const groups = new Map<string, any[]>();
  for (const log of logs) {
    const key = String(log.exerciseId || log.exerciseName || "");
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(log);
  }
  const groupList = Array.from(groups.values());

  // Best-effort references: only write FK values whose target rows exist
  // (the schema enforces them; Feishu's equivalent is the drop-links retry).
  const clientCode = clientRecordId ? String(clientRecordId) : "";
  const clientExists = clientCode
    ? (
        await db
          .select({ id: clients.clientId })
          .from(clients)
          .where(eq(clients.clientId, clientCode))
      ).length > 0
    : false;
  const exerciseCodes = groupList
    .map((sets) => String(sets.find((l: any) => l.exerciseId)?.exerciseId || ""))
    .filter(Boolean);
  const knownExercises = new Set(
    exerciseCodes.length
      ? (
          await db
            .select({ id: exercises.exerciseId })
            .from(exercises)
            .where(inArray(exercises.exerciseId, exerciseCodes))
        ).map((r) => r.id)
      : []
  );

  for (let groupIndex = 0; groupIndex < groupList.length; groupIndex++) {
    const sets = groupList[groupIndex];
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

    // Bodyweight exercises have no weight — fall back to max reps.
    if (bestReps === undefined) bestReps = maxReps;
    // best_reps is an integer column; a decimal (e.g. 8.5 reps avg) fails
    // the row where Feishu accepted it — round instead.
    if (bestReps !== undefined) bestReps = Math.round(bestReps);

    const resultId = `RES-${Date.now()}-${Math.floor(Math.random() * 1e6)}-${groupIndex + 1}`;
    const values: typeof exerciseResults.$inferInsert = {
      resultId,
      clientId: clientExists ? clientCode : null,
      exerciseId: knownExercises.has(exerciseCode) ? exerciseCode : null,
      exerciseName: exerciseName || null,
      date: toEpoch(workoutDate),
      bestWeight: bestWeight ?? null,
      bestReps: bestReps ?? null,
      estimated1rm: best1rm ?? null,
      volume: volume > 0 ? Math.round(volume * 10) / 10 : null,
      sourceWorkoutId: assignedWorkoutId ? String(assignedWorkoutId) : null,
    };

    try {
      await db.insert(exerciseResults).values(values);
      createdRecords.push(resultId);
    } catch (e: any) {
      errors.push({ error: e?.message || String(e), fields: values });
    }
  }

  return { createdRecords, errors };
}
