// Feishu implementation of the test templates domain. Logic moved verbatim
// from the pre-repository api/testTemplates.ts handler; shared client helpers
// replace the handler's inline token/pagination/CRUD fetches where they are
// drop-in equivalents. Field parsing/aliasing (incl. the test -> athlete-metric
// pipeline columns), placeholder filtering and error bodies are unchanged.
import {
  getTenantToken,
  appToken,
  listRecords,
  createRecord,
  updateRecord,
  deleteRecord,
} from "./client.ts";
import type {
  TestTemplatesOpResult,
  CreateTestTemplateInput,
  UpdateTestTemplateInput,
  DeleteTestTemplateInput,
} from "../repositories/testTemplates.ts";

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.name) return item.name;
        if (item?.record_ids) return item.record_ids.join(", ");
        if (item?.link_record_ids) return item.link_record_ids.join(", ");
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");
  if (
    Array.isArray(value?.text_arr) ||
    Object.prototype.hasOwnProperty.call(value, "record_ids") ||
    Object.prototype.hasOwnProperty.call(value, "link_record_ids")
  ) {
    return "";
  }

  return "";
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isTranslationPlaceholder(value: string) {
  return /请提供.*(?:翻译|正文|英文)|provide.*text.*translat/i.test(value);
}

function readField(fields: Record<string, any>, aliases: string[]) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(fields, alias)) {
      return fieldToText(fields[alias]);
    }
  }

  const normalizedAliases = aliases.map(normalizeFieldName);
  const matchingKey = Object.keys(fields).find((key) =>
    normalizedAliases.includes(normalizeFieldName(key))
  );

  return matchingKey ? fieldToText(fields[matchingKey]) : "";
}

function readBoolField(fields: Record<string, any>, aliases: string[]) {
  const text = readField(fields, aliases).trim().toLowerCase();
  return ["true", "yes", "1", "checked", "active"].includes(text);
}

function toLarkDate(value?: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  return new Date(`${value}T00:00:00`).getTime();
}

// Throws on failure (the old handler surfaced this as a 500 "Server error"
// with the message) — the shared client's getFieldNames returns [] instead,
// which would silently turn this into a 400 "Missing required Feishu columns".
async function getTableFieldNames(tableId: string) {
  const token = await getTenantToken();
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/fields?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`Could not fetch table fields: ${JSON.stringify(data)}`);
  }

  return (data.data.items || [])
    .map((field: any) => field.field_name || field.name)
    .filter(Boolean);
}

function resolveFieldName(fieldNames: string[], aliases: string[]) {
  const exact = aliases.find((alias) => fieldNames.includes(alias));
  if (exact) return exact;

  const normalizedAliases = aliases.map(normalizeFieldName);
  return fieldNames.find((fieldName) =>
    normalizedAliases.includes(normalizeFieldName(fieldName))
  );
}

function buildFields(
  fieldNames: string[],
  specs: { aliases: string[]; value: any; required?: boolean }[]
) {
  const fields: Record<string, any> = {};
  const missingRequired: string[] = [];

  for (const spec of specs) {
    const fieldName = resolveFieldName(fieldNames, spec.aliases);

    if (!fieldName) {
      if (spec.required) missingRequired.push(spec.aliases[0]);
      continue;
    }

    fields[fieldName] = spec.value;
  }

  return { fields, missingRequired };
}

type Tables =
  | { ok: true; templates: string; items: string }
  | { ok: false; error: TestTemplatesOpResult };

function tableIds(): Tables {
  const templates =
    process.env.FEISHU_TEST_TEMPLATES_TABLE_ID || process.env.TEST_TEMPLATES;
  const items = process.env.FEISHU_TEST_ITEMS_TABLE_ID || process.env.TEST_ITEMS;

  if (!templates) {
    return {
      ok: false,
      error: { status: 500, body: { error: "Missing FEISHU_TEST_TEMPLATES_TABLE_ID" } },
    };
  }

  if (!items) {
    return {
      ok: false,
      error: { status: 500, body: { error: "Missing FEISHU_TEST_ITEMS_TABLE_ID" } },
    };
  }

  return { ok: true, templates, items };
}

const itemFieldSpecs = (
  testTemplateId: string,
  index: number,
  item: any
): { aliases: string[]; value: any; required?: boolean }[] => [
  {
    aliases: ["Test Item ID", "testItemId"],
    value: `TI-${Date.now()}-${index + 1}`,
    required: true,
  },
  {
    aliases: ["Test Template ID", "testTemplateId", "Template ID"],
    value: testTemplateId,
    required: true,
  },
  { aliases: ["Order", "order"], value: index + 1 },
  {
    aliases: ["Test Name", "testName", "Name", "Test"],
    value: String(item.testName || ""),
    required: true,
  },
  {
    aliases: ["Metric Type", "metricType", "Metric"],
    value: String(item.metricType || "Weight"),
  },
  { aliases: ["Unit", "unit"], value: String(item.unit || "kg") },
  {
    aliases: ["Creates Metric", "Create Metric", "Metric Enabled"],
    value: Boolean(item.createsMetric),
  },
  {
    aliases: ["Metric Name", "metricName"],
    value: String(item.metricName || ""),
  },
  {
    aliases: ["Metric Unit", "metricUnit"],
    value: String(item.metricUnit || item.unit || ""),
  },
  {
    aliases: ["Calculation Method", "Calculation", "Formula"],
    value: String(item.calculationMethod || ""),
  },
  {
    aliases: ["Input Unit", "Input Format"],
    value: String(item.inputUnit || item.unit || ""),
  },
  {
    aliases: ["Instructions", "instructions"],
    value: String(item.instructions || ""),
  },
];

export async function listTestTemplates(): Promise<TestTemplatesOpResult> {
  const tables = tableIds();
  if (!tables.ok) return tables.error;

  const [templateRecords, itemRecords] = await Promise.all([
    listRecords(tables.templates),
    listRecords(tables.items),
  ]);

  const items = itemRecords.map((item: any) => {
    const fields = item.fields || {};

    return {
      recordId: item.record_id,
      testItemId: readField(fields, ["testItemId", "Test Item ID"]),
      testTemplateId: readField(fields, [
        "testTemplateId",
        "Test Template ID",
        "Template ID",
      ]),
      order: readField(fields, ["order", "Order"]),
      testName: readField(fields, ["testName", "Test Name", "Name", "Test"]),
      testNameCn: readField(fields, [
        "Test Name CN",
        "Name CN",
        "Test CN",
      ]),
      metricType: readField(fields, ["metricType", "Metric Type", "Metric"]),
      unit: readField(fields, ["unit", "Unit"]),
      createsMetric: readBoolField(fields, [
        "Creates Metric",
        "Create Metric",
        "Metric Enabled",
      ]),
      metricName: readField(fields, ["Metric Name", "metricName"]),
      metricUnit: readField(fields, ["Metric Unit", "metricUnit"]),
      calculationMethod: readField(fields, [
        "Calculation Method",
        "Calculation",
        "Formula",
      ]),
      inputUnit: readField(fields, ["Input Unit", "Input Format"]),
      instructions: readField(fields, ["instructions", "Instructions"]),
      instructionsCn: readField(fields, [
        "Instructions CN",
        "Description CN",
        "Notes CN",
      ]),
    };
  }).filter((item: any) => {
    return Boolean(
      item.testItemId ||
        item.testTemplateId ||
        item.testName ||
        item.metricType ||
        item.unit ||
        item.instructions
    );
  });

  const tests = templateRecords.map((item: any) => {
    const fields = item.fields || {};
    const rawTestTemplateId = readField(fields, [
      "testTemplateId",
      "Test Template ID",
      "Template ID",
    ]);
    const testTemplateId = rawTestTemplateId || item.record_id;
    const name = readField(fields, [
      "name",
      "Name",
      "Test Template Name",
      "Template Name",
      "Title",
    ]);

    return {
      recordId: item.record_id,
      testTemplateId,
      name,
      nameCn: readField(fields, [
        "Name CN",
        "Test Template Name CN",
        "Template Name CN",
        "Title CN",
      ]),
      description: readField(fields, ["description", "Description"]),
      descriptionCn: readField(fields, ["Description CN"]),
      category: readField(fields, ["category", "Category", "Test Category"]),
      status: readField(fields, ["status", "Status"]),
      createdAt: readField(fields, ["createdAt", "Created At"]),
      items: items
        .filter(
          (testItem: any) =>
            testItem.testTemplateId && testItem.testTemplateId === testTemplateId
        )
        .sort((a: any, b: any) => Number(a.order) - Number(b.order)),
    };
  }).filter((test: any) => {
    return Boolean(
      test.name ||
        (test.nameCn && !isTranslationPlaceholder(test.nameCn)) ||
        test.description ||
        (test.descriptionCn && !isTranslationPlaceholder(test.descriptionCn)) ||
        test.items.length > 0
    );
  });

  return { status: 200, body: { tests } };
}

export async function deleteTestTemplate(
  input: DeleteTestTemplateInput
): Promise<TestTemplatesOpResult> {
  const tables = tableIds();
  if (!tables.ok) return tables.error;
  const { recordId, testTemplateId } = input;

  const itemRecords = await listRecords(tables.items);
  const childItems = itemRecords.filter((item: any) => {
    const fields = item.fields || {};
    return (
      testTemplateId &&
      readField(fields, [
        "testTemplateId",
        "Test Template ID",
        "Template ID",
      ]) === String(testTemplateId)
    );
  });

  const deletedItems = [];

  for (const item of childItems) {
    const data = await deleteRecord(tables.items, item.record_id);

    if (data.code !== 0) {
      return {
        status: 500,
        body: { error: "Could not delete test item", larkResponse: data },
      };
    }

    deletedItems.push(item.record_id);
  }

  const templateData = await deleteRecord(tables.templates, String(recordId));

  if (templateData.code !== 0) {
    return {
      status: 500,
      body: { error: "Could not delete test template", larkResponse: templateData },
    };
  }

  return {
    status: 200,
    body: { success: true, deletedItems: deletedItems.length },
  };
}

export async function updateTestTemplate(
  input: UpdateTestTemplateInput
): Promise<TestTemplatesOpResult> {
  const tables = tableIds();
  if (!tables.ok) return tables.error;

  const [testTemplateFieldNames, testItemFieldNames] = await Promise.all([
    getTableFieldNames(tables.templates),
    getTableFieldNames(tables.items),
  ]);

  const { recordId, testTemplateId, name, description, category, status, items } =
    input;

  const { fields: templateFields, missingRequired } = buildFields(
    testTemplateFieldNames,
    [
      {
        aliases: ["Test Template ID", "testTemplateId", "Template ID"],
        value: String(testTemplateId),
        required: true,
      },
      {
        aliases: ["Test Template Name", "name", "Name", "Template Name", "Title"],
        value: String(name),
        required: true,
      },
      { aliases: ["Description", "description"], value: String(description || "") },
      { aliases: ["Category", "Test Category"], value: String(category || "") },
      { aliases: ["Status", "status"], value: String(status || "Active") },
    ]
  );

  if (missingRequired.length > 0) {
    return {
      status: 400,
      body: {
        error: "Missing required Feishu test columns",
        missingRequired,
        availableFields: testTemplateFieldNames,
      },
    };
  }

  const templateData = await updateRecord(
    tables.templates,
    String(recordId),
    templateFields
  );

  if (templateData.code !== 0) {
    return {
      status: 500,
      body: {
        error: "Could not update test template",
        larkResponse: templateData,
        fieldsSent: templateFields,
      },
    };
  }

  const existingItems = await listRecords(tables.items);
  const childItems = existingItems.filter((item: any) => {
    const fields = item.fields || {};
    return (
      readField(fields, [
        "testTemplateId",
        "Test Template ID",
        "Template ID",
      ]) === String(testTemplateId)
    );
  });

  for (const item of childItems) {
    const data = await deleteRecord(tables.items, item.record_id);

    if (data.code !== 0) {
      return {
        status: 500,
        body: { error: "Could not replace test items", larkResponse: data },
      };
    }
  }

  const testItems = Array.isArray(items) ? items : [];
  const createdItems = [];

  for (const [index, item] of testItems.entries()) {
    const { fields: itemFields, missingRequired: missingItemFields } =
      buildFields(testItemFieldNames, itemFieldSpecs(String(testTemplateId), index, item));

    if (missingItemFields.length > 0) {
      return {
        status: 400,
        body: {
          error: "Missing required Feishu test item columns",
          missingRequired: missingItemFields,
          availableFields: testItemFieldNames,
        },
      };
    }

    const itemData = await createRecord(tables.items, itemFields);

    if (itemData.code !== 0) {
      return {
        status: 500,
        body: {
          error: "Could not create test item",
          larkResponse: itemData,
          fieldsSent: itemFields,
        },
      };
    }

    createdItems.push(itemData.data.record.record_id);
  }

  return {
    status: 200,
    body: {
      success: true,
      testTemplateId: String(testTemplateId),
      testRecordId: String(recordId),
      itemRecordsCreated: createdItems.length,
    },
  };
}

export async function createTestTemplate(
  input: CreateTestTemplateInput
): Promise<TestTemplatesOpResult> {
  const tables = tableIds();
  if (!tables.ok) return tables.error;

  const { name, description, category, status, items } = input;

  const testTemplateId = `TEST-${Date.now()}`;
  const [testTemplateFieldNames, testItemFieldNames] = await Promise.all([
    getTableFieldNames(tables.templates),
    getTableFieldNames(tables.items),
  ]);

  const { fields: templateFields, missingRequired } = buildFields(
    testTemplateFieldNames,
    [
      {
        aliases: ["Test Template ID", "testTemplateId", "Template ID"],
        value: testTemplateId,
        required: true,
      },
      {
        aliases: ["Test Template Name", "name", "Name", "Template Name", "Title"],
        value: String(name),
        required: true,
      },
      { aliases: ["Description", "description"], value: String(description || "") },
      { aliases: ["Category", "Test Category"], value: String(category || "") },
      { aliases: ["Status", "status"], value: String(status || "Active") },
      { aliases: ["Created At", "createdAt"], value: toLarkDate() },
    ]
  );

  if (missingRequired.length > 0) {
    return {
      status: 400,
      body: {
        error: "Missing required Feishu test columns",
        missingRequired,
        availableFields: testTemplateFieldNames,
      },
    };
  }

  const templateData = await createRecord(tables.templates, templateFields);

  if (templateData.code !== 0) {
    return {
      status: 500,
      body: {
        error: "Could not create test template",
        larkResponse: templateData,
        fieldsSent: templateFields,
      },
    };
  }

  const testItems = Array.isArray(items) ? items : [];
  const createdItems = [];

  for (const [index, item] of testItems.entries()) {
    const { fields: itemFields, missingRequired: missingItemFields } =
      buildFields(testItemFieldNames, itemFieldSpecs(testTemplateId, index, item));

    if (missingItemFields.length > 0) {
      return {
        status: 400,
        body: {
          error: "Missing required Feishu test item columns",
          missingRequired: missingItemFields,
          availableFields: testItemFieldNames,
        },
      };
    }

    const itemData = await createRecord(tables.items, itemFields);

    if (itemData.code !== 0) {
      return {
        status: 500,
        body: {
          error: "Could not create test item",
          larkResponse: itemData,
          fieldsSent: itemFields,
        },
      };
    }

    createdItems.push(itemData.data.record.record_id);
  }

  return {
    status: 200,
    body: {
      success: true,
      testTemplateId,
      testRecordId: templateData.data.record.record_id,
      itemRecordsCreated: createdItems.length,
    },
  };
}
