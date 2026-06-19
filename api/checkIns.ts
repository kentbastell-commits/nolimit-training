import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";

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

function normalizeDate(value: any) {
  const text = fieldToText(value);

  if (!text) return "";
  if (/^\d+$/.test(text)) return new Date(Number(text)).toISOString().split("T")[0];

  return text.split("T")[0].split(" ")[0];
}

function toLarkDate(value: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  return new Date(`${value}T00:00:00`).getTime();
}

function toNumberOrUndefined(value: any) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.FEISHU_CHECKINS_TABLE_ID) {
    return res.status(500).json({ error: "Missing FEISHU_CHECKINS_TABLE_ID" });
  }

  try {
    const token = await getTenantToken();

    if (req.method === "GET") {
      const clientId = String(req.query.clientId || "");
      const checkInItems = await fetchAllBitableRecords(
        process.env.FEISHU_BASE_APP_TOKEN as string,
        process.env.FEISHU_CHECKINS_TABLE_ID as string,
        token
      );

      const checkIns = checkInItems
        .map((item: any) => {
          const fields = item.fields || {};

          return {
            recordId: item.record_id,
            checkInId: fieldToText(fields["Check-in ID"]),
            clientId: fieldToText(fields["Client ID"] || fields.Client),
            submittedDate: normalizeDate(fields["Submitted Date"]),
            bodyWeight: fieldToText(fields["Body Weight"]),
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
            coachResponse: fieldToText(fields["Coach Response"]),
            coachReviewed:
              fields["Coach Reviewed"] === true ||
              fieldToText(fields["Coach Reviewed"]).toLowerCase() === "true",
            reviewedDate: normalizeDate(fields["Reviewed Date"]),
            status: fieldToText(fields.Status),
          };
        })
        .filter((checkIn: any) => {
          if (!clientId) return true;
          return checkIn.clientId.includes(clientId);
        })
        .sort((a: any, b: any) => b.submittedDate.localeCompare(a.submittedDate));

      return res.status(200).json({ checkIns });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const {
      clientId,
      clientRecordId,
      submittedDate,
      bodyWeight,
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

    if (!clientId && !clientRecordId) {
      return res.status(400).json({ error: "Missing clientId or clientRecordId" });
    }

    const fields: Record<string, any> = {
      "Check-in ID": `CHK-${Date.now()}`,
      "Client ID": String(clientId || clientRecordId),
      "Submitted Date": toLarkDate(submittedDate),
      Status: status || "Submitted",
    };

    if (clientRecordId) fields.Client = [String(clientRecordId)];
    if (toNumberOrUndefined(bodyWeight) !== undefined) {
      fields["Body Weight"] = toNumberOrUndefined(bodyWeight);
    }
    if (toNumberOrUndefined(sleepQuality) !== undefined) {
      fields["Sleep Quality"] = toNumberOrUndefined(sleepQuality);
    }
    if (toNumberOrUndefined(energy) !== undefined) fields.Energy = toNumberOrUndefined(energy);
    if (mood !== undefined) fields.Mood = String(mood);
    if (toNumberOrUndefined(stress) !== undefined) fields.Stress = toNumberOrUndefined(stress);
    if (toNumberOrUndefined(soreness) !== undefined) {
      fields.Soreness = toNumberOrUndefined(soreness);
    }
    if (toNumberOrUndefined(readinessScore) !== undefined) {
      fields["Readiness Score"] = toNumberOrUndefined(readinessScore);
    }
    if (nutritionNotes !== undefined) fields["Nutrition Notes"] = String(nutritionNotes);
    if (trainingNotes !== undefined) fields["Training Notes"] = String(trainingNotes);
    if (wins !== undefined) fields.Wins = String(wins);
    if (problemsPain !== undefined) fields["Problems / Pain"] = String(problemsPain);
    if (clientNotes !== undefined) fields["Client Notes"] = String(clientNotes);
    if (coachResponse !== undefined) fields["Coach Response"] = String(coachResponse);
    if (coachReviewed !== undefined) fields["Coach Reviewed"] = Boolean(coachReviewed);
    if (reviewedDate) fields["Reviewed Date"] = toLarkDate(reviewedDate);

    let createData = await createRecord(token, fields);

    if (createData.code !== 0 && fields.Client) {
      const fallbackFields = { ...fields };
      delete fallbackFields.Client;
      createData = await createRecord(token, fallbackFields);
    }

    if (createData.code !== 0) {
      return res.status(500).json({
        error: "Could not create check-in",
        larkResponse: createData,
        fieldsSent: fields,
      });
    }

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
