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
