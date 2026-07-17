// Test templates + test items (child table) repository. Dispatches to the
// Feishu or Postgres implementation based on DATA_BACKEND.
//
// Results are HTTP-shaped ({ status, body }): the old api/testTemplates.ts
// handler produced many distinct error bodies (missing Feishu columns, per-step
// larkResponse echoes), so the impls build the exact response and the handler
// forwards it verbatim — wire responses stay byte-identical.
import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/testTemplates.ts";
import { invalidateCache } from "../../../api/_cache.ts";

export type TestTemplatesOpResult = {
  status: number;
  body: Record<string, any>;
};

export type TestItemInput = {
  testName?: any;
  metricType?: any;
  unit?: any;
  // Test -> athlete-metric pipeline fields
  createsMetric?: any;
  metricName?: any;
  metricUnit?: any;
  calculationMethod?: any;
  inputUnit?: any;
  instructions?: any;
};

export type CreateTestTemplateInput = {
  name: any;
  description?: any;
  category?: any;
  status?: any;
  items?: TestItemInput[] | any;
};

export type UpdateTestTemplateInput = CreateTestTemplateInput & {
  recordId: any;
  testTemplateId: any;
};

export type DeleteTestTemplateInput = {
  recordId: any;
  testTemplateId?: any;
};

// The contentAssignments cache (api/contentAssignments.ts) embeds test
// template names, so any successful template write must drop it or coaches
// see stale template names on assignments for up to 5 minutes.
function invalidated(result: TestTemplatesOpResult): TestTemplatesOpResult {
  if (result.status === 200 && result.body?.success) {
    invalidateCache("contentAssignments");
  }
  return result;
}

export async function listTestTemplates(): Promise<TestTemplatesOpResult> {
  return DATA_BACKEND === "postgres"
    ? await (await import("../pg/testTemplates.ts")).listTestTemplates()
    : await feishu.listTestTemplates();
}

export async function createTestTemplate(
  input: CreateTestTemplateInput
): Promise<TestTemplatesOpResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/testTemplates.ts")).createTestTemplate(input)
      : await feishu.createTestTemplate(input);
  return invalidated(result);
}

export async function updateTestTemplate(
  input: UpdateTestTemplateInput
): Promise<TestTemplatesOpResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/testTemplates.ts")).updateTestTemplate(input)
      : await feishu.updateTestTemplate(input);
  return invalidated(result);
}

export async function deleteTestTemplate(
  input: DeleteTestTemplateInput
): Promise<TestTemplatesOpResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/testTemplates.ts")).deleteTestTemplate(input)
      : await feishu.deleteTestTemplate(input);
  return invalidated(result);
}
