import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/programTemplates.ts";
import type { TemplateSummaryDTO } from "../dto.ts";
import type { ProgramExerciseInput } from "../templateMeta.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

export type HandlerResult = { status: number; body: Record<string, any> };

export type CreateWorkoutTemplateInput = {
  programId: string;
  // Feishu record_id of the program; the PR-… code on Postgres.
  programRecordId: string;
  week: any;
  day: any;
  sessionName: string;
  sessionNameCn?: any;
  sessionType?: any;
  sessionGoal?: any;
  estimatedDuration?: any;
  intensity?: any;
  isSingleWorkout?: any;
  exercises: ProgramExerciseInput[];
};

function normalizeLookupText(value?: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/gi, " ")
    .trim();
}

function lookupTextMatches(source?: string, target?: string) {
  const s = normalizeLookupText(source);
  const t = normalizeLookupText(target);
  return Boolean(s && t && (s === t || s.includes(t) || t.includes(s)));
}

export async function listProgramTemplates(
  programId = "",
  programRecordId = ""
): Promise<TemplateSummaryDTO[]> {
  const all =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/programTemplates.ts")).listAllTemplateRows()
      : await feishu.listAllTemplateRows();

  const programSearch = String(programId || "");
  const recordIdTarget = String(programRecordId || "");

  return all
    .filter(
      (row) =>
        (programSearch && lookupTextMatches(row.programId, programSearch)) ||
        (recordIdTarget &&
          (row.programRecordIds.includes(recordIdTarget) ||
            lookupTextMatches(row.programId, recordIdTarget)))
    )
    .map(
      (row): TemplateSummaryDTO => ({
        recordId: row.recordId,
        week: row.week,
        day: row.day,
        sessionName: row.sessionName,
        sessionNameCn: row.sessionNameCn,
        sessionType: row.sessionType,
        sessionGoal: row.sessionGoal,
        estimatedDuration: row.estimatedDuration,
        intensity: row.intensity,
        isSingleWorkout: row.isSingleWorkout,
        exerciseName: row.exerciseName,
        exerciseId: row.exerciseId,
        exerciseRecordId: row.exerciseRecordId,
        order: row.order,
        sets: row.sets,
        reps: row.reps,
        tempo: row.tempo,
        rest: row.rest,
        notes: row.notes,
      })
    )
    .sort((a, b) =>
      a.week !== b.week ? a.week - b.week : a.day !== b.day ? a.day - b.day : a.order - b.order
    );
}

export type BulkSessionInput = Omit<
  CreateWorkoutTemplateInput,
  "programId" | "programRecordId"
>;

export type CreateWorkoutTemplatesBulkInput = {
  programId: string;
  programRecordId: string;
  sessions: BulkSessionInput[];
};

// Whole-program save in one call — the fast path for the builder (the Feishu
// impl collapses N×3 round-trips into ~3). Same cache-invalidation contract as
// the single-session write below.
export async function createWorkoutTemplatesBulk(
  input: CreateWorkoutTemplatesBulkInput
): Promise<HandlerResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/programTemplates.ts")).createWorkoutTemplatesBulk(input)
      : await feishu.createWorkoutTemplatesBulk(input);

  if (result.status === 200) {
    invalidateCache("workoutTemplatesRaw");
    invalidateCache("programs");
    const typeMap = getCached<Record<string, string>>("programSessionTypes");
    if (typeMap && input.sessions.length > 0) {
      // Last session's type wins for the program-level map (matches how the
      // single-write patch keys by program code + record id).
      const type = String(input.sessions[input.sessions.length - 1].sessionType || "Strength");
      if (input.programId) typeMap[input.programId] = type;
      if (input.programRecordId) typeMap[input.programRecordId] = type;
      setCached("programSessionTypes", typeMap, 30 * 60 * 1000);
    }
  }
  return result;
}

export async function createWorkoutTemplate(
  input: CreateWorkoutTemplateInput
): Promise<HandlerResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/programTemplates.ts")).createWorkoutTemplate(input)
      : await feishu.createWorkoutTemplate(input);

  if (result.status === 200) {
    invalidateCache("workoutTemplatesRaw");
    invalidateCache("programs");

    // /api/programs resolves each program's Session Type from a long-lived
    // programId->type map (programSessionTypes). Adding a new session here
    // would otherwise be invisible to that map for up to 30 min — so the
    // session's type never surfaces in the Sessions list or the calendar's
    // Session Type filter. Patch the entry in place (keyed by both program
    // code and record id, matching how the map is built) so it's live
    // immediately without a full templates-table rebuild.
    const typeMap = getCached<Record<string, string>>("programSessionTypes");
    if (typeMap) {
      const type = String(input.sessionType || "Strength");
      if (input.programId) typeMap[input.programId] = type;
      if (input.programRecordId) typeMap[input.programRecordId] = type;
      setCached("programSessionTypes", typeMap, 30 * 60 * 1000);
    }
  }

  return result;
}
