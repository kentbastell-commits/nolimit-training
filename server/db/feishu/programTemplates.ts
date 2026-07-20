import { appToken, getTenantToken } from "./client.ts";
import type { TemplateRow } from "../dto.ts";
import { getCached, setCached } from "../../../api/_cache.ts";
import { parseTemplateMeta, toNum } from "../templateMeta.ts";
import type { ParsedMeta, ProgramExerciseInput } from "../templateMeta.ts";
import type {
  HandlerResult,
  CreateWorkoutTemplateInput,
} from "../repositories/programTemplates.ts";

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
        if (item?.link) return item.link;
        if (item?.url) return item.url;
        if (item?.record_ids) return item.record_ids.join(", ");
        return "";
      })
      .join(", ");
  }
  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.link) return value.link;
  if (value?.url) return value.url;
  return "";
}

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

// Full templates-table scan, shared (and slow), so the RAW items are cached
// under "workoutTemplatesRaw" — the same key api/workoutDetails warms — and
// template writers invalidate it (prefix). Each page retries a few times:
// Feishu throttles after heavy writes (1254607 "Data not ready"), and new
// template rows live on the LAST page — a silently dropped page means a
// program looks empty. A partial (truncated) scan is NEVER cached: a truncated
// snapshot makes every program on the missing pages look empty for the TTL.
async function fetchAllTemplateItems(): Promise<any[]> {
  const cached = getCached<any[]>("workoutTemplatesRaw");
  if (cached) return cached;

  const token = await getTenantToken();
  const allItems: any[] = [];
  let pageToken = "";
  let truncated = false;
  do {
    const url = new URL(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID}/records`
    );
    url.searchParams.set("page_size", "500");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    let pageData: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const recordsResponse = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      pageData = await recordsResponse.json();
      if (pageData?.data?.items) break;
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    if (!pageData?.data?.items) {
      if (allItems.length === 0) {
        const error: any = new Error(
          `No workout template records returned: ${JSON.stringify(pageData)}`
        );
        error.kind = "templatesEmpty";
        error.larkResponse = pageData;
        throw error;
      }
      truncated = true;
      break;
    }

    allItems.push(...pageData.data.items);
    pageToken = pageData.data.has_more ? pageData.data.page_token : "";
  } while (pageToken);

  if (!truncated) {
    setCached("workoutTemplatesRaw", allItems, 10 * 60 * 1000);
  }
  return allItems;
}

export async function listAllTemplateRows(): Promise<TemplateRow[]> {
  const items = await fetchAllTemplateItems();
  return items.map((item: any) => {
    const fields = item.fields || {};
    return {
      recordId: item.record_id,
      programId: fieldToText(fields["Program ID"]),
      programRecordIds: extractRecordIds(fields["Program ID"]),
      week: Number(fieldToText(fields["Week"])) || 1,
      day: Number(fieldToText(fields["Day"])) || 1,
      sessionName: fieldToText(fields["Session Name"]),
      sessionNameCn: fieldToText(fields["Session Name CN"]),
      sessionType: fieldToText(fields["Session Type"]),
      sessionGoal: fieldToText(fields["Session Goal"]),
      estimatedDuration: fieldToText(fields["Estimated Duration"]),
      intensity: fieldToText(fields["Intensity"]),
      isSingleWorkout: /^(true|yes|1)$/i.test(fieldToText(fields["Is Single Workout"])),
      exerciseName: fieldToText(fields["Exercise Name"]),
      exerciseId: fieldToText(fields["Exercise ID"]),
      exerciseRecordId: extractRecordIds(fields["Exercise ID"])[0] || "",
      order: Number(fieldToText(fields["Order"])) || 0,
      sets: fieldToText(fields["Sets"]),
      reps: fieldToText(fields["Reps"]),
      tempo: fieldToText(fields["Tempo"]),
      rest: fieldToText(fields["Rest"]),
      notes: fieldToText(fields["Coaching Notes"]),
    };
  });
}

/* ---------------------------------- writes -------------------------------- */
// createWorkoutTemplate moved verbatim from api/createWorkoutTemplate.ts:
// batch-creates one template row per exercise, then dual-writes the parsed
// set-prescription / alternate child tables (best-effort — child failures are
// reported but never fail the main save).

function makeTemplateId() {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `WT-${random}`;
}

// Create records in chunks (Feishu batch_create caps per request). Resolves to
// { created, errors } (created is a COUNT — the legacy response shape) and
// never throws, so child-table writes can fail softly.
async function batchCreateCounted(
  tableId: string,
  records: { fields: Record<string, any> }[],
  token: string
) {
  const errors: any[] = [];
  let total = 0;

  for (let i = 0; i < records.length; i += 200) {
    const chunk = records.slice(i, i + 200);
    try {
      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/records/batch_create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ records: chunk }),
        }
      );
      const data = await response.json();
      if (!response.ok || data.code !== 0) {
        errors.push(data);
      } else {
        total += data?.data?.records?.length || chunk.length;
      }
    } catch (error: any) {
      errors.push({ message: error?.message || String(error) });
    }
  }

  return { created: total, errors };
}

// Paginated raw scan (the exercise library can exceed one page). Throws the
// legacy "Could not load records" message on an error page.
async function getRecordsRaw(tableId: string, token: string) {
  const items: any[] = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({ page_size: "500" });
    if (pageToken) params.set("page_token", pageToken);

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/records?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await response.json();

    if (!data?.data?.items) {
      throw new Error(`Could not load records: ${JSON.stringify(data)}`);
    }

    items.push(...data.data.items);
    pageToken = data.data.page_token || "";

    if (!data.data.has_more) break;
  } while (pageToken);

  return items;
}

export async function createWorkoutTemplate(
  input: CreateWorkoutTemplateInput
): Promise<HandlerResult> {
  const {
    programId,
    programRecordId,
    week,
    day,
    sessionName,
    sessionNameCn,
    sessionType,
    sessionGoal,
    estimatedDuration,
    intensity,
    isSingleWorkout,
    exercises,
  } = input;

  const token = await getTenantToken();

  // Only read the (large) exercise library when at least one exercise lacks a
  // resolved library record id. Programs built from the library already carry
  // it, so a typical save skips this fetch entirely.
  const needsLibraryLookup = exercises.some(
    (e: ProgramExerciseInput) => !e.exerciseRecordId
  );
  const exerciseRecords = needsLibraryLookup
    ? await getRecordsRaw(
        process.env.FEISHU_EXERCISE_LIBRARY_TABLE_ID as string,
        token
      )
    : [];

  const metas: ParsedMeta[] = [];

  const records = exercises.map(
    (exercise: ProgramExerciseInput, index: number) => {
      let exerciseLinkId = exercise.exerciseRecordId;
      if (!exerciseLinkId) {
        const matchingExercise = exerciseRecords.find((item: any) => {
          const fields = item.fields || {};
          return fieldToText(fields["Exercise ID"]) === exercise.exerciseId;
        });
        if (!matchingExercise) {
          throw new Error(
            `Exercise not found in Exercise Library: ${exercise.exerciseId}`
          );
        }
        exerciseLinkId = matchingExercise.record_id;
      }

      const meta = parseTemplateMeta(exercise.coachingNotes || "");
      metas.push(meta);

      const fields: Record<string, any> = {
        "Template ID": makeTemplateId(),

        // Duplex link fields must be arrays of record IDs
        "Program ID": [programRecordId],
        "Exercise ID": [exerciseLinkId],

        Week: Number(week),
        Day: Number(day),
        "Session Name": sessionName,
        "Session Name CN": String(sessionNameCn || ""),
        "Session Type": String(sessionType || "Strength"),
        "Session Goal": String(sessionGoal || ""),
        Intensity: String(intensity || "Moderate"),
        "Is Single Workout": Boolean(isSingleWorkout),

        Order: Number(exercise.order) || index + 1,
        Sets: Number(exercise.sets) || 1,
        Reps: String(exercise.reps || ""),
        Tempo: String(exercise.tempo || ""),
        Rest: String(exercise.rest || ""),
        // Per-set loads (including "% 1RM" targets) and target metadata are
        // serialized into "Coaching Notes" (see buildExerciseCoachingNotes),
        // so they round-trip without dedicated Feishu columns. Do not add a
        // top-level "Load"/"Target *" field here unless those columns exist
        // in the Workout Templates table — Feishu rejects unknown fields.
        "Coaching Notes": String(exercise.coachingNotes || ""),
        Status: String(exercise.status || "Active"),

        // Normalized typed columns (dual-write). These mirror the meta lines in
        // the "Coaching Notes" blob so the data is migration-ready. The blob
        // stays canonical for reads; these are written in addition.
        "Is Unilateral": meta.isUnilateral,
        "Is Accessory": meta.isAccessory,
      };

      if (meta.sectionName) fields["Section Name"] = meta.sectionName;
      if (meta.exerciseLabel) fields["Exercise Label"] = meta.exerciseLabel;
      if (meta.groupType) fields["Group Type"] = meta.groupType;
      if (meta.groupName) fields["Group Name"] = meta.groupName;
      if (meta.trackingType) fields["Tracking Type"] = meta.trackingType;
      if (meta.accessoryParent) fields["Accessory Parent"] = meta.accessoryParent;
      if (meta.accessoryColor) fields["Accessory Color"] = meta.accessoryColor;

      // "Estimated Duration" is a Number field in Feishu — only send it when
      // it is a real number. Sending "" (the common empty case) makes Feishu
      // reject the whole batch with NumberFieldConvFail.
      const durationNumber = Number(estimatedDuration);
      if (Number.isFinite(durationNumber) && durationNumber > 0) {
        fields["Estimated Duration"] = durationNumber;
      }

      return { fields };
    }
  );

  const createResponse = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID}/records/batch_create`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records }),
    }
  );

  const createData = await createResponse.json();

  if (!createResponse.ok || createData.code !== 0) {
    return {
      status: 500,
      body: {
        error: "Failed to create workout template records",
        larkResponse: createData,
        recordsSent: records,
      },
    };
  }

  // Dual-write child tables: fan the parsed per-set prescriptions and
  // alternates out to their normalized tables, linked back to each template
  // record. Two-way links auto-populate the parent side. These writes are
  // best-effort — failures are reported but never fail the main save.
  const createdTemplates: any[] = createData?.data?.records || [];
  const setPrescriptionsTableId = process.env.FEISHU_SET_PRESCRIPTIONS_TABLE_ID;
  const alternatesTableId = process.env.FEISHU_EXERCISE_ALTERNATES_TABLE_ID;

  const setRecords: { fields: Record<string, any> }[] = [];
  const altRecords: { fields: Record<string, any> }[] = [];

  createdTemplates.forEach((record: any, index: number) => {
    const templateRecordId = record.record_id;
    const meta = metas[index];
    if (!templateRecordId || !meta) return;

    meta.setPrescriptions.forEach((set) => {
      const fields: Record<string, any> = {
        "Prescription ID": `SP-${Date.now()}-${setRecords.length + 1}`,
        "Template ID": [templateRecordId],
        "Set Number": set.setNumber,
      };
      if (set.reps) fields["Reps"] = set.reps;
      if (set.load) fields["Load"] = set.load;
      if (set.intensityValue) fields["Intensity Value"] = set.intensityValue;
      if (set.tempo) fields["Tempo"] = set.tempo;
      if (set.intensityMode) fields["Intensity Mode"] = set.intensityMode;
      const percent = toNum(set.percent);
      if (percent !== undefined) fields["Percent"] = percent;
      const percentMas = toNum(set.percentMas);
      if (percentMas !== undefined) fields["Percent MAS"] = percentMas;
      const rest = toNum(set.rest);
      if (rest !== undefined) fields["Rest"] = rest;
      setRecords.push({ fields });
    });

    meta.alternates.forEach((alt) => {
      const fields: Record<string, any> = {
        "Alternate ID": `ALT-${Date.now()}-${altRecords.length + 1}`,
        "Template ID": [templateRecordId],
      };
      if (alt.exerciseName) fields["Exercise Name"] = alt.exerciseName;
      if (alt.exerciseRecordId) fields["Exercise ID"] = [alt.exerciseRecordId];
      altRecords.push({ fields });
    });
  });

  const childWrites: Record<string, any> = {};

  if (setPrescriptionsTableId && setRecords.length > 0) {
    childWrites.setPrescriptions = await batchCreateCounted(
      setPrescriptionsTableId,
      setRecords,
      token
    );
  } else if (!setPrescriptionsTableId && setRecords.length > 0) {
    childWrites.setPrescriptions = {
      skipped: "Missing FEISHU_SET_PRESCRIPTIONS_TABLE_ID",
    };
  }

  if (alternatesTableId && altRecords.length > 0) {
    childWrites.alternates = await batchCreateCounted(
      alternatesTableId,
      altRecords,
      token
    );
  } else if (!alternatesTableId && altRecords.length > 0) {
    childWrites.alternates = {
      skipped: "Missing FEISHU_EXERCISE_ALTERNATES_TABLE_ID",
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      recordsCreated: createData?.data?.records?.length || records.length,
      programId,
      programRecordId,
      childWrites,
      larkResponse: createData,
    },
  };
}

/* ------------------------- bulk (whole-program) save ---------------------- */
// The per-session createWorkoutTemplate above does 3 Feishu round-trips PER
// session (template + set-prescriptions + alternates). Saving a whole program
// that way is N×3 round-trips at 4-8s each. This bulk path flattens every
// session's rows into aggregated chunked batch_creates — a whole program in
// ~3 round-trips total. Field/child building MIRRORS the single path above;
// keep them in sync. Atomic: if the template write can't fully complete it
// rolls back everything it created and returns failure, so the caller can
// safely fall back to the proven per-session loop with no duplicate rows.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Resolve an exercise's Feishu library record id (carried, or looked up).
function resolveExerciseLinkId(
  exercise: ProgramExerciseInput,
  exerciseRecords: any[]
): string {
  if (exercise.exerciseRecordId) return exercise.exerciseRecordId;
  const match = exerciseRecords.find(
    (item: any) => fieldToText(item.fields?.["Exercise ID"]) === exercise.exerciseId
  );
  if (!match) {
    throw new Error(`Exercise not found in Exercise Library: ${exercise.exerciseId}`);
  }
  return match.record_id;
}

// Build one template-row `fields` object + its parsed meta. Mirrors the field
// map in createWorkoutTemplate above.
function buildTemplateRecord(
  session: BulkSessionInput & { programRecordId: string },
  exercise: ProgramExerciseInput,
  index: number,
  exerciseLinkId: string
): { record: { fields: Record<string, any> }; meta: ParsedMeta } {
  const meta = parseTemplateMeta(exercise.coachingNotes || "");
  const fields: Record<string, any> = {
    "Template ID": makeTemplateId(),
    "Program ID": [session.programRecordId],
    "Exercise ID": [exerciseLinkId],
    Week: Number(session.week),
    Day: Number(session.day),
    "Session Name": session.sessionName,
    "Session Name CN": String(session.sessionNameCn || ""),
    "Session Type": String(session.sessionType || "Strength"),
    "Session Goal": String(session.sessionGoal || ""),
    Intensity: String(session.intensity || "Moderate"),
    "Is Single Workout": Boolean(session.isSingleWorkout),
    Order: Number(exercise.order) || index + 1,
    Sets: Number(exercise.sets) || 1,
    Reps: String(exercise.reps || ""),
    Tempo: String(exercise.tempo || ""),
    Rest: String(exercise.rest || ""),
    "Coaching Notes": String(exercise.coachingNotes || ""),
    Status: String(exercise.status || "Active"),
    "Is Unilateral": meta.isUnilateral,
    "Is Accessory": meta.isAccessory,
  };
  if (meta.sectionName) fields["Section Name"] = meta.sectionName;
  if (meta.exerciseLabel) fields["Exercise Label"] = meta.exerciseLabel;
  if (meta.groupType) fields["Group Type"] = meta.groupType;
  if (meta.groupName) fields["Group Name"] = meta.groupName;
  if (meta.trackingType) fields["Tracking Type"] = meta.trackingType;
  if (meta.accessoryParent) fields["Accessory Parent"] = meta.accessoryParent;
  if (meta.accessoryColor) fields["Accessory Color"] = meta.accessoryColor;
  const durationNumber = Number(session.estimatedDuration);
  if (Number.isFinite(durationNumber) && durationNumber > 0) {
    fields["Estimated Duration"] = durationNumber;
  }
  return { record: { fields }, meta };
}

// batch_create that RETURNS the created records (in input order) so children
// can link to them. Chunks at 100, retries a failed chunk once (Feishu throttle
// 1254607 after heavy writes). Stops at the first unrecoverable chunk.
async function batchCreateReturning(
  tableId: string,
  records: { fields: Record<string, any> }[],
  token: string
): Promise<{ created: any[]; error: any | null }> {
  const created: any[] = [];
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/records/batch_create`;
  for (let i = 0; i < records.length; i += 100) {
    const chunk = records.slice(i, i + 100);
    let ok = false;
    let lastData: any = null;
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      if (attempt > 0) await sleep(2500);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ records: chunk }),
        });
        lastData = await res.json();
        if (res.ok && lastData.code === 0) {
          created.push(...(lastData?.data?.records || []));
          ok = true;
        }
      } catch (error: any) {
        lastData = { message: error?.message || String(error) };
      }
    }
    if (!ok) return { created, error: lastData };
  }
  return { created, error: null };
}

// Undo a partial template write (rollback) so a fallback re-save won't dupe.
async function batchDeleteRecords(tableId: string, recordIds: string[], token: string) {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/records/batch_delete`;
  for (let i = 0; i < recordIds.length; i += 500) {
    try {
      await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ records: recordIds.slice(i, i + 500) }),
      });
    } catch {
      /* best-effort rollback */
    }
  }
}

export type BulkSessionInput = Omit<
  CreateWorkoutTemplateInput,
  "programId" | "programRecordId"
>;

export async function createWorkoutTemplatesBulk(input: {
  programId: string;
  programRecordId: string;
  sessions: BulkSessionInput[];
}): Promise<HandlerResult> {
  const { programRecordId, sessions } = input;
  const templatesTableId = process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID as string;
  const token = await getTenantToken();

  // One library read for the whole program (only if some exercise lacks a
  // resolved record id — library-built programs skip it entirely).
  const needsLibraryLookup = sessions.some((s) =>
    s.exercises.some((e: ProgramExerciseInput) => !e.exerciseRecordId)
  );
  const exerciseRecords = needsLibraryLookup
    ? await getRecordsRaw(process.env.FEISHU_EXERCISE_LIBRARY_TABLE_ID as string, token)
    : [];

  // Flatten every session's exercises into one record list (+ parallel metas).
  const records: { fields: Record<string, any> }[] = [];
  const metas: ParsedMeta[] = [];
  for (const session of sessions) {
    session.exercises.forEach((exercise: ProgramExerciseInput, index: number) => {
      const linkId = resolveExerciseLinkId(exercise, exerciseRecords);
      const { record, meta } = buildTemplateRecord(
        { ...session, programRecordId },
        exercise,
        index,
        linkId
      );
      records.push(record);
      metas.push(meta);
    });
  }

  if (records.length === 0) {
    return { status: 200, body: { success: true, recordsCreated: 0, sessionsSaved: 0, childWrites: {} } };
  }

  // 1. Templates (the required write) — aggregated + returning ids.
  const { created, error } = await batchCreateReturning(templatesTableId, records, token);
  if (error || created.length !== records.length) {
    await batchDeleteRecords(
      templatesTableId,
      created.map((r) => r.record_id).filter(Boolean),
      token
    );
    return {
      status: 500,
      body: {
        error: "Failed to create workout template records",
        larkResponse: error,
        rolledBack: created.length,
      },
    };
  }

  // 2. Child tables (set prescriptions + alternates) — best-effort, in parallel.
  const setPrescriptionsTableId = process.env.FEISHU_SET_PRESCRIPTIONS_TABLE_ID;
  const alternatesTableId = process.env.FEISHU_EXERCISE_ALTERNATES_TABLE_ID;
  const setRecords: { fields: Record<string, any> }[] = [];
  const altRecords: { fields: Record<string, any> }[] = [];

  created.forEach((record: any, index: number) => {
    const templateRecordId = record.record_id;
    const meta = metas[index];
    if (!templateRecordId || !meta) return;
    meta.setPrescriptions.forEach((set) => {
      const fields: Record<string, any> = {
        "Prescription ID": `SP-${Date.now()}-${setRecords.length + 1}`,
        "Template ID": [templateRecordId],
        "Set Number": set.setNumber,
      };
      if (set.reps) fields["Reps"] = set.reps;
      if (set.load) fields["Load"] = set.load;
      if (set.intensityValue) fields["Intensity Value"] = set.intensityValue;
      if (set.tempo) fields["Tempo"] = set.tempo;
      if (set.intensityMode) fields["Intensity Mode"] = set.intensityMode;
      const percent = toNum(set.percent);
      if (percent !== undefined) fields["Percent"] = percent;
      const percentMas = toNum(set.percentMas);
      if (percentMas !== undefined) fields["Percent MAS"] = percentMas;
      const rest = toNum(set.rest);
      if (rest !== undefined) fields["Rest"] = rest;
      setRecords.push({ fields });
    });
    meta.alternates.forEach((alt) => {
      const fields: Record<string, any> = {
        "Alternate ID": `ALT-${Date.now()}-${altRecords.length + 1}`,
        "Template ID": [templateRecordId],
      };
      if (alt.exerciseName) fields["Exercise Name"] = alt.exerciseName;
      if (alt.exerciseRecordId) fields["Exercise ID"] = [alt.exerciseRecordId];
      altRecords.push({ fields });
    });
  });

  const childWrites: Record<string, any> = {};
  const [setResult, altResult] = await Promise.all([
    setPrescriptionsTableId && setRecords.length > 0
      ? batchCreateCounted(setPrescriptionsTableId, setRecords, token)
      : Promise.resolve(null),
    alternatesTableId && altRecords.length > 0
      ? batchCreateCounted(alternatesTableId, altRecords, token)
      : Promise.resolve(null),
  ]);
  if (setResult) childWrites.setPrescriptions = setResult;
  if (altResult) childWrites.alternates = altResult;

  return {
    status: 200,
    body: {
      success: true,
      recordsCreated: created.length,
      sessionsSaved: sessions.length,
      childWrites,
    },
  };
}
