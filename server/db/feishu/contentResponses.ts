import { listRecords } from "./client.ts";
import type { ResponseDTO } from "../dto.ts";
import { ConfigError } from "../errors.ts";

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
