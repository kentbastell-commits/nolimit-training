import type { VercelRequest, VercelResponse } from "@vercel/node";

type TableField = {
  field_name?: string;
  name?: string;
};

type FeishuRecord = {
  record_id: string;
  fields?: Record<string, any>;
};

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

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
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");

  return JSON.stringify(value);
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

    fields[fieldName] = spec.value;
  }

  return { fields, missingRequired };
}

async function getTenantToken() {
  const response = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET,
      }),
    }
  );
  const data = await response.json();

  if (!data.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(data)}`);
  }

  return data.tenant_access_token;
}

async function getTableFields(tableId: string, token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/fields?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`Could not fetch response table fields: ${JSON.stringify(data)}`);
  }

  return (data.data.items || []) as TableField[];
}

async function getRecords(tableId: string, token: string) {
  const records: FeishuRecord[] = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records`
    );
    url.searchParams.set("page_size", "500");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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

async function createRecord(tableId: string, token: string, fields: Record<string, any>) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  return response.json();
}

function parseNumbers(value: string) {
  return (String(value).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
}

function parseDurationSeconds(value: string) {
  const text = String(value || "").trim();
  const timeMatch = text.match(/(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.\d+)?/);
  if (timeMatch) {
    const hours = Number(timeMatch[1] || 0);
    const minutes = Number(timeMatch[2] || 0);
    const seconds = Number(timeMatch[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
  }

  const minuteMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:min|minute|minutes|分钟)/i);
  const secondMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:sec|second|seconds|秒|s)/i);
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  const seconds = secondMatch ? Number(secondMatch[1]) : 0;
  if (minutes || seconds) return minutes * 60 + seconds;

  const numeric = Number(text);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function calculateMetric(params: {
  value: string;
  notes?: string;
  label?: string;
  method?: string;
  metricUnit?: string;
}) {
  const sourceText = [params.value, params.notes, params.label].filter(Boolean).join(" ");
  const method = String(params.method || "Direct Value").toLowerCase();
  const numbers = parseNumbers(sourceText);

  if (method.includes("epley") || method.includes("brzycki")) {
    const weight = numbers[0];
    const reps =
      numbers[1] ||
      Number(String(params.label || "").match(/(\d+)\s*rm/i)?.[1] || "") ||
      1;
    if (!weight || !reps) return null;

    if (method.includes("brzycki")) {
      return Math.round((weight * (36 / (37 - reps))) * 10) / 10;
    }

    return Math.round((weight * (1 + reps / 30)) * 10) / 10;
  }

  if (
    method.includes("2km") ||
    method.includes("aerobic speed") ||
    method.includes("mas")
  ) {
    const seconds = parseDurationSeconds(sourceText);
    if (!seconds) return null;

    const speedMetersPerSecond = 2000 / seconds;
    const unit = String(params.metricUnit || "").toLowerCase();
    const value = unit.includes("m/s")
      ? speedMetersPerSecond
      : speedMetersPerSecond * 3.6;
    return Math.round(value * 100) / 100;
  }

  const direct = numbers[0];
  return Number.isFinite(direct) ? direct : null;
}

async function updateRecord(tableId: string, token: string, recordId: string, fields: Record<string, any>) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records/${recordId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  return response.json();
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      assignmentType,
      assignmentId,
      assignmentRecordId,
      templateId,
      clientId,
      clientName,
      responses,
    } = req.body || {};

    if (!assignmentType || !templateId || !clientId || !Array.isArray(responses)) {
      return res.status(400).json({
        error: "Missing assignmentType, templateId, clientId, or responses",
      });
    }

    const isTest = String(assignmentType).toLowerCase().includes("test");
    const tableId = isTest
      ? process.env.FEISHU_TEST_RESULTS_TABLE_ID || process.env.TEST_RESULTS
      : process.env.FEISHU_FORM_RESPONSES_TABLE_ID || process.env.FORM_RESPONSES;
    const assignmentTableId = isTest
      ? process.env.FEISHU_ASSIGNED_TESTS_TABLE_ID || process.env.ASSIGNED_TESTS
      : process.env.FEISHU_ASSIGNED_FORMS_TABLE_ID || process.env.ASSIGNED_FORMS;

    if (!tableId) {
      return res.status(500).json({
        error: isTest
          ? "Missing FEISHU_TEST_RESULTS_TABLE_ID"
          : "Missing FEISHU_FORM_RESPONSES_TABLE_ID",
      });
    }

    const token = await getTenantToken();
    const tableFields = await getTableFields(tableId, token);
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
      const testItemRecords = await getRecords(testItemsTableId, token);
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
      metricTableFields = await getTableFields(metricTableId, token);
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
        return res.status(400).json({
          error: "Missing required response columns",
          missingRequired,
          availableFields: tableFields
            .map((field) => field.field_name || field.name)
            .filter(Boolean),
        });
      }

      const data = await createRecord(tableId, token, fields);

      if (data.code !== 0) {
        return res.status(500).json({
          error: "Could not submit response",
          larkResponse: data,
          fieldsSent: fields,
        });
      }

      createdRecords.push(data.data.record.record_id);
    } else {

      for (const [index, responseItem] of responses.entries()) {
        const responseId = `${isTest ? "TR" : "FR"}-${Date.now()}-${index + 1}`;
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
          value: String(responseItem.value || ""),
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
          value: String(responseItem.notes || ""),
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
        return res.status(400).json({
          error: "Missing required response columns",
          missingRequired,
          availableFields: tableFields
            .map((field) => field.field_name || field.name)
            .filter(Boolean),
        });
      }

      const data = await createRecord(tableId, token, fields);

      if (data.code !== 0) {
        return res.status(500).json({
          error: "Could not submit response",
          larkResponse: data,
          fieldsSent: fields,
        });
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
            const metricName =
              metricConfig.metricName ||
              `${metricConfig.testName || responseItem.label || "Test"} Metric`;
            const metricUnit = metricConfig.metricUnit || responseItem.unit || "";
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
                await updateRecord(
                  tableId,
                  token,
                  data.data.record.record_id,
                  skippedFields
                );
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
                  aliases: ["Metric Value", "metricValue", "Value"],
                  value: Number(calculatedValue),
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
                { aliases: ["Measured At", "Measured Date", "Date"], value: toLarkDate() },
                { aliases: ["Status", "status"], value: "Active" },
                {
                  aliases: ["Notes", "notes"],
                  value: String(responseItem.notes || ""),
                },
              ]);

              const metricData = await createRecord(metricTableId, token, metricFields);

              if (metricData.code === 0) {
                metricsCreated.push(metricData.data.record.record_id);

                const resultMetricFields = buildFields(tableFields, [
                  { aliases: ["Creates Metric"], value: true },
                  { aliases: ["Metric Created"], value: true },
                  {
                    aliases: ["Calculated Metric Value", "Metric Value"],
                    value: Number(calculatedValue),
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
                    token,
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
      const assignmentTableFields = await getTableFields(assignmentTableId, token);
      const completionFields = buildCompletionFields(assignmentTableFields);

      if (Object.keys(completionFields).length > 0) {
        assignmentUpdate = await updateRecord(
          assignmentTableId,
          token,
          String(assignmentRecordId),
          completionFields
        );
      }
    }

    return res.status(200).json({
      success: true,
      recordsCreated: createdRecords.length,
      metricsCreated: metricsCreated.length,
      metricWarnings,
      assignmentUpdate,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
