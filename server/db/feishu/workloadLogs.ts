// Feishu impl for the workloadLogs domain — logic moved verbatim from
// api/workloadLogs.ts / api/saveWorkloadLog.ts.
import { listRecords, createRecord, updateRecord } from "./client.ts";
import type {
  WorkloadLogDTO,
  SaveWorkloadLogInput,
  SaveWorkloadLogResult,
} from "../repositories/workloadLogs.ts";

function fieldToText(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" ? item : item?.text || item?.name || ""
      )
      .filter(Boolean)
      .join(", ");
  }
  if (value.text) return String(value.text);
  return "";
}

function num(value: any): number {
  const n = Number(fieldToText(value));
  return Number.isFinite(n) ? n : 0;
}

export async function listAllWorkloadLogs(): Promise<WorkloadLogDTO[]> {
  const items = await listRecords(
    process.env.FEISHU_WORKLOAD_LOGS_TABLE_ID as string
  );
  return items.map((item: any): WorkloadLogDTO => {
    const f = item.fields || {};
    const logId = fieldToText(f["Log ID"]);
    return {
      recordId: item.record_id,
      logId,
      dateKey: logId.slice(-10),
      clientId: fieldToText(f["Client ID"]),
      date: num(f["Date"]),
      techAmRpe: num(f["Tech AM RPE"]),
      techAmMin: num(f["Tech AM Min"]),
      techPmRpe: num(f["Tech PM RPE"]),
      techPmMin: num(f["Tech PM Min"]),
      cardioRpe: num(f["Cardio RPE"]),
      cardioMin: num(f["Cardio Min"]),
      notes: fieldToText(f["Notes"]),
    };
  });
}

function toMs(value: any): number {
  if (value === undefined || value === null || value === "") return Date.now();
  if (typeof value === "number") return value;
  if (/^\d+$/.test(String(value))) return Number(value);
  const ms = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function n(value: any): number {
  const v = Number(value);
  return Number.isFinite(v) ? v : 0;
}

export async function saveWorkloadLog(
  input: SaveWorkloadLogInput
): Promise<SaveWorkloadLogResult> {
  const table = process.env.FEISHU_WORKLOAD_LOGS_TABLE_ID as string;
  const { clientId, date } = input;

  const ms = toMs(date);
  const logId = `${clientId}-${dayKey(ms)}`;

  const fields: Record<string, any> = {
    "Log ID": logId,
    "Client ID": clientId,
    Date: ms,
    "Tech AM RPE": n(input.techAmRpe),
    "Tech AM Min": n(input.techAmMin),
    "Tech PM RPE": n(input.techPmRpe),
    "Tech PM Min": n(input.techPmMin),
    "Cardio RPE": n(input.cardioRpe),
    "Cardio Min": n(input.cardioMin),
    Notes: String(input.notes || ""),
  };

  // Upsert by Log ID (one row per client per day).
  const existing = await listRecords(table);
  const match = existing.find(
    (item: any) => (item.fields?.["Log ID"] || "") === logId
  );

  const result = match
    ? await updateRecord(table, match.record_id, fields)
    : await createRecord(table, fields);

  if (result.code !== 0) {
    return { success: false, error: "Could not save workload log", details: result };
  }

  return { success: true, logId, updated: Boolean(match) };
}
