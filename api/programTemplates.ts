import type { VercelRequest, VercelResponse } from "@vercel/node";

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
        if (item?.link) return item.link;
        if (item?.url) return item.url;
        if (item?.record_ids) return item.record_ids.join(", ");
        return "";
      })
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.link) return value.link;
  if (value?.url) return value.url;

  return "";
}

// Pull linked record ids out of a Bitable link/relation field value, whatever
// shape the API returns it in.
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

function normalizeLookupText(value?: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, " ")
    .trim();
}

function lookupTextMatches(source?: string, target?: string) {
  const normalizedSource = normalizeLookupText(source);
  const normalizedTarget = normalizeLookupText(target);

  return Boolean(
    normalizedSource &&
      normalizedTarget &&
      (normalizedSource === normalizedTarget ||
        normalizedSource.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedSource))
  );
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const { programId, programRecordId } = req.query;

    if (!programId && !programRecordId) {
      return res.status(400).json({
        error: "Missing programId",
      });
    }

    const tokenResponse = await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: process.env.FEISHU_APP_ID,
          app_secret: process.env.FEISHU_APP_SECRET,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    // Paginate the whole templates table — once it grows past one page,
    // newly-created templates land on later pages and would be missed.
    const allItems: any[] = [];
    let pageToken = "";
    do {
      const url = new URL(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID}/records`
      );
      url.searchParams.set("page_size", "500");
      if (pageToken) url.searchParams.set("page_token", pageToken);

      const recordsResponse = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${tokenData.tenant_access_token}` },
      });
      const pageData = await recordsResponse.json();

      if (!pageData?.data?.items) {
        if (allItems.length === 0) {
          return res.status(500).json({
            error: "No workout template records returned",
            larkResponse: pageData,
          });
        }
        break;
      }

      allItems.push(...pageData.data.items);
      pageToken = pageData.data.has_more ? pageData.data.page_token : "";
    } while (pageToken);

    const programSearch = String(programId || "");
    const recordIdTarget = String(programRecordId || "");
    const templates = allItems
      .filter((item: any) => {
        const fields = item.fields || {};
        const programIdField = fields["Program ID"];
        const templateProgramId = fieldToText(programIdField);
        const linkedRecordIds = extractRecordIds(programIdField);

        // Match by the PR-#### text (older text-based templates) OR by the
        // linked program record id (newer link-based templates, which no longer
        // resolve to the PR text).
        return (
          (programSearch && lookupTextMatches(templateProgramId, programSearch)) ||
          (recordIdTarget &&
            (linkedRecordIds.includes(recordIdTarget) ||
              lookupTextMatches(templateProgramId, recordIdTarget)))
        );
      })
      .map((item: any) => {
        const fields = item.fields || {};

        return {
          recordId: item.record_id,
          week: Number(fieldToText(fields["Week"])) || 1,
          day: Number(fieldToText(fields["Day"])) || 1,
          sessionName: fieldToText(fields["Session Name"]),
          sessionNameCn: fieldToText(fields["Session Name CN"]),
          sessionType: fieldToText(fields["Session Type"]),
          sessionGoal: fieldToText(fields["Session Goal"]),
          estimatedDuration: fieldToText(fields["Estimated Duration"]),
          intensity: fieldToText(fields["Intensity"]),
          isSingleWorkout: /^(true|yes|1)$/i.test(
            fieldToText(fields["Is Single Workout"])
          ),
          exerciseName: fieldToText(fields["Exercise Name"]),
          exerciseId: fieldToText(fields["Exercise ID"]),
          order: Number(fieldToText(fields["Order"])) || 0,
          // Full prescription so the builder can load a program in one call
          // (no per-day /api/workoutDetails round-trips).
          sets: fieldToText(fields["Sets"]),
          reps: fieldToText(fields["Reps"]),
          tempo: fieldToText(fields["Tempo"]),
          rest: fieldToText(fields["Rest"]),
          notes: fieldToText(fields["Coaching Notes"]),
        };
      })
      .sort((a: any, b: any) => {
        if (a.week !== b.week) {
          return a.week - b.week;
        }

        if (a.day !== b.day) {
          return a.day - b.day;
        }

        return a.order - b.order;
      });

    return res.status(200).json({
      templates,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
