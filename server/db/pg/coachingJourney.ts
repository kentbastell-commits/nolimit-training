import { randomUUID } from "node:crypto";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db, type DbExecutor } from "../client.ts";
import { assignedForms, assignedTests, assignedWorkouts, clients, formQuestions, formTemplates, productOrders } from "../schema.ts";

const INTAKE_ID = "FORM-COACHING-INTAKE";
const isCoaching = (type: string | null) => type === "Online Coaching" || type === "In-Person Training";
const intakeComplete = (status: string | null) => /^(received|submitted|reviewed|completed|not needed)$/i.test((status || "").trim());

// The athlete intake every sign-up gets (Kent, 2026-09-19). Nothing is
// mandatory — a parent filling it in for a child answers what they can.
// Seeded only when the template row is missing; the live template is edited
// in the coach console / via PUT /api/formTemplates and keeps its edits.
export const INTAKE_QUESTIONS: Array<[key: string, label: string, labelCn: string, type: string, options?: string, optionsCn?: string]> = [
  ["name", "Name", "姓名", "Text"],
  ["age", "Age of athlete", "运动员年龄", "Number"],
  ["schedule", "Current technical training schedule", "目前的专项技术训练安排（每周几次、每次多久）", "Long Text"],
  ["competition", "Future competition?", "近期是否有比赛计划？", "Single Select", "Yes,No", "是,否"],
  ["competition_detail", "If yes: which competition, and when?", "如有，请写比赛名称与时间", "Long Text"],
  ["home_gym", "Home gym equipment", "家中可用的训练器械", "Long Text"],
  ["public_gym", "Public gym access", "是否能去健身房？请说明场馆和频率", "Long Text"],
  ["strengths", "Technical strengths", "技术优势", "Long Text"],
  ["weaknesses", "Technical weaknesses", "技术短板", "Long Text"],
  ["injuries", "Previous or current injuries", "既往或目前的伤病", "Long Text"],
];

/** Creates the intake template + questions when absent; never edits an existing one. */
async function ensureIntakeTemplate(exec: DbExecutor) {
  await exec.insert(formTemplates).values({ formId: INTAKE_ID, name: "Athlete intake", nameCn: "运动员入门问卷",
    type: "Intake", productType: "Online Coaching", requiresCoachReview: true,
    description: "Tell your coach about the athlete, their schedule, equipment and history. Nothing is mandatory.",
    descriptionCn: "让教练了解运动员的情况、训练安排、器械和伤病史。所有题目均为选填。" }).onConflictDoNothing();
  await exec.insert(formQuestions).values(INTAKE_QUESTIONS.map(([key, label, labelCn, questionType, options, optionsCn], index) => ({
    questionId: `${INTAKE_ID}-${key}`, formId: INTAKE_ID, orderIndex: index + 1,
    label, labelCn, questionType, required: false,
    ...(options ? { options: options as unknown, optionsCn: optionsCn || null } : {}),
  }))).onConflictDoNothing();
}

/**
 * Every sign-up gets the intake once: scan an invite → log in → questionnaire.
 * Called from wxAuth (invite bind, WeChat self sign-up) and the pay link's
 * identity step. Idempotent: an existing pending or completed intake (from a
 * paid order, an earlier sign-in, or the coach) means nothing is added.
 */
export async function ensureIntakeOnSignup(clientId: string): Promise<{ assigned: boolean; assignmentId: string }> {
  const [client] = await db.select().from(clients).where(eq(clients.clientId, clientId));
  if (!client) return { assigned: false, assignmentId: "" };
  const existing = (await db.select().from(assignedForms).where(and(
    or(eq(assignedForms.clientId, clientId), eq(assignedForms.clientCode, clientId)),
    eq(assignedForms.isIntake, true),
  ))).filter(x => !/^(cancelled|archived)$/i.test(x.status || ""));
  const pending = existing.find(x => !x.completedAt && x.status?.toLowerCase() !== "completed");
  if (pending) return { assigned: false, assignmentId: pending.assignedFormId };
  if (existing.length || intakeComplete(client.intakeStatus)) return { assigned: false, assignmentId: "" };
  await ensureIntakeTemplate(db);
  const assignmentId = `AF-${randomUUID()}`;
  await db.insert(assignedForms).values({ assignedFormId: assignmentId, formId: INTAKE_ID,
    clientId, clientCode: clientId, assignedDate: Date.now(), status: "Assigned", isIntake: true,
    productType: client.clientType?.trim() || "Online Coaching" });
  await db.update(clients).set({ intakeStatus: "Sent" }).where(eq(clients.clientId, clientId));
  return { assigned: true, assignmentId };
}

/** Called inside the payment transaction. The client lock serializes different
 * orders for the same athlete, so renewals cannot create duplicate intakes. */
export async function activateCoachingOrder(tx: DbExecutor, order: typeof productOrders.$inferSelect) {
  if (!isCoaching(order.productType) || !order.clientId || order.paymentStatus?.trim().toLowerCase() !== "paid") return;
  const [client] = await tx.select().from(clients).where(eq(clients.clientId, order.clientId)).for("update");
  if (!client) return;
  const type = client.clientType?.trim();
  const alreadyCoached = Boolean(type) && !/digital/i.test(type!);
  await tx.update(clients).set({
    clientType: !type || /digital/i.test(type) ? order.productType : type,
    subscriptionStatus: "Active",
    paymentStatus: "Paid",
    ...(!client.coachAssigned && order.assignCoach ? { coachAssigned: order.assignCoach } : {}),
  }).where(eq(clients.clientId, client.clientId));

  // In-person arrangements have their own intake requirements. Only online
  // coaching gets this questionnaire automatically.
  if (order.productType !== "Online Coaching") return;
  const assignedIntakes = await tx.select().from(assignedForms).where(and(
    or(eq(assignedForms.clientId, client.clientId), eq(assignedForms.clientCode, client.clientId)),
    eq(assignedForms.isIntake, true),
  ));
  const intake = assignedIntakes.filter(x =>
    !/^(cancelled|archived)$/i.test(x.status || "") &&
    (x.productType === "Online Coaching" || x.formId === INTAKE_ID || (alreadyCoached && !/digital/i.test(x.productType || ""))),
  );
  const [training] = await tx.select({ id: assignedWorkouts.assignedWorkoutId }).from(assignedWorkouts)
    .where(and(eq(assignedWorkouts.clientId, client.clientId), eq(assignedWorkouts.isDraft, false))).limit(1);
  const pending = intake.find(x => !x.completedAt && x.status?.toLowerCase() !== "completed");
  const complete = (alreadyCoached && intakeComplete(client.intakeStatus)) || intake.some(x => x.completedAt || x.status?.toLowerCase() === "completed");
  let needsIntake = Boolean(pending);
  if (!pending && !complete && !(training && alreadyCoached)) {
    // A dedicated, bilingual, non-medical intake; never borrow an unrelated
    // digital or wellness questionnaire. Existing template edits are retained.
    await ensureIntakeTemplate(tx);
    await tx.insert(assignedForms).values({ assignedFormId: `AF-${randomUUID()}`, formId: INTAKE_ID,
      clientId: client.clientId, clientCode: client.clientId, assignedDate: Date.now(), status: "Assigned", isIntake: true, productType: "Online Coaching" });
    await tx.update(clients).set({ intakeStatus: "Sent" }).where(eq(clients.clientId, client.clientId));
    needsIntake = true;
  }
  await tx.update(productOrders).set({
    intakeStatus: needsIntake ? "Sent" : complete ? "Received" : "Not Needed",
    fulfillmentStatus: needsIntake ? "Intake Required" : training ? "Active" : "Plan Preparation",
  }).where(eq(productOrders.orderId, order.orderId));
}

/** Read-only, scoped summary. No health answers or payment credentials. */
export async function getCoachingJourney(clientId: string) {
  const [client] = await db.select().from(clients).where(eq(clients.clientId, clientId));
  if (!client) return null;
  const [orders, forms, tests, workoutCount] = await Promise.all([
    db.select({ productType: productOrders.productType, paymentStatus: productOrders.paymentStatus,
      fulfillmentStatus: productOrders.fulfillmentStatus }).from(productOrders)
      .where(and(eq(productOrders.clientId, clientId), or(eq(productOrders.productType, "Online Coaching"), eq(productOrders.productType, "In-Person Training"))))
      .orderBy(desc(productOrders.purchasedAt), desc(productOrders.orderId)),
    db.select({ id: assignedForms.assignedFormId, isIntake: assignedForms.isIntake,
      completed: assignedForms.completedAt, status: assignedForms.status }).from(assignedForms)
      .where(or(eq(assignedForms.clientId, clientId), eq(assignedForms.clientCode, clientId))),
    db.select({ completed: assignedTests.completedAt }).from(assignedTests)
      .where(and(or(eq(assignedTests.clientId, clientId), eq(assignedTests.clientCode, clientId)), eq(assignedTests.isDraft, false))),
    db.select({ count: sql<number>`count(*)::int` }).from(assignedWorkouts).where(and(eq(assignedWorkouts.clientId, clientId), eq(assignedWorkouts.isDraft, false))),
  ]);
  const paid = orders.find(x => x.paymentStatus?.trim().toLowerCase() === "paid");
  const pendingPayment = orders.some(x => /^(pending|unpaid|awaiting payment)$/i.test((x.paymentStatus || "").trim()));
  const pendingForms = forms.filter(x => !x.completed && x.status?.toLowerCase() !== "completed" && !/^(cancelled|archived)$/i.test(x.status || ""));
  const intake = pendingForms.find(x => x.isIntake);
  const hasWorkouts = Number(workoutCount[0]?.count) > 0;
  // Legacy manually coached athletes can predate client_type and orders.
  // Resolve their display from an assigned coach + training, without changing
  // stored entitlements or mistaking a known digital purchase for coaching.
  const legacyCoached = !client.clientType?.trim() && Boolean(client.coachAssigned?.trim()) && hasWorkouts && !client.purchasedProgramId;
  const coached = Boolean(client.clientType?.trim() && !/digital/i.test(client.clientType)) || Boolean(paid) || legacyCoached;
  const stage = hasWorkouts ? "active"
    : !paid && pendingPayment ? "payment_pending"
    : intake ? "intake"
    : paid?.fulfillmentStatus === "Plan Preparation" || (coached && intakeComplete(client.intakeStatus)) ? "preparing"
    : coached ? "awaiting_plan" : "prospect";
  return { stage, coached, intakeAssignmentId: intake?.id || "",
    pendingAssessments: pendingForms.length + tests.filter(x => !x.completed).length,
    // A paid service can repair the display of an old client without a GET write.
    clientType: coached && (!client.clientType || /digital/i.test(client.clientType)) ? paid?.productType || (legacyCoached ? "Coaching" : client.clientType) || "" : client.clientType || "",
  };
}
