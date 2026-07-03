import type { VercelRequest, VercelResponse } from "@vercel/node";
import { invalidateCache } from "./_cache.ts";
import { notifyCoach } from "./_notify.ts";

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

  return "";
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

  if (method.includes("pace") || method.includes("min/km")) {
    const seconds = parseDurationSeconds(sourceText);
    if (!seconds) return null;

    // Distance in km: explicit "Xkm" / "X m", else assume the 2km test.
    const kmMatch = sourceText.match(/(\d+(?:\.\d+)?)\s*km/i);
    const mMatch = sourceText.match(/(\d+(?:\.\d+)?)\s*m(?![a-z/])/i);
    const distanceKm = kmMatch
      ? Number(kmMatch[1])
      : mMatch
        ? Number(mMatch[1]) / 1000
        : 2;
    if (!distanceKm) return null;

    const minutesPerKm = seconds / 60 / distanceKm;
    return Math.round(minutesPerKm * 100) / 100;
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

  if (method.includes("lactate") || method.includes("threshold")) {
    // Threshold pace -> speed in km/h.
    const seconds = parseDurationSeconds(sourceText);
    const kmMatch = sourceText.match(/(\d+(?:\.\d+)?)\s*km/i);
    const mMatch = sourceText.match(/(\d+(?:\.\d+)?)\s*m(?![a-z/])/i);
    const distanceKm = kmMatch
      ? Number(kmMatch[1])
      : mMatch
        ? Number(mMatch[1]) / 1000
        : NaN;
    // A time-trial (distance + time) -> average speed.
    if (seconds && Number.isFinite(distanceKm) && distanceKm > 0) {
      return Math.round((distanceKm / (seconds / 3600)) * 100) / 100;
    }
    // A pace entered as m:ss (per km) -> speed.
    if (seconds) {
      return Math.round((3600 / seconds) * 100) / 100;
    }
    // A direct speed value.
    const directSpeed = numbers[0];
    return Number.isFinite(directSpeed) ? directSpeed : null;
  }

  // VO2max — Cooper 12-min run (distance m) or Yo-Yo IR1 (distance m).
  if (
    method.includes("vo2") ||
    method.includes("cooper") ||
    method.includes("yo-yo") ||
    method.includes("yoyo")
  ) {
    const dist = numbers[0]; // metres covered
    if (!dist) return null;
    const vo2 =
      method.includes("yo") || method.includes("yoyo")
        ? dist * 0.0084 + 36.4 // Bangsbo Yo-Yo IR1
        : (dist - 504.9) / 44.73; // Cooper 12-min
    return Math.round(vo2 * 10) / 10;
  }

  // Peak power from a countermovement jump (Sayers): jump height (cm) + body
  // mass (kg). Enter as "<height> <mass>" (value + notes).
  if (
    method.includes("peak power") ||
    method.includes("sayers") ||
    method.includes("cmj")
  ) {
    const heightCm = numbers[0];
    const massKg = numbers[1];
    if (!heightCm || !massKg) return null;
    return Math.round(60.7 * heightCm + 45.3 * massKg - 2055);
  }

  // Reactive Strength Index = jump height (m) ÷ ground-contact time (s). Enter
  // "<jump cm> <contact s|ms>"; contact >10 is treated as milliseconds.
  if (method.includes("reactive strength") || method.includes("rsi")) {
    const heightCm = numbers[0];
    let contact = numbers[1];
    if (!heightCm || !contact) return null;
    if (contact > 10) contact = contact / 1000;
    return Math.round((heightCm / 100 / contact) * 100) / 100;
  }

  // Relative strength = load ÷ body mass (× bodyweight). Enter "<load> <mass>".
  if (
    method.includes("relative strength") ||
    method.includes("per bodyweight") ||
    method.includes("/bw")
  ) {
    const load = numbers[0];
    const mass = numbers[1];
    if (!load || !mass) return null;
    return Math.round((load / mass) * 100) / 100;
  }

  // Sprint velocity = distance (m) ÷ time (s) → m/s. Distance comes from the
  // test label (e.g. "40m Sprint"); time is the entered value.
  if (method.includes("sprint") || method.includes("velocity")) {
    const seconds = Number(params.value) || parseDurationSeconds(sourceText);
    const mMatch = sourceText.match(/(\d+(?:\.\d+)?)\s*m(?![a-z/])/i);
    const distance = mMatch ? Number(mMatch[1]) : numbers.find((n) => n >= 5);
    if (!seconds || !distance) return null;
    return Math.round((distance / seconds) * 100) / 100;
  }

  // VIFT — final velocity of the 30-15 IFT, entered directly (km/h). Drives
  // interval-speed prescription, like MAS.
  if (
    method.includes("vift") ||
    method.includes("30-15") ||
    method.includes("ift")
  ) {
    const v = numbers[0];
    return Number.isFinite(v) ? v : null;
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
            // Name the metric after its calculation so downstream features
            // (dashboard 1RM card, auto-prescription resolver) can recognize
            // it by name. The Athlete Metrics table has no calc-method column.
            const methodLower = String(
              metricConfig.calculationMethod || ""
            ).toLowerCase();
            const metricKind =
              methodLower.includes("epley") || methodLower.includes("brzycki")
                ? "Predicted 1RM"
                : methodLower.includes("pace") || methodLower.includes("min/km")
                  ? "Pace"
                  : methodLower.includes("aerobic") ||
                      methodLower.includes("mas") ||
                      methodLower.includes("2km")
                    ? "MAS"
                    : methodLower.includes("lactate") ||
                        methodLower.includes("threshold")
                      ? "LT Pace"
                      : methodLower.includes("vo2") ||
                          methodLower.includes("cooper") ||
                          methodLower.includes("yo")
                        ? "VO2max"
                        : methodLower.includes("power") ||
                            methodLower.includes("sayers") ||
                            methodLower.includes("cmj")
                          ? "Peak Power"
                          : methodLower.includes("rsi") ||
                              methodLower.includes("reactive")
                            ? "RSI"
                            : methodLower.includes("relative") ||
                                methodLower.includes("bodyweight") ||
                                methodLower.includes("/bw")
                              ? "Relative Strength"
                              : methodLower.includes("vift") ||
                                  methodLower.includes("30-15") ||
                                  methodLower.includes("ift")
                                ? "VIFT"
                                : methodLower.includes("sprint") ||
                                    methodLower.includes("velocity")
                                  ? "Velocity"
                                  : "";
            const metricBaseName =
              metricConfig.testName || responseItem.label || "Test";
            const metricName =
              metricConfig.metricName ||
              (metricKind
                ? `${metricBaseName} — ${metricKind}`
                : `${metricBaseName} Metric`);
            // MAS is a speed, so its unit is km/h (or m/s if configured) —
            // not the test's input distance unit (e.g. "m"). 1RM keeps the
            // input weight unit (kg in -> kg out).
            // MAS unit is driven by the chosen method ("... (m/s)") or an
            // explicit metric/input unit; defaults to km/h. (The Test Items
            // table has no Metric Unit column, so the method name is the
            // reliable signal.)
            const wantsMetersPerSecond =
              methodLower.includes("m/s") ||
              String(metricConfig.metricUnit || metricConfig.inputUnit || "")
                .toLowerCase()
                .includes("m/s");
            const metricUnit =
              metricKind === "MAS" ||
              metricKind === "LT Pace" ||
              metricKind === "VIFT"
                ? wantsMetersPerSecond
                  ? "m/s"
                  : "km/h"
                : metricKind === "Pace"
                  ? "min/km"
                  : metricKind === "VO2max"
                    ? "ml/kg/min"
                    : metricKind === "Peak Power"
                      ? "W"
                      : metricKind === "Velocity"
                        ? "m/s"
                        : metricKind === "Relative Strength"
                          ? "x BW"
                          : metricKind === "RSI"
                            ? ""
                            : metricConfig.metricUnit ||
                              responseItem.unit ||
                              "";
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

              const metricData = await createRecord(metricTableId, token, metricFields);

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

    invalidateCache("contentResponses");
    invalidateCache("athleteMetrics");
    invalidateCache("contentAssignments");

    if (String(assignmentType).toLowerCase().includes("questionnaire")) {
      void notifyCoach(
        `📋 Intake completed by ${clientName || clientId}\n` +
          `Their program will auto-load now — check the Review queue for their answers.`
      );
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
