import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/athleteMetrics.ts";
import type { MetricDTO, MetricFilter } from "../dto.ts";
import { getCached, setCached } from "../../../api/_cache.ts";

// Filtering (by client + metric type) is backend-agnostic, so it lives here and
// runs against the DTOs from whichever backend produced them. The UNfiltered
// list is cached (5 min) so per-client requests share one table scan; metric
// writers invalidate "athleteMetrics".
export async function listAthleteMetrics(q: MetricFilter = {}): Promise<MetricDTO[]> {
  let metrics = getCached<MetricDTO[]>("athleteMetrics");
  if (!metrics) {
    metrics =
      DATA_BACKEND === "postgres"
        ? await (await import("../pg/athleteMetrics.ts")).listAllMetrics()
        : await feishu.listAllMetrics();
    setCached("athleteMetrics", metrics, 5 * 60 * 1000);
  }

  const normalize = (v?: string) => String(v || "").trim().toLowerCase();
  const clientTokens = [q.clientId, q.clientRecordId, q.clientCode].map(normalize).filter(Boolean);
  const clientName = String(q.clientName || "").trim();
  const metricType = normalize(q.metricType);

  return metrics.filter((m) => {
    if (clientTokens.length || clientName) {
      const idMatches = clientTokens.includes(normalize(m.clientId));
      const nameMatches = Boolean(clientName) && normalize(m.clientName) === normalize(clientName);
      if (!idMatches && !nameMatches) return false;
    }
    const searchable = `${m.metricType} ${m.metricName} ${m.sourceTestName}`.trim().toLowerCase();
    if (metricType && !searchable.includes(metricType)) return false;
    return true;
  });
}
