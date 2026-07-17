// Postgres impl for the workloadLogs domain. The Log ID `${clientId}-YYYY-MM-DD`
// is the primary key, so the one-row-per-client-per-day upsert is a native
// ON CONFLICT update instead of Feishu's scan-and-match.
import { eq } from "drizzle-orm";
import { db } from "../client.ts";
import { workloadLogs, clients } from "../schema.ts";
import { str } from "./_util.ts";
import type {
  WorkloadLogDTO,
  SaveWorkloadLogInput,
  SaveWorkloadLogResult,
} from "../repositories/workloadLogs.ts";

export async function listAllWorkloadLogs(): Promise<WorkloadLogDTO[]> {
  const rows = await db.select().from(workloadLogs);
  return rows.map((r): WorkloadLogDTO => ({
    recordId: r.workloadLogId,
    logId: r.workloadLogId,
    dateKey: r.workloadLogId.slice(-10),
    clientId: str(r.clientId),
    date: r.date ?? 0,
    techAmRpe: r.techAmRpe ?? 0,
    techAmMin: r.techAmMin ?? 0,
    techPmRpe: r.techPmRpe ?? 0,
    techPmMin: r.techPmMin ?? 0,
    cardioRpe: r.cardioRpe ?? 0,
    cardioMin: r.cardioMin ?? 0,
    notes: str(r.notes),
  }));
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
  const { clientId, date } = input;
  const ms = toMs(date);
  const logId = `${clientId}-${dayKey(ms)}`;

  // FK is enforced here (Feishu stores the code as plain text): keep the code
  // in the PK either way, null the FK column if the client row doesn't exist.
  const clientExists =
    (
      await db
        .select({ id: clients.clientId })
        .from(clients)
        .where(eq(clients.clientId, String(clientId)))
    ).length > 0;

  const row = {
    workloadLogId: logId,
    clientId: clientExists ? String(clientId) : null,
    date: ms,
    techAmRpe: n(input.techAmRpe),
    techAmMin: n(input.techAmMin),
    techPmRpe: n(input.techPmRpe),
    techPmMin: n(input.techPmMin),
    cardioRpe: n(input.cardioRpe),
    cardioMin: n(input.cardioMin),
    notes: String(input.notes || ""),
  };

  try {
    const existing = await db
      .select({ id: workloadLogs.workloadLogId })
      .from(workloadLogs)
      .where(eq(workloadLogs.workloadLogId, logId));
    const updated = existing.length > 0;

    await db
      .insert(workloadLogs)
      .values(row)
      .onConflictDoUpdate({ target: workloadLogs.workloadLogId, set: row });

    return { success: true, logId, updated };
  } catch (e: any) {
    return {
      success: false,
      error: "Could not save workload log",
      details: { message: e?.message || String(e) },
    };
  }
}
