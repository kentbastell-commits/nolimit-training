// Shared core for the app: domain types, pure helpers, constants, and the
// coach-key fetch patch (module side effect). Extracted verbatim from
// App.tsx as phase A of the monolith split — no behavior changes.

export type AppMode = "Coach" | "Client";
export type Page =
  | "Clients"
  | "Teams"
  | "Library"
  | "Workouts"
  | "Digital"
  | "Tests"
  | "Check-ins"
  | "Orders"
  | "Review"
  | "Revenue"
  | "Coaches";
export type ClientTab = "Home" | "Programs" | "Overview" | "Training";
export type CalendarView = "Week" | "Month" | "Full";
export type CalendarDisplayMode = CalendarView;
export type ClientProgramScheduleMode = "Month" | "Week" | "Day";
export type WorkoutPageTab =
  | "Saved Programs"
  | "Program Builder"
  | "Sessions"
  | "Forms"
  | "Tests"
  | "Assignments";
export type ToastType = "success" | "error" | "info";
export type CheckInFilter = "Due" | "Recent" | "No Check-in" | "All";
export type TrackingType = "Weight" | "Time" | "Distance" | "Pace";
export type ClientBucket =
  | "All Clients"
  | "Active"
  | "Premium"
  | "Online Coaching"
  | "Paused"
  | "Needs Contact"
  | "Needs Programming"
  | "Archived";

export type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

export type CoachAnalytics = {
  summary: {
    totalClients: number;
    activeClients: number;
    premiumClients: number;
    needsProgramming: number;
    needsContact: number;
    totalWorkouts: number;
    completedWorkouts: number;
    missedWorkouts: number;
    inProgressWorkouts: number;
    scheduledWorkouts: number;
    upcomingWorkouts: number;
    overdueWorkouts: number;
    completionRate: number;
  };
  attentionClients: {
    clientId: string;
    name: string;
    status: string;
    overdueWorkouts: number;
    completedWorkouts: number;
    totalWorkouts: number;
    needsProgram: boolean;
    needsContact: boolean;
  }[];
};

export type Client = {
  id: string;
  clientCode: string;
  name: string;
  initials: string;
  activity: string;
  training: string;
  program: string;
  status: string;
  clientType?: string;
  primaryCoach?: string;
  secondaryCoach?: string;
  package?: string;
  subscriptionStatus?: string;
  intakeStatus?: string;
  paymentStatus?: string;
  purchasedProgramId?: string;
  accessStartDate?: string;
  accessEndDate?: string;
  source?: string;
  paymentId?: string;
  email?: string;
  phone?: string;
  coach?: string;
  notes?: string;
  notesEn?: string;
  startDate?: string;
  languagePreference?: string;
  // Manual performance-metric overrides (per client, optional).
  masKmhOverride?: string;
  hrMaxOverride?: string;
  restingHrOverride?: string;
  zone5kPct?: string;
  zone10kPct?: string;
  zoneThresholdPct?: string;
  zoneEasyPct?: string;
  tags?: string[];
  categories?: string[];
  lastLogin?: number;
};

export type Coach = {
  recordId: string;
  coachId: string;
  name: string;
  email?: string;
  phoneWechat?: string;
  role: "Admin" | "Coach" | string;
  status: "Active" | "Inactive" | string;
  bio?: string;
  qrCodeUrl?: string;
  createdAt?: string;
};

export type ProductOrder = {
  recordId: string;
  orderId: string;
  clientId: string;
  clientName: string;
  email?: string;
  phone?: string;
  productType: string;
  programId: string;
  productName: string;
  amount: string;
  currency: string;
  paymentStatus: string;
  paymentReference?: string;
  paymentProvider: string;
  purchasedAt: string;
  accessStartDate: string;
  accessEndDate: string;
  intakeStatus: string;
  assignedCoach: string;
  intakeAssignmentId?: string;
  onboardingStatus?: string;
  fulfillmentStatus?: string;
  fulfilledAt?: string;
};

export type Program = {
  recordId: string;
  programId: string;
  programName: string;
  programNameCn?: string;
  goal: string;
  goalCn?: string;
  sport: string;
  level: string;
  durationWeeks: string;
  phase: string;
  phaseCn?: string;
  season?: string;
  sessionsPerWeek: string;
  coach: string;
  status: string;
  builtForClient?: string;
  builtForTeam?: string;
  storeCategory?: string;
  storeCategoryCn?: string;
  storeListingType?: string;
  bundleProgramIds?: string;
  productType?: string;
  sessionType?: string;
  price?: string;
  compareAtPrice?: string;
  currency?: string;
  publicStoreVisible?: boolean;
  purchaseLink?: string;
  defaultIntakeFormId?: string;
  accessLengthDays?: string;
  productStatus?: string;
  salesDescription?: string;
  salesDescriptionCn?: string;
  storeUrl?: string;
  storeDescription?: string;
  storeDescriptionCn?: string;
  productImage?: string;
  sourceOrderId?: string;
  isOrderPlaceholder?: boolean;
};

export type Workout = {
  id: string;
  assignedWorkoutId: string;
  clientId: string;
  programId: string;
  week: string;
  day: string;
  sessionName: string;
  sessionNameCn?: string;
  sessionType?: string;
  sessionGoal?: string;
  estimatedDuration?: string;
  intensity?: string;
  scheduledDate: string;
  completionStatus: string;
  coachNotes: string;
  coachNotesCn?: string;
  clientNotes: string;
  workoutLogs: string;
  sessionRpe?: string;
  sessionDuration?: string;
  sessionLoad?: string;
  coachReviewed?: boolean;
};

export type CopiedCalendarItem =
  | { action: "copy" | "cut"; type: "workout"; id: string; label: string }
  | { action: "copy" | "cut"; type: "assignment"; id: string; label: string };

export type ExerciseDetail = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseNameCn?: string;
  videoUrl?: string;
  videoUrlCn?: string;
  longVideoUrl?: string;
  category?: string;
  categoryCn?: string;
  equipment?: string;
  equipmentCn?: string;
  movementPattern?: string;
  movementPatternCn?: string;
  technicalInstructionsCn?: string;
  coachingCuesCn?: string;
  commonMistakesCn?: string;
  cueNotes?: string;
  cueNotesCn?: string;
  order: number;
  sets: string;
  reps: string;
  tempo: string;
  rest: string;
  notes: string;
  notesCn?: string;
  sectionNameCn?: string;
  targetSource?: string;
  targetMetric?: string;
  targetPercent?: string;
  targetAdjustment?: string;
  autoTarget?: boolean;
  displayTarget?: string;
  alternateExercises?: AlternateExerciseDetail[];
};

// A coach-defined swap option for an exercise, enriched (server-side) with the
// alternate's library details so the player can fully switch to it.
export type AlternateExerciseDetail = {
  exerciseRecordId: string;
  exerciseId: string;
  exerciseName: string;
  exerciseNameCn?: string;
  videoUrl?: string;
  videoUrlCn?: string;
  longVideoUrl?: string;
  category?: string;
  categoryCn?: string;
  equipment?: string;
  equipmentCn?: string;
  movementPattern?: string;
  movementPatternCn?: string;
  technicalInstructionsCn?: string;
  coachingCuesCn?: string;
  commonMistakesCn?: string;
  cueNotes?: string;
  cueNotesCn?: string;
};

export type ExerciseNoteMeta = {
  sectionName: string;
  // Optional custom hex chosen by the coach for a custom section; overrides
  // the keyword/hash palette everywhere badges render.
  sectionColor: string;
  exerciseLabel: string;
  groupType?: ProgramExercise["groupType"];
  groupName: string;
  groupMode?: "" | "AMRAP" | "EMOM";
  groupMinutes?: string;
  trackingType: TrackingType;
  trackingFields?: string[];
  isUnilateral: boolean;
  isAccessory: boolean;
  accessoryParentLabel: string;
  accessoryColor: string;
  setPrescriptions: ExerciseSetPrescription[];
  alternateExercises: ExerciseAlternate[];
  coachingNotes: string;
};

export type ExerciseSetPrescription = {
  setNumber: number;
  reps: string;
  load: string;
  percent: string;
  percentMas: string;
  // Cardio intensity method: "" = zone (%MAS), "custom" = custom %MAS,
  // "hr" = direct heart-rate target, "rpe" = direct RPE. intensityValue holds
  // the bpm (hr) or 1-10 (rpe).
  intensityMode: string;
  intensityValue: string;
  rpe: string;
  rir: string;
  // Per-set duration for holds / isometrics (e.g. "30 s"), shown when the
  // coach picks the "Time" tracking field.
  time: string;
  // Per-set distance in meters (e.g. carries, sled pushes, throws), shown
  // when the coach picks the "Distance" tracking field.
  distance: string;
  tempo: string;
  rest: string;
};

// Named running zones for the builder dropdown (percent = % MAS).
// Mirrors PACE_ZONE_DEFS so a picked zone resolves to pace + HR per client.
export const RUNNING_ZONE_OPTIONS = [
  { key: "mas", label: "MAS", percent: 100 },
  { key: "5k", label: "5K", percent: 95 },
  { key: "10k", label: "10K", percent: 91 },
  { key: "threshold", label: "Threshold", percent: 85 },
  { key: "easy", label: "Easy", percent: 70 },
];

// Attach the coach access key (if unlocked on this device) to every API call.
// The server rejects coach/admin endpoints without it once COACH_ACCESS_KEY
// is set; athlete/public endpoints ignore the header entirely.
export const nativeFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  try {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url.startsWith("/api/")) {
      const key = window.localStorage.getItem("nl_coach_key");
      if (key) {
        const headers = new Headers(
          init?.headers || (input instanceof Request ? input.headers : undefined)
        );
        headers.set("x-coach-key", key);
        return nativeFetch(input, { ...init, headers });
      }
    }
  } catch {
    // fall through to the untouched request
  }
  return nativeFetch(input, init);
}) as typeof fetch;

// A cardio exercise is detected by its Category (set to "Cardio" in the library),
// so it gets the running/Distance layout. Conditioning (wall balls, burpees…) is
// deliberately NOT cardio: those are rep/load-based and shouldn't default to
// Distance tracking — they get their own defaults row instead.
export function isCardioCategory(category?: string) {
  return /cardio|aerobic/i.test(String(category || ""));
}
export function isConditioningCategory(category?: string) {
  return /conditioning/i.test(String(category || ""));
}
export function isCardioSectionName(name?: string) {
  return /cardio|conditioning|aerobic/i.test(String(name || ""));
}

// Category-aware builder defaults. Seeds sets/reps/tempo/rest when a coach adds
// a library exercise, so explosive work starts at low reps / long rest / no
// tempo, mobility starts light, etc., instead of one generic 3×8 @ 3-1-1 for
// everything. First matching row wins; coaches can always edit per exercise.
// (Cardio/Conditioning never reach this — they take the cardio branch.)
export const CATEGORY_PRESCRIPTION_DEFAULTS: Array<{
  match: RegExp;
  sets: string;
  reps: string;
  tempo: string;
  rest: string;
}> = [
  { match: /plyometric|plyo/i, sets: "3", reps: "5", tempo: "", rest: "90 sec" },
  { match: /conditioning/i, sets: "3", reps: "12", tempo: "", rest: "60 sec" },
  { match: /olympic|power/i, sets: "4", reps: "3", tempo: "", rest: "120 sec" },
  { match: /carry/i, sets: "3", reps: "40 m", tempo: "", rest: "90 sec" },
  { match: /mobility|warm/i, sets: "2", reps: "8", tempo: "", rest: "30 sec" },
  { match: /climbing/i, sets: "4", reps: "6", tempo: "", rest: "120 sec" },
  { match: /skill|drill/i, sets: "3", reps: "20 m", tempo: "", rest: "45 sec" },
  { match: /breathing/i, sets: "1", reps: "5 min", tempo: "", rest: "30 sec" },
  { match: /core/i, sets: "3", reps: "10", tempo: "", rest: "45 sec" },
  { match: /accessory/i, sets: "3", reps: "10", tempo: "3-1-1", rest: "60 sec" },
  {
    match: /squat|hinge|push|pull|press/i,
    sets: "3",
    reps: "8",
    tempo: "3-1-1",
    rest: "90 sec",
  },
];

export function categoryPrescriptionDefaults(category?: string) {
  const value = String(category || "");
  if (!value) return null;
  return (
    CATEGORY_PRESCRIPTION_DEFAULTS.find((d) => d.match.test(value)) || null
  );
}

export type ExerciseAlternate = {
  exerciseRecordId: string;
  exerciseId: string;
  exerciseName: string;
};

export type WorkoutHistoryLog = {
  recordId: string;
  exerciseName: string;
  date: string;
  setNumber: string;
  prescribedReps: string;
  actualReps: string;
  actualWeight: string;
  actualTime: string;
  actualDistance: string;
};

export type WorkloadLog = {
  recordId: string;
  logId: string;
  dateKey: string;
  clientId: string;
  date: number;
  techAmRpe: number;
  techAmMin: number;
  techPmRpe: number;
  techPmMin: number;
  cardioRpe: number;
  cardioMin: number;
  notes: string;
};

export type ProgramReview = {
  recordId: string;
  reviewId: string;
  clientId: string;
  clientName: string;
  programId: string;
  programName: string;
  rating: number;
  quote: string;
  showOnStore: boolean;
  approved: boolean;
  submittedDate: string;
};

export type PortalCheckIn = {
  recordId: string;
  checkInId: string;
  clientId: string;
  submittedDate: string;
  bodyWeight: string;
  sleepHours: string;
  sleepQuality: string;
  energy: string;
  mood: string;
  stress: string;
  soreness: string;
  readinessScore: string;
  nutritionNotes: string;
  trainingNotes: string;
  wins: string;
  problemsPain: string;
  clientNotes: string;
  coachResponse: string;
  coachReviewed: boolean;
  reviewedDate: string;
  status: string;
};

export type WorkoutComment = {
  key: string;
  recordIds: string[];
  clientId: string;
  clientName: string;
  assignedWorkoutId: string;
  workoutName: string;
  exerciseNames: string[];
  date: string;
  note: string;
  noteEn?: string;
  reviewed: boolean;
};

export type LibraryExercise = {
  recordId: string;
  exerciseId: string;
  exerciseName: string;
  exerciseNameCn?: string;
  videoUrl: string;
  videoUrlCn?: string;
  longVideoUrl?: string;
  category?: string;
  categoryCn?: string;
  equipment?: string;
  equipmentCn?: string;
  movementPattern?: string;
  movementPatternCn?: string;
  primaryMuscles?: string;
  primaryMusclesCn?: string;
  technicalInstructionsCn?: string;
  coachingCuesCn?: string;
  commonMistakesCn?: string;
  notes?: string;
  notesCn?: string;
  defaultMetric?: string;
  metricCategory?: string;
  usesAutoTarget?: boolean;
  status?: string;
};

export type ProgramExercise = {
  exerciseRecordId: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  sectionName: string;
  exerciseLabel: string;
  sets: string;
  reps: string;
  load: string;
  tempo: string;
  rest: string;
  coachingNotes: string;
  trackingType: TrackingType;
  trackingFields?: string[];
  isUnilateral: boolean;
  groupType: "Straight" | "Superset" | "Circuit";
  groupName: string;
  // Timed circuit schemes: "" = plain rounds, or AMRAP / EMOM with minutes.
  groupMode?: "" | "AMRAP" | "EMOM";
  groupMinutes?: string;
  isAccessory?: boolean;
  accessoryParentLabel?: string;
  accessoryColor?: string;
  sectionColor?: string;
  setPrescriptions?: ExerciseSetPrescription[];
  alternateExercises?: ExerciseAlternate[];
  targetSource?: string;
  targetMetric?: string;
  targetPercent?: string;
  targetAdjustment?: string;
  autoTarget?: boolean;
  displayTarget?: string;
};

export type BuilderLibraryMode = "Exercises" | "Sections";

export type ProgramSession = {
  localId: string;
  week: string;
  day: string;
  sessionName: string;
  sessionNameCn?: string;
  sessionType?: string;
  sessionGoal?: string;
  estimatedDuration?: string;
  intensity?: string;
  isSingleWorkout?: boolean;
  exercises: ProgramExercise[];
};

export type AssignableWorkout = {
  localId: string;
  week: number;
  day: number;
  sessionName: string;
  sessionNameCn?: string;
  sessionType?: string;
  sessionGoal?: string;
  estimatedDuration?: string;
  intensity?: string;
  scheduledDate: string;
};

export type Subscription = {
  id: string;
  subscriptionId: string;
  clientId: string;
  clientRecordIds: string[];
  plan: string;
  price: number;
  currency: string;
  billingCycle: string;
  startDate: string;
  nextBillingDate: string;
  status: string;
  coach: string;
  autoRenew: boolean;
  paymentId: string;
  notes: string;
};

export type Team = {
  id: string;
  name: string;
  coach: string;
  notes: string;
  focus: string;
  memberIds: string[];
  memberCount: number;
  positions: Record<string, string>;
  groups: string[];
  createdTime?: number;
};

export type SavedProgramTemplate = {
  recordId: string;
  week: number;
  day: number;
  sessionName: string;
  sessionType?: string;
  sessionGoal?: string;
  estimatedDuration?: string;
  intensity?: string;
  isSingleWorkout?: boolean;
  exerciseName: string;
  exerciseId: string;
  exerciseRecordId?: string;
  order: number;
  // Per-exercise prescription (lets the builder load a whole program from the
  // single /api/programTemplates call instead of one /api/workoutDetails per day).
  sets?: string;
  reps?: string;
  tempo?: string;
  rest?: string;
  notes?: string;
};

export type SavedFormQuestion = {
  recordId?: string;
  questionId: string;
  formId: string;
  order: string;
  label: string;
  labelCn?: string;
  questionType: string;
  options?: string;
  optionsCn?: string;
  required: boolean;
  helpText?: string;
  helpTextCn?: string;
};

export type SavedFormTemplate = {
  recordId: string;
  formId: string;
  name: string;
  nameCn?: string;
  type: string;
  description: string;
  descriptionCn?: string;
  status: string;
  createdBy: string;
  createdAt: string;
  questions: SavedFormQuestion[];
};

export type SavedTestItem = {
  recordId?: string;
  testItemId: string;
  testTemplateId: string;
  order: string;
  testName: string;
  testNameCn?: string;
  metricType: string;
  unit: string;
  instructions?: string;
  instructionsCn?: string;
  createsMetric?: boolean;
  metricName?: string;
  metricUnit?: string;
  calculationMethod?: string;
  inputUnit?: string;
};

export type SavedTestTemplate = {
  recordId: string;
  testTemplateId: string;
  name: string;
  nameCn?: string;
  description: string;
  descriptionCn?: string;
  category?: string;
  status: string;
  createdAt: string;
  items: SavedTestItem[];
};

export type ContentAssignment = {
  recordId: string;
  assignmentId: string;
  assignmentType: string;
  templateId: string;
  templateName: string;
  clientId: string;
  clientCode: string;
  clientName: string;
  assignedDate: string;
  dueDate: string;
  status: string;
};

export type ContentResponse = {
  recordId: string;
  responseType: string;
  responseId: string;
  assignmentId: string;
  assignmentRecordId: string;
  templateId: string;
  itemId: string;
  label: string;
  answer: string;
  unit: string;
  notes?: string;
  clientId: string;
  clientName: string;
  submittedAt: string;
};

export type AthleteMetric = {
  recordId: string;
  metricId: string;
  clientId: string;
  clientName: string;
  metricType: string;
  metricName: string;
  metricValue: string;
  metricUnit: string;
  sourceType: string;
  sourceRecordId: string;
  sourceTestId: string;
  sourceTestName: string;
  calculationMethod: string;
  measuredAt: string;
  status: string;
  notes: string;
};

// Per-exercise PR/summary row from the Exercise Results table (one per exercise
// per logged workout): best weight + reps, estimated 1RM, and total volume.
export type ExerciseResult = {
  recordId: string;
  resultId: string;
  clientId: string;
  exerciseId: string;
  exerciseName: string;
  workoutId: string;
  date: string;
  bestReps: string;
  bestWeight: string;
  estimatedOneRepMax: string;
  volume: string;
};

export type ContentResponseGroup = {
  key: string;
  responseType: string;
  title: string;
  submittedAt: string;
  answers: ContentResponse[];
};

export type CalendarActionMenuState =
  | {
      kind: "item";
      x: number;
      y: number;
      item:
        | { type: "workout"; workout: Workout }
        | { type: "assignment"; assignment: ContentAssignment };
    }
  | {
      kind: "date";
      x: number;
      y: number;
      date: string;
    };

export type CalendarActionMenuPayload =
  | Omit<Extract<CalendarActionMenuState, { kind: "item" }>, "x" | "y">
  | Omit<Extract<CalendarActionMenuState, { kind: "date" }>, "x" | "y">;

export type SetLog = {
  exerciseId: string;
  // Unique id of the workout-details ROW this log belongs to. Distinguishes
  // two occurrences of the same library exercise within one workout.
  occurrenceId?: string;
  exerciseName: string;
  exerciseOrder: number;
  setNumber: number;
  side?: "Right" | "Left";
  trackingType: TrackingType;
  prescribedSets: string;
  prescribedReps: string;
  prescribedLoad: string;
  prescribedPercent: string;
  prescribedPercentMas: string;
  prescribedIntensityMode: string;
  prescribedIntensityValue: string;
  prescribedRpe: string;
  prescribedRir: string;
  prescribedTime?: string;
  prescribedDistance?: string;
  trackingFields: string[];
  actualReps: string;
  actualWeight: string;
  actualTime: string;
  actualDistance: string;
  actualRpe: string;
  actualRir: string;
};

// Convert a YouTube watch/short/embed/youtu.be link to an embeddable URL.
export function toYoutubeEmbed(url: string): string {
  const match = String(url || "").match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : "";
}

// Derive a thumbnail image URL from a video link (currently YouTube). Returns
// "" when none can be derived, so callers fall back to initials.
export function videoThumbnail(url: string): string {
  const match = String(url || "").match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : "";
}

// Slug for color-coding exercise categories in the library (e.g. "Olympic/Power"
// -> "cat-olympic-power"). Pairs with the .cat-* rules in App.css.
export function categorySlug(category?: string): string {
  const slug = String(category || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `cat-${slug}` : "";
}

// Deterministic chip colors for group/position/category labels so the same
// label is always the same color across teams and profiles.
export const GROUP_LABEL_COLORS = [
  { bg: "#e8f0ff", fg: "#1f5fd6", bd: "#bcd3ff" },
  { bg: "#fdeaee", fg: "#a32f3e", bd: "#f3c5cd" },
  { bg: "#e9f6ee", fg: "#237a30", bd: "#c2e6cd" },
  { bg: "#f3ecfb", fg: "#6a2f9e", bd: "#dcc8f0" },
  { bg: "#fdf0e1", fg: "#9a6a12", bd: "#f0d8b4" },
  { bg: "#e6f6f7", fg: "#0c7382", bd: "#bfe6ea" },
  { bg: "#ecedf6", fg: "#3a4a8a", bd: "#d0d4ea" },
  { bg: "#fbe9f6", fg: "#97287f", bd: "#f1c6e4" },
];
export function labelColor(label: string): { bg: string; fg: string; bd: string } {
  let hash = 0;
  const s = String(label || "");
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return GROUP_LABEL_COLORS[Math.abs(hash) % GROUP_LABEL_COLORS.length];
}

export const MOVEMENT_PATTERN_OPTIONS = [
  "Lower Body Squat",
  "Lower Body Hinge",
  "Lower Body Lunge",
  "Upper Body Horizontal Push",
  "Upper Body Vertical Push",
  "Upper Body Horizontal Pull",
  "Upper Body Vertical Pull",
  "Core / Anti-Rotation",
  "Carry / Loaded Carry",
  "Olympic / Power",
  "Plyometric",
  "Locomotion / Cardio",
  "Mobility / Flexibility",
];

// Canonical exercise-library categories offered in the editor (even before any
// exercise uses them). Colors live in App.css as .cat-<slug> rules.
export const CATEGORY_OPTIONS = [
  "Squat",
  "Hinge",
  "Horizontal Push",
  "Vertical Push",
  "Horizontal Pull",
  "Vertical Pull",
  "Core",
  "Olympic/Power",
  "Plyometric",
  "Carry",
  "Mobility",
  "Cardio",
  "Climbing Specific",
  "Conditioning",
  "Accessory",
  "Skills / Drills",
  "Breathing",
];

export function normalizeDate(value: string) {
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

export function normalizeLookupText(value?: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, " ")
    .trim();
}

export function lookupTextMatches(source?: string, target?: string) {
  const normalizedSource = normalizeLookupText(source);
  const normalizedTarget = normalizeLookupText(target);

  return Boolean(
    normalizedSource &&
      normalizedTarget &&
      (normalizedSource === normalizedTarget ||
        normalizedSource.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedSource))
  );
}

// Run async work over a list with a concurrency cap (parallel but bounded, so
// big saves don't fire dozens of Feishu requests at once).
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

export function makeExerciseLabel(index: number) {
  const groupIndex = Math.floor(index / 4);
  const letter = String.fromCharCode(65 + Math.min(groupIndex, 25));
  const number = (index % 4) + 1;

  return `${letter}${number}`;
}

export function parseExerciseNotes(notes = ""): ExerciseNoteMeta {
  const lines = notes.split(/\r?\n/);
  const meta: ExerciseNoteMeta = {
    sectionName: "",
    sectionColor: "",
    exerciseLabel: "",
    groupName: "",
    trackingType: "Weight",
    isUnilateral: false,
    isAccessory: false,
    accessoryParentLabel: "",
    accessoryColor: "Green",
    setPrescriptions: [],
    alternateExercises: [],
    coachingNotes: "",
  };
  const remainingLines: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    const match = trimmed.match(
      /^(Section|Section Color|Label|Superset|Circuit|Circuit Mode|Circuit Minutes|Tracking|Fields|Unilateral|Accessory|Accessory Parent|Accessory Color|Set Prescriptions|Alternate Exercises):\s*(.+)$/i
    );

    if (!match) {
      remainingLines.push(line);
      return;
    }

    const key = match[1].toLowerCase();
    const value = match[2].trim();

    if (key === "section") meta.sectionName = value;
    if (key === "section color") meta.sectionColor = value;
    if (key === "label") meta.exerciseLabel = value;
    if (key === "tracking") {
      const clean = value.toLowerCase();
      if (clean.includes("time")) meta.trackingType = "Time";
      else if (clean.includes("distance")) meta.trackingType = "Distance";
      else meta.trackingType = "Weight";
    }
    if (key === "fields") {
      meta.trackingFields = value
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean);
    }
    if (key === "unilateral") {
      meta.isUnilateral = /^(yes|true|1|y)$/i.test(value);
    }
    if (key === "accessory") {
      meta.isAccessory = /^(yes|true|1|y)$/i.test(value);
    }
    if (key === "accessory parent") meta.accessoryParentLabel = value;
    if (key === "accessory color") meta.accessoryColor = value;
    if (key === "set prescriptions") {
      try {
        const parsedSets = JSON.parse(value);
        if (Array.isArray(parsedSets)) {
          meta.setPrescriptions = parsedSets
            .map((set, index) => ({
              setNumber: Number(set?.setNumber) || index + 1,
              reps: String(set?.reps || ""),
              load: String(set?.load || ""),
              percent: String(set?.percent || ""),
              percentMas: String(set?.percentMas || ""),
              intensityMode: String(set?.intensityMode || ""),
              intensityValue: String(set?.intensityValue || ""),
              rpe: String(set?.rpe || ""),
              rir: String(set?.rir || ""),
              time: String(set?.time || ""),
              distance: String(set?.distance || ""),
              tempo: String(set?.tempo || ""),
              rest: String(set?.rest || ""),
            }))
            .filter((set) => set.setNumber > 0);
        }
      } catch {
        remainingLines.push(line);
      }
    }
    if (key === "alternate exercises") {
      try {
        const parsedAlternates = JSON.parse(value);
        if (Array.isArray(parsedAlternates)) {
          meta.alternateExercises = parsedAlternates
            .map((alternate) => ({
              exerciseRecordId: String(alternate?.exerciseRecordId || ""),
              exerciseId: String(alternate?.exerciseId || ""),
              exerciseName: String(alternate?.exerciseName || ""),
            }))
            .filter(
              (alternate) => alternate.exerciseName || alternate.exerciseId
            );
        }
      } catch {
        remainingLines.push(line);
      }
    }
    if (key === "superset" || key === "circuit") {
      meta.groupType = key === "superset" ? "Superset" : "Circuit";
      meta.groupName = value;
    }
    if (key === "circuit mode") {
      const mode = value.trim().toUpperCase();
      if (mode === "AMRAP" || mode === "EMOM") meta.groupMode = mode;
    }
    if (key === "circuit minutes") meta.groupMinutes = value.trim();
  });

  meta.coachingNotes = remainingLines.join("\n").trim();

  return meta;
}

// The English note is parsed cleanly by parseExerciseNotes, but a localized
// note (notesCn) often has the same metadata block baked in as a translation
// ("跟踪指标：重量", "辅助主动作：B1", "组数说明：[{…}]"). The Chinese labels vary
// between translations, so instead of matching exact labels we drop any line
// that looks like a "field：value" metadata line — leaving just the coaching
// description.
export const EN_META_LINE =
  /^\s*(?:Section|Label|Superset|Circuit|Circuit Mode|Circuit Minutes|Tracking|Fields|Unilateral|Accessory|Accessory Parent|Accessory Color|Set Prescriptions|Alternate Exercises)\s*[:：]/i;
// A short CJK field label (1-12 ideographs/digits) immediately followed by a
// colon. Real descriptions have punctuation (，。) before any colon, so they
// stay intact.
export const CN_META_LINE = /^\s*[一-鿿][一-鿿0-9]{0,11}[:：]/;
export const META_JSON_FRAGMENT =
  /^\s*[[\]{}]|"(?:setNumber|reps|load|percent|percentMas|intensityMode|intensityValue|rpe|rir|time|tempo|rest|exerciseRecordId|exerciseId|exerciseName)"\s*:/;

export function stripLocalizedExerciseMeta(note = ""): string {
  return note
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

export function composeExerciseNotes(
  notes: string,
  trackingType: TrackingType,
  isUnilateral: boolean
) {
  const parsed = parseExerciseNotes(notes);
  const cleanNotes = parsed.coachingNotes.trim();

  return [
    `Tracking: ${trackingType}`,
    `Unilateral: ${isUnilateral ? "Yes" : "No"}`,
    cleanNotes,
  ]
    .filter(Boolean)
    .join("\n");
}

// Strength tracking fields the coach can customize (max 3). Cardio keeps its
// own Time/Distance/Pace layout and is unaffected by this. "Time" is for
// holds/isometrics — a per-set duration alongside (or instead of) reps.
export const STRENGTH_TRACKING_FIELDS = ["Weight", "Reps", "Time", "Distance", "RPE", "RIR"] as const;

export function effectiveTrackingFields(
  trackingType: TrackingType,
  trackingFields?: string[]
): string[] {
  if (trackingType !== "Weight") return [];
  const picked = (trackingFields || []).filter((f) =>
    (STRENGTH_TRACKING_FIELDS as readonly string[]).includes(f)
  );
  return picked.length ? picked.slice(0, 3) : ["Weight", "Reps"];
}

export type ExerciseCueSection = {
  title: string;
  lines: string[];
};

export function parseExerciseCueSections(notes = ""): ExerciseCueSection[] {
  const meta = parseExerciseNotes(notes);
  const cleanNotes = meta.coachingNotes.trim();

  if (!cleanNotes) return [];

  const sections: ExerciseCueSection[] = [];
  let currentSection: ExerciseCueSection | null = null;

  cleanNotes.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const headingMatch = trimmed.match(/^([^:：]{2,35})[:：]\s*(.*)$/);

    if (headingMatch) {
      currentSection = {
        title: headingMatch[1].trim(),
        lines: headingMatch[2].trim() ? [headingMatch[2].trim()] : [],
      };
      sections.push(currentSection);
      return;
    }

    const cleanLine = trimmed.replace(/^[-*•]\s*/, "");

    if (!currentSection) {
      currentSection = { title: "Coaching Notes", lines: [] };
      sections.push(currentSection);
    }

    currentSection.lines.push(cleanLine);
  });

  return sections.filter((section) => section.lines.length > 0);
}

export function buildExerciseCueDraft(
  exercise: {
    exerciseName: string;
    category?: string;
    equipment?: string;
    movementPattern?: string;
    trackingType: TrackingType;
    isUnilateral: boolean;
  }
) {
  const name = exercise.exerciseName.trim() || "Exercise";
  const category = String(exercise.category || "").trim() || "General";
  const equipment =
    String(exercise.equipment || "").trim() || "Bodyweight or available equipment";
  const pattern =
    String(exercise.movementPattern || "").trim() || "General movement";
  const limbNote = exercise.isUnilateral
    ? "Track left and right sides separately when logging."
    : "Track both sides together unless the coach notes otherwise.";

  return [
    `Technical Cues:`,
    `- Start ${name} with a controlled setup and clear body position before every rep.`,
    `- Keep the movement smooth and repeatable; prioritize quality before load or speed.`,
    `- Use the assigned ${exercise.trackingType.toLowerCase()} target and stop the set if form breaks down.`,
    ``,
    `Setup:`,
    `- Equipment: ${equipment}.`,
    `- Category: ${category}. Movement pattern: ${pattern}.`,
    `- Brace before initiating the rep and keep the working joints aligned.`,
    ``,
    `Execution:`,
    `- Move through the intended range of motion with control.`,
    `- Match the prescribed tempo and avoid rushing the hardest part of the movement.`,
    `- ${limbNote}`,
    ``,
    `Common Mistakes:`,
    `- Losing position to complete extra reps.`,
    `- Moving too quickly and missing the intended training effect.`,
    `- Changing range of motion from rep to rep.`,
    ``,
    `Safety Notes:`,
    `- Stop if sharp pain, numbness, or unusual symptoms appear.`,
    `- Reduce load, range, or speed if the client cannot keep stable positions.`,
    ``,
    `Regression:`,
    `- Use a simpler variation, lighter load, shorter range, or slower pace.`,
    ``,
    `Progression:`,
    `- Increase load, range, tempo demand, volume, or complexity only after consistent quality reps.`,
    ``,
    `Client Instructions:`,
    `Focus on clean reps and steady control. Follow the prescribed ${exercise.trackingType.toLowerCase()} target, record your result, and leave a note if anything felt painful or unclear.`,
  ].join("\n");
}

export function buildExerciseAiPrompt(
  exercise: {
    exerciseName: string;
    category?: string;
    equipment?: string;
    movementPattern?: string;
    trackingType: TrackingType;
    isUnilateral: boolean;
  }
) {
  return [
    "You are a professional strength and conditioning coach writing exercise instructions for climbers and general fitness clients.",
    "",
    "Create concise, practical technical coaching cues for a mobile training app. Use clear coaching language, not academic language. Prioritize safety, body position, breathing/bracing, tempo control, and common mistakes.",
    "",
    `Exercise Name: ${exercise.exerciseName || "Exercise"}`,
    `Category: ${exercise.category || "General"}`,
    `Equipment: ${exercise.equipment || "Not specified"}`,
    `Movement Pattern: ${exercise.movementPattern || "Not specified"}`,
    `Tracking Type: ${exercise.trackingType}`,
    `Unilateral/Bilateral: ${exercise.isUnilateral ? "Unilateral" : "Bilateral"}`,
    "",
    "Return exactly this structure:",
    "Technical Cues:",
    "-",
    "-",
    "-",
    "",
    "Setup:",
    "-",
    "-",
    "",
    "Execution:",
    "-",
    "-",
    "-",
    "",
    "Common Mistakes:",
    "-",
    "-",
    "",
    "Safety Notes:",
    "-",
    "",
    "Regression:",
    "-",
    "",
    "Progression:",
    "-",
    "",
    "Client Instructions:",
    "A short 2-3 sentence version for the client.",
    "",
    "Chinese Version:",
    "Translate all sections into professional Simplified Chinese fitness terminology. Keep it natural for Chinese athletes, not literal translation.",
  ].join("\n");
}

export function dateToInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export type SimpleTaskStatus = "Scheduled" | "Completed" | "Missed";

export function normalizeTaskStatus(status?: string): SimpleTaskStatus {
  const clean = String(status || "").toLowerCase();

  if (clean.includes("complete")) return "Completed";
  if (clean.includes("miss")) return "Missed";

  return "Scheduled";
}

export function isPastCalendarDate(dateString?: string) {
  const date = normalizeDate(String(dateString || ""));

  return Boolean(date) && date < dateToInputValue(new Date());
}

export function getDisplayTaskStatus(
  status?: string,
  scheduledDate?: string
): SimpleTaskStatus {
  const normalized = normalizeTaskStatus(status);

  if (normalized === "Scheduled" && isPastCalendarDate(scheduledDate)) {
    return "Missed";
  }

  return normalized;
}

export function addDays(dateString: string, days: number) {
  const date = new Date(dateString + "T00:00:00");
  date.setDate(date.getDate() + days);
  return dateToInputValue(date);
}

export function addMonths(dateString: string, months: number) {
  const date = new Date(dateString + "T00:00:00");
  date.setMonth(date.getMonth() + months);
  return dateToInputValue(date);
}

export function getMondayStart(dateString: string) {
  const date = new Date(dateString + "T00:00:00");
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return dateToInputValue(date);
}

export function getMonthDates(dateString: string) {
  const date = new Date(dateString + "T00:00:00");
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) =>
    dateToInputValue(new Date(year, month, index + 1))
  );
}

export function getMonthCalendarDates(dateString: string) {
  const monthDates = getMonthDates(dateString);
  const firstDate = new Date(`${monthDates[0]}T00:00:00`);
  const firstDay = firstDate.getDay();
  const leadingBlankCount = firstDay === 0 ? 6 : firstDay - 1;
  const cells: Array<string | null> = [
    ...Array.from({ length: leadingBlankCount }, () => null),
    ...monthDates,
  ];
  const trailingBlankCount = (7 - (cells.length % 7)) % 7;

  return [
    ...cells,
    ...Array.from({ length: trailingBlankCount }, () => null),
  ];
}

export function formatCalendarLabel(dateString: string, locale = "en-US") {
  return new Date(dateString + "T00:00:00").toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatMonthTitle(dateString: string, locale = "en-US") {
  return new Date(dateString + "T00:00:00").toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

export function formatWeekStripLabel(dateString: string, locale = "en-US") {
  const date = new Date(dateString + "T00:00:00");

  return {
    weekday: date.toLocaleDateString(locale, { weekday: "short" }),
    day: date.toLocaleDateString(locale, { day: "numeric" }),
  };
}

export function formatCalendarRangeLabel(
  view: CalendarView,
  anchorDate: string,
  locale = "en-US"
) {
  if (view === "Week") {
    const weekStart = getMondayStart(anchorDate);

    return `${formatCalendarLabel(weekStart, locale)} - ${formatCalendarLabel(
      addDays(weekStart, 6),
      locale
    )}`;
  }

  return new Date(anchorDate + "T00:00:00").toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

export function getStatusClass(status: string) {
  const clean = normalizeTaskStatus(status);

  if (clean === "Completed") return "completedWorkout";
  if (clean === "Missed") return "missedWorkout";

  return "scheduledWorkout";
}

export function getSessionTypeClass(sessionType = "") {
  const clean = String(sessionType || "").toLowerCase();

  if (clean.includes("cardio") || clean.includes("conditioning")) {
    return "sessionTypeCardio";
  }
  if (clean.includes("mobility") || clean.includes("recovery")) {
    return "sessionTypeMobility";
  }
  if (clean.includes("test")) return "sessionTypeTest";
  if (clean.includes("skill") || clean.includes("climbing")) {
    return "sessionTypeSkill";
  }
  if (clean.includes("hybrid")) return "sessionTypeHybrid";

  return "sessionTypeStrength";
}

// Color coding by TASK TYPE (not per session). Strength/power work shares one
// light-gunmetal color; cardio = electric blue; mobility/skill get their own
// hues. "test" in a workout NAME is NOT a category — only physical-test
// assignments are red (see getAssignmentColorClass). The default "Strength"
// sessionType is ignored as noise so a workout named "Cardio" stays cardio.
export function getWorkoutColorClass(workoutName = "", sessionType = "") {
  const type = String(sessionType || "").toLowerCase().trim();
  const haystack = `${workoutName || ""} ${
    type === "strength" ? "" : type
  }`.toLowerCase();
  if (
    haystack.includes("mobility") ||
    haystack.includes("recovery") ||
    haystack.includes("stretch") ||
    haystack.includes("yoga") ||
    haystack.includes("flexibility")
  ) {
    return "wcol-mobility";
  }
  if (
    haystack.includes("skill") ||
    haystack.includes("climb") ||
    haystack.includes("technique")
  ) {
    return "wcol-skill";
  }
  // Explicit strength/power wins over any "run" in the same name
  // (e.g. "Run Test + Strength" is a strength session).
  if (
    haystack.includes("strength") ||
    haystack.includes("power") ||
    haystack.includes("hypertrophy") ||
    haystack.includes("lift")
  ) {
    return "wcol-strength";
  }
  if (
    haystack.includes("cardio") ||
    haystack.includes("conditioning") ||
    haystack.includes("run") ||
    haystack.includes("treadmill") ||
    haystack.includes("erg") ||
    haystack.includes("bike") ||
    haystack.includes("row") ||
    haystack.includes("interval") ||
    haystack.includes("tempo") ||
    haystack.includes("threshold") ||
    haystack.includes("zone") ||
    haystack.includes("aerobic") ||
    haystack.includes("hyrox") ||
    haystack.includes("engine") ||
    haystack.includes("hiit") ||
    haystack.includes("metcon") ||
    haystack.includes("sprint") ||
    haystack.includes("swim") ||
    haystack.includes("jog") ||
    haystack.includes("amrap") ||
    haystack.includes("emom")
  ) {
    return "wcol-cardio";
  }
  // Push, Pull, Full Body, etc. — default to strength/power.
  return "wcol-strength";
}

export function getAssignmentColorClass(assignmentType = "") {
  return String(assignmentType || "").toLowerCase().includes("test")
    ? "wcol-test"
    : "wcol-purple";
}

// Coach role → human label. The stored value stays "Admin" (it gates the
// manage-coaches permission and the admins count/filter via === "Admin"); this
// only changes what the coach's TYPE reads as in the UI.
export function coachRoleLabel(role?: string) {
  return role === "Admin" ? "Head Coach" : role || "Coach";
}

export function languagePreferenceToCode(language?: string) {
  const clean = String(language || "").toLowerCase();

  return clean.includes("中文") ||
    clean.includes("chinese") ||
    clean.includes("mandarin")
    ? "zh"
    : "en";
}

export const DATA_CACHE_MS = 5 * 60 * 1000;
export const PERSISTENT_CACHE_PREFIX = "nolimit-training:data:";

export type CachedData<T> = {
  data: T;
  timestamp: number;
};

export const CACHE_KEYS = {
  // Bumped v1->v2: a stale locally-cached clients list (older objects without a
  // clientCode) made clientLabel fall back to showing the raw code (e.g.
  // "CL-0002") instead of the name on the Review page. Bumping the key forces a
  // one-time fresh re-fetch so every browser gets clientCode-bearing objects.
  // Bumped again for the 2026-07-21 Postgres cutover: pre-migration caches
  // hold Feishu record ids ("rec...") that no pg endpoint can resolve —
  // fresh keys force every browser onto business-code-shaped rows.
  clients: "clients:v3",
  exercises: "exercises:v2",
  productOrders: "product-orders:v2",
  programs: "programs:v2",
  formTemplates: "form-templates:v2",
  testTemplates: "test-templates:v2",
  clientWorkouts: (clientCode: string) => `client-workouts:${clientCode}:v2`,
};

export function isFreshCache(timestamp: number) {
  return Date.now() - timestamp < DATA_CACHE_MS;
}

export function readPersistentCache<T>(key: string): CachedData<T> | null {
  if (typeof window === "undefined") return null;

  try {
    const rawCache = window.localStorage.getItem(`${PERSISTENT_CACHE_PREFIX}${key}`);
    if (!rawCache) return null;

    const parsedCache = JSON.parse(rawCache) as CachedData<T>;
    if (!parsedCache || !isFreshCache(parsedCache.timestamp)) {
      window.localStorage.removeItem(`${PERSISTENT_CACHE_PREFIX}${key}`);
      return null;
    }

    return parsedCache;
  } catch {
    return null;
  }
}

export function writePersistentCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return;

  // Never persist an empty list: a transient empty API response would otherwise
  // be cached in the browser and keep showing "no data" across reloads (looks
  // like data loss). Skipping it just makes the next load re-fetch.
  if (Array.isArray(data) && data.length === 0) return;

  try {
    window.localStorage.setItem(
      `${PERSISTENT_CACHE_PREFIX}${key}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // Local storage can be unavailable in private mode or when quota is full.
  }
}

export function clearPersistentCache(key: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(`${PERSISTENT_CACHE_PREFIX}${key}`);
  } catch {
    // Ignore storage cleanup failures.
  }
}

