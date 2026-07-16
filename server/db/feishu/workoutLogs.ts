import { listRecords } from "./client.ts";
import type { LogDTO } from "../dto.ts";

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
        if (item?.record_ids) return item.record_ids.join(", ");
        if (item?.link_record_ids) return item.link_record_ids.join(", ");
        return "";
      })
      .join(", ");
  }
  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");
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

function normalizeDate(value: any) {
  const text = fieldToText(value);
  if (!text) return "";
  if (/^\d+$/.test(text)) return new Date(Number(text)).toISOString().split("T")[0];
  return text.split("T")[0].split(" ")[0];
}

export async function listAllLogs(): Promise<LogDTO[]> {
  const items = await listRecords(process.env.FEISHU_WORKOUT_LOGS_TABLE_ID as string);
  return items.map((item: any) => {
    const fields = item.fields || {};
    return {
      recordId: item.record_id,
      clientId: fieldToText(fields["Client ID"]),
      clientCode: fieldToText(fields["Client Code"]),
      clientRecordIds: extractRecordIds(fields["Client ID"]),
      exerciseName: fieldToText(fields["Exercise Name"]),
      date: normalizeDate(fields["Date"]),
      setNumber: fieldToText(fields["Set Number"]),
      prescribedReps: fieldToText(fields["Prescribed Reps"]),
      actualReps: fieldToText(fields["Actual Reps"]),
      actualWeight: fieldToText(fields["Actual Weight"]),
      actualTime: fieldToText(fields["Actual Time"]),
      actualDistance: fieldToText(fields["Actual Distance"]),
    };
  });
}
