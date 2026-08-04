import * as pg from "../pg/workouts.ts";
import type { WorkoutDTO } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

// The full assigned-workouts list is cached briefly (2 min — it changes often:
// assigns, completions, reviews) and filtered per request; workout writers
// invalidate "workouts".
export async function listWorkouts(clientCode = ""): Promise<WorkoutDTO[]> {
  let all = getCached<WorkoutDTO[]>("workouts");
  if (!all) {
    all =
      await pg.listAllWorkouts();
    setCached("workouts", all, 2 * 60 * 1000);
  }
  if (!clientCode) return all;
  return all.filter((w) => w.clientId.includes(clientCode));
}

/* ------------------------------- writes ---------------------------------- */

export type WorkoutWriteResult = { success: boolean; [key: string]: unknown };

export type ScheduledWorkoutInput = {
  templateRecordId?: string;
  week: number;
  day: number;
  sessionName: string;
  sessionNameCn?: string;
  sessionType?: string;
  sessionGoal?: string;
  // Session-level coach notes from the builder — land in the assigned
  // workout's Coach Notes so the athlete sees them in the player.
  sessionNotes?: string;
  estimatedDuration?: string;
  intensity?: string;
  scheduledDate: string;
  // Present on a program's test days: assign creates an assigned_tests row
  // (the portal's test-taking stream) instead of an assigned workout.
  testTemplateId?: string;
};

export type AssignProgramInput = {
  // Feishu backend: client record_ids (DuplexLink). Postgres backend: CL-… codes.
  targetClientIds: string[];
  // Feishu record_id / PGM-… code of the program being assigned.
  programRecordId: string;
  scheduledWorkouts: ScheduledWorkoutInput[];
};

export type UpdateWorkoutDateInput = {
  assignedWorkoutRecordId?: string;
  assignedWorkoutId?: string;
  scheduledDate: string;
};

export type DuplicateWorkoutInput = {
  assignedWorkoutRecordId: string;
  scheduledDate?: string;
};

export type ShiftWorkoutDatesInput = {
  clientCode: string;
  fromDate: string; // YYYY-MM-DD — shift workouts scheduled on/after this day
  days: number; // signed; validated by the handler
  includeCompleted?: boolean; // default false: completed sessions stay put
};

export async function assignProgram(
  input: AssignProgramInput
): Promise<WorkoutWriteResult> {
  const result =
    await pg.assignProgram(input);
  if (result.success) {
    invalidateCache("workouts");
    invalidateCache("analytics");
    // Test days land in assigned_tests, which the calendar reads through the
    // content-assignments cache.
    if (input.scheduledWorkouts.some((w) => w.testTemplateId)) {
      invalidateCache("contentAssignments");
    }
  }
  return result;
}

export async function updateAssignedWorkoutDate(
  input: UpdateWorkoutDateInput
): Promise<WorkoutWriteResult> {
  const result =
    await pg.updateAssignedWorkoutDate(input);
  if (result.success) {
    invalidateCache("workouts");
    invalidateCache("analytics");
  }
  return result;
}

// Coach-set position of workouts sharing one calendar day.
export async function reorderAssignedWorkouts(
  orders: Array<{ assignedWorkoutId: string; dayOrder: number }>
): Promise<WorkoutWriteResult> {
  const result = await pg.reorderAssignedWorkouts(orders);
  if (result.success) invalidateCache("workouts");
  return result;
}

// Bulk reschedule: the client-facing "shift my plan" action. Moves every
// not-yet-completed workout scheduled on/after fromDate by N days.
export async function shiftAssignedWorkoutDates(
  input: ShiftWorkoutDatesInput
): Promise<WorkoutWriteResult> {
  const result =
    await pg.shiftAssignedWorkoutDates(input);
  if (result.success) {
    invalidateCache("workouts");
    invalidateCache("analytics");
  }
  return result;
}

export async function duplicateAssignedWorkout(
  input: DuplicateWorkoutInput
): Promise<WorkoutWriteResult> {
  const result =
    await pg.duplicateAssignedWorkout(input);
  if (result.success) {
    invalidateCache("workouts");
    invalidateCache("analytics");
  }
  return result;
}

export async function setWorkoutReviewed(
  assignedWorkoutRecordId: string,
  reviewed: unknown
): Promise<WorkoutWriteResult> {
  const result =
    await pg.setWorkoutReviewed(
          assignedWorkoutRecordId,
          reviewed
        );
  if (result.success) invalidateCache("workouts");
  return result;
}
