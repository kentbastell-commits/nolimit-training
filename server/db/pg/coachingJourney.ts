import { randomUUID } from "node:crypto";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db, type DbExecutor } from "../client.ts";
import { assignedForms, assignedTests, assignedWorkouts, clients, formQuestions, formTemplates, productOrders } from "../schema.ts";

const INTAKE_ID = "FORM-COACHING-INTAKE";
const isCoaching = (type: string | null) => type === "Online Coaching" || type === "In-Person Training";
const intakeComplete = (status: string | null) => /^(received|submitted|reviewed|completed|not needed)$/i.test((status || "").trim());

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
    .where(eq(assignedWorkouts.clientId, client.clientId)).limit(1);
  const pending = intake.find(x => !x.completedAt && x.status?.toLowerCase() !== "completed");
  const complete = (alreadyCoached && intakeComplete(client.intakeStatus)) || intake.some(x => x.completedAt || x.status?.toLowerCase() === "completed");
  let needsIntake = Boolean(pending);
  if (!pending && !complete && !(training && alreadyCoached)) {
    // A dedicated, bilingual, non-medical intake; never borrow an unrelated
    // digital or wellness questionnaire. Existing template edits are retained.
    await tx.insert(formTemplates).values({ formId: INTAKE_ID, name: "Your coaching intake", nameCn: "线上训练入门问卷",
      type: "Intake", productType: "Online Coaching", requiresCoachReview: true,
      description: "Tell your coach how training can fit your goals and schedule.", descriptionCn: "让教练了解你的目标和时间安排，制定适合你的训练计划。" }).onConflictDoNothing();
    const questions = [
      ["sport", "What sport or activity are you training for?", "你主要参加什么运动？"],
      ["goal", "What would you like to improve?", "你最希望提升什么？"],
      ["experience", "Tell us about your current training and experience.", "请介绍你目前的训练安排和训练经验。"],
      ["schedule", "Which days can you train, and for how long?", "你每周哪些天可以训练？每次能安排多长时间？"],
      ["equipment", "Where will you train, and what equipment is available?", "你在哪里训练？有哪些可用器械？"],
    ];
    await tx.insert(formQuestions).values(questions.map(([key, label, labelCn], index) => ({
      questionId: `${INTAKE_ID}-${key}`, formId: INTAKE_ID, orderIndex: index + 1,
      label, labelCn, questionType: "Long Text", required: true,
    }))).onConflictDoNothing();
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
      .where(or(eq(assignedTests.clientId, clientId), eq(assignedTests.clientCode, clientId))),
    db.select({ count: sql<number>`count(*)::int` }).from(assignedWorkouts).where(eq(assignedWorkouts.clientId, clientId)),
  ]);
  const paid = orders.find(x => x.paymentStatus?.trim().toLowerCase() === "paid");
  const pendingPayment = orders.some(x => /^(pending|unpaid|awaiting payment)$/i.test((x.paymentStatus || "").trim()));
  const pendingForms = forms.filter(x => !x.completed && x.status?.toLowerCase() !== "completed" && !/^(cancelled|archived)$/i.test(x.status || ""));
  const intake = pendingForms.find(x => x.isIntake);
  const coached = Boolean(client.clientType?.trim() && !/digital/i.test(client.clientType)) || Boolean(paid);
  const hasWorkouts = Number(workoutCount[0]?.count) > 0;
  const stage = hasWorkouts ? "active"
    : !paid && pendingPayment ? "payment_pending"
    : intake ? "intake"
    : paid?.fulfillmentStatus === "Plan Preparation" || (coached && intakeComplete(client.intakeStatus)) ? "preparing"
    : coached ? "awaiting_plan" : "prospect";
  return { stage, coached, intakeAssignmentId: intake?.id || "",
    pendingAssessments: pendingForms.length + tests.filter(x => !x.completed).length,
    // A paid service can repair the display of an old client without a GET write.
    clientType: coached && (!client.clientType || /digital/i.test(client.clientType)) ? paid?.productType || client.clientType || "" : client.clientType || "",
  };
}
