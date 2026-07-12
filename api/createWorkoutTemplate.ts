import type { VercelRequest, VercelResponse } from "@vercel/node";
import { invalidateCache, getCached, setCached } from "./_cache.ts";

type ProgramExercise = {
  exerciseRecordId?: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: number;
  reps: string;
  load?: string;
  tempo: string;
  rest: string;
  coachingNotes: string;
  status?: string;
  targetSource?: string;
  targetMetric?: string;
  targetPercent?: string;
  targetAdjustment?: string;
  autoTarget?: boolean;
  displayTarget?: string;
};

function makeTemplateId() {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `WT-${random}`;
}

// Coerce free text to a number for Feishu Number fields. Returns undefined for
// blank / non-numeric so the field can be omitted (Feishu rejects "" on Number
// fields with NumberFieldConvFail).
function toNum(value: any): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const direct = Number(value);
  if (Number.isFinite(direct)) return direct;
  const match = String(value).match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

type ParsedSet = {
  setNumber: number;
  reps: string;
  load: string;
  percent: string;
  percentMas: string;
  intensityMode: string;
  intensityValue: string;
  tempo: string;
  rest: string;
};

type ParsedAlternate = {
  exerciseRecordId: string;
  exerciseId: string;
  exerciseName: string;
};

type ParsedMeta = {
  sectionName: string;
  exerciseLabel: string;
  groupType: string;
  groupName: string;
  trackingType: string;
  isUnilateral: boolean;
  isAccessory: boolean;
  accessoryParent: string;
  accessoryColor: string;
  setPrescriptions: ParsedSet[];
  alternates: ParsedAlternate[];
};

// Server-side port of the frontend parseExerciseNotes (src/App.tsx). Reads the
// "Coaching Notes" blob the builder serializes (buildExerciseCoachingNotes) so
// we can fan the structured data out to typed columns + child tables, while the
// blob itself stays the canonical read path.
function parseTemplateMeta(notes = ""): ParsedMeta {
  const meta: ParsedMeta = {
    sectionName: "",
    exerciseLabel: "",
    groupType: "",
    groupName: "",
    trackingType: "Weight",
    isUnilateral: false,
    isAccessory: false,
    accessoryParent: "",
    accessoryColor: "",
    setPrescriptions: [],
    alternates: [],
  };

  notes.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    const match = trimmed.match(
      /^(Section|Label|Superset|Circuit|Tracking|Unilateral|Accessory|Accessory Parent|Accessory Color|Set Prescriptions|Alternate Exercises):\s*(.+)$/i
    );

    if (!match) return;

    const key = match[1].toLowerCase();
    const value = match[2].trim();

    if (key === "section") meta.sectionName = value;
    if (key === "label") meta.exerciseLabel = value;
    if (key === "tracking") {
      const clean = value.toLowerCase();
      if (clean.includes("time")) meta.trackingType = "Time";
      else if (clean.includes("distance")) meta.trackingType = "Distance";
      else meta.trackingType = "Weight";
    }
    if (key === "unilateral") meta.isUnilateral = /^(yes|true|1|y)$/i.test(value);
    if (key === "accessory") meta.isAccessory = /^(yes|true|1|y)$/i.test(value);
    if (key === "accessory parent") meta.accessoryParent = value;
    if (key === "accessory color") meta.accessoryColor = value;
    if (key === "superset" || key === "circuit") {
      meta.groupType = key === "superset" ? "Superset" : "Circuit";
      meta.groupName = value;
    }
    if (key === "set prescriptions") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          meta.setPrescriptions = parsed
            .map((set: any, index: number) => ({
              setNumber: Number(set?.setNumber) || index + 1,
              reps: String(set?.reps || ""),
              load: String(set?.load || ""),
              percent: String(set?.percent || ""),
              percentMas: String(set?.percentMas || ""),
              intensityMode: String(set?.intensityMode || ""),
              intensityValue: String(set?.intensityValue || ""),
              tempo: String(set?.tempo || ""),
              rest: String(set?.rest || ""),
            }))
            .filter((set) => set.setNumber > 0);
        }
      } catch {
        // leave empty on malformed JSON
      }
    }
    if (key === "alternate exercises") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          meta.alternates = parsed
            .map((alt: any) => ({
              exerciseRecordId: String(alt?.exerciseRecordId || ""),
              exerciseId: String(alt?.exerciseId || ""),
              exerciseName: String(alt?.exerciseName || ""),
            }))
            .filter((alt) => alt.exerciseName || alt.exerciseId);
        }
      } catch {
        // leave empty on malformed JSON
      }
    }
  });

  return meta;
}

// Create records in chunks (Feishu batch_create caps per request). Resolves to
// { created, errors } and never throws, so child-table writes can fail softly
// without breaking the main template creation.
async function batchCreateRecords(
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
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records/batch_create`,
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
        if (item?.link) return item.link;
        if (item?.url) return item.url;
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

async function getTenantToken() {
  const tokenResponse = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET,
      }),
    }
  );

  const tokenData = await tokenResponse.json();

  if (!tokenData.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.tenant_access_token;
}

async function getRecords(tableId: string, token: string) {
  // Paginate — the exercise library can exceed one page (500). Without this,
  // exercises beyond the first page can't be found when saving a workout.
  const items: any[] = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({ page_size: "500" });
    if (pageToken) params.set("page_token", pageToken);

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
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
    } = req.body;

    if (!programId || !programRecordId || !week || !day || !sessionName) {
      return res.status(400).json({
        error: "Missing required fields",
        required: [
          "programId",
          "programRecordId",
          "week",
          "day",
          "sessionName",
        ],
        received: {
          programId,
          programRecordId,
          week,
          day,
          sessionName,
        },
      });
    }

    if (!Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({
        error: "No exercises provided",
      });
    }

    const token = await getTenantToken();

    // Only read the (large) exercise library when at least one exercise lacks a
    // resolved library record id. Programs built from the library already carry
    // it, so a typical save skips this fetch entirely.
    const needsLibraryLookup = exercises.some(
      (e: ProgramExercise) => !e.exerciseRecordId
    );
    const exerciseRecords = needsLibraryLookup
      ? await getRecords(
          process.env.FEISHU_EXERCISE_LIBRARY_TABLE_ID as string,
          token
        )
      : [];

    const metas: ParsedMeta[] = [];

    const records = exercises.map((exercise: ProgramExercise, index: number) => {
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
    });

    const createResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID}/records/batch_create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records,
        }),
      }
    );

    const createData = await createResponse.json();

    if (!createResponse.ok || createData.code !== 0) {
      return res.status(500).json({
        error: "Failed to create workout template records",
        larkResponse: createData,
        recordsSent: records,
      });
    }

    // Dual-write child tables: fan the parsed per-set prescriptions and
    // alternates out to their normalized tables, linked back to each template
    // record. Two-way links auto-populate the parent side. These writes are
    // best-effort — failures are reported but never fail the main save.
    const createdTemplates: any[] = createData?.data?.records || [];
    const setPrescriptionsTableId =
      process.env.FEISHU_SET_PRESCRIPTIONS_TABLE_ID;
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
      childWrites.setPrescriptions = await batchCreateRecords(
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
      childWrites.alternates = await batchCreateRecords(
        alternatesTableId,
        altRecords,
        token
      );
    } else if (!alternatesTableId && altRecords.length > 0) {
      childWrites.alternates = {
        skipped: "Missing FEISHU_EXERCISE_ALTERNATES_TABLE_ID",
      };
    }

    invalidateCache("workoutTemplatesRaw");
    invalidateCache("programs");

    // /api/programs resolves each program's Session Type from a long-lived
    // programId->type map (programSessionTypes). Adding a new session here would
    // otherwise be invisible to that map for up to 30 min — so the session's
    // type never surfaces in the Sessions list or the calendar's Session Type
    // filter. Patch the entry in place (keyed by both program code and record
    // id, matching how the map is built) so it's live immediately without a full
    // templates-table rebuild.
    const typeMap = getCached<Record<string, string>>("programSessionTypes");
    if (typeMap) {
      const type = String(sessionType || "Strength");
      if (programId) typeMap[programId] = type;
      if (programRecordId) typeMap[programRecordId] = type;
      setCached("programSessionTypes", typeMap, 30 * 60 * 1000);
    }

    return res.status(200).json({
      success: true,
      recordsCreated: createData?.data?.records?.length || records.length,
      programId,
      programRecordId,
      childWrites,
      larkResponse: createData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
