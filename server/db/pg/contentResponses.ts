import { eq, inArray } from "drizzle-orm";
import { db } from "../client.ts";
import {
  formResponses,
  testResults,
  testItems,
  athleteMetrics,
  assignedForms,
  assignedTests,
  formTemplates,
  testTemplates,
  clients,
} from "../schema.ts";
import { epochToDate, str } from "./_util.ts";
import {
  calculateMetric,
  deriveMetricKind,
  deriveMetricUnit,
} from "../metricPipeline.ts";
import type { ResponseDTO } from "../dto.ts";
import type {
  SubmitContentResponseInput,
  SubmitContentResponseResult,
} from "../repositories/contentResponses.ts";

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

/* ------------------------- submitContentResponse -------------------------- */
// Same semantics as the Feishu impl. Questionnaires land as ONE row with the
// answers JSON (the pg schema always has that column); physical tests land as
// one row per item and run the test->metric pipeline. FK references are
// validated first (Feishu just stores dead text) — a missing client keeps the
// submission with the FK nulled so an athlete's submit can never bounce.

async function exists<T extends { length: number }>(q: Promise<T>) {
  return (await q).length > 0;
}

export async function submitContentResponse(
  input: SubmitContentResponseInput
): Promise<SubmitContentResponseResult> {
  const {
    assignmentType,
    assignmentId,
    assignmentRecordId,
    templateId,
    clientId,
    clientName,
    responses,
  } = input;

  const isTest = String(assignmentType).toLowerCase().includes("test");
  const now = Date.now();
  const clientCode = String(clientId);
  const assignmentCode = String(assignmentId || assignmentRecordId || "");

  const clientFk = (await exists(
    db.select({ id: clients.clientId }).from(clients).where(eq(clients.clientId, clientCode))
  ))
    ? clientCode
    : null;

  const createdRecords: string[] = [];
  const metricsCreated: string[] = [];
  const metricWarnings: string[] = [];

  const clientComment = String(
    responses.find(
      (responseItem: any) =>
        responseItem?.questionId === "__client_comment" ||
        responseItem?.itemId === "__client_comment" ||
        String(responseItem?.label || "").toLowerCase() === "client comment"
    )?.value || ""
  );

  if (!isTest) {
    const responseId = `FR-${now}`;
    const assignedFk = assignmentCode
      ? (await exists(
          db
            .select({ id: assignedForms.assignedFormId })
            .from(assignedForms)
            .where(eq(assignedForms.assignedFormId, assignmentCode))
        ))
        ? assignmentCode
        : null
      : null;
    const formFk = (await exists(
      db
        .select({ id: formTemplates.formId })
        .from(formTemplates)
        .where(eq(formTemplates.formId, String(templateId)))
    ))
      ? String(templateId)
      : null;

    try {
      await db.insert(formResponses).values({
        responseId,
        assignedFormId: assignedFk,
        formId: formFk,
        clientId: clientFk,
        submittedAt: now,
        answers: responses,
        clientComment: clientComment || null,
      });
    } catch (e: any) {
      return {
        status: 500,
        body: { error: "Could not submit response", message: e?.message || String(e) },
      };
    }
    createdRecords.push(responseId);
  } else {
    // Metric configs for this template's items, keyed by item id.
    const itemIds = responses
      .map((r: any) => String(r.itemId || r.questionId || ""))
      .filter(Boolean);
    const itemRows = itemIds.length
      ? await db.select().from(testItems).where(inArray(testItems.testItemId, itemIds))
      : [];
    const testItemMetrics = new Map(
      itemRows.map((item) => [
        item.testItemId,
        {
          createsMetric: item.createsMetric === true,
          metricType: str(item.testingMetricType) || str(item.metricType),
          metricName: str(item.metricName),
          metricUnit: str(item.metricUnit),
          calculationMethod: str(item.calculationMethod),
          inputUnit: str(item.inputUnit),
          testName: str(item.testName),
        },
      ])
    );
    const knownItems = new Set(itemRows.map((r) => r.testItemId));
    const templateFk = (await exists(
      db
        .select({ id: testTemplates.testTemplateId })
        .from(testTemplates)
        .where(eq(testTemplates.testTemplateId, String(templateId)))
    ))
      ? String(templateId)
      : null;
    const assignedFk = assignmentCode
      ? (await exists(
          db
            .select({ id: assignedTests.assignedTestId })
            .from(assignedTests)
            .where(eq(assignedTests.assignedTestId, assignmentCode))
        ))
        ? assignmentCode
        : null
      : null;

    for (const [index, responseItem] of responses.entries()) {
      const responseId = `TR-${now}-${index + 1}`;
      const responseValue = String(responseItem.value || "");
      const responseNotes = String(responseItem.notes || "");
      const storedNotes = responseValue
        ? [responseNotes, `Result input: ${responseValue}`].filter(Boolean).join("\n")
        : responseNotes;
      const responseItemId = String(responseItem.itemId || responseItem.questionId || "");

      // The Feishu impl 400s when the required Value can't be written.
      if (!responseValue) {
        return {
          status: 400,
          body: {
            error: "Missing required response columns",
            missingRequired: ["Value"],
            availableFields: [],
          },
        };
      }

      const row: typeof testResults.$inferInsert = {
        resultId: responseId,
        assignedTestId: assignedFk,
        testTemplateId: templateFk,
        testItemId: knownItems.has(responseItemId) ? responseItemId : null,
        clientId: clientFk,
        value: responseValue,
        unit: String(responseItem.unit || "") || null,
        notes: storedNotes || null,
        submittedAt: now,
      };

      try {
        await db.insert(testResults).values(row);
      } catch (e: any) {
        return {
          status: 500,
          body: { error: "Could not submit response", message: e?.message || String(e) },
        };
      }
      createdRecords.push(responseId);

      const metricConfig = testItemMetrics.get(responseItemId);
      if (metricConfig?.createsMetric) {
        const metricKind = deriveMetricKind(metricConfig.calculationMethod);
        const metricBaseName = metricConfig.testName || responseItem.label || "Test";
        const metricName =
          metricConfig.metricName ||
          (metricKind ? `${metricBaseName} — ${metricKind}` : `${metricBaseName} Metric`);
        const metricUnit = deriveMetricUnit({
          metricKind,
          calculationMethod: metricConfig.calculationMethod,
          metricUnit: metricConfig.metricUnit,
          inputUnit: metricConfig.inputUnit,
          responseUnit: responseItem.unit,
        });
        const calculatedValue = calculateMetric({
          value: String(responseItem.value || ""),
          notes: String(responseItem.notes || ""),
          label: String(responseItem.label || metricConfig.testName || ""),
          method: metricConfig.calculationMethod,
          metricUnit,
        });

        if (calculatedValue === null) {
          metricWarnings.push(
            `Could not calculate ${metricName} from "${responseItem.value || ""}"`
          );
          await db
            .update(testResults)
            .set({ createsMetric: true, metricCreated: false })
            .where(eq(testResults.resultId, responseId));
        } else {
          const metricId = `AM-${now}-${index + 1}`;
          try {
            await db.insert(athleteMetrics).values({
              metricId,
              clientId: clientFk,
              clientName: String(clientName || "") || null,
              metricType:
                String(metricConfig.metricType || responseItem.metricType || "") || null,
              metricName,
              value: calculatedValue,
              unit: metricUnit || null,
              sourceType: "Physical Test",
              sourceTestId: responseItemId || null,
              sourceTestName:
                String(responseItem.label || metricConfig.testName || "") || null,
              calculationMethod: String(metricConfig.calculationMethod || "Direct Value"),
              validFrom: now,
              status: "Active",
              notes: String(responseItem.notes || "") || null,
            });
            metricsCreated.push(metricId);
            await db
              .update(testResults)
              .set({ createsMetric: true, metricCreated: true })
              .where(eq(testResults.resultId, responseId));
          } catch (e: any) {
            metricWarnings.push(
              `Could not create ${metricName}: ${e?.message || String(e)}`
            );
          }
        }
      }
    }
  }

  // Mark the assignment completed (same best-effort semantics as Feishu).
  let assignmentUpdate: any = null;
  const completionTarget = String(assignmentRecordId || "");
  if (completionTarget) {
    const updated = isTest
      ? await db
          .update(assignedTests)
          .set({ completedAt: now })
          .where(eq(assignedTests.assignedTestId, completionTarget))
          .returning({ id: assignedTests.assignedTestId })
      : await db
          .update(assignedForms)
          .set({ status: "Completed", completedAt: now })
          .where(eq(assignedForms.assignedFormId, completionTarget))
          .returning({ id: assignedForms.assignedFormId });
    assignmentUpdate = { code: 0, updated: updated.length };
  }

  return {
    status: 200,
    body: {
      success: true,
      recordsCreated: createdRecords.length,
      metricsCreated: metricsCreated.length,
      metricWarnings,
      assignmentUpdate,
    },
  };
}
