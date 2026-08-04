import { and, eq, gte, inArray, isNull, not, ilike, or, sql } from "drizzle-orm";
import { db } from "../client.ts";
import { assignedTests, assignedWorkouts, workoutLogs } from "../schema.ts";
import { fillTranslation } from "../translate.ts";
import { dayStartMs, pgErrorMessage, str } from "./_util.ts";
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
  const rows = await db
    .select()
    .from(assignedWorkouts)
    .orderBy(
      assignedWorkouts.scheduledDate,
      // Coach-chosen position within a day; unordered rows sort after so a
      // fresh assignment lands below deliberately placed sessions.
      sql`${assignedWorkouts.dayOrder} asc nulls last`,
      assignedWorkouts.assignedWorkoutId
    );
  // Feishu's "Workout Logs" link column told the frontend a workout has saved
  // logs (Continue vs Start, recent-submissions list). Postgres inverts the
  // relationship — logs point at workouts — so surface it with one grouped
  // lookup instead of hardcoding "".
  const logged = new Set(
    (
      await db
        .selectDistinct({ awId: workoutLogs.assignedWorkoutId })
        .from(workoutLogs)
        .where(not(isNull(workoutLogs.assignedWorkoutId)))
    ).map((r) => String(r.awId))
  );
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
      dayOrder: r.dayOrder ?? null,
      completionStatus: str(r.completionStatus),
      coachNotes: str(r.coachNotes),
      coachNotesCn: str(r.coachNotesCn),
      clientNotes: str(r.clientNotes),
      workoutLogs: logged.has(r.assignedWorkoutId) ? "has-logs" : "",
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

  // Test days in the program become assigned_tests rows (the parallel calendar
  // stream the portal's test-taking flow already reads) — never workouts.
  const testEntries = scheduledWorkouts.filter((w) => w.testTemplateId);
  const workoutEntries = scheduledWorkouts.filter((w) => !w.testTemplateId);

  const mintedIds = await mintAssignedWorkoutIds(
    targetClientIds.length * workoutEntries.length
  );
  let mintIndex = 0;

  const rows: Insert[] = targetClientIds.flatMap((cid) =>
    workoutEntries.map((workout) => {
      const row: Insert = {
        assignedWorkoutId: mintedIds[mintIndex++],
        clientId: cid,
        programId: programRecordId,
        week: intOrNull(workout.week),
        day: intOrNull(workout.day),
        sessionName: workout.sessionName,
        sessionType: workout.sessionType || "Strength",
        sessionGoal: workout.sessionGoal || "",
        coachNotes: workout.sessionNotes || null,
        intensity: workout.intensity || "Moderate",
        scheduledDate: epochOrNull(toLarkDate(workout.scheduledDate)),
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

  try {
    if (rows.length > 0) await db.insert(assignedWorkouts).values(rows);
  } catch (e: any) {
    return { success: false, error: pgErrorMessage(e) };
  }

  // Best-effort after commit: mirror the coach's English note and session
  // name into the CN columns so a Chinese athlete's calendar/player isn't
  // silently English. Fills empty columns only; text already containing
  // Chinese is the coach's own wording — leave it.
  const emptyOnly = (col: any) => or(isNull(col), eq(col, ""));
  const hasCjk = (text: string) => /[一-鿿]/.test(text);
  for (const row of rows) {
    const note = String(row.coachNotes || "");
    if (note && !hasCjk(note)) {
      void fillTranslation(note, "zh", (zh) =>
        db
          .update(assignedWorkouts)
          .set({ coachNotesCn: zh })
          .where(
            and(
              eq(assignedWorkouts.assignedWorkoutId, row.assignedWorkoutId),
              emptyOnly(assignedWorkouts.coachNotesCn)
            )
          )
      );
    }
    const sessionName = String(row.sessionName || "");
    if (sessionName && !row.sessionNameCn && !hasCjk(sessionName)) {
      void fillTranslation(sessionName, "zh", (zh) =>
        db
          .update(assignedWorkouts)
          .set({ sessionNameCn: zh })
          .where(
            and(
              eq(assignedWorkouts.assignedWorkoutId, row.assignedWorkoutId),
              emptyOnly(assignedWorkouts.sessionNameCn)
            )
          )
      );
    }
  }

  let testsCreated = 0;
  if (testEntries.length > 0) {
    let testCounter = 0;
    const testRows = targetClientIds.flatMap((cid) =>
      testEntries.map((workout) => ({
        assignedTestId: `AT-${Date.now()}-${++testCounter}`,
        testTemplateId: String(workout.testTemplateId),
        // On Postgres the CL-… code is both the clients PK and the code column
        // (mirrors assignContent in pg/contentAssignments.ts).
        clientId: cid,
        clientCode: cid,
        assignedDate: epochOrNull(toLarkDate(workout.scheduledDate)),
      }))
    );
    try {
      await db.insert(assignedTests).values(testRows);
      testsCreated = testRows.length;
    } catch (e: any) {
      // The workouts are already in; report the partial failure rather than
      // pretending the whole assign failed.
      return {
        success: true,
        recordsCreated: rows.length,
        testsCreated: 0,
        warning: `Workouts assigned but test days failed: ${pgErrorMessage(e)}`,
      };
    }
  }

  return { success: true, recordsCreated: rows.length + testsCreated, testsCreated };
}

// Coach drag-reorder within one calendar day: persist each workout's
// position so every client (coach view, portal, mini program) shows the
// same order. Written as one transaction — a half-applied order is worse
// than the old order.
export async function reorderAssignedWorkouts(
  orders: Array<{ assignedWorkoutId: string; dayOrder: number }>
): Promise<WorkoutWriteResult> {
  try {
    await db.transaction(async (tx) => {
      for (const o of orders) {
        await tx
          .update(assignedWorkouts)
          .set({ dayOrder: Math.trunc(o.dayOrder) })
          .where(eq(assignedWorkouts.assignedWorkoutId, String(o.assignedWorkoutId)));
      }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: pgErrorMessage(e) };
  }
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
      .set({ scheduledDate: epochOrNull(toLarkDate(scheduledDate)) })
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
  // Take just the date part so a full ISO timestamp (e.g. from
  // `new Date().toISOString()`) still resolves via dayStartMs (China-local
  // midnight) instead of falling through to UTC-midnight math below —
  // named mistake #46, the two-convention date column.
  const dateOnly = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dayStartMs(dateOnly);
  return new Date(value).getTime();
}

export async function shiftAssignedWorkoutDates(
  i: ShiftWorkoutDatesInput
): Promise<WorkoutWriteResult> {
  const fromMs = dayStartMs(i.fromDate);
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
