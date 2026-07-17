// Postgres impl for the contentAssignments domain. On this backend the pg
// tables carry ONE date column (assigned_date — how the live Feishu tables
// were introspected), so the assignment's "scheduled/due date" and the list's
// dueDate both live there; assignContent prefers the coach-chosen dueDate.
// Client/template references are FK-enforced here (Feishu just stores dead
// text): a missing client keeps the code in client_code with the FK nulled,
// a missing template fails the create explicitly.
import { eq } from "drizzle-orm";
import { db } from "../client.ts";
import {
  assignedForms,
  assignedTests,
  formTemplates,
  testTemplates,
  clients,
} from "../schema.ts";
import { epochToDate, str } from "./_util.ts";
import type {
  AssignContentInput,
  AssignContentResult,
  ContentAssignmentDTO,
  UpdateAssignmentDateInput,
  UpdateAssignmentDateResult,
} from "../repositories/contentAssignments.ts";

function toEpoch(value?: string): number {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  const ms = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}

export async function listContentAssignments(): Promise<ContentAssignmentDTO[]> {
  const [formRows, testRows] = await Promise.all([
    db
      .select({
        row: assignedForms,
        templateName: formTemplates.name,
        clientName: clients.fullName,
      })
      .from(assignedForms)
      .leftJoin(formTemplates, eq(assignedForms.formId, formTemplates.formId))
      .leftJoin(clients, eq(assignedForms.clientId, clients.clientId)),
    db
      .select({
        row: assignedTests,
        templateName: testTemplates.name,
        clientName: clients.fullName,
      })
      .from(assignedTests)
      .leftJoin(
        testTemplates,
        eq(assignedTests.testTemplateId, testTemplates.testTemplateId)
      )
      .leftJoin(clients, eq(assignedTests.clientId, clients.clientId)),
  ]);

  const forms = formRows.map(
    ({ row, templateName, clientName }): ContentAssignmentDTO => ({
      recordId: row.assignedFormId,
      assignmentId: row.assignedFormId,
      assignmentType: "Questionnaire",
      templateId: str(row.formId),
      templateName: str(templateName),
      clientId: str(row.clientId) || str(row.clientCode),
      clientCode: str(row.clientCode) || str(row.clientId),
      clientName: str(clientName),
      assignedDate: epochToDate(row.assignedDate),
      dueDate: epochToDate(row.assignedDate),
      status: str(row.status) || (row.completedAt ? "Completed" : "Assigned"),
    })
  );

  const tests = testRows.map(
    ({ row, templateName, clientName }): ContentAssignmentDTO => ({
      recordId: row.assignedTestId,
      assignmentId: row.assignedTestId,
      assignmentType: "Physical Test",
      templateId: str(row.testTemplateId),
      templateName: str(templateName),
      clientId: str(row.clientId) || str(row.clientCode),
      clientCode: str(row.clientCode) || str(row.clientId),
      clientName: str(clientName),
      assignedDate: epochToDate(row.assignedDate),
      dueDate: epochToDate(row.assignedDate),
      status: row.completedAt ? "Completed" : "Assigned",
    })
  );

  return [...forms, ...tests];
}

export async function assignContent(
  input: AssignContentInput
): Promise<AssignContentResult> {
  const {
    assignmentType,
    templateId,
    clientId,
    clientCode,
    assignedDate,
    dueDate,
  } = input;

  const isTest = String(assignmentType).toLowerCase().includes("test");
  const assignmentId = `${isTest ? "AT" : "AF"}-${Date.now()}`;
  const code = String(clientCode || clientId);
  const dateMs = toEpoch(dueDate || assignedDate);

  const clientExists =
    (
      await db
        .select({ id: clients.clientId })
        .from(clients)
        .where(eq(clients.clientId, String(clientId)))
    ).length > 0;
  const clientFk = clientExists ? String(clientId) : null;

  if (isTest) {
    const template = await db
      .select({ id: testTemplates.testTemplateId })
      .from(testTemplates)
      .where(eq(testTemplates.testTemplateId, String(templateId)));
    if (!template.length) {
      return {
        success: false,
        kind: "create-failed",
        larkResponse: { message: `Test template not found: ${templateId}` },
        fieldsSent: { assignmentId, templateId: String(templateId) },
      };
    }
    await db.insert(assignedTests).values({
      assignedTestId: assignmentId,
      testTemplateId: String(templateId),
      clientId: clientFk,
      clientCode: code,
      assignedDate: dateMs,
    });
    return { success: true, recordId: assignmentId };
  }

  const template = await db
    .select({ id: formTemplates.formId })
    .from(formTemplates)
    .where(eq(formTemplates.formId, String(templateId)));
  if (!template.length) {
    return {
      success: false,
      kind: "create-failed",
      larkResponse: { message: `Form template not found: ${templateId}` },
      fieldsSent: { assignmentId, templateId: String(templateId) },
    };
  }
  await db.insert(assignedForms).values({
    assignedFormId: assignmentId,
    formId: String(templateId),
    clientId: clientFk,
    clientCode: code,
    assignedDate: dateMs,
    status: "Assigned",
  });
  return { success: true, recordId: assignmentId };
}

export async function updateContentAssignmentDate(
  input: UpdateAssignmentDateInput
): Promise<UpdateAssignmentDateResult> {
  const { assignmentType, recordId, scheduledDate } = input;
  const isTest = String(assignmentType).toLowerCase().includes("test");
  const dateMs = toEpoch(scheduledDate);

  const updated = isTest
    ? await db
        .update(assignedTests)
        .set({ assignedDate: dateMs })
        .where(eq(assignedTests.assignedTestId, recordId))
        .returning({ id: assignedTests.assignedTestId })
    : await db
        .update(assignedForms)
        .set({ assignedDate: dateMs })
        .where(eq(assignedForms.assignedFormId, recordId))
        .returning({ id: assignedForms.assignedFormId });

  if (!updated.length) {
    return {
      success: false,
      kind: "update-failed",
      attemptedFields: ["Assigned Date"],
      failedFields: [
        { fieldName: "Assigned Date", response: { error: "Record not found", recordId } },
      ],
    };
  }

  return { success: true, updatedFields: ["Assigned Date"], failedFields: [] };
}
