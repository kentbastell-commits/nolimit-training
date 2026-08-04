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
// switch — field-allowlisted for non-coach callers, see updateClient.ts),
// contentAssignments/Responses, exerciseResults, athleteMetrics,
// formTemplates, testTemplates, workoutComments, notifications,
// workloadLogs, reviews (storeOnly/clientId branches), autoLoadProgram.
// Also excluded after tracing real usage: createClient (public 1:1 invite
// funnel), coaches (public store "meet your coach" — PII stripped for
// non-coach callers, see coaches.ts), programTemplates/workoutDetails (the
// athlete portal's own workout player — entitlement-checked per request
// for non-coach callers, see those handlers).
//
// 2026-07-30 audit: `teams` and `subscriptions` were listed here as
// deliberate exclusions, but tracing every call site (src/App.tsx) showed
// BOTH are only ever fetched from coach-console code paths (`!isCoachView`
// / `!isClientPortal` guards) — the portal never needed them. That stale
// comment is exactly how they shipped unauthenticated for an unknown
// period, leaking every athlete's client code (the portal's own bearer
// credential) plus the coach's private roster notes via `teams`, and every
// client's billing/payment data via `subscriptions`. Rule: before excluding
// a handler here "because the portal needs it", grep every real call site —
// don't trust a prior comment's claim without re-verifying it.
export const COACH_ONLY_HANDLERS = new Set([
  "analytics",
  "assignContent",
  "assignProgram",
  "createProductOrder",
  "createProgram",
  "createWorkoutTemplate",
  "createWorkoutTemplatesBulk",
  "deleteRecord",
  "duplicateAssignedWorkout",
  "duplicateProgram",
  "enquiries",
  "productOrders",
  "reviewWorkoutComment",
  "setWorkoutReviewed",
  "subscriptions",
  "teams",
  "updateAssignedProgramDate",
  "reorderAssignedWorkouts",
  "updateContentAssignmentDate",
  "updateProductOrder",
  "updateProgram",
  "upsertCoach",
  "upsertExercise",
  "upsertSubscription",
  "upsertTeam",
]);
