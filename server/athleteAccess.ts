import { and, eq, or } from "drizzle-orm";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isVerifiedCoach, COACH_ONLY_HANDLERS } from "../api/_coachAuth.ts";
import { athleteSessionsRequired, readAthleteSession, sameOriginRequest } from "./athleteAuth.ts";
import { db } from "./db/client.ts";
import { assignedForms, assignedTests, assignedWorkouts, productOrders } from "./db/schema.ts";
import { clientHasProgramAccess } from "./db/pg/clients.ts";
import { verifyCheckoutKey } from "./checkoutAuth.ts";

const PUBLIC = new Set([
  "athleteSession", "findMyPortal", "wxAuth", "wxAuthWeb", "wxLogin", "clientLog", "inPersonEnquiry",
  "createClient", "activateDigitalOrder", "coaches", "programs", "wxpayConfig", "wxpayStatus", "payLink",
]);
const ATHLETE = new Set([
  "clients", "myProfile", "updateClient", "recordLogin", "workouts", "workoutHistory", "exerciseResults",
  "athleteMetrics", "checkIns", "workloadLogs", "saveWorkloadLog", "workoutComments", "contentAssignments",
  "contentResponses", "submitContentResponse", "notifications", "formVideos", "clientMessages", "referralStatus",
  "productOrders", "autoLoadProgram", "saveWorkoutLog", "shiftAssignedWorkouts", "updateAssignedProgramDate",
  "wxSubscribeBank", "uploadFormVideoFile", "reviews", "programTemplates", "workoutDetails", "formTemplates",
  "testTemplates", "testLibrary",
]);
const PAYMENT_CREATE = new Set(["wxpayCreate", "wxpayCreateJsapi", "wxpayCreateMini"]);
const LIBRARY = new Set(["programTemplates", "workoutDetails", "formTemplates", "testTemplates", "testLibrary"]);
const CLIENT_FIELDS = ["clientId", "clientCode", "clientRecordId"];
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const unsafe = (req: VercelRequest) => !["GET", "HEAD", "OPTIONS"].includes(req.method || "GET");
const refuse = (res: VercelResponse, status: number, error: string, code = "ATHLETE_ACCESS_DENIED") => {
  res.status(status).json({ error, code }); return false;
};

/** Production dispatcher boundary: credentials identify the actor; request
 * parameters select only resources owned by that actor. API handlers retain
 * their field/business validation and the coach key remains a separate role. */
export async function authorizeAthleteRequest(name: string, req: VercelRequest, res: VercelResponse): Promise<boolean> {
  if (name.startsWith("companyOps")) return true; // independent Feishu session/CSRF boundary
  const session = await readAthleteSession(req);
  if (session?.proof === "preview" && unsafe(req) && !(name === "athleteSession" && req.body?.action === "logout")) {
    return refuse(res, 403, "Athlete preview is read-only", "ATHLETE_PREVIEW_READ_ONLY");
  }
  if (isVerifiedCoach(req as never)) return true;
  if (COACH_ONLY_HANDLERS.has(name)) return refuse(res, 401, "Coach access key required");
  if (PUBLIC.has(name) || (name === "exercises" && req.method === "GET") ||
      (name === "reviews" && req.method === "GET" && req.query.storeOnly === "1") ||
      (name === "coachingSignup" && !["claim", "intake"].includes(req.body?.stage))) return true;

  // These capabilities authorize a checkout, never an athlete's profile or
  // training history. Old forwarded payment links keep working across retries.
  if (PAYMENT_CREATE.has(name) || name === "coachingSignup") {
    const orderId = text(req.body?.orderId);
    const checkoutKey = text(req.body?.checkoutKey);
    if (checkoutKey && verifyCheckoutKey(checkoutKey) === orderId) {
      if (unsafe(req) && !sameOriginRequest(req)) return refuse(res, 403, "Cross-site request refused");
      const [order] = await db.select({ clientId: productOrders.clientId }).from(productOrders).where(eq(productOrders.orderId, orderId));
      if (!order) return refuse(res, 404, "Order not found");
      if (name === "coachingSignup") {
        req.body = { ...req.body, clientRecordId: order.clientId, clientCode: order.clientId, checkoutOrderId: orderId };
      }
      return true;
    }
    if (!session) {
      if (!athleteSessionsRequired()) return true;
      return refuse(res, 401, "Sign in or reopen your payment link", "ATHLETE_SESSION_REQUIRED");
    }
    const [order] = await db.select({ clientId: productOrders.clientId }).from(productOrders).where(eq(productOrders.orderId, orderId));
    if (!order || order.clientId !== session.clientId) return refuse(res, 403, "This order belongs to another athlete");
    if (name === "coachingSignup") req.body = { ...req.body, checkoutOrderId: orderId, clientRecordId: session.clientId, clientCode: session.clientId };
    return !unsafe(req) || sameOriginRequest(req) || refuse(res, 403, "Cross-site request refused");
  }

  if (!ATHLETE.has(name) && name !== "exercises") return refuse(res, 401, "Coach access key required");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Cookie, Authorization");
  if (!session) {
    if (!athleteSessionsRequired()) return true;
    return refuse(res, 401, "Sign in to continue", "ATHLETE_SESSION_REQUIRED");
  }
  if (unsafe(req) && !sameOriginRequest(req)) return refuse(res, 403, "Cross-site request refused");
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const query = { ...req.query };
  for (const source of [query, body]) {
    for (const key of CLIENT_FIELDS) {
      const value = source[key];
      if (value !== undefined && value !== "" && (typeof value !== "string" || value.trim().toUpperCase() !== session.clientId.toUpperCase())) {
        return refuse(res, 403, "This account belongs to another athlete");
      }
    }
  }
  if (name === "clients" && query.code && text(query.code).toUpperCase() !== session.clientId.toUpperCase()) {
    return refuse(res, 403, "This account belongs to another athlete");
  }
  if ((LIBRARY.has(name) && req.method !== "GET") || (name === "exercises" && req.method !== "GET") ||
      (name === "notifications" && req.method !== "GET") || (name === "formVideos" && !["GET", "POST"].includes(req.method || "")) ||
      (name === "checkIns" && (body.recordId || body.coachResponse !== undefined || body.reviewedDate !== undefined || body.coachReviewed !== undefined ||
        (body.status !== undefined && !["Daily", "Submitted"].includes(body.status)))) ||
      (name === "clientMessages" && body.messageId) || (name === "reviews" && body.recordId)) {
    return refuse(res, 403, "Coach access key required");
  }
  if (name === "updateClient" && Object.keys(body).some(key => !["clientRecordId", "languagePreference", "lastCheckInDate"].includes(key))) {
    return refuse(res, 403, "Coach access key required");
  }

  const source = req.method === "GET" ? query : body;
  // A caller may omit its code, but never select another athlete's object.
  const workoutIds = [source.assignedWorkoutId, source.assignedWorkoutRecordId].filter(value => value !== undefined && value !== "");
  for (const id of workoutIds) {
    if (typeof id !== "string") return refuse(res, 400, "Invalid workout id");
    const [owned] = await db.select({ id: assignedWorkouts.assignedWorkoutId }).from(assignedWorkouts)
      .where(and(eq(assignedWorkouts.assignedWorkoutId, id), eq(assignedWorkouts.clientId, session.clientId), eq(assignedWorkouts.isDraft, false)));
    if (!owned) return refuse(res, 404, "Workout not found");
  }
  if (name === "submitContentResponse") {
    const id = text(body.assignmentId);
    const isTest = /test/i.test(text(body.assignmentType));
    const [owned] = isTest
      ? await db.select({ id: assignedTests.assignedTestId }).from(assignedTests).where(and(eq(assignedTests.assignedTestId, id),
        or(eq(assignedTests.clientId, session.clientId), eq(assignedTests.clientCode, session.clientId)), eq(assignedTests.isDraft, false)))
      : await db.select({ id: assignedForms.assignedFormId }).from(assignedForms).where(and(eq(assignedForms.assignedFormId, id),
        or(eq(assignedForms.clientId, session.clientId), eq(assignedForms.clientCode, session.clientId))));
    if (!owned) return refuse(res, 404, "Assignment not found");
  }
  if (["programTemplates", "workoutDetails"].includes(name)) {
    const programId = text(query.programId || query.programRecordId);
    if (!await clientHasProgramAccess(session.clientId, programId)) return refuse(res, 403, "No access to this program");
  }

  delete query.clientName;
  for (const key of CLIENT_FIELDS) query[key] = session.clientId;
  if (name === "clients") query.code = session.clientId;
  // Express 5's query property is a getter. Bind one validated query object
  // for all downstream reads rather than mutating a temporary getter result.
  Object.defineProperty(req, "query", { configurable: true, value: query });
  if (unsafe(req) && name !== "uploadFormVideoFile") {
    const next = { ...body };
    for (const key of CLIENT_FIELDS) if (key in next) next[key] = session.clientId;
    const primary = ["updateClient", "autoLoadProgram"].includes(name) ? "clientRecordId"
      : ["shiftAssignedWorkouts", "updateAssignedProgramDate"].includes(name) ? "clientCode" : "clientId";
    next[primary] = session.clientId;
    if ("clientName" in next) next.clientName = session.name;
    req.body = next;
  }
  return true;
}
