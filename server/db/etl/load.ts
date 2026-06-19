// ETL — load layer. Full reload into Postgres (idempotent: truncate + insert).
// Only imported when actually loading (run.ts dynamic-imports it), so the
// dry-run never needs a database connection or the drizzle/pg deps.
import { db, pool } from "../client.ts";
import * as s from "../schema.ts";

// FK dependency order — parents before children.
const ORDER: [string, any, string][] = [
  ["coaches", s.coaches, "coachId"],
  ["exercises", s.exercises, "exerciseId"],
  ["programs", s.programs, "programId"],
  ["clients", s.clients, "clientId"],
  ["teams", s.teams, "teamId"],
  ["workout_templates", s.workoutTemplates, "templateId"],
  ["set_prescriptions", s.setPrescriptions, "prescriptionId"],
  ["exercise_alternates", s.exerciseAlternates, "alternateId"],
  ["assigned_workouts", s.assignedWorkouts, "assignedWorkoutId"],
  ["workout_logs", s.workoutLogs, "logId"],
  ["exercise_results", s.exerciseResults, "resultId"],
  ["athlete_metrics", s.athleteMetrics, "metricId"],
  ["subscriptions", s.subscriptions, "subscriptionId"],
  ["product_orders", s.productOrders, "orderId"],
  ["check_ins", s.checkIns, "checkinId"],
  ["form_templates", s.formTemplates, "formId"],
  ["form_questions", s.formQuestions, "questionId"],
  ["assigned_forms", s.assignedForms, "assignedFormId"],
  ["form_responses", s.formResponses, "responseId"],
  ["test_templates", s.testTemplates, "testTemplateId"],
  ["test_items", s.testItems, "testItemId"],
  ["assigned_tests", s.assignedTests, "assignedTestId"],
  ["test_results", s.testResults, "resultId"],
  ["notifications", s.notifications, "notificationId"],
];

function dedupeByPk(rows: Record<string, any>[], pk: string) {
  const seen = new Map<string, Record<string, any>>();
  for (const row of rows) {
    const key = String(row[pk]);
    if (key) seen.set(key, row); // last wins
  }
  return [...seen.values()];
}

export async function load(
  rows: Record<string, Record<string, unknown>[]>,
  teamMembers: Record<string, unknown>[]
) {
  const tableNames = [...ORDER.map(([n]) => n), "team_members"];
  await pool.query(`TRUNCATE ${tableNames.map((n) => `"${n}"`).join(", ")} CASCADE`);

  for (const [name, table, pk] of ORDER) {
    const data = dedupeByPk(rows[name] || [], pk);
    for (let i = 0; i < data.length; i += 500) {
      await db.insert(table).values(data.slice(i, i + 500) as any);
    }
    console.log(`loaded ${name}: ${data.length}`);
  }

  for (let i = 0; i < teamMembers.length; i += 500) {
    if (teamMembers.length) await db.insert(s.teamMembers).values(teamMembers.slice(i, i + 500) as any);
  }
  console.log(`loaded team_members: ${teamMembers.length}`);

  await pool.end();
}
