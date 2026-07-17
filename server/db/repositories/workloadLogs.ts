// Climbing/technical workload logs (daily sRPE diary: tech AM/PM + cardio).
// One row per client per day, upserted by Log ID `${clientId}-YYYY-MM-DD`.
import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/workloadLogs.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

export type WorkloadLogDTO = {
  recordId: string;
  logId: string;
  // Calendar day (YYYY-MM-DD) — the last 10 chars of the Log ID, which is
  // timezone-stable (unlike re-deriving from the stored ms).
  dateKey: string;
  clientId: string;
  date: number;
  techAmRpe: number;
  techAmMin: number;
  techPmRpe: number;
  techPmMin: number;
  cardioRpe: number;
  cardioMin: number;
  notes: string;
};

export type SaveWorkloadLogInput = {
  clientId: string;
  date?: any;
  techAmRpe?: any;
  techAmMin?: any;
  techPmRpe?: any;
  techPmMin?: any;
  cardioRpe?: any;
  cardioMin?: any;
  notes?: any;
};

export type SaveWorkloadLogResult = {
  success: boolean;
  logId?: string;
  updated?: boolean;
  error?: string;
  details?: any;
};

export async function listWorkloadLogs(clientId = ""): Promise<WorkloadLogDTO[]> {
  let all = getCached<WorkloadLogDTO[]>("workloadLogs");
  if (!all) {
    all =
      DATA_BACKEND === "postgres"
        ? await (await import("../pg/workloadLogs.ts")).listAllWorkloadLogs()
        : await feishu.listAllWorkloadLogs();
    setCached("workloadLogs", all, 5 * 60 * 1000);
  }
  return all.filter((log) => !clientId || log.clientId.includes(clientId));
}

export async function saveWorkloadLog(
  input: SaveWorkloadLogInput
): Promise<SaveWorkloadLogResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/workloadLogs.ts")).saveWorkloadLog(input)
      : await feishu.saveWorkloadLog(input);
  if (result.success) invalidateCache("workloadLogs");
  return result;
}
