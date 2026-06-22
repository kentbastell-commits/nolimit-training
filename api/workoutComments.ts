import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";
import { getCached, setCached } from "./_cache.ts";

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.name) return item.name;
        if (item?.record_ids) return item.record_ids.join(", ");
        if (item?.link_record_ids) return item.link_record_ids.join(", ");
        if (
          Array.isArray(item?.text_arr) ||
          Object.prototype.hasOwnProperty.call(item, "record_ids") ||
          Object.prototype.hasOwnProperty.call(item, "link_record_ids")
        ) {
          return "";
        }
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.value) return fieldToText(value.value);
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");
  if (
    Array.isArray(value?.text_arr) ||
    Object.prototype.hasOwnProperty.call(value, "record_ids") ||
    Object.prototype.hasOwnProperty.call(value, "link_record_ids")
  ) {
    return "";
  }

  return "";
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeDate(value: string) {
  if (!value) return "";
  if (/^\d+$/.test(value)) {
    const date = new Date(Number(value));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return value.split("T")[0].split(" ")[0];
}

function readField(fields: Record<string, any>, aliases: string[]) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(fields, alias)) {
      return fieldToText(fields[alias]);
    }
  }

  const normalizedAliases = aliases.map(normalizeFieldName);
  const matchingKey = Object.keys(fields).find((key) =>
    normalizedAliases.includes(normalizeFieldName(key))
  );

  return matchingKey ? fieldToText(fields[matchingKey]) : "";
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
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const workoutLogsTableId = process.env.FEISHU_WORKOUT_LOGS_TABLE_ID;

  if (!workoutLogsTableId) {
    return res.status(500).json({ error: "Missing workout logs table ID" });
  }

  try {
    const { clientId = "", clientName = "" } = req.query;
    const requestedClientId = String(clientId).toLowerCase();
    const requestedClientName = String(clientName).toLowerCase();

    // Cache the raw workout-logs scan (the slow part); the comment aggregation
    // below is cheap and runs per-request. Shares writers with workoutHistory.
    let commentItems = getCached<any[]>("workoutComments");
    if (!commentItems) {
      const token = await getTenantToken();
      commentItems = await fetchAllBitableRecords(
        process.env.FEISHU_BASE_APP_TOKEN as string,
        workoutLogsTableId as string,
        token
      );
      setCached("workoutComments", commentItems, 5 * 60 * 1000);
    }

    const commentMap = new Map<string, any>();

    for (const item of commentItems) {
      const fields = item.fields || {};
      const note = readField(fields, [
        "Client Comment",
        "Workout Comment",
        "Athlete Notes",
        "Client Notes",
        "Notes",
        "Session Notes",
      ]);
      const cleanNote = note.replace(/\n?\[Reviewed\]\s*$/i, "").trim();

      if (!cleanNote) continue;

      const logClientId = readField(fields, ["Client ID", "clientId"]);
      const logClientName = readField(fields, ["Client Name", "Athlete Name", "Athlete"]);
      const clientIdMatches =
        Boolean(requestedClientId) &&
        (logClientId.toLowerCase().includes(requestedClientId) ||
          logClientName.toLowerCase().includes(requestedClientId));
      const clientNameMatches =
        Boolean(requestedClientName) &&
        logClientName.toLowerCase().includes(requestedClientName);

      if ((requestedClientId || requestedClientName) && !clientIdMatches && !clientNameMatches) {
        continue;
      }

      const assignedWorkoutId = readField(fields, [
        "Assigned Workout ID",
        "Assigned Workout",
        "Workout ID",
      ]);
      const date = normalizeDate(readField(fields, ["Date", "Workout Date"]));
      const reviewedText = readField(fields, [
        "Coach Reviewed",
        "Comment Reviewed",
        "Reviewed",
      ]).toLowerCase();
      const reviewed =
        reviewedText === "true" ||
        reviewedText === "yes" ||
        reviewedText === "reviewed" ||
        /\[reviewed\]/i.test(note);
      const key = `${assignedWorkoutId || "workout"}-${date}-${cleanNote}`;
      const existing = commentMap.get(key);

      if (existing) {
        existing.recordIds.push(item.record_id);
        existing.exerciseNames = Array.from(
          new Set([
            ...existing.exerciseNames,
            readField(fields, ["Exercise Name", "Exercise"]),
          ].filter(Boolean))
        );
        existing.reviewed = existing.reviewed && reviewed;
        continue;
      }

      commentMap.set(key, {
        key,
        recordIds: [item.record_id],
        clientId: logClientId,
        clientName: logClientName,
        assignedWorkoutId,
        workoutName: readField(fields, ["Session Name", "Workout Name"]),
        exerciseNames: [readField(fields, ["Exercise Name", "Exercise"])].filter(
          Boolean
        ),
        date,
        note: cleanNote,
        noteEn: readField(fields, [
          "Client Comment EN",
          "Athlete Notes EN",
          "Notes EN",
          "Workout Comment EN",
        ]),
        reviewed,
      });
    }

    const comments = Array.from(commentMap.values()).sort((a, b) =>
      String(b.date).localeCompare(String(a.date))
    );

    return res.status(200).json({ comments });
  } catch (error: any) {
    return res.status(500).json({
      error: "Could not fetch workout comments",
      message: error.message,
    });
  }
}
