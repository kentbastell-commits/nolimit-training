import { fieldText, formatDate, parseJsonList, pickField, listRecords } from "./client.ts";
import type { ClientDTO } from "../dto.ts";

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
