// Postgres implementation of the test templates domain. Same result shapes as
// the Feishu impl. On Postgres the business code (TEST-… / TI-…) IS the
// identity, so recordId params carry the template code and recordId in
// responses echoes it.
//
// Columns the Feishu tables have but Postgres doesn't (Status, Created At on
// templates) behave like missing Feishu columns did: writes drop them
// silently (buildFields semantics), reads return "".
import { eq } from "drizzle-orm";
import { db } from "../client.ts";
import { testTemplates, testItems } from "../schema.ts";
import { str } from "./_util.ts";
import type {
  TestTemplatesOpResult,
  CreateTestTemplateInput,
  UpdateTestTemplateInput,
  DeleteTestTemplateInput,
} from "../repositories/testTemplates.ts";

type ItemRow = typeof testItems.$inferSelect;
type TemplateRow = typeof testTemplates.$inferSelect;

function isTranslationPlaceholder(value: string) {
  return /请提供.*(?:翻译|正文|英文)|provide.*text.*translat/i.test(value);
}

function mapItem(r: ItemRow) {
  return {
    recordId: r.testItemId, // business code is the identity on Postgres
    testItemId: r.testItemId,
    testTemplateId: str(r.testTemplateId),
    order: r.orderIndex == null ? "" : String(r.orderIndex),
    testName: str(r.testName),
    testNameCn: str(r.testNameCn),
    metricType: str(r.metricType),
    unit: str(r.unit),
    createsMetric: Boolean(r.createsMetric),
    metricName: str(r.metricName),
    metricUnit: str(r.metricUnit),
    calculationMethod: str(r.calculationMethod),
    inputUnit: str(r.inputUnit),
    instructions: str(r.instructions),
    instructionsCn: str(r.instructionsCn),
  };
}

export async function listTestTemplates(): Promise<TestTemplatesOpResult> {
  const [templateRows, itemRows] = await Promise.all([
    db.select().from(testTemplates),
    db.select().from(testItems),
  ]);

  const items = itemRows.map(mapItem).filter((item) => {
    return Boolean(
      item.testItemId ||
        item.testTemplateId ||
        item.testName ||
        item.metricType ||
        item.unit ||
        item.instructions
    );
  });

  const tests = templateRows
    .map((r: TemplateRow) => ({
      recordId: r.testTemplateId,
      testTemplateId: r.testTemplateId,
      name: str(r.name),
      nameCn: str(r.nameCn),
      description: str(r.description),
      descriptionCn: str(r.descriptionCn),
      category: str(r.category),
      status: "", // Feishu-only column
      createdAt: "", // Feishu-only column
      items: items
        .filter(
          (testItem) =>
            testItem.testTemplateId && testItem.testTemplateId === r.testTemplateId
        )
        .sort((a, b) => Number(a.order) - Number(b.order)),
    }))
    .filter((test) => {
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

function itemRows(testTemplateId: string, items: unknown) {
  const list = Array.isArray(items) ? items : [];
  return list.map((item: any, index: number) => ({
    testItemId: `TI-${Date.now()}-${index + 1}`,
    testTemplateId,
    orderIndex: index + 1,
    testName: String(item?.testName || ""),
    metricType: String(item?.metricType || "Weight"),
    unit: String(item?.unit || "kg"),
    // Test -> athlete-metric pipeline fields
    createsMetric: Boolean(item?.createsMetric),
    metricName: String(item?.metricName || ""),
    metricUnit: String(item?.metricUnit || item?.unit || ""),
    calculationMethod: String(item?.calculationMethod || ""),
    inputUnit: String(item?.inputUnit || item?.unit || ""),
    instructions: String(item?.instructions || ""),
  }));
}

export async function createTestTemplate(
  input: CreateTestTemplateInput
): Promise<TestTemplatesOpResult> {
  const testTemplateId = `TEST-${Date.now()}`;

  await db.insert(testTemplates).values({
    testTemplateId,
    name: String(input.name),
    description: String(input.description || ""),
    category: String(input.category || ""),
  });

  const rows = itemRows(testTemplateId, input.items);
  if (rows.length) await db.insert(testItems).values(rows);

  return {
    status: 200,
    body: {
      success: true,
      testTemplateId,
      testRecordId: testTemplateId,
      itemRecordsCreated: rows.length,
    },
  };
}

export async function updateTestTemplate(
  input: UpdateTestTemplateInput
): Promise<TestTemplatesOpResult> {
  const testTemplateId = String(input.testTemplateId);

  const updated = await db
    .update(testTemplates)
    .set({
      testTemplateId,
      name: String(input.name),
      description: String(input.description || ""),
      category: String(input.category || ""),
    })
    .where(eq(testTemplates.testTemplateId, testTemplateId))
    .returning({ testTemplateId: testTemplates.testTemplateId });

  if (!updated.length) {
    return {
      status: 500,
      body: { error: "Could not update test template" },
    };
  }

  // Same replace semantics as Feishu: drop the template's items, then
  // recreate from the payload.
  await db.delete(testItems).where(eq(testItems.testTemplateId, testTemplateId));

  const rows = itemRows(testTemplateId, input.items);
  if (rows.length) await db.insert(testItems).values(rows);

  return {
    status: 200,
    body: {
      success: true,
      testTemplateId,
      testRecordId: String(input.recordId),
      itemRecordsCreated: rows.length,
    },
  };
}

export async function deleteTestTemplate(
  input: DeleteTestTemplateInput
): Promise<TestTemplatesOpResult> {
  // recordId carries the template code on Postgres; testTemplateId (when
  // sent) matches it.
  const templateCode = String(input.testTemplateId || input.recordId);

  const deletedItems = input.testTemplateId
    ? await db
        .delete(testItems)
        .where(eq(testItems.testTemplateId, String(input.testTemplateId)))
        .returning({ testItemId: testItems.testItemId })
    : [];

  const deletedTemplates = await db
    .delete(testTemplates)
    .where(eq(testTemplates.testTemplateId, templateCode))
    .returning({ testTemplateId: testTemplates.testTemplateId });

  if (!deletedTemplates.length) {
    return {
      status: 500,
      body: { error: "Could not delete test template" },
    };
  }

  return {
    status: 200,
    body: { success: true, deletedItems: deletedItems.length },
  };
}
