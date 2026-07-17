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
async function cascadeDeleteClientData(
  clientCode: string
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const add = (envName: string, deleted: number) => {
    if (deleted > 0) counts[envName] = deleted;
  };

  // workout_logs reference assigned_workouts (no DB cascade) — delete them
  // first, then detach any log some OTHER owner left pointing at this client's
  // workouts (Feishu would simply clear that link).
  const logs = await db
    .delete(workoutLogs)
    .where(
      or(eq(workoutLogs.clientId, clientCode), eq(workoutLogs.clientCode, clientCode))
    )
    .returning();
  add("FEISHU_WORKOUT_LOGS_TABLE_ID", logs.length);
  await db
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
  const aw = await db
    .delete(assignedWorkouts)
    .where(eq(assignedWorkouts.clientId, clientCode))
    .returning();
  add("FEISHU_ASSIGNED_WORKOUTS_TABLE_ID", aw.length);

  const er = await db
    .delete(exerciseResults)
    .where(eq(exerciseResults.clientId, clientCode))
    .returning();
  add("FEISHU_EXERCISE_RESULTS_TABLE_ID", er.length);

  const ci = await db
    .delete(checkIns)
    .where(eq(checkIns.clientId, clientCode))
    .returning();
  add("FEISHU_CHECKINS_TABLE_ID", ci.length);

  // form_responses reference assigned_forms (no DB cascade) — same pattern.
  const fr = await db
    .delete(formResponses)
    .where(eq(formResponses.clientId, clientCode))
    .returning();
  add("FEISHU_FORM_RESPONSES_TABLE_ID", fr.length);
  await db
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
  const af = await db
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
  const tr = await db
    .delete(testResults)
    .where(eq(testResults.clientId, clientCode))
    .returning();
  add("FEISHU_TEST_RESULTS_TABLE_ID", tr.length);
  await db
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
  const at = await db
    .delete(assignedTests)
    .where(
      or(
        eq(assignedTests.clientId, clientCode),
        eq(assignedTests.clientCode, clientCode)
      )
    )
    .returning();
  add("FEISHU_ASSIGNED_TESTS_TABLE_ID", at.length);

  const wl = await db
    .delete(workloadLogs)
    .where(eq(workloadLogs.clientId, clientCode))
    .returning();
  add("FEISHU_WORKLOAD_LOGS_TABLE_ID", wl.length);

  const am = await db
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
async function detachReferences(resource: DeleteResource, id: string) {
  switch (resource) {
    case "client":
      // Financial + misc records survive a client delete (matches the Feishu
      // cascade, which intentionally leaves them); their client link dies.
      await db
        .update(subscriptions)
        .set({ clientId: null })
        .where(eq(subscriptions.clientId, id));
      await db
        .update(productOrders)
        .set({ clientId: null })
        .where(eq(productOrders.clientId, id));
      await db
        .update(notifications)
        .set({ clientId: null })
        .where(eq(notifications.clientId, id));
      await db
        .update(reviews)
        .set({ clientId: null })
        .where(eq(reviews.clientId, id));
      await db
        .update(formVideos)
        .set({ clientId: null })
        .where(eq(formVideos.clientId, id));
      break;
    case "exercise":
      await db
        .update(workoutTemplates)
        .set({ exerciseId: null })
        .where(eq(workoutTemplates.exerciseId, id));
      await db
        .update(exerciseAlternates)
        .set({ exerciseId: null })
        .where(eq(exerciseAlternates.exerciseId, id));
      await db
        .update(workoutLogs)
        .set({ exerciseId: null })
        .where(eq(workoutLogs.exerciseId, id));
      await db
        .update(exerciseResults)
        .set({ exerciseId: null })
        .where(eq(exerciseResults.exerciseId, id));
      await db
        .update(testLibrary)
        .set({ linkedExerciseId: null })
        .where(eq(testLibrary.linkedExerciseId, id));
      break;
    case "program":
      // A program's own building blocks go with it (their set_prescriptions /
      // exercise_alternates are removed by the schema's ON DELETE CASCADE)…
      await db
        .delete(workoutTemplates)
        .where(eq(workoutTemplates.programId, id));
      // …while independent records that merely point at the program keep
      // living with the link cleared, exactly like Feishu.
      await db
        .update(clients)
        .set({ programId: null })
        .where(eq(clients.programId, id));
      await db
        .update(assignedWorkouts)
        .set({ programId: null })
        .where(eq(assignedWorkouts.programId, id));
      await db
        .update(productOrders)
        .set({ programId: null })
        .where(eq(productOrders.programId, id));
      await db
        .update(reviews)
        .set({ programId: null })
        .where(eq(reviews.programId, id));
      break;
    case "workout":
      await db
        .update(workoutLogs)
        .set({ assignedWorkoutId: null })
        .where(eq(workoutLogs.assignedWorkoutId, id));
      break;
    case "assignedForm":
      await db
        .update(formResponses)
        .set({ assignedFormId: null })
        .where(eq(formResponses.assignedFormId, id));
      break;
    case "assignedTest":
      await db
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

  // Like Feishu, the client cascade runs BEFORE the parent delete and its
  // deletions stand even if the parent row turns out not to exist.
  let cascade: Record<string, number> | undefined;
  if (resource === "client") {
    cascade = await cascadeDeleteClientData(recordId);
  }

  await detachReferences(resource, recordId);

  const deleted = await db
    .delete(entry.table)
    .where(eq(entry.pk, recordId))
    .returning();

  if (deleted.length === 0) {
    return { success: false, error: "Failed to delete record", cascade };
  }

  return { success: true, cascade };
}
