// Postgres impl for the testLibrary domain. The linked exercise is a real FK
// (EX-… code); its display name comes from a join instead of Feishu's
// cache-based record_id resolution.
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "../client.ts";
import { testLibrary, exercises } from "../schema.ts";
import { fillTranslation } from "../translate.ts";
import { str } from "./_util.ts";
import type {
  TestLibraryResult,
  LibraryTestDTO,
  CreateLibraryTestInput,
} from "../repositories/testLibrary.ts";

export async function listTestLibrary(): Promise<TestLibraryResult> {
  const rows = await db
    .select({ test: testLibrary, exerciseName: exercises.name })
    .from(testLibrary)
    .leftJoin(exercises, eq(testLibrary.linkedExerciseId, exercises.exerciseId));

  const tests = rows
    .map(({ test: r, exerciseName }): LibraryTestDTO => ({
      recordId: r.testId,
      testId: r.testId,
      testName: str(r.name),
      testNameCn: str(r.nameCn),
      category: str(r.category),
      resultMetric: str(r.resultMetric),
      resultUnit: str(r.resultUnit),
      calculation: str(r.calculation),
      protocol: str(r.protocol),
      protocolCn: str(r.protocolCn),
      // Feishu parity: an unset checkbox read as false there; the seeded
      // library relied on that, so ?? true silently inverted trend/PR
      // direction for every never-configured test.
      higherIsBetter: r.higherIsBetter ?? false,
      status: str(r.status) || "Active",
      linkedExerciseName: str(exerciseName) || str(r.linkedExerciseId),
      linkedExerciseRecordId: str(r.linkedExerciseId),
    }))
    .filter((t) => t.testName)
    .sort((a, b) => a.testId.localeCompare(b.testId));

  return { status: 200, body: { tests } };
}

export async function createLibraryTest(
  input: CreateLibraryTestInput
): Promise<TestLibraryResult> {
  // TST-XXXX is a PRIMARY KEY here (Feishu had no uniqueness constraint) —
  // re-mint on the rare collision.
  let testId = "TST-" + String(Math.floor(1000 + Math.random() * 9000));
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await db
      .select({ id: testLibrary.testId })
      .from(testLibrary)
      .where(eq(testLibrary.testId, testId));
    if (!clash.length) break;
    testId = "TST-" + String(Math.floor(1000 + Math.random() * 9000));
  }

  // FK-validated exercise link (frontend sends the EX-… code in pg mode).
  const linkCode = String(input.linkedExerciseRecordId || "").trim();
  const linkFk =
    linkCode &&
    (
      await db
        .select({ id: exercises.exerciseId })
        .from(exercises)
        .where(eq(exercises.exerciseId, linkCode))
    ).length
      ? linkCode
      : null;

  try {
    await db.insert(testLibrary).values({
      testId,
      name: String(input.testName).trim(),
      nameCn: String(input.testNameCn || "").trim() || null,
      category: String(input.category).trim(),
      resultMetric: String(input.resultMetric || "").trim() || null,
      resultUnit: String(input.resultUnit || "").trim() || null,
      calculation: String(input.calculation || "").trim() || null,
      protocol: String(input.protocol || "").trim() || null,
      protocolCn: String(input.protocolCn || "").trim() || null,
      higherIsBetter: Boolean(input.higherIsBetter),
      status: "Active",
      linkedExerciseId: linkFk,
    });
  } catch (e: any) {
    return {
      status: 502,
      body: { error: "Feishu error", message: e?.message || "Could not create test" },
    };
  }

  // Translate-on-write: fill the CN name/protocol when the coach didn't
  // provide them (best-effort, fills empty only).
  const emptyOnly = (col: any) => or(isNull(col), eq(col, ""));
  void fillTranslation(String(input.testName), "zh", (zh) =>
    db
      .update(testLibrary)
      .set({ nameCn: zh })
      .where(and(eq(testLibrary.testId, testId), emptyOnly(testLibrary.nameCn)))
  );
  if (String(input.protocol || "").trim()) {
    void fillTranslation(String(input.protocol), "zh", (zh) =>
      db
        .update(testLibrary)
        .set({ protocolCn: zh })
        .where(and(eq(testLibrary.testId, testId), emptyOnly(testLibrary.protocolCn)))
    );
  }

  return { status: 200, body: { success: true, testId, recordId: testId } };
}
