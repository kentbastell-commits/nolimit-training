// Postgres implementation of the test templates domain. Same result shapes as
// the Feishu impl. On Postgres the business code (TEST-… / TI-…) IS the
// identity, so recordId params carry the template code and recordId in
// responses echoes it.
//
// Columns the Feishu tables have but Postgres doesn't (Status, Created At on
// templates) behave like missing Feishu columns did: writes drop them
// silently (buildFields semantics), reads return "".
import { eq, inArray } from "drizzle-orm";
import { db } from "../client.ts";
import {
  testTemplates,
  testItems,
  testResults,
  assignedTests,
} from "../schema.ts";
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
    db.select().from(testTemplates).orderBy(testTemplates.testTemplateId),
    db.select().from(testItems).orderBy(testItems.orderIndex),
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
    // CN + typing columns: the console doesn't send these; update() carries
    // them over from the previous rows so an edit never strips them.
    testNameCn: item?.testNameCn ? String(item.testNameCn) : null,
    unitCn: item?.unitCn ? String(item.unitCn) : null,
    instructionsCn: item?.instructionsCn ? String(item.instructionsCn) : null,
    testingMetricType: item?.testingMetricType
      ? String(item.testingMetricType)
      : null,
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

  // Existing items feed two things: the CN/typing carry-over (the console
  // payload doesn't include testNameCn/instructionsCn/unitCn/
  // testingMetricType — without the carry-over one edit strips them forever)
  // and the FK detach of historical results below.
  const existingItems = await db
    .select()
    .from(testItems)
    .where(eq(testItems.testTemplateId, testTemplateId));
  const carry = new Map(existingItems.map((r) => [str(r.testName), r]));

  const rows = itemRows(testTemplateId, input.items).map((row) => {
    const prev = carry.get(row.testName);
    if (!prev) return row;
    return {
      ...row,
      testNameCn: row.testNameCn ?? prev.testNameCn,
      unitCn: row.unitCn ?? prev.unitCn,
      instructionsCn: row.instructionsCn ?? prev.instructionsCn,
      testingMetricType: row.testingMetricType ?? prev.testingMetricType,
    };
  });

  // Transactional replace: historical test_results FK-reference the old item
  // rows, so the bare delete used to throw AFTER the template row was already
  // updated (partial write + stale cache). Detach results first — the old
  // item rows are being replaced, so their links are dead either way (same
  // semantics Feishu had, where results kept text codes pointing nowhere).
  let found = true;
  await db.transaction(async (tx) => {
    const updated = await tx
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
      found = false;
      return;
    }

    const oldIds = existingItems.map((r) => String(r.testItemId));
    if (oldIds.length) {
      await tx
        .update(testResults)
        .set({ testItemId: null })
        .where(inArray(testResults.testItemId, oldIds));
    }
    await tx.delete(testItems).where(eq(testItems.testTemplateId, testTemplateId));
    if (rows.length) await tx.insert(testItems).values(rows);
  });

  if (!found) {
    return {
      status: 500,
      body: { error: "Could not update test template" },
    };
  }

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

  // Transactional delete with FK detach: assigned_tests + test_results
  // reference the template and its items, so the bare delete used to throw
  // AFTER destroying the item rows (orphaned template, generic 500). Feishu
  // deleted cleanly and left dead text links — nulling the FKs is the same
  // semantics.
  let deletedItemCount = 0;
  let found = false;
  await db.transaction(async (tx) => {
    const itemIds = (
      await tx
        .select({ id: testItems.testItemId })
        .from(testItems)
        .where(eq(testItems.testTemplateId, templateCode))
    ).map((r) => String(r.id));

    if (itemIds.length) {
      await tx
        .update(testResults)
        .set({ testItemId: null })
        .where(inArray(testResults.testItemId, itemIds));
    }
    await tx
      .update(testResults)
      .set({ testTemplateId: null })
      .where(eq(testResults.testTemplateId, templateCode));
    await tx
      .update(assignedTests)
      .set({ testTemplateId: null })
      .where(eq(assignedTests.testTemplateId, templateCode));

    const deletedItems = await tx
      .delete(testItems)
      .where(eq(testItems.testTemplateId, templateCode))
      .returning({ testItemId: testItems.testItemId });
    deletedItemCount = deletedItems.length;

    const deletedTemplates = await tx
      .delete(testTemplates)
      .where(eq(testTemplates.testTemplateId, templateCode))
      .returning({ testTemplateId: testTemplates.testTemplateId });
    // No rollback needed on miss: every statement above matches zero rows
    // when the template doesn't exist.
    found = deletedTemplates.length > 0;
  });

  if (!found) {
    return {
      status: 500,
      body: { error: "Could not delete test template" },
    };
  }

  return {
    status: 200,
    body: { success: true, deletedItems: deletedItemCount },
  };
}
