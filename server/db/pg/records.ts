// Postgres impl of the generic record delete. On this backend the business
// code (CL-0001, PR-…, WT-…) IS the id, so `recordId` is looked up against the
// whitelisted table's code column. Behavior mirrors Feishu exactly:
//  - deleting a client cascades to their training/wellness rows (financial
//    records — product orders, subscriptions — are left in place with the
//    dead client link cleared, just as Feishu clears a link to a deleted row);
//  - deleting any other parent never fails on dangling references — children
//    that Feishu would leave orphaned are detached (FK set to null) or, where
//    the schema already cascades (workout_templates → set_prescriptions /
//    exercise_alternates, teams → team_members), removed by the FK itself.
import { eq, inArray, or } from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import { db } from "../client.ts";
import {
  clients,
  exercises,
  programs,
  teams,
  subscriptions,
  productOrders,
  workoutTemplates,
  exerciseAlternates,
  assignedWorkouts,
  workoutLogs,
  exerciseResults,
  checkIns,
  workloadLogs,
  assignedForms,
  formResponses,
  assignedTests,
  testResults,
  athleteMetrics,
  notifications,
  reviews,
  formVideos,
  testLibrary,
} from "../schema.ts";
import type {
  DeleteRecordInput,
  DeleteRecordResult,
  DeleteResource,
} from "../repositories/records.ts";

// Explicit whitelist: resource name → drizzle table + business-code PK column.
const RESOURCE_TABLES: Record<
  DeleteResource,
  { table: AnyPgTable; pk: AnyPgColumn }
> = {
  client: { table: clients, pk: clients.clientId },
  exercise: { table: exercises, pk: exercises.exerciseId },
  workout: { table: assignedWorkouts, pk: assignedWorkouts.assignedWorkoutId },
  assignedForm: { table: assignedForms, pk: assignedForms.assignedFormId },
  assignedTest: { table: assignedTests, pk: assignedTests.assignedTestId },
  productOrder: { table: productOrders, pk: productOrders.orderId },
  program: { table: programs, pk: programs.programId },
  workoutTemplate: { table: workoutTemplates, pk: workoutTemplates.templateId },
  team: { table: teams, pk: teams.teamId },
  subscription: { table: subscriptions, pk: subscriptions.subscriptionId },
  workoutLog: { table: workoutLogs, pk: workoutLogs.logId },
  exerciseResult: { table: exerciseResults, pk: exerciseResults.resultId },
  checkIn: { table: checkIns, pk: checkIns.checkinId },
  workloadLog: { table: workloadLogs, pk: workloadLogs.workloadLogId },
  formResponse: { table: formResponses, pk: formResponses.responseId },
  testResult: { table: testResults, pk: testResults.resultId },
  athleteMetric: { table: athleteMetrics, pk: athleteMetrics.metricId },
};

// Delete every row a client owns across their training/wellness tables.
// Counts are keyed by the FEISHU_*_TABLE_ID env names so the response `cascade`
// object is shaped identically on both backends. Order matters: children with
// plain (non-cascading) FKs onto rows we delete go first.
// Executor type: the plain client or a transaction handle — the cascade and
// detach run inside one transaction so a mid-sequence error can't leave a
// half-deleted client (Feishu tolerated partial failures; Postgres shouldn't).
type DbExec = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function cascadeDeleteClientData(
  clientCode: string,
  dbx: DbExec
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const add = (envName: string, deleted: number) => {
    if (deleted > 0) counts[envName] = deleted;
  };

  // workout_logs reference assigned_workouts (no DB cascade) — delete them
  // first, then detach any log some OTHER owner left pointing at this client's
  // workouts (Feishu would simply clear that link).
  const logs = await dbx
    .delete(workoutLogs)
    .where(
      or(eq(workoutLogs.clientId, clientCode), eq(workoutLogs.clientCode, clientCode))
    )
    .returning();
  add("FEISHU_WORKOUT_LOGS_TABLE_ID", logs.length);
  await dbx
    .update(workoutLogs)
    .set({ assignedWorkoutId: null })
    .where(
      inArray(
        workoutLogs.assignedWorkoutId,
        db
          .select({ id: assignedWorkouts.assignedWorkoutId })
          .from(assignedWorkouts)
          .where(eq(assignedWorkouts.clientId, clientCode))
      )
    );
  const aw = await dbx
    .delete(assignedWorkouts)
    .where(eq(assignedWorkouts.clientId, clientCode))
    .returning();
  add("FEISHU_ASSIGNED_WORKOUTS_TABLE_ID", aw.length);

  const er = await dbx
    .delete(exerciseResults)
    .where(eq(exerciseResults.clientId, clientCode))
    .returning();
  add("FEISHU_EXERCISE_RESULTS_TABLE_ID", er.length);

  const ci = await dbx
    .delete(checkIns)
    .where(eq(checkIns.clientId, clientCode))
    .returning();
  add("FEISHU_CHECKINS_TABLE_ID", ci.length);

  // form_responses reference assigned_forms (no DB cascade) — same pattern.
  const fr = await dbx
    .delete(formResponses)
    .where(eq(formResponses.clientId, clientCode))
    .returning();
  add("FEISHU_FORM_RESPONSES_TABLE_ID", fr.length);
  await dbx
    .update(formResponses)
    .set({ assignedFormId: null })
    .where(
      inArray(
        formResponses.assignedFormId,
        db
          .select({ id: assignedForms.assignedFormId })
          .from(assignedForms)
          .where(
            or(
              eq(assignedForms.clientId, clientCode),
              eq(assignedForms.clientCode, clientCode)
            )
          )
      )
    );
  const af = await dbx
    .delete(assignedForms)
    .where(
      or(
        eq(assignedForms.clientId, clientCode),
        eq(assignedForms.clientCode, clientCode)
      )
    )
    .returning();
  add("FEISHU_ASSIGNED_FORMS_TABLE_ID", af.length);

  // test_results reference assigned_tests (no DB cascade) — same pattern.
  const tr = await dbx
    .delete(testResults)
    .where(eq(testResults.clientId, clientCode))
    .returning();
  add("FEISHU_TEST_RESULTS_TABLE_ID", tr.length);
  await dbx
    .update(testResults)
    .set({ assignedTestId: null })
    .where(
      inArray(
        testResults.assignedTestId,
        db
          .select({ id: assignedTests.assignedTestId })
          .from(assignedTests)
          .where(
            or(
              eq(assignedTests.clientId, clientCode),
              eq(assignedTests.clientCode, clientCode)
            )
          )
      )
    );
  const at = await dbx
    .delete(assignedTests)
    .where(
      or(
        eq(assignedTests.clientId, clientCode),
        eq(assignedTests.clientCode, clientCode)
      )
    )
    .returning();
  add("FEISHU_ASSIGNED_TESTS_TABLE_ID", at.length);

  const wl = await dbx
    .delete(workloadLogs)
    .where(eq(workloadLogs.clientId, clientCode))
    .returning();
  add("FEISHU_WORKLOAD_LOGS_TABLE_ID", wl.length);

  const am = await dbx
    .delete(athleteMetrics)
    .where(eq(athleteMetrics.clientId, clientCode))
    .returning();
  add("FEISHU_ATHLETE_METRICS_TABLE_ID", am.length);

  return counts;
}

// Detach (null out) every plain FK that points at the row being deleted, so
// the delete can never fail on a dangling reference — mirroring Feishu, where
// deleting a record simply clears the links other rows held to it. Tables the
// schema already cascades (set_prescriptions/exercise_alternates from
// workout_templates, team_members from teams/clients) are NOT touched here.
async function detachReferences(
  resource: DeleteResource,
  id: string,
  dbx: DbExec
) {
  switch (resource) {
    case "client":
      // Financial + misc records survive a client delete (matches the Feishu
      // cascade, which intentionally leaves them); their client link dies.
      await dbx
        .update(subscriptions)
        .set({ clientId: null })
        .where(eq(subscriptions.clientId, id));
      await dbx
        .update(productOrders)
        .set({ clientId: null })
        .where(eq(productOrders.clientId, id));
      await dbx
        .update(notifications)
        .set({ clientId: null })
        .where(eq(notifications.clientId, id));
      await dbx
        .update(reviews)
        .set({ clientId: null })
        .where(eq(reviews.clientId, id));
      await dbx
        .update(formVideos)
        .set({ clientId: null })
        .where(eq(formVideos.clientId, id));
      break;
    case "exercise":
      await dbx
        .update(workoutTemplates)
        .set({ exerciseId: null })
        .where(eq(workoutTemplates.exerciseId, id));
      await dbx
        .update(exerciseAlternates)
        .set({ exerciseId: null })
        .where(eq(exerciseAlternates.exerciseId, id));
      await dbx
        .update(workoutLogs)
        .set({ exerciseId: null })
        .where(eq(workoutLogs.exerciseId, id));
      await dbx
        .update(exerciseResults)
        .set({ exerciseId: null })
        .where(eq(exerciseResults.exerciseId, id));
      await dbx
        .update(testLibrary)
        .set({ linkedExerciseId: null })
        .where(eq(testLibrary.linkedExerciseId, id));
      break;
    case "program":
      // A program's own building blocks go with it (their set_prescriptions /
      // exercise_alternates are removed by the schema's ON DELETE CASCADE)…
      await dbx
        .delete(workoutTemplates)
        .where(eq(workoutTemplates.programId, id));
      // …while independent records that merely point at the program keep
      // living with the link cleared, exactly like Feishu.
      await dbx
        .update(clients)
        .set({ programId: null })
        .where(eq(clients.programId, id));
      await dbx
        .update(assignedWorkouts)
        .set({ programId: null })
        .where(eq(assignedWorkouts.programId, id));
      await dbx
        .update(productOrders)
        .set({ programId: null })
        .where(eq(productOrders.programId, id));
      await dbx
        .update(reviews)
        .set({ programId: null })
        .where(eq(reviews.programId, id));
      break;
    case "workout":
      await dbx
        .update(workoutLogs)
        .set({ assignedWorkoutId: null })
        .where(eq(workoutLogs.assignedWorkoutId, id));
      break;
    case "assignedForm":
      await dbx
        .update(formResponses)
        .set({ assignedFormId: null })
        .where(eq(formResponses.assignedFormId, id));
      break;
    case "assignedTest":
      await dbx
        .update(testResults)
        .set({ assignedTestId: null })
        .where(eq(testResults.assignedTestId, id));
      break;
    default:
      // workoutTemplate/team rely on the schema's ON DELETE CASCADE; the
      // remaining resources are leaf tables nothing references.
      break;
  }
}

export async function deleteRecordFromTable(
  input: DeleteRecordInput
): Promise<DeleteRecordResult> {
  const { resource, recordId } = input;
  const entry = RESOURCE_TABLES[resource];
  if (!entry) {
    // Unreachable via the handler (it validates first) — kept as a hard stop
    // so no unlisted table can ever be deleted from.
    return { success: false, error: "Unsupported delete resource" };
  }

  // One transaction end to end: cascade + detach + parent delete commit or
  // roll back together — no more half-deleted clients on a mid-sequence
  // error. (A missing parent still doesn't throw, so like Feishu the cascade
  // stands in that case.)
  let cascade: Record<string, number> | undefined;
  let deletedCount = 0;
  await db.transaction(async (tx) => {
    if (resource === "client") {
      cascade = await cascadeDeleteClientData(recordId, tx);
    }
    await detachReferences(resource, recordId, tx);
    const deleted = await tx
      .delete(entry.table)
      .where(eq(entry.pk, recordId))
      .returning();
    deletedCount = deleted.length;
  });

  if (deletedCount === 0) {
    return { success: false, error: "Failed to delete record", cascade };
  }

  return { success: true, cascade };
}
