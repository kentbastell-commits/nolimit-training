import type { VercelRequest, VercelResponse } from "@vercel/node";

// Extract a single Bitable cell item to text. Handles link/lookup objects
// (which carry text/text_arr) and returns "" for empty links so an unresolved
// relation never leaks a raw JSON blob into the UI.
function itemToText(item: any): string {
  if (item === null || item === undefined) return "";
  if (typeof item === "string") return item;
  if (typeof item === "number") return String(item);
  if (typeof item === "boolean") return item ? "true" : "false";
  if (item.text) return String(item.text);
  if (Array.isArray(item.text_arr) && item.text_arr.length) {
    return item.text_arr.filter(Boolean).join(", ");
  }
  if (item.name) return String(item.name);
  if (item.value !== undefined) return fieldToText(item.value);
  if (Array.isArray(item.record_ids) && item.record_ids.length) {
    return item.record_ids.join(", ");
  }
  if (Array.isArray(item.link_record_ids) && item.link_record_ids.length) {
    return item.link_record_ids.join(", ");
  }
  return "";
}

function fieldToText(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";

  if (Array.isArray(value)) {
    return value.map(itemToText).filter(Boolean).join(", ");
  }

  return itemToText(value);
}

function readFirstField(fields: Record<string, any>, candidates: string[]) {
  const normalizedFields = new Map(
    Object.keys(fields).map((fieldName) => [
      fieldName.trim().toLowerCase(),
      fieldName,
    ])
  );

  for (const candidate of candidates) {
    const fieldName =
      normalizedFields.get(candidate.trim().toLowerCase()) || candidate;
    const value = fieldToText(fields[fieldName]);

    if (value) return value;
  }

  return "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const clientCode = String(req.query.clientCode || "");

    const tokenResponse = await fetch(
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

    const tokenData = await tokenResponse.json();

    if (!tokenData.tenant_access_token) {
      return res.status(500).json({
        error: "Could not get tenant access token",
        details: tokenData,
      });
    }

    // Paginate the assigned-workouts table — a single page would drop recent
    // assignments once the table exceeds one page (it's shared across clients).
    const allItems: any[] = [];
    let pageToken = "";
    do {
      const url = new URL(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID}/records`
      );
      url.searchParams.set("page_size", "500");
      if (pageToken) url.searchParams.set("page_token", pageToken);

      const recordsResponse = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${tokenData.tenant_access_token}` },
      });
      const recordsData = await recordsResponse.json();

      if (recordsData.code !== 0) {
        if (allItems.length === 0) {
          return res.status(500).json({
            error: "Could not fetch assigned workouts",
            details: recordsData,
          });
        }
        break;
      }

      allItems.push(...(recordsData.data?.items || []));
      pageToken = recordsData.data?.has_more ? recordsData.data.page_token : "";
    } while (pageToken);

    const workouts = allItems
      .map((item: any) => {
        const fields = item.fields || {};

        return {
          id: item.record_id,
          assignedWorkoutId: fieldToText(fields["Assigned Workout ID"]),
          clientId: fieldToText(fields["Client ID"]),
          programId: fieldToText(fields["Program ID"]),
          week: fieldToText(fields["Week"]),
          day: fieldToText(fields["Day"]),
          sessionName: fieldToText(fields["Session Name"]),
          sessionNameCn: readFirstField(fields, ["Session Name CN", "Name CN"]),
          sessionType: fieldToText(fields["Session Type"]),
          sessionGoal: fieldToText(fields["Session Goal"]),
          estimatedDuration: fieldToText(fields["Estimated Duration"]),
          intensity: fieldToText(fields["Intensity"]),
          scheduledDate: fieldToText(fields["Scheduled Date"]),
          completionStatus: fieldToText(fields["Completion Status"]),
          coachNotes: fieldToText(fields["Coach Notes"]),
          coachNotesCn: readFirstField(fields, ["Coach Notes CN", "Notes CN"]),
          clientNotes: fieldToText(fields["Client Notes"]),
          workoutLogs: fieldToText(fields["Workout Logs"]),
        };
      })
      .filter((workout: any) => {
        if (!clientCode) return true;
        return workout.clientId.includes(clientCode);
      });

    return res.status(200).json({ workouts });
  } catch (error: any) {
    return res.status(500).json({
      error: "Could not fetch workouts",
      message: error.message,
    });
  }
}
