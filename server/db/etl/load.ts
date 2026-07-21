// ETL — load layer. Full reload into Postgres (idempotent: truncate + insert).
// Only imported when actually loading, so the dry-run/dump never needs a DB.
import { db, pool } from "../client.ts";
import * as s from "../schema.ts";

// FK dependency order — parents before children. [name, table, pkProp]
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
  ["workload_logs", s.workloadLogs, "workloadLogId"],
  ["reviews", s.reviews, "reviewId"],
  ["enquiries", s.enquiries, "enquiryId"],
  ["form_videos", s.formVideos, "videoId"],
  ["test_library", s.testLibrary, "testId"],
];

// child FK prop -> parent table name. Any value not present in the parent's PK
// set is nulled so a real (or orphaned test) reference can't break the load.
const FKS: Record<string, Record<string, string>> = {
  clients: { programId: "programs" },
  workout_templates: { programId: "programs", exerciseId: "exercises" },
  set_prescriptions: { templateId: "workout_templates" },
  exercise_alternates: { templateId: "workout_templates", exerciseId: "exercises" },
  assigned_workouts: { clientId: "clients", programId: "programs" },
  workout_logs: { clientId: "clients", assignedWorkoutId: "assigned_workouts", exerciseId: "exercises" },
  exercise_results: { clientId: "clients", exerciseId: "exercises" },
  athlete_metrics: { clientId: "clients" },
  subscriptions: { clientId: "clients" },
  product_orders: { clientId: "clients", programId: "programs" },
  check_ins: { clientId: "clients" },
  form_questions: { formId: "form_templates" },
  assigned_forms: { formId: "form_templates", clientId: "clients" },
  form_responses: { assignedFormId: "assigned_forms", formId: "form_templates", clientId: "clients" },
  test_items: { testTemplateId: "test_templates" },
  assigned_tests: { testTemplateId: "test_templates", clientId: "clients" },
  test_results: {
    assignedTestId: "assigned_tests",
    testTemplateId: "test_templates",
    testItemId: "test_items",
    clientId: "clients",
  },
  notifications: { clientId: "clients" },
  workload_logs: { clientId: "clients" },
  reviews: { clientId: "clients", programId: "programs" },
  form_videos: { clientId: "clients" },
  test_library: { linkedExerciseId: "exercises" },
};

function dedupeByPk(rows: Record<string, any>[], pk: string) {
  const seen = new Map<string, Record<string, any>>();
  for (const row of rows) {
    const key = String(row[pk]);
    if (key) seen.set(key, row);
  }
  return [...seen.values()];
}

export async function load(
  rows: Record<string, Record<string, unknown>[]>,
  teamMembers: Record<string, unknown>[]
) {
  // Dedupe by PK first.
  const clean: Record<string, Record<string, any>[]> = {};
  for (const [name, , pk] of ORDER) clean[name] = dedupeByPk(rows[name] || [], pk);

  // PK sets per table for FK validation.
  const pkSet: Record<string, Set<string>> = {};
  for (const [name, , pk] of ORDER) pkSet[name] = new Set(clean[name].map((r) => String(r[pk])));

  // Null orphaned FK references.
  let nulled = 0;
  for (const [name] of ORDER) {
    const fks = FKS[name];
    if (!fks) continue;
    for (const row of clean[name]) {
      for (const [prop, parent] of Object.entries(fks)) {
        const v = row[prop];
        if (v != null && !pkSet[parent].has(String(v))) {
          row[prop] = null;
          nulled++;
        }
      }
    }
  }
  const validMembers = teamMembers.filter(
    (m) => pkSet["teams"].has(String((m as any).teamId)) && pkSet["clients"].has(String((m as any).clientId))
  );
  if (nulled) console.log(`nulled ${nulled} orphaned FK reference(s)`);

  const tableNames = [...ORDER.map(([n]) => n), "team_members"];

  // Safety fence (post-cutover 2026-07-21): this loader TRUNCATEs everything,
  // and production now lives in Postgres — a casual run against nolimit_prod
  // would destroy every write since the Feishu freeze and reload the stale
  // mirror. Fresh twin/CN targets are empty and pass untouched; a non-empty
  // target requires an explicit, ugly override.
  const occupied = await pool.query(
    `SELECT (SELECT count(*) FROM clients) + (SELECT count(*) FROM workout_logs) AS n`
  );
  if (Number(occupied.rows[0]?.n || 0) > 0 && process.env.ETL_FORCE_RELOAD !== "yes") {
    throw new Error(
      "ETL refused: target database is NOT empty — it may be live production. " +
        "This load TRUNCATEs all tables and reloads the frozen Feishu mirror. " +
        "If you truly mean to wipe it, re-run with ETL_FORCE_RELOAD=yes."
    );
  }

  await pool.query(`TRUNCATE ${tableNames.map((n) => `"${n}"`).join(", ")} CASCADE`);

  for (const [name, table] of ORDER) {
    const data = clean[name];
    for (let i = 0; i < data.length; i += 500) await db.insert(table).values(data.slice(i, i + 500));
    console.log(`loaded ${name}: ${data.length}`);
  }
  for (let i = 0; i < validMembers.length; i += 500) {
    await db.insert(s.teamMembers).values(validMembers.slice(i, i + 500) as any);
  }
  console.log(`loaded team_members: ${validMembers.length}`);

  await pool.end();
}
