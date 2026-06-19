import {
  fieldText,
  formatDate,
  parseJsonList,
  pickField,
  listRecords,
  getFieldNames,
  updateRecord,
} from "./client.ts";
import type { ClientDTO, UpdateClientInput, WriteResult } from "../dto.ts";

export async function listClients(): Promise<ClientDTO[]> {
  const items = await listRecords(process.env.FEISHU_CLIENTS_TABLE_ID as string);
  return items.map((item: any) => {
    const fields = item.fields || {};
    const name = fieldText(fields["Full Name"]) || "Unnamed Client";
    const clientCode = fieldText(fields["Client ID"]);
    return {
      id: item.record_id,
      clientCode,
      name,
      initials: name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      activity: formatDate(fields["Last Check-in Date"], "--"),
      training: "--",
      program: fieldText(fields["Program ID"]) || "--",
      status: fieldText(fields["Package Type"]) || "Active",
      clientType: fieldText(fields["Client Type"]),
      primaryCoach: fieldText(fields["Primary Coach"]),
      secondaryCoach: fieldText(fields["Secondary Coach"]),
      package: fieldText(fields["Package"]),
      subscriptionStatus: fieldText(fields["Subscription Status"]),
      intakeStatus: fieldText(fields["Intake Status"]),
      paymentStatus: fieldText(fields["Payment Status"]),
      purchasedProgramId: fieldText(fields["Purchased Program ID"]),
      accessStartDate: formatDate(fields["Access Start Date"], "--"),
      accessEndDate: formatDate(fields["Access End Date"], "--"),
      source: fieldText(fields["Source"]),
      paymentId: fieldText(fields["Stripe/Payment ID"]),
      email: fieldText(fields["Email"]),
      phone: fieldText(fields["Phone/WeChat"]),
      coach: fieldText(fields["Primary Coach"]) || fieldText(fields["Coach Assigned"]),
      notes: fieldText(fields["Notes"]),
      notesEn: fieldText(fields["Notes EN"]),
      startDate: formatDate(fields["Start Date"], "--"),
      languagePreference:
        fieldText(fields["Language Preference"]) || fieldText(fields["Language"]) || "English",
      masKmhOverride: pickField(fields, ["MAS (km/h)", "MAS km/h", "MAS (kmh)", "MAS"]),
      hrMaxOverride: pickField(fields, ["HR Max", "HRmax", "Max HR"]),
      restingHrOverride: pickField(fields, ["Resting HR", "RHR", "Resting Heart Rate"]),
      zone5kPct: pickField(fields, ["Zone 5K %", "5K %", "Zone 5K"]),
      zone10kPct: pickField(fields, ["Zone 10K %", "10K %", "Zone 10K"]),
      zoneThresholdPct: pickField(fields, ["Zone Threshold %", "Threshold %", "Zone Threshold"]),
      zoneEasyPct: pickField(fields, ["Zone Easy %", "Easy %", "Zone Easy"]),
      tags: parseJsonList(pickField(fields, ["Tags"])),
      categories: parseJsonList(pickField(fields, ["Categories"])),
      lastLogin: Number(pickField(fields, ["Last Login"])) || 0,
    };
  });
}

function toLarkDate(value: string) {
  if (!value || value === "--") return undefined;
  return new Date(`${value}T00:00:00`).getTime();
}

function toLarkNumber(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "" || value === "--") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function recordLogin(
  clientRecordId?: string,
  clientCode?: string
): Promise<WriteResult> {
  const tableId = process.env.FEISHU_CLIENTS_TABLE_ID as string;
  let recordId = clientRecordId;
  if (!recordId) {
    const items = await listRecords(tableId);
    const match = items.find(
      (it: any) => fieldText(it.fields?.["Client ID"]) === String(clientCode)
    );
    recordId = match?.record_id;
  }
  if (!recordId) return { success: false, error: "Client not found" };
  const data = await updateRecord(tableId, recordId, { "Last Login": Date.now() });
  if (data.code !== 0) return { success: false, larkResponse: data };
  return { success: true, recordId };
}

export async function updateClient(input: UpdateClientInput): Promise<WriteResult> {
  const tableId = process.env.FEISHU_CLIENTS_TABLE_ID as string;
  const fields: Record<string, any> = {};
  const i = input;
  if (i.name !== undefined) fields["Full Name"] = i.name;
  if (i.email !== undefined) fields.Email = i.email;
  if (i.phone !== undefined) fields["Phone/WeChat"] = i.phone;
  if (i.coach !== undefined) fields["Coach Assigned"] = i.coach;
  if (i.primaryCoachId !== undefined)
    fields["Primary Coach"] = i.primaryCoachId ? [i.primaryCoachId] : [];
  if (i.secondaryCoachId !== undefined)
    fields["Secondary Coach"] = i.secondaryCoachId ? [i.secondaryCoachId] : [];
  if (i.clientType !== undefined) fields["Client Type"] = i.clientType;
  if (i.packageType !== undefined) fields["Package Type"] = i.packageType;
  if (i.packageName !== undefined) fields.Package = i.packageName;
  if (i.program !== undefined) fields.Program = i.program;
  if (i.subscriptionStatus !== undefined) fields["Subscription Status"] = i.subscriptionStatus;
  if (i.intakeStatus !== undefined) fields["Intake Status"] = i.intakeStatus;
  if (i.paymentStatus !== undefined) fields["Payment Status"] = i.paymentStatus;
  if (i.purchasedProgramId !== undefined) fields["Purchased Program ID"] = i.purchasedProgramId;
  if (i.source !== undefined) fields.Source = i.source;
  if (i.paymentId !== undefined) fields["Stripe/Payment ID"] = i.paymentId;
  if (i.notes !== undefined) fields.Notes = i.notes;
  if (i.languagePreference !== undefined) fields["Language Preference"] = i.languagePreference;
  const sd = toLarkDate(i.startDate || "");
  if (sd) fields["Start Date"] = sd;
  const lc = toLarkDate(i.lastCheckInDate || "");
  if (lc) fields["Last Check-in Date"] = lc;
  const asd = toLarkDate(i.accessStartDate || "");
  if (asd) fields["Access Start Date"] = asd;
  const aed = toLarkDate(i.accessEndDate || "");
  if (aed) fields["Access End Date"] = aed;

  const namesArr = await getFieldNames(tableId);
  const availableFieldNames = namesArr.length ? new Set(namesArr) : null;
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const availableByNorm = availableFieldNames
    ? new Map([...availableFieldNames].map((n) => [norm(String(n)), String(n)]))
    : null;
  const resolveColumn = (candidates: string[]) => {
    if (!availableByNorm) return candidates[0];
    for (const candidate of candidates) {
      const hit = availableByNorm.get(norm(candidate));
      if (hit) return hit;
    }
    return null;
  };
  const numberOverrides: Array<{ candidates: string[]; value: unknown }> = [
    { candidates: ["MAS (km/h)", "MAS km/h", "MAS (kmh)", "MAS"], value: i.masKmhOverride },
    { candidates: ["HR Max", "HRmax", "Max HR"], value: i.hrMaxOverride },
    { candidates: ["Resting HR", "RHR", "Resting Heart Rate"], value: i.restingHrOverride },
    { candidates: ["Zone 5K %", "5K %", "Zone 5K"], value: i.zone5kPct },
    { candidates: ["Zone 10K %", "10K %", "Zone 10K"], value: i.zone10kPct },
    { candidates: ["Zone Threshold %", "Threshold %", "Zone Threshold"], value: i.zoneThresholdPct },
    { candidates: ["Zone Easy %", "Easy %", "Zone Easy"], value: i.zoneEasyPct },
  ];
  for (const { candidates, value } of numberOverrides) {
    const larkValue = toLarkNumber(value);
    if (larkValue === undefined) continue;
    const columnName = resolveColumn(candidates);
    if (columnName) fields[columnName] = larkValue;
  }
  if (i.tags !== undefined) fields["Tags"] = JSON.stringify(Array.isArray(i.tags) ? i.tags : []);
  if (i.categories !== undefined)
    fields["Categories"] = JSON.stringify(Array.isArray(i.categories) ? i.categories : []);

  const omittedFields: string[] = [];
  const filteredFields = availableFieldNames
    ? Object.fromEntries(
        Object.entries(fields).filter(([fieldName]) => {
          const keep = availableFieldNames.has(fieldName);
          if (!keep) omittedFields.push(fieldName);
          return keep;
        })
      )
    : fields;

  const data = await updateRecord(tableId, i.clientRecordId, filteredFields);
  if (data.code !== 0) {
    return { success: false, error: "Failed to update client", larkResponse: data, fieldsSent: filteredFields };
  }
  return { success: true, omittedFields, clientRecordId: i.clientRecordId, larkResponse: data };
}
