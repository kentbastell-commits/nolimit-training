import { appToken, getTenantToken } from "./client.ts";
import type { TemplateRow } from "../dto.ts";
import { getCached, setCached } from "../../../api/_cache.ts";

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

// Full templates-table scan, shared (and slow), so the RAW items are cached
// under "workoutTemplatesRaw" — the same key api/workoutDetails warms — and
// template writers invalidate it (prefix). Each page retries a few times:
// Feishu throttles after heavy writes (1254607 "Data not ready"), and new
// template rows live on the LAST page — a silently dropped page means a
// program looks empty. A partial (truncated) scan is NEVER cached: a truncated
// snapshot makes every program on the missing pages look empty for the TTL.
async function fetchAllTemplateItems(): Promise<any[]> {
  const cached = getCached<any[]>("workoutTemplatesRaw");
  if (cached) return cached;

  const token = await getTenantToken();
  const allItems: any[] = [];
  let pageToken = "";
  let truncated = false;
  do {
    const url = new URL(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID}/records`
    );
    url.searchParams.set("page_size", "500");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    let pageData: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const recordsResponse = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      pageData = await recordsResponse.json();
      if (pageData?.data?.items) break;
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    if (!pageData?.data?.items) {
      if (allItems.length === 0) {
        const error: any = new Error(
          `No workout template records returned: ${JSON.stringify(pageData)}`
        );
        error.kind = "templatesEmpty";
        error.larkResponse = pageData;
        throw error;
      }
      truncated = true;
      break;
    }

    allItems.push(...pageData.data.items);
    pageToken = pageData.data.has_more ? pageData.data.page_token : "";
  } while (pageToken);

  if (!truncated) {
    setCached("workoutTemplatesRaw", allItems, 10 * 60 * 1000);
  }
  return allItems;
}

export async function listAllTemplateRows(): Promise<TemplateRow[]> {
  const items = await fetchAllTemplateItems();
  return items.map((item: any) => {
    const fields = item.fields || {};
    return {
      recordId: item.record_id,
      programId: fieldToText(fields["Program ID"]),
      programRecordIds: extractRecordIds(fields["Program ID"]),
      week: Number(fieldToText(fields["Week"])) || 1,
      day: Number(fieldToText(fields["Day"])) || 1,
      sessionName: fieldToText(fields["Session Name"]),
      sessionNameCn: fieldToText(fields["Session Name CN"]),
      sessionType: fieldToText(fields["Session Type"]),
      sessionGoal: fieldToText(fields["Session Goal"]),
      estimatedDuration: fieldToText(fields["Estimated Duration"]),
      intensity: fieldToText(fields["Intensity"]),
      isSingleWorkout: /^(true|yes|1)$/i.test(fieldToText(fields["Is Single Workout"])),
      exerciseName: fieldToText(fields["Exercise Name"]),
      exerciseId: fieldToText(fields["Exercise ID"]),
      exerciseRecordId: extractRecordIds(fields["Exercise ID"])[0] || "",
      order: Number(fieldToText(fields["Order"])) || 0,
      sets: fieldToText(fields["Sets"]),
      reps: fieldToText(fields["Reps"]),
      tempo: fieldToText(fields["Tempo"]),
      rest: fieldToText(fields["Rest"]),
      notes: fieldToText(fields["Coaching Notes"]),
    };
  });
}
