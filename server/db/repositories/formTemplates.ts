// Form templates + form questions (child table) repository. Dispatches to the
// Feishu or Postgres implementation based on DATA_BACKEND.
//
// Results are HTTP-shaped ({ status, body }): the old api/formTemplates.ts
// handler produced many distinct error bodies (missing Feishu columns, per-step
// larkResponse echoes), so the impls build the exact response and the handler
// forwards it verbatim — wire responses stay byte-identical.
import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/formTemplates.ts";
import { invalidateCache } from "../../../api/_cache.ts";

export type FormTemplatesOpResult = {
  status: number;
  body: Record<string, any>;
};

export type FormQuestionInput = {
  label?: any;
  questionType?: any;
  options?: any;
  required?: any;
  helpText?: any;
};

export type CreateFormTemplateInput = {
  name: any;
  type?: any;
  description?: any;
  status?: any;
  createdBy?: any;
  questions?: FormQuestionInput[] | any;
};

export type UpdateFormTemplateInput = CreateFormTemplateInput & {
  recordId: any;
  formId: any;
};

export type DeleteFormTemplateInput = {
  recordId: any;
  formId?: any;
};

// The contentAssignments cache (api/contentAssignments.ts) embeds form
// template names, so any successful template write must drop it or coaches
// see stale template names on assignments for up to 5 minutes.
function invalidated(result: FormTemplatesOpResult): FormTemplatesOpResult {
  if (result.status === 200 && result.body?.success) {
    invalidateCache("contentAssignments");
  }
  return result;
}

export async function listFormTemplates(): Promise<FormTemplatesOpResult> {
  return DATA_BACKEND === "postgres"
    ? await (await import("../pg/formTemplates.ts")).listFormTemplates()
    : await feishu.listFormTemplates();
}

export async function createFormTemplate(
  input: CreateFormTemplateInput
): Promise<FormTemplatesOpResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/formTemplates.ts")).createFormTemplate(input)
      : await feishu.createFormTemplate(input);
  return invalidated(result);
}

export async function updateFormTemplate(
  input: UpdateFormTemplateInput
): Promise<FormTemplatesOpResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/formTemplates.ts")).updateFormTemplate(input)
      : await feishu.updateFormTemplate(input);
  return invalidated(result);
}

export async function deleteFormTemplate(
  input: DeleteFormTemplateInput
): Promise<FormTemplatesOpResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/formTemplates.ts")).deleteFormTemplate(input)
      : await feishu.deleteFormTemplate(input);
  return invalidated(result);
}
