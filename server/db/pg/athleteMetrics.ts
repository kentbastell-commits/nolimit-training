import { db } from "../client.ts";
import { athleteMetrics } from "../schema.ts";
import { epochToDate, str } from "./_util.ts";
import type { MetricDTO } from "../dto.ts";

type Row = typeof athleteMetrics.$inferSelect;

export async function listAllMetrics(): Promise<MetricDTO[]> {
  const rows = await db.select().from(athleteMetrics);
  return rows.map(
    (r: Row): MetricDTO => ({
      recordId: r.metricId,
      metricId: str(r.metricId),
      clientId: str(r.clientId),
      clientName: str(r.clientName),
      metricType: str(r.metricType),
      metricName: str(r.metricName),
      metricValue: str(r.value),
      metricUnit: str(r.unit),
      sourceType: str(r.sourceType),
      sourceRecordId: "",
      sourceTestId: str(r.sourceTestId),
      sourceTestName: str(r.sourceTestName),
      calculationMethod: str(r.calculationMethod),
      measuredAt: epochToDate(r.validFrom),
      status: str(r.status),
      notes: str(r.notes),
    })
  );
}
