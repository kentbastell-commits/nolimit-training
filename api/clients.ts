import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";
import { getCached, setCached } from "./_cache.ts";

function fieldToText(value: any): string {
  if (!value) return "";

  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.name) return item.name;
        if (item?.record_ids) return item.record_ids.join(",");
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

// Read a field by name, matching case-insensitively across naming variants.
// Parse a JSON array stored in a text field; tolerate plain comma lists and empties.
function parseJsonList(raw: string): string[] {
  const clean = String(raw || "").trim();
  if (!clean) return [];
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
  } catch {
    return clean
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function pickField(fields: Record<string, any>, candidates: string[]): string {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const byNorm = new Map(
    Object.keys(fields || {}).map((key) => [norm(key), key])
  );
  for (const candidate of candidates) {
    const hit = byNorm.get(norm(candidate));
    if (hit) return fieldToText(fields[hit]);
  }
  return "";
}

function formatDate(value: any): string {
  const text = fieldToText(value);

  if (!text) return "--";

  if (/^\d+$/.test(text)) {
    const date = new Date(Number(text));
    return date.toISOString().split("T")[0];
  }

  return text.split("T")[0].split(" ")[0];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const cachedClients = getCached("clients");
    if (cachedClients) return res.status(200).json({ clients: cachedClients });

    const tokenResponse = await fetch(
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

    const tokenData = await tokenResponse.json();

    const clientItems = await fetchAllBitableRecords(
      process.env.FEISHU_BASE_APP_TOKEN as string,
      process.env.FEISHU_CLIENTS_TABLE_ID as string,
      tokenData.tenant_access_token
    );

    const clients = clientItems.map((item: any) => {
      const fields = item.fields || {};
      const name = fieldToText(fields["Full Name"]) || "Unnamed Client";
      const clientCode = fieldToText(fields["Client ID"]);

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
        activity: formatDate(fields["Last Check-in Date"]),
        training: "--",
        program: fieldToText(fields["Program ID"]) || "--",
        status: fieldToText(fields["Package Type"]) || "Active",
        clientType: fieldToText(fields["Client Type"]),
        primaryCoach: fieldToText(fields["Primary Coach"]),
        secondaryCoach: fieldToText(fields["Secondary Coach"]),
        package: fieldToText(fields["Package"]),
        subscriptionStatus: fieldToText(fields["Subscription Status"]),
        intakeStatus: fieldToText(fields["Intake Status"]),
        paymentStatus: fieldToText(fields["Payment Status"]),
        purchasedProgramId: fieldToText(fields["Purchased Program ID"]),
        accessStartDate: formatDate(fields["Access Start Date"]),
        accessEndDate: formatDate(fields["Access End Date"]),
        source: fieldToText(fields["Source"]),
        paymentId: fieldToText(fields["Stripe/Payment ID"]),
        email: fieldToText(fields["Email"]),
        phone: fieldToText(fields["Phone/WeChat"]),
        coach:
          fieldToText(fields["Primary Coach"]) ||
          fieldToText(fields["Coach Assigned"]),
        notes: fieldToText(fields["Notes"]),
        notesEn: fieldToText(fields["Notes EN"]),
        startDate: formatDate(fields["Start Date"]),
        languagePreference:
          fieldToText(fields["Language Preference"]) ||
          fieldToText(fields["Language"]) ||
          "English",
        // Manual performance-metric overrides (per client, optional). Match
        // the column case-insensitively across a few naming variants.
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

    setCached("clients", clients, 10 * 60 * 1000);

    return res.status(200).json({ clients });
  } catch (error: any) {
    return res.status(500).json({
      error: "Could not fetch clients",
      message: error.message,
    });
  }
}
