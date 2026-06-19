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
