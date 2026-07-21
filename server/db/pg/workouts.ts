import { and, eq, gte, inArray, isNull, not, ilike, or, sql } from "drizzle-orm";
import { db } from "../client.ts";
import { assignedWorkouts } from "../schema.ts";
import { str } from "./_util.ts";
import type { WorkoutDTO } from "../dto.ts";
import type {
  AssignProgramInput,
  DuplicateWorkoutInput,
  ShiftWorkoutDatesInput,
  UpdateWorkoutDateInput,
  WorkoutWriteResult,
} from "../repositories/workouts.ts";

type Row = typeof assignedWorkouts.$inferSelect;

export async function listAllWorkouts(): Promise<WorkoutDTO[]> {
  const rows = await db.select().from(assignedWorkouts);
  return rows.map(
    (r: Row): WorkoutDTO => ({
      id: r.assignedWorkoutId,
      assignedWorkoutId: r.assignedWorkoutId,
      clientId: str(r.clientId),
      programId: str(r.programId),
      week: str(r.week),
      day: str(r.day),
      sessionName: str(r.sessionName),
      sessionNameCn: str(r.sessionNameCn),
      sessionType: str(r.sessionType),
      sessionGoal: str(r.sessionGoal),
      estimatedDuration: str(r.estimatedDuration),
      intensity: str(r.intensity),
      scheduledDate: str(r.scheduledDate), // epoch-ms as text, matching Feishu
      completionStatus: str(r.completionStatus),
      coachNotes: str(r.coachNotes),
      coachNotesCn: str(r.coachNotesCn),
      clientNotes: str(r.clientNotes),
      workoutLogs: "",
      sessionRpe: str(r.sessionRpe),
      sessionDuration: str(r.sessionDuration),
      sessionLoad: str(r.sessionLoad),
      coachReviewed: r.coachReviewed ?? false,
    })
  );
}

/* ------------------------------- writes ---------------------------------- */
// Same result shapes as the Feishu impls (minus larkResponse — there is no
// Lark). On Postgres the business code (AW-…) IS the id: frontend params named
// recordId carry the code, and Feishu DuplexLink [record_id] arrays become the
// business-code FK columns (client_id = CL-…, program_id = PGM-…).

type Insert = typeof assignedWorkouts.$inferInsert;

function makeAssignedWorkoutId() {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `AW-${random}`;
}

// Mint collision-free AW ids (same Feishu shape, but here AW- is a PK — a
// clash fails the whole batch insert; probability grows with table size).
// Mirrors the hardened mint in pg/programs.ts.
async function mintAssignedWorkoutIds(count: number): Promise<string[]> {
  const ids = new Set<string>();
  while (ids.size < count) ids.add(makeAssignedWorkoutId());
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await db
      .select({ id: assignedWorkouts.assignedWorkoutId })
      .from(assignedWorkouts)
      .where(inArray(assignedWorkouts.assignedWorkoutId, [...ids]));
    if (!clash.length) break;
    for (const c of clash) ids.delete(String(c.id));
    while (ids.size < count) ids.add(makeAssignedWorkoutId());
  }
  return [...ids];
}

// NaN-safe numeric coercion. Feishu's JSON.stringify turned NaN into null, so
// null (not a crash) is the faithful equivalent for bad numbers here.
function intOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function epochOrNull(ms: number): number | null {
  return Number.isFinite(ms) ? ms : null;
}

export async function assignProgram(input: AssignProgramInput): Promise<WorkoutWriteResult> {
  const { targetClientIds, programRecordId, scheduledWorkouts } = input;

  const mintedIds = await mintAssignedWorkoutIds(
    targetClientIds.length * scheduledWorkouts.length
  );
  let mintIndex = 0;

  const rows: Insert[] = targetClientIds.flatMap((cid) =>
    scheduledWorkouts.map((workout) => {
      const row: Insert = {
        assignedWorkoutId: mintedIds[mintIndex++],
        clientId: cid,
        programId: programRecordId,
        week: intOrNull(workout.week),
        day: intOrNull(workout.day),
        sessionName: workout.sessionName,
        sessionType: workout.sessionType || "Strength",
        sessionGoal: workout.sessionGoal || "",
        intensity: workout.intensity || "Moderate",
        scheduledDate: epochOrNull(new Date(workout.scheduledDate).getTime()),
        completionStatus: "Scheduled",
      };

      const durationNumber = Number(workout.estimatedDuration);
      if (Number.isFinite(durationNumber) && durationNumber > 0) {
        row.estimatedDuration = Math.round(durationNumber);
      }

      if (workout.sessionNameCn) {
        row.sessionNameCn = workout.sessionNameCn;
      }

      return row;
    })
  );

  await db.insert(assignedWorkouts).values(rows);

  return { success: true, recordsCreated: rows.length };
}

export async function updateAssignedWorkoutDate(
  input: UpdateWorkoutDateInput
): Promise<WorkoutWriteResult> {
  const { assignedWorkoutRecordId, assignedWorkoutId, scheduledDate } = input;

  // Either param may carry the AW- code in pg mode; try both.
  const candidates = Array.from(
    new Set([assignedWorkoutRecordId, assignedWorkoutId].filter(Boolean))
  ) as string[];

  for (const candidate of candidates) {
    const updated = await db
      .update(assignedWorkouts)
      .set({ scheduledDate: epochOrNull(new Date(scheduledDate).getTime()) })
      .where(eq(assignedWorkouts.assignedWorkoutId, candidate))
      .returning({ assignedWorkoutId: assignedWorkouts.assignedWorkoutId });
    if (updated.length) {
      return {
        success: true,
        assignedWorkoutRecordId: candidate,
        assignedWorkoutId,
        scheduledDate,
      };
    }
  }

  return { success: false, error: "Failed to update assigned workout date" };
}

function toLarkDate(value?: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  const [year, month, day] = value.split("-").map(Number);
  if (year && month && day) {
    return new Date(year, month - 1, day).getTime();
  }
  return new Date(value).getTime();
}

export async function shiftAssignedWorkoutDates(
  i: ShiftWorkoutDatesInput
): Promise<WorkoutWriteResult> {
  const fromMs = new Date(i.fromDate).getTime();
  const deltaMs = i.days * 86400000;
  const conditions = [
    eq(assignedWorkouts.clientId, str(i.clientCode)),
    gte(assignedWorkouts.scheduledDate, fromMs),
  ];
  if (!i.includeCompleted) {
    conditions.push(
      or(
        isNull(assignedWorkouts.completionStatus),
        not(ilike(assignedWorkouts.completionStatus, "completed"))
      )!
    );
  }
  const rows = await db
    .update(assignedWorkouts)
    .set({
      scheduledDate: sql`${assignedWorkouts.scheduledDate} + ${deltaMs}`,
    })
    .where(and(...conditions))
    .returning({ assignedWorkoutId: assignedWorkouts.assignedWorkoutId });
  return { success: true, updated: rows.length, matched: rows.length };
}

export async function duplicateAssignedWorkout(
  input: DuplicateWorkoutInput
): Promise<WorkoutWriteResult> {
  const { assignedWorkoutRecordId, scheduledDate } = input;

  const sources = await db
    .select()
    .from(assignedWorkouts)
    .where(eq(assignedWorkouts.assignedWorkoutId, assignedWorkoutRecordId));
  const source = sources[0];

  if (!source) {
    return { success: false, error: "Could not read assigned workout" };
  }

  // Same semantics as the Feishu clone: copy every field, override id/date/
  // status. (Workout Logs links have no column here — logs point at workouts.)
  const [newId] = await mintAssignedWorkoutIds(1);
  const clone: Insert = {
    ...source,
    assignedWorkoutId: newId,
    scheduledDate: epochOrNull(toLarkDate(scheduledDate)),
    completionStatus: "Scheduled",
  };

  await db.insert(assignedWorkouts).values(clone);

  return { success: true, recordId: newId };
}

export async function setWorkoutReviewed(
  assignedWorkoutRecordId: string,
  reviewed: unknown
): Promise<WorkoutWriteResult> {
  const updated = await db
    .update(assignedWorkouts)
    .set({ coachReviewed: Boolean(reviewed) })
    .where(eq(assignedWorkouts.assignedWorkoutId, assignedWorkoutRecordId))
    .returning({ assignedWorkoutId: assignedWorkouts.assignedWorkoutId });

  if (!updated.length) {
    return {
      success: false,
      details: { error: "Assigned workout not found", assignedWorkoutRecordId },
    };
  }
  return { success: true };
}
