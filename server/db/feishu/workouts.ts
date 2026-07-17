import { listRecords } from "./client.ts";
import { fetchAllBitableRecords } from "../../../api/_pagination.ts";
import type { WorkoutDTO } from "../dto.ts";
import type {
  AssignProgramInput,
  DuplicateWorkoutInput,
  UpdateWorkoutDateInput,
  WorkoutWriteResult,
} from "../repositories/workouts.ts";

// Verbatim from api/workouts.ts: returns "" for empty links so an unresolved
// relation never leaks a raw JSON blob (the data-integrity fix).
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
  if (Array.isArray(value)) return value.map(itemToText).filter(Boolean).join(", ");
  return itemToText(value);
}

function readFirstField(fields: Record<string, any>, candidates: string[]) {
  const normalizedFields = new Map(
    Object.keys(fields).map((f) => [f.trim().toLowerCase(), f])
  );
  for (const candidate of candidates) {
    const fieldName = normalizedFields.get(candidate.trim().toLowerCase()) || candidate;
    const value = fieldToText(fields[fieldName]);
    if (value) return value;
  }
  return "";
}

export async function listAllWorkouts(): Promise<WorkoutDTO[]> {
  const items = await listRecords(process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID as string);
  return items.map((item: any) => {
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
      // Internal-load metrics (coach-only) captured at workout finish.
      sessionRpe: fieldToText(fields["Session RPE"]),
      sessionDuration: fieldToText(fields["Session Duration"]),
      sessionLoad: fieldToText(fields["Session Load"]),
      coachReviewed: /^(true|reviewed|yes|1)$/i.test(
        fieldToText(fields["Coach Reviewed"])
      ),
    };
  });
}

/* ------------------------------- writes ---------------------------------- */
// Logic moved verbatim from api/assignProgram.ts, api/updateAssignedProgramDate.ts,
// api/duplicateAssignedWorkout.ts and api/setWorkoutReviewed.ts. Each function
// keeps its handler's exact token semantics (inline fetch, per-handler error
// bodies) so the response shapes and unit-tested failure paths are unchanged.

function makeAssignedWorkoutId() {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `AW-${random}`;
}

// Raw token fetch (NOT the cached api/_token.ts one): these handlers surfaced
// token failures as their own response bodies on every call, so the fetch has
// to happen — and fail — per call.
async function fetchTenantTokenRaw(): Promise<any> {
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
  return response.json();
}

export async function assignProgram(input: AssignProgramInput): Promise<WorkoutWriteResult> {
  const { targetClientIds, programRecordId, scheduledWorkouts } = input;

  const tokenData = await fetchTenantTokenRaw();
  if (!tokenData.tenant_access_token) {
    return {
      success: false,
      error: "Could not get Lark tenant access token",
      larkResponse: tokenData,
    };
  }

  // One workout record per (client × scheduled workout) so a single call can
  // populate a whole team.
  const records = targetClientIds.flatMap((cid: string) =>
    scheduledWorkouts.map((workout) => {
      const fields: Record<string, any> = {
        "Assigned Workout ID": makeAssignedWorkoutId(),

        // Duplex link fields
        "Client ID": [cid],
        "Program ID": [programRecordId],

        Week: Number(workout.week),
        Day: Number(workout.day),
        "Session Name": workout.sessionName,
        "Session Type": workout.sessionType || "Strength",
        "Session Goal": workout.sessionGoal || "",
        Intensity: workout.intensity || "Moderate",

        // Lark date fields usually want timestamp
        "Scheduled Date": new Date(workout.scheduledDate).getTime(),

        "Completion Status": "Scheduled",
      };

      // "Estimated Duration" is a Number field — only send a real number, never
      // "" (which Feishu rejects with NumberFieldConvFail).
      const durationNumber = Number(workout.estimatedDuration);
      if (Number.isFinite(durationNumber) && durationNumber > 0) {
        fields["Estimated Duration"] = durationNumber;
      }

      if (workout.sessionNameCn) {
        fields["Session Name CN"] = workout.sessionNameCn;
      }

      return { fields };
    })
  );

  const createResponse = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID}/records/batch_create`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.tenant_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records }),
    }
  );

  const createData = await createResponse.json();

  if (!createResponse.ok || createData.code !== 0) {
    return {
      success: false,
      error: "Failed to assign program",
      larkResponse: createData,
      recordsSent: records,
    };
  }

  return {
    success: true,
    recordsCreated: createData?.data?.records?.length || records.length,
    larkResponse: createData,
  };
}

export async function updateAssignedWorkoutDate(
  input: UpdateWorkoutDateInput
): Promise<WorkoutWriteResult> {
  const { assignedWorkoutRecordId, assignedWorkoutId, scheduledDate } = input;

  const tokenData = await fetchTenantTokenRaw();
  if (!tokenData.tenant_access_token) {
    return {
      success: false,
      error: "Could not get Lark tenant token",
      larkResponse: tokenData,
    };
  }

  let recordId = assignedWorkoutRecordId;

  if (!String(recordId || "").startsWith("rec") && assignedWorkoutId) {
    const items = await fetchAllBitableRecords(
      process.env.FEISHU_BASE_APP_TOKEN as string,
      process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID as string,
      tokenData.tenant_access_token
    );
    const match = items.find((item: any) => {
      return fieldToText(item.fields?.["Assigned Workout ID"]) ===
        String(assignedWorkoutId);
    });

    recordId = match?.record_id || recordId;
  }

  const updateResponse = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID}/records/${recordId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${tokenData.tenant_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          "Scheduled Date": new Date(scheduledDate).getTime(),
        },
      }),
    }
  );

  const updateData = await updateResponse.json();

  if (!updateResponse.ok || updateData.code !== 0) {
    return {
      success: false,
      error: "Failed to update assigned workout date",
      larkResponse: updateData,
    };
  }

  return {
    success: true,
    assignedWorkoutRecordId: recordId,
    assignedWorkoutId,
    scheduledDate,
    larkResponse: updateData,
  };
}

function toLarkDate(value?: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  const [year, month, day] = value.split("-").map(Number);
  if (year && month && day) {
    return new Date(year, month - 1, day).getTime();
  }
  return new Date(value).getTime();
}

// Throwing token fetch — duplicate/setReviewed reported token failures via
// their generic catch ("Server error" + message), not a dedicated body.
async function getTenantTokenOrThrow(): Promise<string> {
  const data = await fetchTenantTokenRaw();
  if (!data.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(data)}`);
  }
  return data.tenant_access_token;
}

export async function duplicateAssignedWorkout(
  input: DuplicateWorkoutInput
): Promise<WorkoutWriteResult> {
  const { assignedWorkoutRecordId, scheduledDate } = input;
  const tableId = process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID;

  if (!tableId) {
    return {
      success: false,
      error: "Missing FEISHU_ASSIGNED_WORKOUTS_TABLE_ID",
    };
  }

  const token = await getTenantTokenOrThrow();
  const readResponse = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records/${assignedWorkoutRecordId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const readData = await readResponse.json();

  if (!readResponse.ok || readData.code !== 0) {
    return {
      success: false,
      error: "Could not read assigned workout",
      larkResponse: readData,
    };
  }

  const sourceFields = readData.data.record.fields || {};
  const fields = {
    ...sourceFields,
    "Assigned Workout ID": makeAssignedWorkoutId(),
    "Scheduled Date": toLarkDate(scheduledDate),
    "Completion Status": "Scheduled",
  };

  delete fields["Workout Logs"];
  delete fields["Workout Logs1"];
  delete fields.SourceID;

  const createResponse = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );
  const createData = await createResponse.json();

  if (!createResponse.ok || createData.code !== 0) {
    return {
      success: false,
      error: "Could not duplicate assigned workout",
      larkResponse: createData,
      fieldsSent: fields,
    };
  }

  return {
    success: true,
    recordId: createData.data.record.record_id,
    larkResponse: createData,
  };
}

export async function setWorkoutReviewed(
  assignedWorkoutRecordId: string,
  reviewed: unknown
): Promise<WorkoutWriteResult> {
  const token = await getTenantTokenOrThrow();
  const app = process.env.FEISHU_BASE_APP_TOKEN;
  const table = process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID;

  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${app}/tables/${table}/records/${assignedWorkoutRecordId}`;
  // "Coach Reviewed" is a checkbox field (boolean).
  let result = await (
    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: { "Coach Reviewed": Boolean(reviewed) },
      }),
    })
  ).json();

  // Fall back to a text value if the field happens to be text, not checkbox.
  if (result.code !== 0) {
    result = await (
      await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: { "Coach Reviewed": reviewed ? "Reviewed" : "" },
        }),
      })
    ).json();
  }

  if (result.code !== 0) {
    return { success: false, details: result };
  }
  return { success: true };
}
