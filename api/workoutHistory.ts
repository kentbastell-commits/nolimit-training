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
        if (item?.record_ids) return item.record_ids.join(", ");
        if (item?.link_record_ids) return item.link_record_ids.join(", ");
        return JSON.stringify(item);
      })
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");

  return JSON.stringify(value);
}

// Linked record ids out of a Bitable link field (so a "Client ID" link can be
// matched by the client's record id, not just its resolved display text).
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

function toNumber(value: any) {
  const number = Number(fieldToText(value));
  return Number.isFinite(number) ? number : 0;
}

async function getTenantToken() {
  const response = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET,
      }),
    }
  );
  const data = await response.json();

  if (!data.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(data)}`);
  }

  return data.tenant_access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const clientId = String(req.query.clientId || "");
    const exerciseNameFilter = String(req.query.exerciseName || "").toLowerCase();
    const token = await getTenantToken();

    // Paginate — the workout-logs table grows fast; a single 500-row page would
    // drop the most recent logs (and whole clients' histories) once it's full.
    const allItems: any[] = [];
    let pageToken = "";
    do {
      const url = new URL(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_WORKOUT_LOGS_TABLE_ID}/records`
      );
      url.searchParams.set("page_size", "500");
      if (pageToken) url.searchParams.set("page_token", pageToken);

      const recordsResponse = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const recordsData = await recordsResponse.json();

      if (!recordsData?.data?.items) {
        if (allItems.length === 0) {
          return res.status(500).json({
            error: "Could not fetch workout logs",
            larkResponse: recordsData,
          });
        }
        break;
      }

      allItems.push(...recordsData.data.items);
      pageToken = recordsData.data.has_more ? recordsData.data.page_token : "";
    } while (pageToken);

    const logs = allItems
      .map((item: any) => {
        const fields = item.fields || {};

        return {
          recordId: item.record_id,
          clientId: fieldToText(fields["Client ID"]),
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
      })
      .filter((log: any) => {
        const matchesClient =
          !clientId ||
          log.clientId.includes(clientId) ||
          log.clientRecordIds.includes(clientId);
        const matchesExercise =
          !exerciseNameFilter ||
          log.exerciseName.toLowerCase().includes(exerciseNameFilter);

        return matchesClient && matchesExercise;
      })
      .sort((a: any, b: any) => b.date.localeCompare(a.date));

    const historyByExercise = new Map<string, any>();

    logs.forEach((log: any) => {
      const key = log.exerciseName || "Unnamed Exercise";
      const existing = historyByExercise.get(key) || {
        exerciseName: key,
        totalSets: 0,
        lastDate: "",
        lastReps: "",
        lastWeight: "",
        bestWeight: 0,
        bestReps: 0,
      };

      const weight = Number(log.actualWeight) || 0;
      const reps = Number(log.actualReps) || 0;

      if (!existing.lastDate || log.date > existing.lastDate) {
        existing.lastDate = log.date;
        existing.lastReps = log.actualReps;
        existing.lastWeight = log.actualWeight;
      }

      existing.totalSets += 1;
      existing.bestWeight = Math.max(existing.bestWeight, weight);
      existing.bestReps = Math.max(existing.bestReps, reps);

      historyByExercise.set(key, existing);
    });

    return res.status(200).json({
      logs,
      history: Array.from(historyByExercise.values()).sort((a, b) =>
        a.exerciseName.localeCompare(b.exerciseName)
      ),
      summary: {
        totalLogs: logs.length,
        uniqueExercises: historyByExercise.size,
        bestWeight: Math.max(0, ...logs.map((log: any) => toNumber(log.actualWeight))),
        bestReps: Math.max(0, ...logs.map((log: any) => toNumber(log.actualReps))),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Could not fetch workout history",
      message: error.message,
    });
  }
}
