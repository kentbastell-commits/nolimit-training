// Server-side port of the frontend parseExerciseNotes (src/App.tsx). Reads the
// "Coaching Notes" blob the builder serializes (buildExerciseCoachingNotes) so
// createWorkoutTemplate can fan the structured data out to typed columns +
// child tables, while the blob itself stays the canonical read path. Shared by
// both backend impls (moved verbatim from api/createWorkoutTemplate.ts).

export type ProgramExerciseInput = {
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
  coachingNotesCn?: string;
  status?: string;
  targetSource?: string;
  targetMetric?: string;
  targetPercent?: string;
  targetAdjustment?: string;
  autoTarget?: boolean;
  displayTarget?: string;
};

export type ParsedSet = {
  setNumber: number;
  reps: string;
  load: string;
  percent: string;
  percentMas: string;
  intensityMode: string;
  intensityValue: string;
  tempo: string;
  rest: string;
  rpe: string;
  rir: string;
  time: string;
  distance: string;
};

export type ParsedAlternate = {
  exerciseRecordId: string;
  exerciseId: string;
  exerciseName: string;
};

export type ParsedMeta = {
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

// Coerce free text to a number. Returns undefined for blank / non-numeric so
// the field can be omitted (Feishu rejects "" on Number fields; pg gets null).
export function toNum(value: any): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const direct = Number(value);
  if (Number.isFinite(direct)) return direct;
  const match = String(value).match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseTemplateMeta(notes = ""): ParsedMeta {
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
      /^(Section|Section Color|Label|Label Mode|Superset|Circuit|Tracking|Unilateral|Accessory|Accessory Parent|Accessory Color|Set Prescriptions|Alternate Exercises):\s*(.+)$/i
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
              rpe: String(set?.rpe || ""),
              rir: String(set?.rir || ""),
              time: String(set?.time || ""),
              distance: String(set?.distance || ""),
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

// Port of src/appCore.ts stripLocalizedExerciseMeta. The English note keeps
// its metadata block (Section/Tracking/Set Prescriptions…) because both
// clients PARSE it; the Chinese note only ever needs the coach's prose. 323
// legacy coaching_notes_cn rows carry a machine translation of the whole
// block (板块/标签/组次规划 JSON) from before the translator stripped meta
// lines (4c5c9f8), and the released mini program (2026.9.17.4) renders
// notesCn raw on the workout card — so the server strips it (CLAUDE.md #47).
const EN_META_LINE =
  /^\s*(?:Section|Section Color|Label|Label Mode|Superset|Circuit|Circuit Mode|Circuit Minutes|Tracking|Fields|Unilateral|Accessory|Accessory Parent|Accessory Color|Set Prescriptions|Alternate Exercises|Target[^:：]*)\s*[:：]/i;
// Keep in sync with src/appCore.ts: a Chinese label plus colon is not enough
// to identify metadata (e.g. "第1组：保持30秒" is essential coaching prose).
const CN_META_LINE = /^\s*(?:板块|部分|区块|章节|训练板块|区段|板块颜色|区块颜色|标签|标签模式|超级组|超组|循环|循环模式|循环分钟|循环时长|追踪|追踪项|追踪类型|追踪指标|跟踪|跟踪项|跟踪类型|跟踪指标|记录类型|字段|单侧|单侧训练|单侧动作|辅助|辅助动作|辅具|辅助父项|辅助父动作|附件父项|辅助颜色|辅具颜色|组次规划|组次处方|每组处方|组处方|组数|替代动作|备选动作|目标来源|目标指标|目标百分比|目标调整|自动目标|显示目标)\s*[:：]/;
const META_JSON_FRAGMENT =
  /^\s*[[\]{}]|"(?:setNumber|reps|load|percent|percentMas|intensityMode|intensityValue|rpe|rir|time|tempo|rest|exerciseRecordId|exerciseId|exerciseName)"\s*:/;

export function stripLocalizedExerciseMeta(note = ""): string {
  return String(note || "")
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (EN_META_LINE.test(trimmed)) return false;
      if (CN_META_LINE.test(trimmed)) return false;
      if (META_JSON_FRAGMENT.test(trimmed)) return false;
      return true;
    })
    .join("\n")
    .trim();
}
