import { eq } from "drizzle-orm";
import { db } from "../client.ts";
import {
  formResponses,
  testResults,
  assignedForms,
  assignedTests,
  formTemplates,
  testTemplates,
  clients,
} from "../schema.ts";
import { epochToDate, str } from "./_util.ts";
import type { ResponseDTO } from "../dto.ts";
export { submitContentResponse } from "./submitAssessment.ts";

export async function listAllResponses(clientId = "", clientName = ""): Promise<ResponseDTO[]> {
  const [forms, tests] = await Promise.all([
    db.select({ row: formResponses, title: formTemplates.name, titleCn: formTemplates.nameCn, reviewedAt: assignedForms.reviewedAt, clientName: clients.fullName }).from(formResponses)
      .leftJoin(formTemplates, eq(formResponses.formId, formTemplates.formId))
      .leftJoin(assignedForms, eq(formResponses.assignedFormId, assignedForms.assignedFormId))
      .leftJoin(clients, eq(formResponses.clientId, clients.clientId))
      .where(clientId ? eq(formResponses.clientId, clientId) : clientName ? eq(clients.fullName, clientName) : undefined),
    db.select({ row: testResults, title: testTemplates.name, titleCn: testTemplates.nameCn, reviewedAt: assignedTests.reviewedAt, clientName: clients.fullName }).from(testResults)
      .leftJoin(testTemplates, eq(testResults.testTemplateId, testTemplates.testTemplateId))
      .leftJoin(assignedTests, eq(testResults.assignedTestId, assignedTests.assignedTestId))
      .leftJoin(clients, eq(testResults.clientId, clients.clientId))
      .where(clientId ? eq(testResults.clientId, clientId) : clientName ? eq(clients.fullName, clientName) : undefined),
  ]);

  const formDtos: ResponseDTO[] = forms.map(({ row: r, title, titleCn, reviewedAt, clientName }) => ({
    templateName: str(title), templateNameCn: str(titleCn), reviewedAt: reviewedAt ? Number(reviewedAt) : null,
    recordId: r.responseId,
    responseType: "Questionnaire",
    responseId: r.responseId,
    assignmentId: str(r.assignedFormId),
    assignmentRecordId: "",
    templateId: str(r.formId),
    itemId: "",
    label: "",
    answer: "",
    answersJson: r.answers == null ? "" : JSON.stringify(r.answers),
    answersJsonEn: str(r.answersEn),
    unit: "",
    notes: "",
    clientComment: str(r.clientComment),
    clientCommentEn: str(r.clientCommentEn),
    clientId: str(r.clientId),
    clientName: str(clientName),
    submittedAt: epochToDate(r.submittedAt),
  }));

  const testDtos: ResponseDTO[] = tests.map(({ row: r, title, titleCn, reviewedAt, clientName }) => ({
    templateName: str(title), templateNameCn: str(titleCn), reviewedAt: reviewedAt ? Number(reviewedAt) : null,
    recordId: r.resultId,
    responseType: "Physical Test",
    responseId: r.resultId,
    assignmentId: str(r.assignedTestId),
    assignmentRecordId: "",
    templateId: str(r.testTemplateId),
    itemId: str(r.testItemId) || (r.testItemName === "Client Comment" ? "__client_comment" : ""),
    // The stored name renders directly (the frontend prefers label over the
    // itemId lookup), so results outlive template edits.
    label: str(r.testItemName),
    answer: str(r.value),
    answersJson: "",
    unit: str(r.unit),
    notes: str(r.notes),
    notesEn: str(r.notesEn),
    clientId: str(r.clientId),
    clientName: str(clientName),
    submittedAt: epochToDate(r.submittedAt),
  }));

  return [...formDtos, ...testDtos];
}
