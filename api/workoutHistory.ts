import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCached, setCached } from "./_cache.ts";
import { getTenantToken } from "./_token.ts";
import { fetchAllBitableRecords } from "./_pagination.ts";

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

// Feishu tenant token now comes from the shared in-memory cache (./_token.ts).

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const clientId = String(req.query.clientId || "");
    const clientCode = String(req.query.clientCode || "");
    const exerciseNameFilter = String(req.query.exerciseName || "").toLowerCase();

    // Does a mapped log belong to this client? "Client ID" is a DuplexLink, so
    // match either the record_id (portal passes selectedClient.id) or the code
    // (the link resolves to the client code in text).
    const matchesClient = (log: any) =>
      (!clientId && !clientCode) ||
      (clientId &&
        (log.clientId.includes(clientId) ||
          log.clientRecordIds.includes(clientId))) ||
      (clientCode && log.clientId.includes(clientCode));

    // Fetch only THIS client's logs by filtering on the code (a link resolves to
    // the code, so a text filter on the code works where the record_id can't).
    // Cache per client, and always narrow in memory before caching so a
    // full-scan fallback can never leak another client's rows into the key.
    const cacheKey = `workoutLogs:${clientCode || clientId || "all"}`;
    let allLogs = getCached<any[]>(cacheKey);

    if (!allLogs) {
      const token = await getTenantToken();

      let allItems: any[] = clientCode
        ? await fetchAllBitableRecords(
            process.env.FEISHU_BASE_APP_TOKEN as string,
            process.env.FEISHU_WORKOUT_LOGS_TABLE_ID as string,
            token,
            { filter: `CurrentValue.[Client ID]="${clientCode}"` }
          )
        : [];

      // Fallback: a filter that matched nothing (link quirk, or genuinely no
      // logs) → full scan, then narrow in memory. Never returns empty by mistake.
      if (!allItems.length) {
        allItems = await fetchAllBitableRecords(
          process.env.FEISHU_BASE_APP_TOKEN as string,
          process.env.FEISHU_WORKOUT_LOGS_TABLE_ID as string,
          token
        );
      }

      allLogs = allItems
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
        .filter(matchesClient);

      setCached(cacheKey, allLogs, 5 * 60 * 1000);
    }

    const logs = allLogs
      .filter(
        (log: any) =>
          !exerciseNameFilter ||
          log.exerciseName.toLowerCase().includes(exerciseNameFilter)
      )
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
