import { db } from "../client.ts";
import { formResponses, testResults } from "../schema.ts";
import { epochToDate, str } from "./_util.ts";
import type { ResponseDTO } from "../dto.ts";

export async function listAllResponses(): Promise<ResponseDTO[]> {
  const [forms, tests] = await Promise.all([
    db.select().from(formResponses),
    db.select().from(testResults),
  ]);

  const formDtos: ResponseDTO[] = forms.map((r) => ({
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
    unit: "",
    notes: "",
    clientId: str(r.clientId),
    clientName: "",
    submittedAt: epochToDate(r.submittedAt),
  }));

  const testDtos: ResponseDTO[] = tests.map((r) => ({
    recordId: r.resultId,
    responseType: "Physical Test",
    responseId: r.resultId,
    assignmentId: str(r.assignedTestId),
    assignmentRecordId: "",
    templateId: str(r.testTemplateId),
    itemId: str(r.testItemId),
    label: "",
    answer: str(r.value),
    answersJson: "",
    unit: str(r.unit),
    notes: str(r.notes),
    clientId: str(r.clientId),
    clientName: "",
    submittedAt: epochToDate(r.submittedAt),
  }));

  return [...formDtos, ...testDtos];
}
