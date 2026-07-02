import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";
import { getCached, setCached, invalidateCache } from "./_cache.ts";
import { getTenantToken } from "./_token.ts";

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

function normalizeDate(value: any) {
  const text = fieldToText(value);

  if (!text) return "";
  if (/^\d+$/.test(text)) return new Date(Number(text)).toISOString().split("T")[0];

  return text.split("T")[0].split(" ")[0];
}

function toLarkDate(value: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  // Anchor on noon UTC so the calendar date survives a round-trip regardless of
  // the server's timezone (normalizeDate reads it back in UTC).
  return new Date(`${value}T12:00:00Z`).getTime();
}

function toNumberOrUndefined(value: any) {
  if (value === "" || value === undefined || value === null) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

// Feishu tenant token now comes from the shared in-memory cache (./_token.ts).

// Only send fields that actually exist on the table, so a schema that's missing
// (or renamed) a column never fails the whole write.
async function getTableFieldNames(token: string): Promise<Set<string> | null> {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_CHECKINS_TABLE_ID}/fields?page_size=200`,
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

async function createRecord(token: string, fields: Record<string, any>) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_CHECKINS_TABLE_ID}/records`,
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

async function updateRecord(
  token: string,
  recordId: string,
  fields: Record<string, any>
) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_CHECKINS_TABLE_ID}/records/${recordId}`,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.FEISHU_CHECKINS_TABLE_ID) {
    return res.status(500).json({ error: "Missing FEISHU_CHECKINS_TABLE_ID" });
  }

  try {
    const token = await getTenantToken();

    if (req.method === "GET") {
      const clientId = String(req.query.clientId || "");

      let allCheckIns = getCached<any[]>("checkIns");

      if (!allCheckIns) {
        const checkInItems = await fetchAllBitableRecords(
          process.env.FEISHU_BASE_APP_TOKEN as string,
          process.env.FEISHU_CHECKINS_TABLE_ID as string,
          token
        );

        allCheckIns = checkInItems.map((item: any) => {
          const fields = item.fields || {};
          // "Client" is the plain-text client code; "Client ID" is the duplex
          // link to the Clients table.
          const clientCode =
            fieldToText(fields["Client"]) || fieldToText(fields["Client ID"]);

          return {
            recordId: item.record_id,
            checkInId: fieldToText(fields["Check-in ID"]),
            clientId: clientCode,
            clientRecordIds: extractRecordIds(fields["Client ID"]),
            submittedDate: normalizeDate(fields["Submitted Date"]),
            bodyWeight: fieldToText(fields["Body Weight"]),
            sleepHours: fieldToText(fields["Sleep Hours"]),
            sleepQuality: fieldToText(fields["Sleep Quality"]),
            energy: fieldToText(fields.Energy),
            mood: fieldToText(fields.Mood),
            stress: fieldToText(fields.Stress),
            soreness: fieldToText(fields.Soreness),
            readinessScore: fieldToText(fields["Readiness Score"]),
            nutritionNotes: fieldToText(fields["Nutrition Notes"]),
            trainingNotes: fieldToText(fields["Training Notes"]),
            wins: fieldToText(fields.Wins),
            problemsPain: fieldToText(fields["Problems / Pain"]),
            clientNotes: fieldToText(fields["Client Notes"]),
            coachResponse: fieldToText(fields["Coaches Notes"]),
            coachReviewed:
              Boolean(fieldToText(fields["Coaches Notes"]).trim()) ||
              fields["Coach Reviewed"] === true,
            reviewedDate: normalizeDate(fields["Reviewed Date"]),
            status: fieldToText(fields.Status),
          };
        });

        setCached("checkIns", allCheckIns, 5 * 60 * 1000);
      }

      const checkIns = allCheckIns
        .filter((checkIn: any) => {
          if (!clientId) return true;
          return (
            checkIn.clientId.includes(clientId) ||
            checkIn.clientRecordIds.includes(clientId)
          );
        })
        .sort((a: any, b: any) => b.submittedDate.localeCompare(a.submittedDate));

      return res.status(200).json({ checkIns });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const {
      recordId,
      clientId,
      clientRecordId,
      submittedDate,
      bodyWeight,
      sleepHours,
      sleepQuality,
      energy,
      mood,
      stress,
      soreness,
      readinessScore,
      nutritionNotes,
      trainingNotes,
      wins,
      problemsPain,
      clientNotes,
      coachResponse,
      coachReviewed,
      reviewedDate,
      status,
    } = req.body;

    // Coach responding to / reviewing an existing check-in (update, not create).
    if (recordId) {
      const available = await getTableFieldNames(token);
      const updateCandidate: Record<string, any> = {
        "Coaches Notes": coachResponse,
        "Coach Reviewed": coachReviewed === undefined ? true : Boolean(coachReviewed),
        "Reviewed Date": toLarkDate(
          reviewedDate || new Date().toISOString().split("T")[0]
        ),
      };
      const updateFields: Record<string, any> = {};
      for (const [name, value] of Object.entries(updateCandidate)) {
        if (value === undefined || value === null) continue;
        if (available && !available.has(name)) continue;
        updateFields[name] = value;
      }

      const updateData = await updateRecord(token, recordId, updateFields);
      if (updateData.code !== 0) {
        return res.status(500).json({
          error: "Could not update check-in",
          larkResponse: updateData,
          fieldsSent: updateFields,
        });
      }

      invalidateCache("checkIns");
      return res.status(200).json({ success: true, recordId, larkResponse: updateData });
    }

    if (!clientId && !clientRecordId) {
      return res.status(400).json({ error: "Missing clientId or clientRecordId" });
    }

    // Candidate fields with their correct Bitable types (numbers as numbers,
    // "Client ID" as a duplex-link array, "Client" as the plain-text code).
    const candidate: Record<string, any> = {
      "Check-in ID": `CHK-${Date.now()}`,
      Client: String(clientId || clientRecordId),
      "Submitted Date": toLarkDate(submittedDate),
      Status: status || "Submitted",
      "Body Weight": toNumberOrUndefined(bodyWeight),
      "Sleep Hours": toNumberOrUndefined(sleepHours),
      "Sleep Quality": toNumberOrUndefined(sleepQuality),
      Energy: toNumberOrUndefined(energy),
      Mood: toNumberOrUndefined(mood),
      Stress: toNumberOrUndefined(stress),
      Soreness: toNumberOrUndefined(soreness),
      "Readiness Score": toNumberOrUndefined(readinessScore),
      "Nutrition Notes": nutritionNotes,
      "Training Notes": trainingNotes,
      Wins: wins,
      "Problems / Pain": problemsPain,
      "Client Notes": clientNotes,
      "Coaches Notes": coachResponse,
      "Reviewed Date": reviewedDate ? toLarkDate(reviewedDate) : undefined,
    };
    if (clientRecordId) candidate["Client ID"] = [String(clientRecordId)];

    const available = await getTableFieldNames(token);
    const fields: Record<string, any> = {};
    for (const [name, value] of Object.entries(candidate)) {
      if (value === undefined || value === null) continue;
      if (available && !available.has(name)) continue;
      fields[name] = value;
    }

    let createData = await createRecord(token, fields);

    // If the duplex link rejects the value, retry without it rather than fail.
    if (createData.code !== 0 && fields["Client ID"]) {
      const fallback = { ...fields };
      delete fallback["Client ID"];
      createData = await createRecord(token, fallback);
    }

    if (createData.code !== 0) {
      return res.status(500).json({
        error: "Could not create check-in",
        larkResponse: createData,
        fieldsSent: fields,
      });
    }

    invalidateCache("checkIns");

    return res.status(200).json({
      success: true,
      recordId: createData.data.record.record_id,
      larkResponse: createData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
