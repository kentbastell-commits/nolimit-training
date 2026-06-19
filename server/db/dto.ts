// Data-transfer shapes returned by the repository layer. These match what the
// API handlers already return, so the frontend is unaffected by the backend
// swap. Backend implementations (Feishu / Postgres) both produce these.

export type ExerciseDTO = {
  recordId: string;
  exerciseId: string;
  exerciseName: string;
  exerciseNameCn: string;
  videoUrl: string;
  videoUrlCn: string;
  longVideoUrl: string;
  category: string;
  categoryCn: string;
  equipment: string;
  equipmentCn: string;
  movementPattern: string;
  movementPatternCn: string;
  primaryMuscles: string;
  primaryMusclesCn: string;
  technicalInstructionsCn: string;
  coachingCuesCn: string;
  commonMistakesCn: string;
  notes: string;
  defaultMetric: string;
  metricCategory: string;
  usesAutoTarget: boolean;
  status: string;
};

export type ExerciseListResult = {
  exercises: ExerciseDTO[];
  availableFields: string[]; // Feishu field introspection (debug); [] on Postgres
};

// NOTE: fields named `id`/`recordId`/`clientRecordIds` return the Feishu
// record_id on the Feishu backend; on Postgres they return the business code
// (no record_ids exist). Consistent within a backend; everything flips together
// at cutover. See docs/postgres-migration.md.

// Generic write result (handlers pass it straight back as JSON).
export type WriteResult = { success: boolean; [key: string]: unknown };

export type UpdateClientInput = {
  clientRecordId: string;
  name?: string;
  email?: string;
  phone?: string;
  coach?: string;
  primaryCoachId?: string;
  secondaryCoachId?: string;
  clientType?: string;
  packageType?: string;
  packageName?: string;
  program?: string;
  subscriptionStatus?: string;
  intakeStatus?: string;
  paymentStatus?: string;
  purchasedProgramId?: string;
  accessStartDate?: string;
  accessEndDate?: string;
  source?: string;
  paymentId?: string;
  startDate?: string;
  lastCheckInDate?: string;
  notes?: string;
  languagePreference?: string;
  masKmhOverride?: unknown;
  hrMaxOverride?: unknown;
  restingHrOverride?: unknown;
  zone5kPct?: unknown;
  zone10kPct?: unknown;
  zoneThresholdPct?: unknown;
  zoneEasyPct?: unknown;
  tags?: string[];
  categories?: string[];
};

export type CoachDTO = {
  recordId: string;
  coachId: string;
  name: string;
  email: string;
  phoneWechat: string;
  role: string;
  status: string;
  bio: string;
  createdAt: string;
};

export type ProgramDTO = {
  recordId: string;
  programId: string;
  programName: string;
  programNameCn: string;
  goal: string;
  goalCn: string;
  sport: string;
  level: string;
  durationWeeks: string;
  phase: string;
  phaseCn: string;
  sessionsPerWeek: string;
  coach: string;
  status: string;
  productType: string;
  price: string;
  currency: string;
  publicStoreVisible: boolean;
  purchaseLink: string;
  defaultIntakeFormId: string;
  accessLengthDays: string;
  productStatus: string;
  salesDescription: string;
  salesDescriptionCn: string;
  storeUrl: string;
  storeDescription: string;
  storeDescriptionCn: string;
  productImage: string;
};

export type ClientDTO = {
  id: string;
  clientCode: string;
  name: string;
  initials: string;
  activity: string;
  training: string;
  program: string;
  status: string;
  clientType: string;
  primaryCoach: string;
  secondaryCoach: string;
  package: string;
  subscriptionStatus: string;
  intakeStatus: string;
  paymentStatus: string;
  purchasedProgramId: string;
  accessStartDate: string;
  accessEndDate: string;
  source: string;
  paymentId: string;
  email: string;
  phone: string;
  coach: string;
  notes: string;
  notesEn: string;
  startDate: string;
  languagePreference: string;
  masKmhOverride: string;
  hrMaxOverride: string;
  restingHrOverride: string;
  zone5kPct: string;
  zone10kPct: string;
  zoneThresholdPct: string;
  zoneEasyPct: string;
  tags: string[];
  categories: string[];
  lastLogin: number;
};

export type WorkoutDTO = {
  id: string;
  assignedWorkoutId: string;
  clientId: string;
  programId: string;
  week: string;
  day: string;
  sessionName: string;
  sessionNameCn: string;
  sessionType: string;
  sessionGoal: string;
  estimatedDuration: string;
  intensity: string;
  scheduledDate: string;
  completionStatus: string;
  coachNotes: string;
  coachNotesCn: string;
  clientNotes: string;
  workoutLogs: string;
};

export type LogDTO = {
  recordId: string;
  clientId: string;
  clientRecordIds: string[];
  exerciseName: string;
  date: string;
  setNumber: string;
  prescribedReps: string;
  actualReps: string;
  actualWeight: string;
  actualTime: string;
  actualDistance: string;
};

export type ExerciseHistoryDTO = {
  exerciseName: string;
  totalSets: number;
  lastDate: string;
  lastReps: string;
  lastWeight: string;
  bestWeight: number;
  bestReps: number;
};

export type WorkoutHistoryResult = {
  logs: LogDTO[];
  history: ExerciseHistoryDTO[];
  summary: { totalLogs: number; uniqueExercises: number; bestWeight: number; bestReps: number };
};

export type WorkoutDetailDTO = {
  id: string;
  templateId: string;
  programId: string;
  sessionType: string;
  sessionGoal: string;
  estimatedDuration: string;
  intensity: string;
  exerciseId: string;
  exerciseName: string;
  exerciseNameCn: string;
  videoUrl: string;
  videoUrlCn: string;
  longVideoUrl: string;
  category: string;
  categoryCn: string;
  equipment: string;
  equipmentCn: string;
  movementPattern: string;
  movementPatternCn: string;
  technicalInstructionsCn: string;
  coachingCuesCn: string;
  commonMistakesCn: string;
  cueNotes: string;
  cueNotesCn: string;
  order: number;
  sets: string;
  reps: string;
  tempo: string;
  rest: string;
  notes: string;
  notesCn: string;
  sectionNameCn: string;
  targetSource: string;
  targetMetric: string;
  targetPercent: string;
  targetAdjustment: string;
  autoTarget: boolean;
  displayTarget: string;
};

export type TemplateSummaryDTO = {
  recordId: string;
  week: number;
  day: number;
  sessionName: string;
  sessionNameCn: string;
  sessionType: string;
  sessionGoal: string;
  estimatedDuration: string;
  intensity: string;
  isSingleWorkout: boolean;
  exerciseName: string;
  exerciseId: string;
  order: number;
};

// Internal: carries the program reference used for filtering before it's stripped.
export type TemplateRow = TemplateSummaryDTO & {
  programId: string;
  programRecordIds: string[];
};

export type ResponseDTO = {
  recordId: string;
  responseType: "Questionnaire" | "Physical Test";
  responseId: string;
  assignmentId: string;
  assignmentRecordId: string;
  templateId: string;
  itemId: string;
  label: string;
  answer: string;
  answersJson: string;
  unit: string;
  notes: string;
  clientId: string;
  clientName: string;
  submittedAt: string;
};

export type AnalyticsResult = {
  clientActivity: {
    recordId: string;
    clientId: string;
    completed7d: number;
    scheduled7d: number;
  }[];
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

export type TeamDTO = {
  id: string;
  name: string;
  coach: string;
  notes: string;
  focus: string;
  memberIds: string[];
  memberCount: number;
  positions: Record<string, string>;
  groups: string[];
  createdTime: number;
};

export type MetricDTO = {
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

export type MetricFilter = {
  clientId?: string;
  clientRecordId?: string;
  clientCode?: string;
  clientName?: string;
  metricType?: string;
};

export type OrderDTO = {
  recordId: string;
  orderId: string;
  clientId: string;
  clientName: string;
  email: string;
  phone: string;
  productType: string;
  programId: string;
  productName: string;
  amount: string;
  currency: string;
  paymentStatus: string;
  paymentProvider: string;
  purchasedAt: string;
  accessStartDate: string;
  accessEndDate: string;
  intakeStatus: string;
  assignedCoach: string;
  intakeAssignmentId: string;
  onboardingStatus: string;
  fulfillmentStatus: string;
  fulfilledAt: string;
};

export type SubscriptionDTO = {
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
