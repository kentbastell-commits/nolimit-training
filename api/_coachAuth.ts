// Coach-only API gating. When COACH_ACCESS_KEY is set on the server, requests
// to coach/admin endpoints must carry it in the x-coach-key header. Unset key
// = gating off (safe rollout / local dev). Athlete-facing endpoints are never
// gated — the athlete portal keeps working with plain links.
export function coachKeyOk(req: { headers: Record<string, unknown> }): boolean {
  const required = process.env.COACH_ACCESS_KEY;
  if (!required) return true;
  const provided = req.headers["x-coach-key"];
  return typeof provided === "string" && provided === required;
}

// Handler names (as registered in server/index.ts) that only a coach may call.
// Deliberately excludes everything the athlete portal or public store touches:
// activateDigitalOrder, findMyPortal, inPersonEnquiry, recordLogin, workouts,
// workoutDetails/History, saveWorkoutLog/WorkloadLog, submitContentResponse,
// checkIns, exercises, programs, clients, updateClient (portal language
// switch), contentAssignments/Responses, exerciseResults, athleteMetrics,
// formTemplates, testTemplates, workoutComments, notifications, teams,
// workloadLogs, reviews, subscriptions (portal profile), autoLoadProgram.
// Also excluded after tracing real usage: createClient (public 1:1 invite
// funnel), coaches (public store "meet your coach"), programTemplates (public
// store sample-week preview).
export const COACH_ONLY_HANDLERS = new Set([
  "analytics",
  "assignContent",
  "assignProgram",
  "createProductOrder",
  "createProgram",
  "createWorkoutTemplate",
  "deleteRecord",
  "duplicateAssignedWorkout",
  "enquiries",
  "productOrders",
  "reviewWorkoutComment",
  "setWorkoutReviewed",
  "updateAssignedProgramDate",
  "updateContentAssignmentDate",
  "updateProductOrder",
  "updateProgram",
  "upsertCoach",
  "upsertExercise",
  "upsertSubscription",
  "upsertTeam",
]);
