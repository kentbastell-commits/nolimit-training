import { listRecords } from "./client.ts";
import type { TemplateRow } from "../dto.ts";

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

export async function listAllTemplateRows(): Promise<TemplateRow[]> {
  const items = await listRecords(process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID as string);
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
      order: Number(fieldToText(fields["Order"])) || 0,
    };
  });
}
