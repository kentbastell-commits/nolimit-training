// Feishu impl for the check-ins domain — logic moved verbatim from the old
// api/checkIns.ts handler. "Client" is the plain-text client code; "Client ID"
// is the duplex link to the Clients table (written as [record_id], with a
// retry-without-link fallback if Feishu rejects it).
import { fetchAllBitableRecords } from "../../../api/_pagination.ts";
import {
  getTenantToken,
  appToken,
  createRecord,
  updateRecord,
  fieldText,
  formatDate,
} from "./client.ts";
import type { WriteResult } from "../dto.ts";
import type {
  CheckInDTO,
  ReviewCheckInInput,
  CreateCheckInInput,
} from "../repositories/checkIns.ts";

function tableId(): string {
  return process.env.FEISHU_CHECKINS_TABLE_ID as string;
}

// Linked record ids out of a Bitable duplex-link field.
function extractRecordIds(value: any): string[] {
  if (!value) return [];
  const out: string[] = [];
  const pushFrom = (o: any) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o.record_ids)) out.push(...o.record_ids);
    if (Array.isArray(o.link_record_ids)) out.push(...o.link_record_ids);
    if (typeof o.record_id === "string") out.push(o.record_id);
  };
  if (Array.isArray(value)) value.forEach(pushFrom);
  else pushFrom(value);
  return out;
}

function toLarkDate(value: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  // Anchor on noon UTC so the calendar date survives a round-trip regardless of
  // the server's timezone (formatDate reads it back in UTC).
  return new Date(`${value}T12:00:00Z`).getTime();
}

function toNumberOrUndefined(value: any) {
  if (value === "" || value === undefined || value === null) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

// Only send fields that actually exist on the table, so a schema that's missing
// (or renamed) a column never fails the whole write. Returns null (meaning
// "don't filter") when the field list can't be read — NOT an empty set, which
// would drop every field.
async function getTableFieldNames(token: string): Promise<Set<string> | null> {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId()}/fields?page_size=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  if (!response.ok || data.code !== 0) return null;
  return new Set(
    (data?.data?.items || [])
      .map((field: any) => field.field_name || field.name)
      .filter(Boolean)
  );
}

export async function listCheckIns(): Promise<CheckInDTO[]> {
  const token = await getTenantToken();

  const checkInItems = await fetchAllBitableRecords(appToken(), tableId(), token);

  return checkInItems.map((item: any): CheckInDTO => {
    const fields = item.fields || {};
    // "Client" is the plain-text client code; "Client ID" is the duplex
    // link to the Clients table.
    const clientCode =
      fieldText(fields["Client"]) || fieldText(fields["Client ID"]);

    return {
      recordId: item.record_id,
      checkInId: fieldText(fields["Check-in ID"]),
      clientId: clientCode,
      clientRecordIds: extractRecordIds(fields["Client ID"]),
      submittedDate: formatDate(fields["Submitted Date"]),
      bodyWeight: fieldText(fields["Body Weight"]),
      sleepHours: fieldText(fields["Sleep Hours"]),
      sleepQuality: fieldText(fields["Sleep Quality"]),
      energy: fieldText(fields.Energy),
      mood: fieldText(fields.Mood),
      stress: fieldText(fields.Stress),
      soreness: fieldText(fields.Soreness),
      readinessScore: fieldText(fields["Readiness Score"]),
      nutritionNotes: fieldText(fields["Nutrition Notes"]),
      trainingNotes: fieldText(fields["Training Notes"]),
      wins: fieldText(fields.Wins),
      problemsPain: fieldText(fields["Problems / Pain"]),
      clientNotes: fieldText(fields["Client Notes"]),
      coachResponse: fieldText(fields["Coaches Notes"]),
      coachReviewed:
        Boolean(fieldText(fields["Coaches Notes"]).trim()) ||
        fields["Coach Reviewed"] === true,
      reviewedDate: formatDate(fields["Reviewed Date"]),
      status: fieldText(fields.Status),
    };
  });
}

// Coach responding to / reviewing an existing check-in (update, not create).
export async function reviewCheckIn(input: ReviewCheckInInput): Promise<WriteResult> {
  const token = await getTenantToken();

  const available = await getTableFieldNames(token);
  const updateCandidate: Record<string, any> = {
    "Coaches Notes": input.coachResponse,
    "Coach Reviewed":
      input.coachReviewed === undefined ? true : Boolean(input.coachReviewed),
    "Reviewed Date": toLarkDate(
      input.reviewedDate || new Date().toISOString().split("T")[0]
    ),
  };
  const updateFields: Record<string, any> = {};
  for (const [name, value] of Object.entries(updateCandidate)) {
    if (value === undefined || value === null) continue;
    if (available && !available.has(name)) continue;
    updateFields[name] = value;
  }

  const updateData = await updateRecord(tableId(), input.recordId, updateFields);
  if (updateData.code !== 0) {
    return {
      success: false,
      error: "Could not update check-in",
      larkResponse: updateData,
      fieldsSent: updateFields,
    };
  }

  return { success: true, recordId: input.recordId, larkResponse: updateData };
}

export async function createCheckIn(input: CreateCheckInInput): Promise<WriteResult> {
  const token = await getTenantToken();

  // Candidate fields with their correct Bitable types (numbers as numbers,
  // "Client ID" as a duplex-link array, "Client" as the plain-text code).
  const candidate: Record<string, any> = {
    "Check-in ID": `CHK-${Date.now()}`,
    Client: String(input.clientId || input.clientRecordId),
    "Submitted Date": toLarkDate(input.submittedDate),
    Status: input.status || "Submitted",
    "Body Weight": toNumberOrUndefined(input.bodyWeight),
    "Sleep Hours": toNumberOrUndefined(input.sleepHours),
    "Sleep Quality": toNumberOrUndefined(input.sleepQuality),
    Energy: toNumberOrUndefined(input.energy),
    Mood: toNumberOrUndefined(input.mood),
    Stress: toNumberOrUndefined(input.stress),
    Soreness: toNumberOrUndefined(input.soreness),
    "Readiness Score": toNumberOrUndefined(input.readinessScore),
    "Nutrition Notes": input.nutritionNotes,
    "Training Notes": input.trainingNotes,
    Wins: input.wins,
    "Problems / Pain": input.problemsPain,
    "Client Notes": input.clientNotes,
    "Coaches Notes": input.coachResponse,
    "Reviewed Date": input.reviewedDate ? toLarkDate(input.reviewedDate) : undefined,
  };
  if (input.clientRecordId) candidate["Client ID"] = [String(input.clientRecordId)];

  const available = await getTableFieldNames(token);
  const fields: Record<string, any> = {};
  for (const [name, value] of Object.entries(candidate)) {
    if (value === undefined || value === null) continue;
    if (available && !available.has(name)) continue;
    fields[name] = value;
  }

  let createData = await createRecord(tableId(), fields);

  // If the duplex link rejects the value, retry without it rather than fail.
  if (createData.code !== 0 && fields["Client ID"]) {
    const fallback = { ...fields };
    delete fallback["Client ID"];
    createData = await createRecord(tableId(), fallback);
  }

  if (createData.code !== 0) {
    return {
      success: false,
      error: "Could not create check-in",
      larkResponse: createData,
      fieldsSent: fields,
    };
  }

  return {
    success: true,
    recordId: createData.data.record.record_id,
    larkResponse: createData,
  };
}
