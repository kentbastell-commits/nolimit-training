import { db } from "../client.ts";
import { workoutLogs } from "../schema.ts";
import { epochToDate, str } from "./_util.ts";
import type { LogDTO } from "../dto.ts";

type Row = typeof workoutLogs.$inferSelect;

export async function listAllLogs(): Promise<LogDTO[]> {
  const rows = await db.select().from(workoutLogs);
  return rows.map(
    (r: Row): LogDTO => ({
      recordId: r.logId,
      clientId: str(r.clientId),
      clientRecordIds: r.clientId ? [r.clientId] : [],
      exerciseName: str(r.exerciseName),
      date: epochToDate(r.date),
      setNumber: str(r.setNumber),
      prescribedReps: str(r.prescribedReps),
      actualReps: str(r.actualReps),
      actualWeight: str(r.actualWeight),
      actualTime: str(r.actualTime),
      actualDistance: str(r.actualDistance),
    })
  );
}
