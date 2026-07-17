// Canonical Test Library (physical tests): 1RM tests bound to exercises,
// energy-system tests, jump/speed/mobility tests. Athlete metrics bind to
// these Test IDs; calculations (e1RM, MAS, pace) key off the Calculation field.
//
// Results are HTTP-shaped ({status, body}) — the legacy handler had distinct
// 502 "Feishu error" bodies the frontend recognizes.
import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/testLibrary.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

export type TestLibraryResult = { status: number; body: Record<string, any> };

export type LibraryTestDTO = {
  recordId: string;
  testId: string;
  testName: string;
  testNameCn: string;
  category: string;
  resultMetric: string;
  resultUnit: string;
  calculation: string;
  protocol: string;
  protocolCn: string;
  higherIsBetter: boolean;
  status: string;
  linkedExerciseName: string;
  linkedExerciseRecordId: string;
};

export type CreateLibraryTestInput = {
  testName: string;
  category: string;
  testNameCn?: string;
  resultMetric?: string;
  resultUnit?: string;
  calculation?: string;
  protocol?: string;
  protocolCn?: string;
  higherIsBetter?: any;
  // Feishu record_id of the linked exercise; the EX-… code on Postgres.
  linkedExerciseRecordId?: string;
};

export async function listTestLibrary(): Promise<TestLibraryResult> {
  const cached = getCached<LibraryTestDTO[]>("testLibrary");
  if (cached) return { status: 200, body: { tests: cached } };

  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/testLibrary.ts")).listTestLibrary()
      : await feishu.listTestLibrary();

  if (result.status === 200) {
    setCached("testLibrary", result.body.tests, 10 * 60 * 1000);
  }
  return result;
}

export async function createLibraryTest(
  input: CreateLibraryTestInput
): Promise<TestLibraryResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/testLibrary.ts")).createLibraryTest(input)
      : await feishu.createLibraryTest(input);
  if (result.status === 200) invalidateCache("testLibrary");
  return result;
}
