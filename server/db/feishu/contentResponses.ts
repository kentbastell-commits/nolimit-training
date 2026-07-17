import { listRecords, getTenantToken, appToken, createRecord, updateRecord } from "./client.ts";
import type { ResponseDTO } from "../dto.ts";
import { ConfigError } from "../errors.ts";
import {
  calculateMetric,
  deriveMetricKind,
  deriveMetricUnit,
  parseNumbers,
} from "../metricPipeline.ts";
import type {
  SubmitContentResponseInput,
  SubmitContentResponseResult,
} from "../repositories/contentResponses.ts";

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
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }
  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.value) return fieldToText(value.value);
  if (value?.record_ids) return value.record_ids.join(", ");
  return "";
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeDate(value: string) {
  if (!value) return "";
  if (/^\d+$/.test(value)) {
    const d = new Date(Number(value));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return value.split("T")[0].split(" ")[0];
}

function readField(fields: Record<string, any>, aliases: string[]) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(fields, alias)) return fieldToText(fields[alias]);
  }
  const normalizedAliases = aliases.map(normalizeFieldName);
  const matchingKey = Object.keys(fields).find((key) =>
    normalizedAliases.includes(normalizeFieldName(key))
  );
  return matchingKey ? fieldToText(fields[matchingKey]) : "";
}

function mapResponse(item: any, responseType: "Questionnaire" | "Physical Test"): ResponseDTO {
  const fields = item.fields || {};
  return {
    recordId: item.record_id,
    responseType,
    responseId: readField(fields, ["Form Response ID", "Test Result ID", "Response ID", "Result ID", "ID"]),
    assignmentId: readField(fields, ["Assigned Forms ID", "Assigned Form ID", "Assigned Test ID", "Assignment ID", "Assigned ID"]),
    assignmentRecordId: readField(fields, ["Assignment Record ID", "Record ID"]),
    templateId: readField(fields, ["Form ID", "Test Template ID", "Template ID", "Questionnaire ID", "Test ID"]),
    itemId: readField(fields, ["Question ID", "Test Item ID", "Item ID"]),
    label: readField(fields, ["Question", "Question Text", "Label", "Test Name", "Item Name"]),
    answer: readField(fields, ["Answer", "Response", "Value", "Result"]),
    answersJson: readField(fields, ["Answers Json", "Answers JSON", "Answers"]),
    unit: readField(fields, ["Unit"]),
    notes: readField(fields, ["Notes", "Note", "Result Notes"]),
    clientId: readField(fields, ["Client ID", "clientId"]),
    clientName: readField(fields, ["Client Name", "clientName", "Athlete Name", "Athlete"]),
    submittedAt: normalizeDate(readField(fields, ["Submitted At", "Submitted Date", "Date", "Completed At"])),
  };
}

export async function listAllResponses(): Promise<ResponseDTO[]> {
  const formTable = process.env.FEISHU_FORM_RESPONSES_TABLE_ID || process.env.FORM_RESPONSES;
  const testTable = process.env.FEISHU_TEST_RESULTS_TABLE_ID || process.env.TEST_RESULTS;
  if (!formTable && !testTable) {
    throw new ConfigError("Missing response table IDs");
  }
  const [forms, tests] = await Promise.all([
    formTable ? listRecords(formTable) : Promise.resolve([]),
    testTable ? listRecords(testTable) : Promise.resolve([]),
  ]);
  return [
    ...forms.map((i: any) => mapResponse(i, "Questionnaire")),
    ...tests.map((i: any) => mapResponse(i, "Physical Test")),
  ];
}

/* ------------------------- submitContentResponse -------------------------- */
// Logic moved verbatim from api/submitContentResponse.ts. Writes the response
// rows (single answers-JSON row for questionnaires when the column exists,
// else one row per item), runs the test->metric pipeline, and marks the
// assignment completed. Returns the exact legacy HTTP status + body.

type TableField = {
  field_name?: string;
  name?: string;
  type?: number;
  ui_type?: string;
  property?: Record<string, any>;
};

type FeishuRecord = {
  record_id: string;
  fields?: Record<string, any>;
};

function toLarkDate(value?: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  return new Date(`${value}T00:00:00`).getTime();
}

function resolveField(fields: TableField[], aliases: string[]) {
  const exact = aliases.find((alias) =>
    fields.some((field) => (field.field_name || field.name) === alias)
  );

  if (exact) {
    return fields.find((field) => (field.field_name || field.name) === exact);
  }

  const normalizedAliases = aliases.map(normalizeFieldName);

  return fields.find((field) =>
    normalizedAliases.includes(
      normalizeFieldName(field.field_name || field.name || "")
    )
  );
}

function hasField(fields: TableField[], aliases: string[]) {
  return Boolean(resolveField(fields, aliases));
}

function fieldTypeText(field?: TableField) {
  return `${field?.type || ""} ${field?.ui_type || ""}`.toLowerCase();
}

function isNumberField(field?: TableField) {
  const typeText = fieldTypeText(field);
  return field?.type === 2 || typeText.includes("number");
}

function isLinkField(field?: TableField) {
  const typeText = fieldTypeText(field);
  return (
    field?.type === 21 ||
    typeText.includes("duplex") ||
    typeText.includes("link") ||
    typeText.includes("relation")
  );
}

function isSelectField(field?: TableField) {
  const typeText = fieldTypeText(field);
  return field?.type === 3 || field?.type === 4 || typeText.includes("select");
}

function coerceFieldValue(field: TableField | undefined, value: any) {
  if (value === undefined || value === null) return undefined;

  if (isNumberField(field)) {
    if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
    const numeric = parseNumbers(String(value))[0];
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  if (isLinkField(field)) {
    const values = Array.isArray(value) ? value : [value];
    const recordIds = values
      .flatMap((item) => {
        if (typeof item === "string") return item;
        if (item?.record_id) return item.record_id;
        if (Array.isArray(item?.record_ids)) return item.record_ids;
        if (Array.isArray(item?.link_record_ids)) return item.link_record_ids;
        return "";
      })
      .map((item) => String(item).trim())
      .filter((item) => /^rec[a-z0-9]+$/i.test(item));

    return recordIds.length > 0 ? recordIds : undefined;
  }

  if (isSelectField(field)) {
    const options = Array.isArray(field?.property?.options)
      ? field!.property!.options
          .map((option: any) => String(option?.name ?? ""))
          .filter(Boolean)
      : [];
    const valueStr = String(value);
    // When the select has a fixed option list, only write a value that matches
    // an existing option. Otherwise skip it — Feishu rejects the whole record
    // for an unknown option (SingleSelectFieldConvFail).
    if (options.length > 0) {
      return (
        options.find((option) => option.toLowerCase() === valueStr.toLowerCase()) ||
        undefined
      );
    }
    return valueStr;
  }

  return value;
}

function readBooleanField(fields: Record<string, any>, aliases: string[]) {
  const text = readField(fields, aliases).trim().toLowerCase();
  return ["true", "yes", "1", "checked", "active"].includes(text);
}

function buildFields(
  tableFields: TableField[],
  specs: { aliases: string[]; value: any; required?: boolean }[]
) {
  const fields: Record<string, any> = {};
  const missingRequired: string[] = [];

  for (const spec of specs) {
    const field = resolveField(tableFields, spec.aliases);
    const fieldName = field?.field_name || field?.name;

    if (!fieldName) {
      if (spec.required) missingRequired.push(spec.aliases[0]);
      continue;
    }

    const coercedValue = coerceFieldValue(field, spec.value);

    if (
      coercedValue === undefined ||
      coercedValue === "" ||
      (Array.isArray(coercedValue) && coercedValue.length === 0)
    ) {
      if (spec.required) missingRequired.push(spec.aliases[0]);
      continue;
    }

    fields[fieldName] = coercedValue;
  }

  return { fields, missingRequired };
}

async function getSubmitTableFields(tableId: string, token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/fields?page_size=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`Could not fetch response table fields: ${JSON.stringify(data)}`);
  }

  return (data.data.items || []) as TableField[];
}

async function getRecordsRaw(tableId: string, token: string) {
  const records: FeishuRecord[] = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/records`
    );
    url.searchParams.set("page_size", "500");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`Could not fetch records: ${JSON.stringify(data)}`);
    }

    records.push(...(data.data.items || []));
    pageToken = data.data.page_token || "";
  } while (pageToken);

  return records;
}

function buildCompletionFields(tableFields: TableField[]) {
  return buildFields(tableFields, [
    {
      aliases: ["Status", "status", "Completion Status"],
      value: "Completed",
    },
    {
      aliases: ["Completed At", "Completed Date", "Completd At"],
      value: Date.now(),
    },
  ]).fields;
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
  const tableId = isTest
    ? process.env.FEISHU_TEST_RESULTS_TABLE_ID || process.env.TEST_RESULTS
    : process.env.FEISHU_FORM_RESPONSES_TABLE_ID || process.env.FORM_RESPONSES;
  const assignmentTableId = isTest
    ? process.env.FEISHU_ASSIGNED_TESTS_TABLE_ID || process.env.ASSIGNED_TESTS
    : process.env.FEISHU_ASSIGNED_FORMS_TABLE_ID || process.env.ASSIGNED_FORMS;

  if (!tableId) {
    throw new ConfigError(
      isTest
        ? "Missing FEISHU_TEST_RESULTS_TABLE_ID"
        : "Missing FEISHU_FORM_RESPONSES_TABLE_ID"
    );
  }

  const token = await getTenantToken();
  const tableFields = await getSubmitTableFields(tableId, token);
  const createdRecords: string[] = [];
  const metricsCreated: string[] = [];
  const metricWarnings: string[] = [];
  const metricTableId =
    process.env.FEISHU_ATHLETE_METRICS_TABLE_ID || process.env.ATHLETE_METRICS;
  const testItemsTableId =
    process.env.FEISHU_TEST_ITEMS_TABLE_ID || process.env.TEST_ITEMS;
  let metricTableFields: TableField[] = [];
  let testItemMetrics = new Map<string, any>();

  if (isTest && testItemsTableId) {
    const testItemRecords = await getRecordsRaw(testItemsTableId, token);
    testItemMetrics = new Map(
      testItemRecords.map((item) => {
        const fields = item.fields || {};
        const testItemId = readField(fields, [
          "Test Item ID",
          "testItemId",
          "Item ID",
          "Question ID",
        ]);

        return [
          testItemId,
          {
            createsMetric: readBooleanField(fields, [
              "Creates Metric",
              "Create Metric",
              "Metric Enabled",
            ]),
            metricType: readField(fields, ["Metric Type", "metricType", "Metric"]),
            metricName: readField(fields, ["Metric Name", "metricName"]),
            metricUnit: readField(fields, ["Metric Unit", "metricUnit"]),
            calculationMethod: readField(fields, [
              "Calculation Method",
              "Calculation",
              "Formula",
            ]),
            inputUnit: readField(fields, ["Input Unit", "Input Format"]),
            testName: readField(fields, ["Test Name", "testName", "Name", "Test"]),
          },
        ];
      })
    );
  }

  if (isTest && metricTableId) {
    metricTableFields = await getSubmitTableFields(metricTableId, token);
  }

  const clientComment = String(
    responses.find(
      (responseItem: any) =>
        responseItem?.questionId === "__client_comment" ||
        responseItem?.itemId === "__client_comment" ||
        String(responseItem?.label || "").toLowerCase() === "client comment"
    )?.value || ""
  );

  if (!isTest && hasField(tableFields, ["Answers Json", "Answers JSON", "Answers"])) {
    const responseId = `FR-${Date.now()}`;
    const { fields, missingRequired } = buildFields(tableFields, [
      {
        aliases: ["Form Response ID", "Response ID", "Result ID", "ID"],
        value: responseId,
      },
      {
        aliases: [
          "Assigned Forms ID",
          "Assigned Form ID",
          "Assignment ID",
          "Assigned ID",
        ],
        value: String(assignmentId || assignmentRecordId || ""),
      },
      {
        aliases: ["Assignment Record ID", "Record ID"],
        value: String(assignmentRecordId || ""),
      },
      {
        aliases: ["Form ID", "Template ID", "Questionnaire ID"],
        value: String(templateId),
      },
      {
        aliases: ["Client ID", "clientId"],
        value: String(clientId),
      },
      {
        aliases: ["Client Name", "clientName", "Athlete Name"],
        value: String(clientName || ""),
      },
      {
        aliases: ["Submitted At", "Submitted Date", "Date"],
        value: toLarkDate(),
      },
      {
        aliases: ["Answers Json", "Answers JSON", "Answers"],
        value: JSON.stringify(responses),
        required: true,
      },
      {
        aliases: ["Client Comment", "Athlete Notes", "Notes", "Comment"],
        value: clientComment,
      },
    ]);

    if (missingRequired.length > 0) {
      return {
        status: 400,
        body: {
          error: "Missing required response columns",
          missingRequired,
          availableFields: tableFields
            .map((field) => field.field_name || field.name)
            .filter(Boolean),
        },
      };
    }

    const data = await createRecord(tableId, fields);

    if (data.code !== 0) {
      return {
        status: 500,
        body: {
          error: "Could not submit response",
          larkResponse: data,
          fieldsSent: fields,
        },
      };
    }

    createdRecords.push(data.data.record.record_id);
  } else {
    for (const [index, responseItem] of responses.entries()) {
      const responseId = `${isTest ? "TR" : "FR"}-${Date.now()}-${index + 1}`;
      const responseValue = String(responseItem.value || "");
      const responseNotes = String(responseItem.notes || "");
      const storedNotes =
        isTest && responseValue
          ? [responseNotes, `Result input: ${responseValue}`]
              .filter(Boolean)
              .join("\n")
          : responseNotes;
      const { fields, missingRequired } = buildFields(tableFields, [
        {
          aliases: isTest
            ? ["Test Result ID", "Result ID", "Response ID", "ID"]
            : ["Form Response ID", "Response ID", "Result ID", "ID"],
          value: responseId,
        },
        {
          aliases: isTest
            ? ["Assigned Test ID", "Assignment ID", "Assigned ID"]
            : [
                "Assigned Forms ID",
                "Assigned Form ID",
                "Assignment ID",
                "Assigned ID",
              ],
          value: String(assignmentId || assignmentRecordId || ""),
        },
        {
          aliases: ["Assignment Record ID", "Record ID"],
          value: String(assignmentRecordId || ""),
        },
        {
          aliases: isTest
            ? ["Test Template ID", "Template ID", "Test ID"]
            : ["Form ID", "Template ID", "Questionnaire ID"],
          value: String(templateId),
        },
        {
          aliases: isTest
            ? ["Test Item ID", "Item ID", "Question ID"]
            : ["Question ID", "Item ID"],
          value: String(responseItem.itemId || responseItem.questionId || ""),
        },
        {
          aliases: isTest
            ? ["Test Name", "Item Name", "Question"]
            : ["Question", "Question Text", "Label"],
          value: String(responseItem.label || ""),
        },
        {
          aliases: isTest
            ? ["Value", "Result", "Answer", "Result Value"]
            : [
                "Answer",
                "Response",
                "Response Value",
                "Answer Text",
                "Question Answer",
              ],
          value: responseValue,
          required: true,
        },
        {
          aliases: ["Unit"],
          value: String(responseItem.unit || ""),
        },
        {
          aliases: [
            "Notes",
            "Note",
            "Result Notes",
            "Client Comment",
            "Athlete Notes",
          ],
          value: storedNotes,
        },
        {
          aliases: ["Client ID", "clientId"],
          value: String(clientId),
        },
        {
          aliases: ["Client Name", "clientName", "Athlete Name"],
          value: String(clientName || ""),
        },
        {
          aliases: ["Submitted At", "Submitted Date", "Date"],
          value: toLarkDate(),
        },
      ]);

      if (missingRequired.length > 0) {
        return {
          status: 400,
          body: {
            error: "Missing required response columns",
            missingRequired,
            availableFields: tableFields
              .map((field) => field.field_name || field.name)
              .filter(Boolean),
          },
        };
      }

      const data = await createRecord(tableId, fields);

      if (data.code !== 0) {
        return {
          status: 500,
          body: {
            error: "Could not submit response",
            larkResponse: data,
            fieldsSent: fields,
          },
        };
      }

      createdRecords.push(data.data.record.record_id);

      if (isTest) {
        const responseItemId = String(
          responseItem.itemId || responseItem.questionId || ""
        );
        const metricConfig = testItemMetrics.get(responseItemId);

        if (metricConfig?.createsMetric) {
          if (!metricTableId || metricTableFields.length === 0) {
            metricWarnings.push(
              `Metric not created for ${responseItem.label || responseItemId}: missing Athlete Metrics table`
            );
          } else {
            const metricKind = deriveMetricKind(metricConfig.calculationMethod);
            const metricBaseName =
              metricConfig.testName || responseItem.label || "Test";
            const metricName =
              metricConfig.metricName ||
              (metricKind
                ? `${metricBaseName} — ${metricKind}`
                : `${metricBaseName} Metric`);
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

              const skippedFields = buildFields(tableFields, [
                { aliases: ["Creates Metric"], value: true },
                { aliases: ["Metric Created"], value: false },
                { aliases: ["Metric Status"], value: "Skipped" },
              ]).fields;
              if (Object.keys(skippedFields).length > 0) {
                await updateRecord(tableId, data.data.record.record_id, skippedFields);
              }
            } else {
              const metricId = `AM-${Date.now()}-${index + 1}`;
              const { fields: metricFields } = buildFields(metricTableFields, [
                { aliases: ["Metric ID", "metricId", "ID"], value: metricId },
                { aliases: ["Client ID", "clientId"], value: String(clientId) },
                {
                  aliases: ["Client Name", "clientName", "Athlete Name"],
                  value: String(clientName || ""),
                },
                {
                  aliases: ["Metric Type", "metricType", "Type"],
                  value: String(metricConfig.metricType || responseItem.metricType || ""),
                },
                {
                  aliases: ["Metric Name", "metricName", "Name"],
                  value: String(metricName),
                },
                {
                  // Sent as a string so it works whether the Feishu column is
                  // Text or Number — coerceFieldValue converts to number when
                  // the field is numeric. (Live "Metric Value" is a text field.)
                  aliases: ["Metric Value", "metricValue", "Value"],
                  value: String(calculatedValue),
                },
                {
                  aliases: ["Metric Unit", "metricUnit", "Unit"],
                  value: String(metricUnit),
                },
                {
                  aliases: ["Source Type", "sourceType"],
                  value: "Physical Test",
                },
                {
                  aliases: ["Source Record ID", "sourceRecordId"],
                  value: data.data.record.record_id,
                },
                {
                  aliases: ["Source Test ID", "sourceTestId", "Test Item ID"],
                  value: responseItemId,
                },
                {
                  aliases: ["Source Test Name", "sourceTestName", "Test Name"],
                  value: String(responseItem.label || metricConfig.testName || ""),
                },
                {
                  aliases: ["Calculation Method", "calculationMethod", "Formula"],
                  value: String(metricConfig.calculationMethod || "Direct Value"),
                },
                {
                  aliases: ["Measured At", "Measured Date", "Date", "Valid From"],
                  value: toLarkDate(),
                },
                { aliases: ["Status", "status"], value: "Active" },
                {
                  aliases: ["Notes", "notes"],
                  value: String(responseItem.notes || ""),
                },
              ]);

              const metricData = await createRecord(metricTableId, metricFields);

              if (metricData.code === 0) {
                metricsCreated.push(metricData.data.record.record_id);

                const resultMetricFields = buildFields(tableFields, [
                  { aliases: ["Creates Metric"], value: true },
                  { aliases: ["Metric Created"], value: true },
                  {
                    aliases: ["Calculated Metric Value", "Metric Value"],
                    value: String(calculatedValue),
                  },
                  {
                    aliases: ["Calculated Metric Unit", "Metric Unit"],
                    value: String(metricUnit),
                  },
                  { aliases: ["Metric Status"], value: "Created" },
                ]).fields;
                if (Object.keys(resultMetricFields).length > 0) {
                  await updateRecord(
                    tableId,
                    data.data.record.record_id,
                    resultMetricFields
                  );
                }
              } else {
                metricWarnings.push(
                  `Could not create ${metricName}: ${JSON.stringify(metricData)}`
                );
              }
            }
          }
        }
      }
    }
  }

  let assignmentUpdate: any = null;

  if (assignmentTableId && assignmentRecordId) {
    const assignmentTableFields = await getSubmitTableFields(assignmentTableId, token);
    const completionFields = buildCompletionFields(assignmentTableFields);

    if (Object.keys(completionFields).length > 0) {
      assignmentUpdate = await updateRecord(
        assignmentTableId,
        String(assignmentRecordId),
        completionFields
      );
    }
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
