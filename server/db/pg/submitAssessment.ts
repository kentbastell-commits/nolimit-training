import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../client.ts";
import { assignedForms, assignedTests, formQuestions, formResponses, testResults, testItems, athleteMetrics, clients } from "../schema.ts";
import { queueTranslations } from "../contentTranslations.ts";
import { calculateMetric, deriveMetricKind, deriveMetricUnit } from "../metricPipeline.ts";
import { validQuestionAnswer, validTestAnswer } from "../../../src/contentAnswers.ts";
import type { SubmitContentResponseInput, SubmitContentResponseResult } from "../repositories/contentResponses.ts";

export async function submitContentResponse(input: SubmitContentResponseInput): Promise<SubmitContentResponseResult> {
  const isTest = /test/i.test(input.assignmentType);
  const assignmentId = String(input.assignmentRecordId || input.assignmentId || "");
  const fail = (status: number, error: string): SubmitContentResponseResult => ({ status, body: { error } });
  if (!assignmentId || (input.assignmentRecordId && input.assignmentId && input.assignmentRecordId !== input.assignmentId)) {
    return fail(400, "A single assigned form or test is required.");
  }
  const translateIds: string[] = [];
  try {
    const result = await db.transaction(async tx => {
      // The assignment is the durable identity of this submission. A lost
      // response and concurrent retries serialize on this row across workers.
      const assignment = isTest
        ? (await tx.select().from(assignedTests).where(eq(assignedTests.assignedTestId, assignmentId)).for("update"))[0]
        : (await tx.select().from(assignedForms).where(eq(assignedForms.assignedFormId, assignmentId)).for("update"))[0];
      if (!assignment) return fail(404, "This assignment no longer exists.");
      if ("isDraft" in assignment && assignment.isDraft) return fail(403, "This test is not published.");
      if (assignment.clientId !== input.clientId && assignment.clientCode !== input.clientId) return fail(403, "This assignment does not belong to that client.");
      const templateId = "formId" in assignment ? assignment.formId : assignment.testTemplateId;
      if (templateId !== input.templateId) return fail(409, "The assignment has changed. Please reopen it.");
      const isIntake = "isIntake" in assignment && assignment.isIntake;
      if (assignment.completedAt || ("status" in assignment && assignment.status === "Completed")) {
        return { status: 200, body: { success: true, alreadySubmitted: true, isIntake, recordsCreated: 0, metricsCreated: 0, metricWarnings: [], assignmentUpdate: { code: 0, updated: 0 } } };
      }
      const now = Date.now();
      const responses = input.responses;
      if (!responses.length || responses.some(r => !r || typeof r !== "object")) return fail(400, "Please complete the assigned questions.");
      const idOf = (r: any) => String(r.questionId || r.itemId || "");
      const ids = responses.map(idOf);
      if (ids.some(id => !id) || new Set(ids).size !== ids.length) return fail(400, "Each question must have one answer.");
      const byId = new Map(responses.map(r => [idOf(r), r]));
      const comment = String(byId.get("__client_comment")?.value ?? "").trim();
      const clientId = assignment.clientId;
      let metricsCreated = 0;
      if (!isTest) {
        const questions = await tx.select().from(formQuestions).where(eq(formQuestions.formId, templateId!));
        if (questions.some(q => !validQuestionAnswer({ ...q, questionType: q.questionType || "", required: Boolean(q.required) }, byId.get(q.questionId)?.value))) {
          return fail(400, "Please answer all required questions with valid choices.");
        }
        const responseId = `FR-${randomUUID()}`;
        await tx.insert(formResponses).values({ responseId, assignedFormId: assignmentId, formId: templateId, clientId,
          submittedAt: now, answers: responses, clientComment: comment || null });
        translateIds.push(responseId);
        await tx.update(assignedForms).set({ status: "Completed", completedAt: now, reviewedAt: null, reviewStatus: "Pending" }).where(eq(assignedForms.assignedFormId, assignmentId));
        if (isIntake && clientId) await tx.update(clients).set({ intakeStatus: "Submitted" }).where(eq(clients.clientId, clientId));
      } else {
        const items = await tx.select().from(testItems).where(eq(testItems.testTemplateId, templateId!));
        if (!items.length || items.some(item => !validTestAnswer({ ...item, testName: item.testName || "", unit: item.unit || "", metricType: item.metricType || "", inputUnit: item.inputUnit || "", calculationMethod: item.calculationMethod || "", metricName: item.metricName || "", metricUnit: item.metricUnit || "" }, String(byId.get(item.testItemId)?.value ?? "")))) {
          return fail(400, "Please enter a valid result for each test item.");
        }
        if (ids.some(id => id !== "__client_comment" && !items.some(item => item.testItemId === id))) return fail(409, "The test has changed. Please reopen it.");
        // Validate every derived metric before the first write. A database
        // failure in any result, metric or completion rolls back the lot.
        const prepared = items.map(item => {
          const response = byId.get(item.testItemId)!;
          const kind = deriveMetricKind(item.calculationMethod || "");
          const unit = deriveMetricUnit({ metricKind: kind, calculationMethod: item.calculationMethod || "", metricUnit: item.metricUnit || "", inputUnit: item.inputUnit || "", responseUnit: item.unit || "" });
          const value = item.createsMetric ? calculateMetric({ value: String(response.value), notes: String(response.notes || ""), label: item.testName || "", method: item.calculationMethod || "", metricUnit: unit }) : null;
          return { item, response, kind, unit, value };
        });
        if (prepared.some(p => p.item.createsMetric && (p.value === null || !Number.isFinite(p.value)))) return fail(400, "A test metric could not be calculated. Please check the results.");
        for (const { item, response, kind, unit, value } of prepared) {
          const resultId = `TR-${randomUUID()}`;
          await tx.insert(testResults).values({ resultId, assignedTestId: assignmentId, testTemplateId: templateId,
            testItemId: item.testItemId, testItemName: item.testName, clientId, value: String(response.value), unit: item.unit,
            notes: String(response.notes || "") || null, submittedAt: now, createsMetric: Boolean(item.createsMetric), metricCreated: Boolean(item.createsMetric) });
          translateIds.push(resultId);
          if (item.createsMetric) {
            await tx.insert(athleteMetrics).values({ metricId: `AM-${randomUUID()}`, clientId, clientName: input.clientName || null,
              metricType: item.testingMetricType || item.metricType, metricName: item.metricName || `${item.testName || "Test"} — ${kind || "Metric"}`,
              value: value!, unit, sourceType: "Physical Test", sourceTestId: item.testItemId, sourceTestName: item.testName,
              calculationMethod: item.calculationMethod || "Direct Value", validFrom: now, status: "Active", notes: String(response.notes || "") || null });
            metricsCreated++;
          }
        }
        if (comment) {
          const resultId = `TR-${randomUUID()}`;
          await tx.insert(testResults).values({ resultId, assignedTestId: assignmentId, testTemplateId: templateId, clientId,
            testItemName: "Client Comment", value: comment, submittedAt: now });
          translateIds.push(resultId);
        }
        await tx.update(assignedTests).set({ completedAt: now, reviewedAt: null }).where(eq(assignedTests.assignedTestId, assignmentId));
      }
      return { status: 200, body: { success: true, isIntake, recordsCreated: translateIds.length, metricsCreated, metricWarnings: [], assignmentUpdate: { code: 0, updated: 1 } } };
    });
    if (result.status === 200 && translateIds.length) queueTranslations(isTest ? "testResults" : "formResponses", translateIds);
    return result;
  } catch (error) {
    console.error("Assessment transaction failed", error);
    return fail(500, "Could not save your answers. Please retry; your assignment will only be saved once.");
  }
}
