// Postgres implementation of the form templates domain. Same result shapes as
// the Feishu impl. On Postgres the business code (FORM-…) IS the identity, so
// recordId params carry the form code and recordId in responses echoes it.
//
// Columns the Feishu tables have but Postgres doesn't (Status, Created By,
// Created At, Options CN) behave like missing Feishu columns did: writes drop
// them silently (buildFields semantics), reads return "".
import { eq } from "drizzle-orm";
import { db } from "../client.ts";
import {
  formTemplates,
  formQuestions,
  assignedForms,
  formResponses,
} from "../schema.ts";
import { str } from "./_util.ts";
import type {
  FormTemplatesOpResult,
  CreateFormTemplateInput,
  UpdateFormTemplateInput,
  DeleteFormTemplateInput,
} from "../repositories/formTemplates.ts";

type QuestionRow = typeof formQuestions.$inferSelect;
type TemplateRow = typeof formTemplates.$inferSelect;

// jsonb Options column -> the display text the Feishu impl produced from its
// text column (migrated rows may hold a parsed array; our writes store the
// raw string).
function jsonText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((x) => String(x)).filter(Boolean).join(", ");
  return JSON.stringify(value);
}

function mapQuestion(r: QuestionRow) {
  return {
    recordId: r.questionId, // business code is the identity on Postgres
    questionId: r.questionId,
    formId: str(r.formId),
    order: r.orderIndex == null ? "" : String(r.orderIndex),
    label: str(r.label),
    labelCn: str(r.labelCn),
    questionType: str(r.questionType),
    options: jsonText(r.options),
    optionsCn: "", // Feishu-only column
    required: Boolean(r.required),
    helpText: str(r.helpText),
    helpTextCn: str(r.helpTextCn),
  };
}

export async function listFormTemplates(): Promise<FormTemplatesOpResult> {
  const [templateRows, questionRows] = await Promise.all([
    db.select().from(formTemplates),
    db.select().from(formQuestions),
  ]);

  const questions = questionRows.map(mapQuestion);

  const forms = templateRows.map((r: TemplateRow) => ({
    recordId: r.formId,
    formId: r.formId,
    name: str(r.name),
    nameCn: str(r.nameCn),
    type: str(r.type),
    description: str(r.description),
    descriptionCn: str(r.descriptionCn),
    status: "", // Feishu-only column
    createdBy: "", // Feishu-only column
    createdAt: "", // Feishu-only column
    questions: questions
      .filter((question) => question.formId && question.formId === r.formId)
      .sort((a, b) => Number(a.order) - Number(b.order)),
  }));

  return { status: 200, body: { forms } };
}

function questionRows(formId: string, questions: unknown) {
  const items = Array.isArray(questions) ? questions : [];
  return items.map((question: any, index: number) => ({
    questionId: `Q-${Date.now()}-${index + 1}`,
    formId,
    orderIndex: index + 1,
    label: String(question?.label || ""),
    questionType: String(question?.questionType || "Text"),
    options: String(question?.options || "") as unknown,
    required: Boolean(question?.required),
    helpText: String(question?.helpText || ""),
  }));
}

export async function createFormTemplate(
  input: CreateFormTemplateInput
): Promise<FormTemplatesOpResult> {
  const formId = `FORM-${Date.now()}`;

  await db.insert(formTemplates).values({
    formId,
    name: String(input.name),
    type: String(input.type || "Questionnaire"),
    description: String(input.description || ""),
  });

  const rows = questionRows(formId, input.questions);
  if (rows.length) await db.insert(formQuestions).values(rows);

  return {
    status: 200,
    body: {
      success: true,
      formId,
      formRecordId: formId,
      questionRecordsCreated: rows.length,
    },
  };
}

export async function updateFormTemplate(
  input: UpdateFormTemplateInput
): Promise<FormTemplatesOpResult> {
  const formId = String(input.formId);

  const updated = await db
    .update(formTemplates)
    .set({
      formId,
      name: String(input.name),
      type: String(input.type || "Questionnaire"),
      description: String(input.description || ""),
    })
    .where(eq(formTemplates.formId, formId))
    .returning({ formId: formTemplates.formId });

  if (!updated.length) {
    return {
      status: 500,
      body: { error: "Could not update form template" },
    };
  }

  // Same replace semantics as Feishu: drop the template's questions, then
  // recreate from the payload.
  await db.delete(formQuestions).where(eq(formQuestions.formId, formId));

  const rows = questionRows(formId, input.questions);
  if (rows.length) await db.insert(formQuestions).values(rows);

  return {
    status: 200,
    body: {
      success: true,
      formId,
      formRecordId: String(input.recordId),
      questionRecordsCreated: rows.length,
    },
  };
}

export async function deleteFormTemplate(
  input: DeleteFormTemplateInput
): Promise<FormTemplatesOpResult> {
  // recordId carries the form code on Postgres; formId (when sent) matches it.
  const formId = String(input.formId || input.recordId);

  // Transactional delete with FK detach: assigned_forms + form_responses
  // reference the template, so the bare delete used to throw AFTER the
  // questions were already destroyed (orphaned question-less template + 500).
  // Feishu deleted cleanly leaving dead text links — nulling matches that.
  let deletedQuestionCount = 0;
  let found = false;
  await db.transaction(async (tx) => {
    await tx
      .update(assignedForms)
      .set({ formId: null })
      .where(eq(assignedForms.formId, formId));
    await tx
      .update(formResponses)
      .set({ formId: null })
      .where(eq(formResponses.formId, formId));

    const deletedQuestions = await tx
      .delete(formQuestions)
      .where(eq(formQuestions.formId, formId))
      .returning({ questionId: formQuestions.questionId });
    deletedQuestionCount = deletedQuestions.length;

    const deletedTemplates = await tx
      .delete(formTemplates)
      .where(eq(formTemplates.formId, formId))
      .returning({ formId: formTemplates.formId });
    // No rollback needed on miss: every statement above matches zero rows
    // when the form doesn't exist.
    found = deletedTemplates.length > 0;
  });

  if (!found) {
    return {
      status: 500,
      body: { error: "Could not delete form template" },
    };
  }

  return {
    status: 200,
    body: { success: true, deletedQuestions: deletedQuestionCount },
  };
}
