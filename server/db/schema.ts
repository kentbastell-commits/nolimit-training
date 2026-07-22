import {
  pgTable,
  text,
  bigint,
  integer,
  boolean,
  jsonb,
  doublePrecision,
  numeric,
  index,
} from "drizzle-orm/pg-core";

/**
 * NoLimit Training — Postgres schema (Drizzle).
 *
 * Reconciled against the LIVE Feishu tables (introspected 2026-06-19), so the
 * columns mirror real data, not the older reference doc.
 *
 * Conventions (full rationale in docs/postgres-migration.md):
 *  - Primary keys are the existing business codes (CL-0001, EX-…). Tables with
 *    no business-code column in Feishu (teams) use the Feishu record_id as PK.
 *  - Timestamps are bigint epoch-milliseconds (matches all frontend parsing).
 *  - Multi-selects → text[]; variable structures → jsonb.
 *  - Money → numeric(10,2); measured values → double precision.
 *  - Feishu link fields become either FK columns or join tables; Feishu
 *    bookkeeping columns (UnknownName*, SourceID, link mirrors) are dropped.
 *
 * Body Metrics stays intentionally un-modeled (China-PIPL deferral).
 */

const ts = (name: string) => bigint(name, { mode: "number" });
const money = (name: string) => numeric(name, { precision: 10, scale: 2 });

/* ------------------------------------------------------------------ coaches */
export const coaches = pgTable("coaches", {
  coachId: text("coach_id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"),
  status: text("status").default("Active"),
  bio: text("bio"),
  revenueSharePct: doublePrecision("revenue_share_pct"),
  // WeCom "add me" QR code image — lets a client-facing surface show
  // "message your coach" without a personal-WeChat handle in plain text.
  qrCodeUrl: text("qr_code_url"),
  createdAt: ts("created_at"),
});

/* ---------------------------------------------------------------- exercises */
export const exercises = pgTable(
  "exercises",
  {
    exerciseId: text("exercise_id").primaryKey(),
    name: text("name").notNull(),
    nameCn: text("name_cn"),
    category: text("category"),
    categoryCn: text("category_cn"),
    movementPattern: text("movement_pattern"),
    primaryMuscles: text("primary_muscles"),
    primaryMusclesCn: text("primary_muscles_cn"),
    equipment: text("equipment").array(),
    difficulty: text("difficulty"),
    trainingQuality: text("training_quality"),
    defaultSets: integer("default_sets"),
    defaultReps: text("default_reps"),
    defaultRest: text("default_rest"),
    rpeTarget: text("rpe_target"),
    coachingCues: text("coaching_cues"),
    coachingCuesCn: text("coaching_cues_cn"),
    technicalCues: text("technical_cues"),
    technicalCuesCn: text("technical_cues_cn"),
    commonErrors: text("common_errors"),
    commonErrorsCn: text("common_errors_cn"),
    thumbnailUrl: text("thumbnail_url"),
    shortVideoUrl: text("short_video_url"),
    longVideoUrl: text("long_video_url"),
    defaultMetric: text("default_metric"),
    metricCategory: text("metric_category"),
    useAutoTarget: boolean("use_auto_target"),
    status: text("status").default("Active"),
  },
  (t) => [
    index("exercises_category_idx").on(t.category),
    index("exercises_status_idx").on(t.status),
    index("exercises_name_idx").on(t.name),
  ]
);

/* ----------------------------------------------------------------- programs */
export const programs = pgTable(
  "programs",
  {
    programId: text("program_id").primaryKey(),
    name: text("name").notNull(),
    nameCn: text("name_cn"),
    goal: text("goal"),
    goalCn: text("goal_cn"),
    sport: text("sport"),
    level: text("level"),
    durationWeeks: integer("duration_weeks"),
    phase: text("phase"),
    phaseCn: text("phase_cn"),
    season: integer("season"),
    sessionsPerWeek: integer("sessions_per_week"),
    // Stored as a coach name in Feishu (not a code), so no FK to coaches.
    coachId: text("coach_id"),
    description: text("description"),
    descriptionCn: text("description_cn"),
    status: text("status").default("Active"),
    // Client/team-specific builds (stored as free text in Feishu — codes/names)
    builtForClient: text("built_for_client"),
    builtForTeam: text("built_for_team"),
    // Store / commerce
    storeCategory: text("store_category"),
    storeCategoryCn: text("store_category_cn"),
    storeListingType: text("store_listing_type"),
    bundleProgramIds: text("bundle_program_ids"), // comma/JSON list of PR- codes
    productType: text("product_type"),
    price: money("price"),
    compareAtPrice: money("compare_at_price"),
    currency: text("currency"),
    publicStoreVisible: boolean("public_store_visible").default(false),
    purchaseLink: text("purchase_link"),
    storeUrl: text("store_url"),
    storeDescription: text("store_description"),
    storeDescriptionCn: text("store_description_cn"),
    productImage: text("product_image"),
    defaultIntakeFormId: text("default_intake_form_id"),
    accessLengthDays: integer("access_length_days"),
    productStatus: text("product_status"),
    salesDescription: text("sales_description"),
    salesDescriptionCn: text("sales_description_cn"),
  },
  (t) => [
    index("programs_coach_idx").on(t.coachId),
    index("programs_status_idx").on(t.status),
    index("programs_store_idx").on(t.publicStoreVisible),
  ]
);

/* ------------------------------------------------------------------ clients */
export const clients = pgTable(
  "clients",
  {
    clientId: text("client_id").primaryKey(),
    fullName: text("full_name").notNull(),
    fullNameCn: text("full_name_cn"),
    email: text("email"),
    phone: text("phone"),
    languagePreference: text("language_preference").default("en"),
    // Mini program one-tap login: set when the athlete binds their WeChat
    // account after a verified phone+name login. Never sent to the client.
    wechatOpenid: text("wechat_openid"),
    clientType: text("client_type"),
    // Coach fields hold names in Feishu (not codes), so no FK to coaches.
    primaryCoachId: text("primary_coach_id"),
    secondaryCoachId: text("secondary_coach_id"),
    coachAssigned: text("coach_assigned"),
    programId: text("program_id").references(() => programs.programId),
    purchasedProgramId: text("purchased_program_id"),
    packageType: text("package_type"),
    package: text("package"),
    subscriptionStatus: text("subscription_status"),
    intakeStatus: text("intake_status"),
    paymentStatus: text("payment_status"),
    startDate: ts("start_date"),
    accessStartDate: ts("access_start_date"),
    accessEndDate: ts("access_end_date"),
    source: text("source"),
    stripePaymentId: text("stripe_payment_id"),
    lastLogin: ts("last_login"),
    lastCheckinDate: ts("last_checkin_date"),
    tags: text("tags").array(),
    categories: text("categories").array(),
    notes: text("notes"),
    notesEn: text("notes_en"),
    // Denormalized performance fields (drive training-zone display).
    mas: doublePrecision("mas"),
    hrMax: doublePrecision("hr_max"),
    restingHr: doublePrecision("resting_hr"),
    zone5kPct: doublePrecision("zone_5k_pct"),
    zone10kPct: doublePrecision("zone_10k_pct"),
    zoneThresholdPct: doublePrecision("zone_threshold_pct"),
    zoneEasyPct: doublePrecision("zone_easy_pct"),
  },
  (t) => [
    index("clients_primary_coach_idx").on(t.primaryCoachId),
    index("clients_email_idx").on(t.email),
    index("clients_type_idx").on(t.clientType),
  ]
);

/* -------------------------------------------------------------------- teams */
// No business-code column in Feishu — PK is the Feishu record_id.
export const teams = pgTable(
  "teams",
  {
    teamId: text("team_id").primaryKey(),
    name: text("name").notNull(),
    coach: text("coach"),
    focus: text("focus"),
    notes: text("notes"),
    positions: jsonb("positions"), // subgroup/position definitions
    groups: jsonb("groups"),
    createdAt: ts("created_at"),
  },
  (t) => [index("teams_coach_idx").on(t.coach)]
);

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => teams.teamId, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    position: text("position"),
  },
  (t) => [
    index("team_members_team_idx").on(t.teamId),
    index("team_members_client_idx").on(t.clientId),
  ]
);

/* -------------------------------------------------------- workout_templates */
export const workoutTemplates = pgTable(
  "workout_templates",
  {
    templateId: text("template_id").primaryKey(),
    programId: text("program_id").references(() => programs.programId),
    week: integer("week"),
    day: integer("day"),
    sessionName: text("session_name"),
    sessionNameCn: text("session_name_cn"),
    sessionType: text("session_type"),
    sessionGoal: text("session_goal"),
    // Session-level coach notes (intensity cues, warm-up instructions),
    // replicated on each of the session's rows like sessionGoal.
    sessionNotes: text("session_notes"),
    estimatedDuration: integer("estimated_duration"),
    intensity: text("intensity"),
    isSingleWorkout: boolean("is_single_workout"),
    exerciseId: text("exercise_id").references(() => exercises.exerciseId),
    exerciseName: text("exercise_name"),
    exerciseOrder: integer("exercise_order"),
    sets: integer("sets"),
    reps: text("reps"),
    tempo: text("tempo"),
    rest: text("rest"),
    videoUrl: text("video_url"),
    coachingNotes: text("coaching_notes"),
    coachingNotesCn: text("coaching_notes_cn"),
    // Auto-target / prescription resolution
    targetSource: text("target_source"),
    targetMetric: text("target_metric"),
    targetPercent: doublePrecision("target_percent"),
    targetAdjustment: doublePrecision("target_adjustment"),
    autoTarget: boolean("auto_target"),
    displayTarget: text("display_target"),
    // Builder layout / grouping
    sectionName: text("section_name"),
    exerciseLabel: text("exercise_label"),
    groupType: text("group_type"),
    groupName: text("group_name"),
    trackingType: text("tracking_type"),
    isUnilateral: boolean("is_unilateral"),
    isAccessory: boolean("is_accessory"),
    accessoryParent: text("accessory_parent"),
    accessoryColor: text("accessory_color"),
    status: text("status").default("Active"),
  },
  (t) => [
    index("workout_templates_program_idx").on(t.programId),
    index("workout_templates_exercise_idx").on(t.exerciseId),
    index("workout_templates_program_week_day_idx").on(t.programId, t.week, t.day),
  ]
);

/* -------------------------------------------------------- set_prescriptions */
// Per-set detail for a workout_templates row (its own Feishu table).
export const setPrescriptions = pgTable(
  "set_prescriptions",
  {
    prescriptionId: text("prescription_id").primaryKey(),
    templateId: text("template_id").references(() => workoutTemplates.templateId, {
      onDelete: "cascade",
    }),
    setNumber: integer("set_number"),
    reps: text("reps"),
    load: text("load"),
    percent: doublePrecision("percent"),
    percentMas: doublePrecision("percent_mas"),
    intensityMode: text("intensity_mode"),
    intensityValue: text("intensity_value"),
    tempo: text("tempo"),
    rest: text("rest"),
  },
  (t) => [index("set_prescriptions_template_idx").on(t.templateId)]
);

/* ------------------------------------------------------- exercise_alternates */
// Alternate/substitute exercises for a workout_templates row.
export const exerciseAlternates = pgTable(
  "exercise_alternates",
  {
    alternateId: text("alternate_id").primaryKey(),
    templateId: text("template_id").references(() => workoutTemplates.templateId, {
      onDelete: "cascade",
    }),
    exerciseId: text("exercise_id").references(() => exercises.exerciseId),
    exerciseName: text("exercise_name"),
  },
  (t) => [
    index("exercise_alternates_template_idx").on(t.templateId),
    index("exercise_alternates_exercise_idx").on(t.exerciseId),
  ]
);

/* -------------------------------------------------------- assigned_workouts */
export const assignedWorkouts = pgTable(
  "assigned_workouts",
  {
    assignedWorkoutId: text("assigned_workout_id").primaryKey(),
    clientId: text("client_id").references(() => clients.clientId),
    programId: text("program_id").references(() => programs.programId),
    week: integer("week"),
    day: integer("day"),
    sessionName: text("session_name"),
    sessionNameCn: text("session_name_cn"),
    sessionType: text("session_type"),
    sessionGoal: text("session_goal"),
    intensity: text("intensity"),
    estimatedDuration: integer("estimated_duration"),
    scheduledDate: ts("scheduled_date"),
    completionStatus: text("completion_status"),
    coachNotes: text("coach_notes"),
    coachNotesCn: text("coach_notes_cn"),
    clientNotes: text("client_notes"),
    clientNotesCn: text("client_notes_cn"),
    // Internal-load metrics (coach-only) written at workout finish
    sessionRpe: doublePrecision("session_rpe"),
    sessionDuration: doublePrecision("session_duration"), // minutes
    sessionLoad: doublePrecision("session_load"), // RPE × duration
    coachReviewed: boolean("coach_reviewed").default(false),
  },
  (t) => [
    index("assigned_workouts_client_idx").on(t.clientId),
    index("assigned_workouts_client_date_idx").on(t.clientId, t.scheduledDate),
    index("assigned_workouts_program_idx").on(t.programId),
    index("assigned_workouts_status_idx").on(t.completionStatus),
  ]
);

/* ------------------------------------------------------------- workout_logs */
export const workoutLogs = pgTable(
  "workout_logs",
  {
    logId: text("log_id").primaryKey(),
    clientId: text("client_id").references(() => clients.clientId),
    // Plain-text CL- code written on save (fast per-client filtering without
    // resolving the link column)
    clientCode: text("client_code"),
    assignedWorkoutId: text("assigned_workout_id").references(
      () => assignedWorkouts.assignedWorkoutId
    ),
    exerciseId: text("exercise_id").references(() => exercises.exerciseId),
    exerciseName: text("exercise_name"),
    date: ts("date"),
    setNumber: integer("set_number"),
    prescribedSets: integer("prescribed_sets"),
    prescribedReps: text("prescribed_reps"),
    actualReps: integer("actual_reps"),
    actualWeight: doublePrecision("actual_weight"),
    actualRpe: doublePrecision("actual_rpe"),
    actualRir: doublePrecision("actual_rir"),
    weightUnit: text("weight_unit"),
    actualTime: text("actual_time"),
    timeUnit: text("time_unit"),
    actualDistance: doublePrecision("actual_distance"),
    distanceUnit: text("distance_unit"),
    completed: boolean("completed"),
    coachReviewed: boolean("coach_reviewed"),
    athleteNotes: text("athlete_notes"),
    athleteNotesEn: text("athlete_notes_en"),
    exerciseOrder: integer("exercise_order"),
    volume: doublePrecision("volume"),
    durationSeconds: integer("duration_seconds"),
    loadScore: doublePrecision("load_score"),
    createdAt: ts("created_at"),
  },
  (t) => [
    index("workout_logs_client_idx").on(t.clientId),
    index("workout_logs_assigned_idx").on(t.assignedWorkoutId),
    index("workout_logs_exercise_idx").on(t.exerciseId),
    index("workout_logs_client_date_idx").on(t.clientId, t.date),
  ]
);

/* --------------------------------------------------------- exercise_results */
export const exerciseResults = pgTable(
  "exercise_results",
  {
    resultId: text("result_id").primaryKey(),
    clientId: text("client_id").references(() => clients.clientId),
    exerciseId: text("exercise_id").references(() => exercises.exerciseId),
    exerciseName: text("exercise_name"),
    date: ts("date"),
    bestWeight: doublePrecision("best_weight"),
    bestReps: integer("best_reps"),
    estimated1rm: doublePrecision("estimated_1rm"),
    volume: doublePrecision("volume"),
    sourceWorkoutId: text("source_workout_id"),
  },
  (t) => [
    index("exercise_results_client_idx").on(t.clientId),
    index("exercise_results_client_exercise_idx").on(t.clientId, t.exerciseId),
  ]
);

/* ---------------------------------------------------------- athlete_metrics */
// Performance model (drives auto-prescription): 1RM, MAS, LT, HRmax, RestingHR.
export const athleteMetrics = pgTable(
  "athlete_metrics",
  {
    metricId: text("metric_id").primaryKey(),
    clientId: text("client_id").references(() => clients.clientId),
    clientName: text("client_name"),
    sourceTestId: text("source_test_id"),
    metricName: text("metric_name"),
    metricType: text("metric_type"),
    value: doublePrecision("value"),
    unit: text("unit"),
    validFrom: ts("valid_from"),
    validUntil: ts("valid_until"),
    sourceTestName: text("source_test_name"),
    calculationMethod: text("calculation_method"),
    sourceType: text("source_type"),
    status: text("status").default("Active"),
    notes: text("notes"),
  },
  (t) => [
    index("athlete_metrics_client_idx").on(t.clientId),
    index("athlete_metrics_client_type_idx").on(t.clientId, t.metricType),
  ]
);

/* ------------------------------------------------------------ subscriptions */
export const subscriptions = pgTable(
  "subscriptions",
  {
    subscriptionId: text("subscription_id").primaryKey(),
    clientId: text("client_id").references(() => clients.clientId),
    plan: text("plan"),
    price: money("price"),
    currency: text("currency").default("CNY"),
    billingCycle: text("billing_cycle"),
    startDate: ts("start_date"),
    nextBillingDate: ts("next_billing_date"),
    status: text("status").default("Active"),
    coach: text("coach"),
    autoRenew: boolean("auto_renew").default(false),
    paymentId: text("payment_id"),
    notes: text("notes"),
  },
  (t) => [
    index("subscriptions_client_idx").on(t.clientId),
    index("subscriptions_status_idx").on(t.status),
    index("subscriptions_next_billing_idx").on(t.nextBillingDate),
  ]
);

/* ----------------------------------------------------------- product_orders */
export const productOrders = pgTable(
  "product_orders",
  {
    orderId: text("order_id").primaryKey(),
    clientId: text("client_id").references(() => clients.clientId),
    clientName: text("client_name"),
    productType: text("product_type"),
    programId: text("program_id").references(() => programs.programId),
    productName: text("product_name"),
    amount: money("amount"),
    currency: text("currency"),
    paymentStatus: text("payment_status"),
    paymentProvider: text("payment_provider"),
    paymentReference: text("payment_reference"),
    // Referral program: who invited this buyer, and how many earned 10%
    // reward units this purchase consumed (stack cap 5 = 50%).
    referrerCode: text("referrer_code"),
    referralRewardsUsed: integer("referral_rewards_used"),
    purchasedAt: ts("purchased_at"),
    accessStartDate: ts("access_start_date"),
    intakeStatus: text("intake_status"),
    assignCoach: text("assign_coach"),
    fulfillmentStatus: text("fulfillment_status"), // New Order | Program Loaded
  },
  (t) => [
    index("product_orders_client_idx").on(t.clientId),
    index("product_orders_program_idx").on(t.programId),
    index("product_orders_payment_status_idx").on(t.paymentStatus),
  ]
);

/* ---------------------------------------------------------------- check_ins */
export const checkIns = pgTable(
  "check_ins",
  {
    checkinId: text("checkin_id").primaryKey(),
    clientId: text("client_id").references(() => clients.clientId),
    clientName: text("client_name"),
    submittedDate: ts("submitted_date"),
    bodyWeight: doublePrecision("body_weight"),
    sleepQuality: integer("sleep_quality"),
    energy: integer("energy"),
    mood: text("mood"),
    stress: integer("stress"),
    soreness: integer("soreness"),
    sleepHours: doublePrecision("sleep_hours"),
    readinessScore: doublePrecision("readiness_score"),
    status: text("status"),
    nutritionNotes: text("nutrition_notes"),
    trainingNotes: text("training_notes"),
    wins: text("wins"),
    problemsPain: text("problems_pain"),
    clientNotes: text("client_notes"),
    coachNotes: text("coach_notes"),
    reviewedDate: ts("reviewed_date"),
  },
  (t) => [
    index("check_ins_client_idx").on(t.clientId),
    index("check_ins_client_date_idx").on(t.clientId, t.submittedDate),
  ]
);

/* ============================== Forms (questionnaires / intake) ========== */
export const formTemplates = pgTable("form_templates", {
  formId: text("form_id").primaryKey(),
  name: text("name").notNull(),
  nameCn: text("name_cn"),
  type: text("type"),
  description: text("description"),
  descriptionCn: text("description_cn"),
  productType: text("product_type"),
  publicIntakeLink: text("public_intake_link"),
  requiresCoachReview: boolean("requires_coach_review").default(false),
});

export const formQuestions = pgTable(
  "form_questions",
  {
    questionId: text("question_id").primaryKey(),
    formId: text("form_id").references(() => formTemplates.formId),
    orderIndex: integer("order_index"),
    label: text("label"),
    labelCn: text("label_cn"),
    questionType: text("question_type"),
    options: jsonb("options"),
    required: boolean("required").default(false),
    helpText: text("help_text"),
    helpTextCn: text("help_text_cn"),
  },
  (t) => [index("form_questions_form_idx").on(t.formId)]
);

export const assignedForms = pgTable(
  "assigned_forms",
  {
    assignedFormId: text("assigned_form_id").primaryKey(),
    formId: text("form_id").references(() => formTemplates.formId),
    clientId: text("client_id").references(() => clients.clientId),
    clientCode: text("client_code"),
    assignedDate: ts("assigned_date"),
    status: text("status"),
    completedAt: ts("completed_at"),
    productType: text("product_type"),
    intakeAssessment: text("intake_assessment"),
    reviewStatus: text("review_status"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: ts("reviewed_at"),
  },
  (t) => [
    index("assigned_forms_client_idx").on(t.clientId),
    index("assigned_forms_form_idx").on(t.formId),
  ]
);

export const formResponses = pgTable(
  "form_responses",
  {
    responseId: text("response_id").primaryKey(),
    assignedFormId: text("assigned_form_id").references(
      () => assignedForms.assignedFormId
    ),
    formId: text("form_id").references(() => formTemplates.formId),
    clientId: text("client_id").references(() => clients.clientId),
    submittedAt: ts("submitted_at"),
    answers: jsonb("answers"),
    clientComment: text("client_comment"),
    clientCommentEn: text("client_comment_en"),
  },
  (t) => [
    index("form_responses_client_idx").on(t.clientId),
    index("form_responses_assigned_idx").on(t.assignedFormId),
  ]
);

/* ============================== Tests (physical testing) ================= */
export const testTemplates = pgTable("test_templates", {
  testTemplateId: text("test_template_id").primaryKey(),
  name: text("name").notNull(),
  nameCn: text("name_cn"),
  category: text("category"),
  description: text("description"),
  descriptionCn: text("description_cn"),
});

export const testItems = pgTable(
  "test_items",
  {
    testItemId: text("test_item_id").primaryKey(),
    testTemplateId: text("test_template_id").references(
      () => testTemplates.testTemplateId
    ),
    orderIndex: integer("order_index"),
    testName: text("test_name"),
    testNameCn: text("test_name_cn"),
    metricType: text("metric_type"),
    unit: text("unit"),
    unitCn: text("unit_cn"),
    instructions: text("instructions"),
    instructionsCn: text("instructions_cn"),
    // Test → athlete-metric pipeline
    createsMetric: boolean("creates_metric"),
    testingMetricType: text("testing_metric_type"),
    calculationMethod: text("calculation_method"),
    metricName: text("metric_name"),
    metricUnit: text("metric_unit"),
    inputUnit: text("input_unit"),
  },
  (t) => [index("test_items_template_idx").on(t.testTemplateId)]
);

export const assignedTests = pgTable(
  "assigned_tests",
  {
    assignedTestId: text("assigned_test_id").primaryKey(),
    testTemplateId: text("test_template_id").references(
      () => testTemplates.testTemplateId
    ),
    clientId: text("client_id").references(() => clients.clientId),
    clientCode: text("client_code"),
    assignedDate: ts("assigned_date"),
    options: jsonb("options"),
    completedAt: ts("completed_at"),
  },
  (t) => [
    index("assigned_tests_client_idx").on(t.clientId),
    index("assigned_tests_template_idx").on(t.testTemplateId),
  ]
);

export const testResults = pgTable(
  "test_results",
  {
    resultId: text("result_id").primaryKey(),
    assignedTestId: text("assigned_test_id").references(
      () => assignedTests.assignedTestId
    ),
    testTemplateId: text("test_template_id").references(
      () => testTemplates.testTemplateId
    ),
    testItemId: text("test_item_id").references(() => testItems.testItemId),
    // Denormalized item name: template edits replace item rows (nulling the
    // FK above on historical results), so the display name must survive on
    // the result itself.
    testItemName: text("test_item_name"),
    clientId: text("client_id").references(() => clients.clientId),
    value: text("value"),
    unit: text("unit"),
    notes: text("notes"),
    notesEn: text("notes_en"),
    submittedAt: ts("submitted_at"),
    createsMetric: boolean("creates_metric"),
    metricCreated: boolean("metric_created"),
  },
  (t) => [
    index("test_results_client_idx").on(t.clientId),
    index("test_results_assigned_idx").on(t.assignedTestId),
    index("test_results_item_idx").on(t.testItemId),
  ]
);

/* ============================== Notifications =========================== */
export const notifications = pgTable(
  "notifications",
  {
    notificationId: text("notification_id").primaryKey(),
    clientId: text("client_id").references(() => clients.clientId),
    title: text("title"),
    body: text("body"),
    type: text("type"),
    read: boolean("read").default(false),
    createdAt: ts("created_at"),
  },
  (t) => [index("notifications_client_idx").on(t.clientId)]
);

/* ================== Tables added on Feishu after 2026-06-20 =============== */

// Athlete weekly self-report (Tech AM/PM RPE+min, extra cardio) — one row per
// client per day; Log ID = "<clientCode>-YYYY-MM-DD". Feeds the coach Training
// Load dashboard (monotony/strain).
export const workloadLogs = pgTable(
  "workload_logs",
  {
    workloadLogId: text("workload_log_id").primaryKey(),
    clientId: text("client_id").references(() => clients.clientId),
    date: ts("date"),
    techAmRpe: doublePrecision("tech_am_rpe"),
    techAmMin: doublePrecision("tech_am_min"),
    techPmRpe: doublePrecision("tech_pm_rpe"),
    techPmMin: doublePrecision("tech_pm_min"),
    cardioRpe: doublePrecision("cardio_rpe"),
    cardioMin: doublePrecision("cardio_min"),
    notes: text("notes"),
  },
  (t) => [index("workload_logs_client_date_idx").on(t.clientId, t.date)]
);

// Store testimonials (client-submitted, coach-approved).
export const reviews = pgTable(
  "reviews",
  {
    reviewId: text("review_id").primaryKey(),
    clientId: text("client_id").references(() => clients.clientId),
    clientName: text("client_name"),
    programId: text("program_id").references(() => programs.programId),
    programName: text("program_name"),
    rating: doublePrecision("rating"),
    quote: text("quote"),
    showOnStore: boolean("show_on_store").default(false),
    approved: boolean("approved").default(false),
    submittedDate: ts("submitted_date"),
  },
  (t) => [index("reviews_program_idx").on(t.programId)]
);

// In-person training enquiries from the public store (no client FK — these
// arrive before a client record exists).
export const enquiries = pgTable("enquiries", {
  enquiryId: text("enquiry_id").primaryKey(),
  contactPerson: text("contact_person"),
  contact: text("contact"),
  organization: text("organization"),
  athletes: text("athletes"),
  duration: text("duration"),
  notes: text("notes"),
  submittedDate: text("submitted_date"), // stored as text in Feishu
  status: text("status"),
});

// Athlete form-check submissions (video and/or note) + coach replies.
export const formVideos = pgTable(
  "form_videos",
  {
    videoId: text("video_id").primaryKey(),
    clientId: text("client_id").references(() => clients.clientId),
    clientName: text("client_name"),
    exerciseName: text("exercise_name"),
    workoutName: text("workout_name"),
    videoUrl: text("video_url"),
    clientNote: text("client_note"),
    submittedAt: ts("submitted_at"),
    status: text("status"), // New | Reviewed
    coachReply: text("coach_reply"),
    reviewedAt: ts("reviewed_at"),
  },
  (t) => [index("form_videos_client_idx").on(t.clientId)]
);

// Canonical physical-test library (the Tests page "identity layer"); batteries
// (testTemplates/testItems) reference these by Test ID.
export const testLibrary = pgTable("test_library", {
  testId: text("test_id").primaryKey(),
  name: text("name").notNull(),
  nameCn: text("name_cn"),
  category: text("category"),
  resultMetric: text("result_metric"),
  resultUnit: text("result_unit"),
  calculation: text("calculation"),
  protocol: text("protocol"),
  protocolCn: text("protocol_cn"),
  higherIsBetter: boolean("higher_is_better").default(true),
  status: text("status"),
  linkedExerciseId: text("linked_exercise_id").references(() => exercises.exerciseId),
});
