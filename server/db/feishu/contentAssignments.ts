// Feishu impl for the contentAssignments domain. Logic moved verbatim from
// api/assignContent.ts, api/updateContentAssignmentDate.ts and the read side of
// api/contentAssignments.ts; token fetch / pagination / record writes go
// through the shared client helpers.
import {
  getTenantToken,
  appToken,
  listRecords,
  createRecord,
  updateRecord,
} from "./client.ts";
import { ConfigError } from "../errors.ts";
import type {
  AssignContentInput,
  AssignContentResult,
  ContentAssignmentDTO,
  UpdateAssignmentDateInput,
  UpdateAssignmentDateResult,
} from "../repositories/contentAssignments.ts";

type TableField = {
  field_name?: string;
  name?: string;
  type?: number;
  ui_type?: string;
};

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toLarkDate(value?: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  const [year, month, day] = value.split("-").map(Number);
  if (year && month && day) {
    return new Date(year, month - 1, day).getTime();
  }
  return new Date(value).getTime();
}

function isLinkField(field?: TableField) {
  const uiType = String(field?.ui_type || "").toLowerCase();

  return (
    field?.type === 21 ||
    uiType.includes("duplex") ||
    uiType.includes("link") ||
    uiType.includes("relation")
  );
}

function resolveField(fields: TableField[], aliases: string[]) {
  const names = fields
    .map((field) => field.field_name || field.name)
    .filter(Boolean) as string[];
  const exact = aliases.find((alias) => names.includes(alias));

  if (exact) {
    return fields.find((field) => (field.field_name || field.name) === exact);
  }

  const normalizedAliases = aliases.map(normalizeFieldName);

  return fields.find((field) => {
    const name = field.field_name || field.name || "";
    return normalizedAliases.includes(normalizeFieldName(name));
  });
}

function resolveFields(fields: TableField[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeFieldName);
  const seen = new Set<string>();

  return fields.filter((field) => {
    const name = field.field_name || field.name || "";
    const matches =
      aliases.includes(name) || normalizedAliases.includes(normalizeFieldName(name));

    if (!matches || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

function isDateField(field?: TableField) {
  const uiType = String(field?.ui_type || "").toLowerCase();
  return field?.type === 5 || uiType.includes("date");
}

function isAuditDateField(field?: TableField) {
  const name = normalizeFieldName(field?.field_name || field?.name || "");
  return (
    name.includes("created") ||
    name.includes("updated") ||
    name.includes("modified")
  );
}

function buildFields(
  tableFields: TableField[],
  specs: {
    aliases: string[];
    value: any;
    linkValue?: any;
    required?: boolean;
  }[]
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

    fields[fieldName] = isLinkField(field) && spec.linkValue ? spec.linkValue : spec.value;
  }

  return { fields, missingRequired };
}

const scheduledDateAliases = [
  "Assigned Date",
  "Due Date",
  "Due date",
  "dueDate",
  "Due",
  "Deadline",
  "Scheduled Date",
  "Schedule Date",
  "Assignment Date",
  "assignedDate",
  "Date Assigned",
  "Assigned For",
  "Start Date",
  "Target Date",
  "Date",
];

function resolveScheduledDateFields(fields: TableField[]) {
  const byName = resolveFields(fields, scheduledDateAliases);
  const seen = new Set(
    byName.map((field) => field.field_name || field.name).filter(Boolean)
  );
  const byType = fields.filter((field) => {
    const fieldName = field.field_name || field.name || "";
    return isDateField(field) && !isAuditDateField(field) && !seen.has(fieldName);
  });

  return [...byName, ...byType];
}

// The shared client only exposes field NAMES; the assignment logic needs full
// field objects (type/ui_type) to spot link + date columns, so this stays a
// raw fetch. errorPrefix preserves each old handler's exact error message.
async function getTableFields(tableId: string, errorPrefix: string) {
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
    throw new Error(`${errorPrefix}: ${JSON.stringify(data)}`);
  }

  return (data.data.items || []) as TableField[];
}

/* ----------------------------- assignContent ----------------------------- */

export async function assignContent(
  input: AssignContentInput
): Promise<AssignContentResult> {
  const {
    assignmentType,
    templateId,
    templateName,
    clientId,
    clientCode,
    clientName,
    assignedDate,
    dueDate,
  } = input;

  // Token first (verbatim old-handler order): a broken Feishu credential
  // surfaces as a server error even when a table id is also missing.
  await getTenantToken();
  const isTest = String(assignmentType).toLowerCase().includes("test");
  const assignedTestsTableId =
    process.env.FEISHU_ASSIGNED_TESTS_TABLE_ID || process.env.ASSIGNED_TESTS;
  const assignedFormsTableId =
    process.env.FEISHU_ASSIGNED_FORMS_TABLE_ID || process.env.ASSIGNED_FORMS;

  if (isTest && !assignedTestsTableId) {
    throw new ConfigError("Missing FEISHU_ASSIGNED_TESTS_TABLE_ID");
  }

  if (!isTest && !assignedFormsTableId) {
    throw new ConfigError("Missing FEISHU_ASSIGNED_FORMS_TABLE_ID");
  }

  const tableId = isTest
    ? (assignedTestsTableId as string)
    : (assignedFormsTableId as string);
  const tableFields = await getTableFields(
    tableId,
    "Could not fetch assignment table fields"
  );
  const assignmentId = `${isTest ? "AT" : "AF"}-${Date.now()}`;
  const { fields } = buildFields(tableFields, [
    {
      aliases: isTest
        ? [
            "Assigned Test ID",
            "Assigned Test Id",
            "assignedTestId",
            "Assignment ID",
            "Assignment Id",
            "Assigned ID",
            "Assigned Id",
            "ID",
          ]
        : [
            "Assigned Form ID",
            "Assigned Form Id",
            "assignedFormId",
            "Assignment ID",
            "Assignment Id",
            "Assigned ID",
            "Assigned Id",
            "ID",
          ],
      value: assignmentId,
    },
    {
      aliases: isTest
        ? [
            "Test Template ID",
            "Test Template Id",
            "testTemplateId",
            "Template ID",
            "Template Id",
            "Test ID",
            "Test Id",
            "Physical Test ID",
            "Physical Test Id",
            "Saved Test ID",
            "Saved Test Id",
            "Saved Item ID",
            "Saved Item Id",
            "Content ID",
            "Content Id",
          ]
        : [
            "Form ID",
            "Form Id",
            "formId",
            "Template ID",
            "Template Id",
            "Questionnaire ID",
            "Questionnaire Id",
            "Form Template ID",
            "Form Template Id",
            "Questionnaire Template ID",
            "Questionnaire Template Id",
            "Saved Form ID",
            "Saved Form Id",
            "Saved Questionnaire ID",
            "Saved Questionnaire Id",
            "Saved Item ID",
            "Saved Item Id",
            "Content ID",
            "Content Id",
          ],
      value: String(templateId),
    },
    {
      aliases: [
        "Assignment Type",
        "Type",
        "Content Type",
        "Item Type",
        "Assigned Type",
      ],
      value: String(assignmentType),
    },
    {
      aliases: isTest
        ? [
            "Saved Test",
            "Physical Test",
            "Test",
            "Test Name",
            "Template",
            "Template Name",
            "Saved Item",
            "Assignment Name",
            "Name",
          ]
        : [
            "Saved Form",
            "Saved Questionnaire",
            "Questionnaire",
            "Form",
            "Form Name",
            "Template",
            "Template Name",
            "Saved Item",
            "Assignment Name",
            "Name",
          ],
      value: String(templateName || templateId),
    },
    {
      aliases: [
        "Client",
        "Client ID",
        "Client Id",
        "clientId",
        "Client Record ID",
        "Client Record Id",
      ],
      value: String(clientId),
      linkValue: [String(clientId)],
    },
    {
      aliases: ["Client Code", "clientCode", "Athlete Code", "Athlete ID"],
      value: String(clientCode || ""),
    },
    {
      aliases: [
        "Client Name",
        "clientName",
        "Athlete",
        "Athlete Name",
        "Member",
        "Member Name",
      ],
      value: String(clientName || ""),
    },
    {
      aliases: ["Created At", "Created Date", "Assigned At"],
      value: toLarkDate(assignedDate),
    },
    {
      aliases: scheduledDateAliases,
      value: toLarkDate(dueDate),
    },
    {
      aliases: ["Status", "status"],
      value: "Assigned",
    },
  ]);

  const scheduledDateValue = toLarkDate(dueDate);

  resolveScheduledDateFields(tableFields).forEach((field) => {
    const fieldName = field.field_name || field.name;
    if (fieldName) fields[fieldName] = scheduledDateValue;
  });

  if (Object.keys(fields).length === 0) {
    return {
      success: false,
      kind: "no-columns",
      availableFields: tableFields
        .map((field) => field.field_name || field.name)
        .filter(Boolean) as string[],
    };
  }

  const data = await createRecord(tableId, fields);

  if (data.code !== 0) {
    return {
      success: false,
      kind: "create-failed",
      larkResponse: data,
      fieldsSent: fields,
    };
  }

  return {
    success: true,
    recordId: data.data.record.record_id,
    larkResponse: data,
  };
}

/* ---------------------- updateContentAssignmentDate ---------------------- */

export async function updateContentAssignmentDate(
  input: UpdateAssignmentDateInput
): Promise<UpdateAssignmentDateResult> {
  const { assignmentType, recordId, scheduledDate } = input;

  const isTest = String(assignmentType).toLowerCase().includes("test");
  const tableId = isTest
    ? process.env.FEISHU_ASSIGNED_TESTS_TABLE_ID || process.env.ASSIGNED_TESTS
    : process.env.FEISHU_ASSIGNED_FORMS_TABLE_ID || process.env.ASSIGNED_FORMS;

  if (!tableId) {
    throw new ConfigError(
      isTest
        ? "Missing FEISHU_ASSIGNED_TESTS_TABLE_ID"
        : "Missing FEISHU_ASSIGNED_FORMS_TABLE_ID"
    );
  }

  const tableFields = await getTableFields(tableId, "Could not fetch assignment fields");
  const dueDateFields = resolveScheduledDateFields(tableFields);
  const fieldNames = dueDateFields
    .map((field) => field.field_name || field.name)
    .filter(Boolean) as string[];

  if (fieldNames.length === 0) {
    return {
      success: false,
      kind: "no-date-column",
      availableFields: tableFields
        .map((field) => field.field_name || field.name)
        .filter(Boolean) as string[],
    };
  }

  const updatedFields: string[] = [];
  const failedFields: { fieldName: string; response: any }[] = [];

  for (const fieldName of fieldNames) {
    let data = await updateRecord(tableId, recordId, {
      [fieldName]: toLarkDate(scheduledDate),
    });

    if (data.code !== 0) {
      data = await updateRecord(tableId, recordId, {
        [fieldName]: String(scheduledDate),
      });
    }

    if (data.code === 0) {
      updatedFields.push(fieldName);
    } else {
      failedFields.push({ fieldName, response: data });
    }
  }

  if (updatedFields.length === 0) {
    return {
      success: false,
      kind: "update-failed",
      attemptedFields: fieldNames,
      failedFields,
    };
  }

  return { success: true, updatedFields, failedFields };
}

/* -------------------------- listContentAssignments ------------------------ */

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
  if (value?.value) return fieldToText(value.value);
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

function readFirstAvailableField(fields: Record<string, any>, fieldNames: string[]) {
  for (const fieldName of fieldNames) {
    if (Object.prototype.hasOwnProperty.call(fields, fieldName)) {
      return fieldToText(fields[fieldName]);
    }
  }

  return "";
}

function buildTemplateNameMap(
  records: any[],
  idAliases: string[],
  nameAliases: string[]
) {
  const map = new Map<string, string>();

  for (const record of records) {
    const fields = record.fields || {};
    const name = readField(fields, nameAliases);
    const templateId = readField(fields, idAliases);

    if (name) {
      map.set(record.record_id, name);
      if (templateId) map.set(templateId, name);
    }
  }

  return map;
}

function normalizeDate(value: string) {
  if (!value) return "";
  if (/^\d+$/.test(value)) {
    const date = new Date(Number(value));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return value.split("T")[0].split(" ")[0];
}

function getScheduledDateFieldNames(tableFields: TableField[]) {
  const normalizedAliases = scheduledDateAliases.map(normalizeFieldName);
  const names = tableFields
    .filter((field) => {
      const name = field.field_name || field.name || "";
      return (
        scheduledDateAliases.includes(name) ||
        normalizedAliases.includes(normalizeFieldName(name)) ||
        (isDateField(field) && !isAuditDateField(field))
      );
    })
    .map((field) => field.field_name || field.name)
    .filter(Boolean) as string[];

  return Array.from(new Set(names));
}

function mapAssignment(
  item: any,
  fallbackType: "Questionnaire" | "Physical Test",
  tableFields: TableField[],
  templateNameMap = new Map<string, string>()
): ContentAssignmentDTO {
  const fields = item.fields || {};
  const assignedDate = normalizeDate(
    readField(fields, ["Created At", "Created Date", "Assigned At"])
  );
  const dueDate = normalizeDate(
    readField(fields, scheduledDateAliases) ||
      readFirstAvailableField(fields, getScheduledDateFieldNames(tableFields))
  );

  const templateId = readField(fields, [
    "Form ID",
    "Test Template ID",
    "Template ID",
    "Questionnaire ID",
    "Saved Item ID",
    "Content ID",
  ]);
  const templateName = readField(fields, [
    "Saved Questionnaire",
    "Saved Form",
    "Saved Test",
    "Questionnaire",
    "Form",
    "Physical Test",
    "Test",
    "Template Name",
    "Assignment Name",
    "Name",
  ]);

  return {
    recordId: item.record_id,
    assignmentId:
      readField(fields, [
        "Assigned Form ID",
        "Assigned Test ID",
        "Assignment ID",
        "Assigned ID",
        "ID",
      ]) || item.record_id,
    assignmentType:
      readField(fields, ["Assignment Type", "Type", "Content Type", "Item Type"]) ||
      fallbackType,
    templateId,
    templateName: templateName || templateNameMap.get(templateId) || "",
    clientId: readField(fields, [
      "Client",
      "Client ID",
      "Client Record ID",
      "clientId",
    ]),
    clientCode: readField(fields, ["Client Code", "clientCode", "Athlete Code"]),
    clientName: readField(fields, [
      "Client Name",
      "clientName",
      "Athlete",
      "Athlete Name",
      "Member Name",
    ]),
    assignedDate,
    dueDate,
    status: readField(fields, ["Status", "status"]) || "Assigned",
  };
}

export async function listContentAssignments(): Promise<ContentAssignmentDTO[]> {
  const assignedFormsTableId =
    process.env.FEISHU_ASSIGNED_FORMS_TABLE_ID || process.env.ASSIGNED_FORMS;
  const assignedTestsTableId =
    process.env.FEISHU_ASSIGNED_TESTS_TABLE_ID || process.env.ASSIGNED_TESTS;
  const formTemplatesTableId =
    process.env.FEISHU_FORM_TEMPLATES_TABLE_ID || process.env.FORM_TEMPLATES;
  const testTemplatesTableId =
    process.env.FEISHU_TEST_TEMPLATES_TABLE_ID || process.env.TEST_TEMPLATES;

  if (!assignedFormsTableId && !assignedTestsTableId) {
    throw new ConfigError("Missing assignment table IDs");
  }

  const [formTemplateRecords, testTemplateRecords] = await Promise.all([
    formTemplatesTableId ? listRecords(formTemplatesTableId) : Promise.resolve([]),
    testTemplatesTableId ? listRecords(testTemplatesTableId) : Promise.resolve([]),
  ]);
  const formTemplateNameMap = buildTemplateNameMap(
    formTemplateRecords,
    ["formId", "Form ID", "Template ID"],
    ["name", "Name", "Form Name", "Template Name", "Title"]
  );
  const testTemplateNameMap = buildTemplateNameMap(
    testTemplateRecords,
    ["testTemplateId", "Test Template ID", "Template ID"],
    ["name", "Name", "Test Template Name", "Template Name", "Title"]
  );
  const records = await Promise.all([
    assignedFormsTableId
      ? Promise.all([
          listRecords(assignedFormsTableId),
          getTableFields(assignedFormsTableId, "Could not fetch assignment fields"),
        ]).then(([items, tableFields]) =>
          items.map((item: any) =>
            mapAssignment(item, "Questionnaire", tableFields, formTemplateNameMap)
          )
        )
      : Promise.resolve([]),
    assignedTestsTableId
      ? Promise.all([
          listRecords(assignedTestsTableId),
          getTableFields(assignedTestsTableId, "Could not fetch assignment fields"),
        ]).then(([items, tableFields]) =>
          items.map((item: any) =>
            mapAssignment(item, "Physical Test", tableFields, testTemplateNameMap)
          )
        )
      : Promise.resolve([]),
  ]);

  return records.flat();
}
