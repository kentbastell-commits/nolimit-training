import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/programs.ts";
import type { ProgramDTO } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

// Write operations return the exact HTTP status + JSON body the legacy handler
// produced, so the thinned api/ handlers stay byte-compatible (unit tests
// assert exact bodies, e.g. duplicateProgram's week-mode `toEqual`).
export type HandlerResult = { status: number; body: Record<string, any> };

export type CreateProgramInput = {
  programName: string;
  programNameCn?: any;
  goal?: any;
  goalCn?: any;
  sport?: any;
  level?: any;
  durationWeeks?: any;
  phase?: any;
  season?: any;
  sessionsPerWeek?: any;
  coach?: any;
  status?: any;
  productType?: any;
  price?: any;
  compareAtPrice?: any;
  currency?: any;
  publicStoreVisible?: any;
  purchaseLink?: any;
  defaultIntakeFormId?: any;
  accessLengthDays?: any;
  productStatus?: any;
  salesDescription?: any;
  salesDescriptionCn?: any;
  builtForClient?: any;
  builtForTeam?: any;
  storeCategory?: any;
  storeCategoryCn?: any;
  storeListingType?: any;
  bundleProgramIds?: any;
};

export type UpdateProgramInput = Omit<CreateProgramInput, "programName"> & {
  programRecordId: string;
  programName?: any;
};

export type DuplicateProgramInput = {
  programRecordId: string;
  mode?: string;
  fromWeek?: any;
  toWeek?: any;
};

export async function listPrograms(): Promise<ProgramDTO[]> {
  const cached = getCached<ProgramDTO[]>("programs");
  if (cached) return cached;

  const programs =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/programs.ts")).listPrograms()
      : await feishu.listPrograms();

  setCached("programs", programs, 10 * 60 * 1000);
  return programs;
}

// Mirrors EXACTLY which inputs produce a Feishu field in updateProgram, so the
// handler can keep the legacy 400 "No fields to update" without a round-trip.
// Empty strings on typed columns (Price/URL/Number) never become fields.
export function hasProgramUpdateFields(i: UpdateProgramInput): boolean {
  const definedKeys: Array<keyof UpdateProgramInput> = [
    "programName",
    "goal",
    "sport",
    "level",
    "durationWeeks",
    "phase",
    "sessionsPerWeek",
    "coach",
    "status",
    "productType",
    "currency",
    "publicStoreVisible",
    "defaultIntakeFormId",
    "productStatus",
    "salesDescription",
    "salesDescriptionCn",
    "builtForClient",
    "builtForTeam",
    "storeCategory",
    "storeCategoryCn",
    "storeListingType",
    "bundleProgramIds",
  ];
  if (definedKeys.some((key) => i[key] !== undefined)) return true;
  const nonEmptyKeys: Array<keyof UpdateProgramInput> = [
    "season",
    "price",
    "compareAtPrice",
    "purchaseLink",
    "accessLengthDays",
  ];
  return nonEmptyKeys.some((key) => i[key] !== undefined && i[key] !== "");
}

export async function createProgram(input: CreateProgramInput): Promise<HandlerResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/programs.ts")).createProgram(input)
      : await feishu.createProgram(input);
  if (result.status === 200) invalidateCache("programs");
  return result;
}

export async function updateProgram(input: UpdateProgramInput): Promise<HandlerResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/programs.ts")).updateProgram(input)
      : await feishu.updateProgram(input);
  if (result.status === 200) invalidateCache("programs");
  return result;
}

export async function duplicateProgram(input: DuplicateProgramInput): Promise<HandlerResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/programs.ts")).duplicateProgram(input)
      : await feishu.duplicateProgram(input);
  if (result.status === 200) {
    // Legacy keys the old handler dropped, PLUS "workoutTemplatesRaw" — the key
    // the converted read paths (programTemplates/workoutDetails) actually cache
    // the templates scan under. Copied sessions must show up immediately.
    if (input.mode === "week") {
      invalidateCache("programTemplates");
      invalidateCache("workoutDetails");
      invalidateCache("workoutTemplatesRaw");
    } else {
      invalidateCache("programs");
      invalidateCache("programTemplates");
      invalidateCache("workoutTemplatesRaw");
    }
  }
  return result;
}
