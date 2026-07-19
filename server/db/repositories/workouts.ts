import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/workouts.ts";
import type { WorkoutDTO } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

// The full assigned-workouts list is cached briefly (2 min — it changes often:
// assigns, completions, reviews) and filtered per request; workout writers
// invalidate "workouts".
export async function listWorkouts(clientCode = ""): Promise<WorkoutDTO[]> {
  let all = getCached<WorkoutDTO[]>("workouts");
  if (!all) {
    all =
      DATA_BACKEND === "postgres"
        ? await (await import("../pg/workouts.ts")).listAllWorkouts()
        : await feishu.listAllWorkouts();
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
  estimatedDuration?: string;
  intensity?: string;
  scheduledDate: string;
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
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/workouts.ts")).assignProgram(input)
      : await feishu.assignProgram(input);
  if (result.success) {
    invalidateCache("workouts");
    invalidateCache("analytics");
  }
  return result;
}

export async function updateAssignedWorkoutDate(
  input: UpdateWorkoutDateInput
): Promise<WorkoutWriteResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/workouts.ts")).updateAssignedWorkoutDate(input)
      : await feishu.updateAssignedWorkoutDate(input);
  if (result.success) {
    invalidateCache("workouts");
    invalidateCache("analytics");
  }
  return result;
}

// Bulk reschedule: the client-facing "shift my plan" action. Moves every
// not-yet-completed workout scheduled on/after fromDate by N days.
export async function shiftAssignedWorkoutDates(
  input: ShiftWorkoutDatesInput
): Promise<WorkoutWriteResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/workouts.ts")).shiftAssignedWorkoutDates(input)
      : await feishu.shiftAssignedWorkoutDates(input);
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
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/workouts.ts")).duplicateAssignedWorkout(input)
      : await feishu.duplicateAssignedWorkout(input);
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
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/workouts.ts")).setWorkoutReviewed(
          assignedWorkoutRecordId,
          reviewed
        )
      : await feishu.setWorkoutReviewed(assignedWorkoutRecordId, reviewed);
  if (result.success) invalidateCache("workouts");
  return result;
}
