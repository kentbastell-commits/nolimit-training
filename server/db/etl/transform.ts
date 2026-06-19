// ETL — transform layer. Maps Feishu records to Postgres row objects matching
// server/db/schema.ts. No DB imports (so the dry-run runs without Postgres).
import {
  type FeishuRecord,
  textOrNull,
  fieldNum,
  fieldBool,
  fieldDateMs,
  fieldArr,
  fieldJson,
  fieldJsonArr,
  linkRecordIds,
} from "./extract.ts";

export type Ctx = { idMaps: Record<string, Map<string, string>> };

const money = (n: number | null) => (n == null ? null : String(n));

// Business code for a record: its PK text field, falling back to the Feishu id.
export function code(rec: FeishuRecord, pkField: string): string {
  const t = pkField ? textOrNull(rec.fields[pkField]) : null;
  return t ?? rec.record_id;
}

// Resolve a field to a referenced business code. Handles all three ways Feishu
// stores a reference: a structured link, a record-id stored as plain text, or
// the business code itself already in text.
function resolveOne(raw: string, m?: Map<string, string>): string {
  return (m && m.get(raw)) ?? raw; // map record_id -> code; else pass through
}

function ref(v: any, key: string, ctx: Ctx): string | null {
  const m = ctx.idMaps[key];
  const ids = linkRecordIds(v);
  if (ids.length) return resolveOne(ids[0], m);
  const t = textOrNull(v);
  return t == null ? null : resolveOne(t, m);
}

function refAll(v: any, key: string, ctx: Ctx): string[] {
  const m = ctx.idMaps[key];
  const ids = linkRecordIds(v);
  if (ids.length) return ids.map((id) => resolveOne(id, m));
  const t = textOrNull(v);
  return t == null ? [] : [resolveOne(t, m)];
}

export type TableSpec = {
  table: string;
  envVar: string;
  fallbackId?: string;
  pkField: string;
  expected: string[];
  map: (rec: FeishuRecord, ctx: Ctx) => Record<string, unknown>;
};

export const TABLES: TableSpec[] = [
  {
    table: "coaches",
    envVar: "FEISHU_COACHES_TABLE_ID",
    fallbackId: "tblzFeZwc4Zby2cr",
    pkField: "Coach ID",
    expected: ["Coach ID", "Name", "Email", "Phone/Wechat", "Role", "Status", "Bio", "Created At"],
    map: (r) => ({
      coachId: code(r, "Coach ID"),
      name: textOrNull(r.fields["Name"]) ?? "",
      email: textOrNull(r.fields["Email"]),
      phone: textOrNull(r.fields["Phone/Wechat"]),
      role: textOrNull(r.fields["Role"]),
      status: textOrNull(r.fields["Status"]),
      bio: textOrNull(r.fields["Bio"]),
      createdAt: fieldDateMs(r.fields["Created At"]),
    }),
  },
  {
    table: "exercises",
    envVar: "FEISHU_EXERCISE_LIBRARY_TABLE_ID",
    pkField: "Exercise ID",
    expected: ["Exercise ID","Exercise Name","Exercise Name CN","Category","Category CN","Technical Cues","Technical Cues Cn","Primary Muscles","Primary Muscles CN","Equipment","Difficulty","Training Quality","Default Sets","Default Reps","Default Rest","RPE Target","Professional Coaching Cues","Professional Coaching Cues CN","Common Errors / Watchouts","Common Errors / Watchouts CN","Thumbnail Image","Short Video URL","Long Video URL","Default Metric","Metric Category","Use Auto Target","Status","Movement Pattern","Photo Search Keywords","Thumbnail Search Keywords"],
    map: (r) => {
      const f = r.fields;
      return {
        exerciseId: code(r, "Exercise ID"),
        name: textOrNull(f["Exercise Name"]) ?? "",
        nameCn: textOrNull(f["Exercise Name CN"]),
        category: textOrNull(f["Category"]),
        categoryCn: textOrNull(f["Category CN"]),
        movementPattern: textOrNull(f["Movement Pattern"]),
        primaryMuscles: textOrNull(f["Primary Muscles"]),
        primaryMusclesCn: textOrNull(f["Primary Muscles CN"]),
        equipment: fieldArr(f["Equipment"]),
        difficulty: textOrNull(f["Difficulty"]),
        trainingQuality: textOrNull(f["Training Quality"]),
        defaultSets: fieldNum(f["Default Sets"]),
        defaultReps: textOrNull(f["Default Reps"]),
        defaultRest: textOrNull(f["Default Rest"]),
        rpeTarget: textOrNull(f["RPE Target"]),
        coachingCues: textOrNull(f["Professional Coaching Cues"]),
        coachingCuesCn: textOrNull(f["Professional Coaching Cues CN"]),
        technicalCues: textOrNull(f["Technical Cues"]),
        technicalCuesCn: textOrNull(f["Technical Cues Cn"]),
        commonErrors: textOrNull(f["Common Errors / Watchouts"]),
        commonErrorsCn: textOrNull(f["Common Errors / Watchouts CN"]),
        thumbnailUrl: textOrNull(f["Thumbnail Image"]),
        shortVideoUrl: textOrNull(f["Short Video URL"]),
        longVideoUrl: textOrNull(f["Long Video URL"]),
        defaultMetric: textOrNull(f["Default Metric"]),
        metricCategory: textOrNull(f["Metric Category"]),
        useAutoTarget: fieldBool(f["Use Auto Target"]),
        status: textOrNull(f["Status"]),
      };
    },
  },
  {
    table: "programs",
    envVar: "FEISHU_PROGRAMS_TABLE_ID",
    pkField: "Program ID",
    expected: ["Program ID","Program Name","Program Name CN","Goal","Goal CN","Sport","Level","Duration Weeks","Phase","Phase CN","Sessions / Week","Coach","Description","Description CN","Status","Store URL","Store Description","Store Description CN","Product Image","Product Type","Price","Public Store Visible","Currency","Purchase Link","Default Intake Form ID","Access Length Days","Product Status","Sales Description","Sales Description CN","Duration/Weeks"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        programId: code(r, "Program ID"),
        name: textOrNull(f["Program Name"]) ?? "",
        nameCn: textOrNull(f["Program Name CN"]),
        goal: textOrNull(f["Goal"]),
        goalCn: textOrNull(f["Goal CN"]),
        sport: textOrNull(f["Sport"]),
        level: textOrNull(f["Level"]),
        durationWeeks: fieldNum(f["Duration Weeks"]),
        phase: textOrNull(f["Phase"]),
        phaseCn: textOrNull(f["Phase CN"]),
        sessionsPerWeek: fieldNum(f["Sessions / Week"]),
        coachId: ref(f["Coach"], "coaches", ctx),
        description: textOrNull(f["Description"]),
        descriptionCn: textOrNull(f["Description CN"]),
        status: textOrNull(f["Status"]),
        productType: textOrNull(f["Product Type"]),
        price: money(fieldNum(f["Price"])),
        currency: textOrNull(f["Currency"]),
        publicStoreVisible: fieldBool(f["Public Store Visible"]),
        purchaseLink: textOrNull(f["Purchase Link"]),
        storeUrl: textOrNull(f["Store URL"]),
        storeDescription: textOrNull(f["Store Description"]),
        storeDescriptionCn: textOrNull(f["Store Description CN"]),
        productImage: textOrNull(f["Product Image"]),
        defaultIntakeFormId: textOrNull(f["Default Intake Form ID"]),
        accessLengthDays: fieldNum(f["Access Length Days"]),
        productStatus: textOrNull(f["Product Status"]),
        salesDescription: textOrNull(f["Sales Description"]),
        salesDescriptionCn: textOrNull(f["Sales Description CN"]),
      };
    },
  },
  {
    table: "clients",
    envVar: "FEISHU_CLIENTS_TABLE_ID",
    pkField: "Client ID",
    expected: ["Client ID","Full Name","Full Name CN","Coach Assigned","Program ID","Start Date","Package Type","Email","Phone/WeChat","Notes","Last Check-in Date","Language Preference","Client Type","Primary Coach","Secondary Coach","Package","Subscription Status","Intake Status","Payment Status","Purchased Program ID","Access Start Date","Access End Date","Source","Stripe Payment ID","Notes EN","MAS","HR Max","Resting HR","Zone 5K%","Zone 10k%","Zone Threshold %","Zone Easy %","Tags","Categories","Last Login"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        clientId: code(r, "Client ID"),
        fullName: textOrNull(f["Full Name"]) ?? "",
        fullNameCn: textOrNull(f["Full Name CN"]),
        email: textOrNull(f["Email"]),
        phone: textOrNull(f["Phone/WeChat"]),
        languagePreference: textOrNull(f["Language Preference"]),
        clientType: textOrNull(f["Client Type"]),
        primaryCoachId: ref(f["Primary Coach"], "coaches", ctx),
        secondaryCoachId: ref(f["Secondary Coach"], "coaches", ctx),
        coachAssigned: textOrNull(f["Coach Assigned"]),
        programId: ref(f["Program ID"], "programs", ctx),
        purchasedProgramId: textOrNull(f["Purchased Program ID"]),
        packageType: textOrNull(f["Package Type"]),
        package: textOrNull(f["Package"]),
        subscriptionStatus: textOrNull(f["Subscription Status"]),
        intakeStatus: textOrNull(f["Intake Status"]),
        paymentStatus: textOrNull(f["Payment Status"]),
        startDate: fieldDateMs(f["Start Date"]),
        accessStartDate: fieldDateMs(f["Access Start Date"]),
        accessEndDate: fieldDateMs(f["Access End Date"]),
        source: textOrNull(f["Source"]),
        stripePaymentId: textOrNull(f["Stripe Payment ID"]),
        lastLogin: fieldDateMs(f["Last Login"]),
        lastCheckinDate: fieldDateMs(f["Last Check-in Date"]),
        tags: fieldJsonArr(f["Tags"]),
        categories: fieldJsonArr(f["Categories"]),
        notes: textOrNull(f["Notes"]),
        notesEn: textOrNull(f["Notes EN"]),
        mas: fieldNum(f["MAS"]),
        hrMax: fieldNum(f["HR Max"]),
        restingHr: fieldNum(f["Resting HR"]),
        zone5kPct: fieldNum(f["Zone 5K%"]),
        zone10kPct: fieldNum(f["Zone 10k%"]),
        zoneThresholdPct: fieldNum(f["Zone Threshold %"]),
        zoneEasyPct: fieldNum(f["Zone Easy %"]),
      };
    },
  },
  {
    table: "teams",
    envVar: "FEISHU_TEAMS_TABLE_ID",
    pkField: "",
    expected: ["Team Name", "Coach", "Notes", "Members", "Positions", "Focus", "Groups"],
    map: (r) => ({
      teamId: r.record_id,
      name: textOrNull(r.fields["Team Name"]) ?? "",
      coach: textOrNull(r.fields["Coach"]),
      focus: textOrNull(r.fields["Focus"]),
      notes: textOrNull(r.fields["Notes"]),
      positions: fieldJson(r.fields["Positions"]),
      groups: fieldJson(r.fields["Groups"]),
      createdAt: null,
    }),
  },
  {
    table: "workout_templates",
    envVar: "FEISHU_WORKOUT_TEMPLATES_TABLE_ID",
    pkField: "Template ID",
    expected: ["Template ID","Program ID","Week","Day","Session Name","Session Name CN","Exercise ID","Exercise Name","Order","Sets","Reps","Video URL","Tempo","Rest","Coaching Notes","Coaching Notes CN","Status","Session Type","Session Goal","Estimated Duration","Intensity","Is Single Workout","Target Source","Target Metric","Target Percent","Target Adjustment","Auto Target","Display Target","Set Prescriptions","Exercise Alternates","Section Name","Exercise Label","Group Type","Group Name","Tracking Type","Is Unilateral","Is Accessory","Accessory Parent","Accessory Color"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        templateId: code(r, "Template ID"),
        programId: ref(f["Program ID"], "programs", ctx),
        week: fieldNum(f["Week"]),
        day: fieldNum(f["Day"]),
        sessionName: textOrNull(f["Session Name"]),
        sessionNameCn: textOrNull(f["Session Name CN"]),
        sessionType: textOrNull(f["Session Type"]),
        sessionGoal: textOrNull(f["Session Goal"]),
        estimatedDuration: fieldNum(f["Estimated Duration"]),
        intensity: textOrNull(f["Intensity"]),
        isSingleWorkout: fieldBool(f["Is Single Workout"]),
        exerciseId: ref(f["Exercise ID"], "exercises", ctx),
        exerciseName: textOrNull(f["Exercise Name"]),
        exerciseOrder: fieldNum(f["Order"]),
        sets: fieldNum(f["Sets"]),
        reps: textOrNull(f["Reps"]),
        tempo: textOrNull(f["Tempo"]),
        rest: textOrNull(f["Rest"]),
        videoUrl: textOrNull(f["Video URL"]),
        coachingNotes: textOrNull(f["Coaching Notes"]),
        coachingNotesCn: textOrNull(f["Coaching Notes CN"]),
        targetSource: textOrNull(f["Target Source"]),
        targetMetric: textOrNull(f["Target Metric"]),
        targetPercent: fieldNum(f["Target Percent"]),
        targetAdjustment: fieldNum(f["Target Adjustment"]),
        autoTarget: fieldBool(f["Auto Target"]),
        displayTarget: textOrNull(f["Display Target"]),
        sectionName: textOrNull(f["Section Name"]),
        exerciseLabel: textOrNull(f["Exercise Label"]),
        groupType: textOrNull(f["Group Type"]),
        groupName: textOrNull(f["Group Name"]),
        trackingType: textOrNull(f["Tracking Type"]),
        isUnilateral: fieldBool(f["Is Unilateral"]),
        isAccessory: fieldBool(f["Is Accessory"]),
        accessoryParent: textOrNull(f["Accessory Parent"]),
        accessoryColor: textOrNull(f["Accessory Color"]),
        status: textOrNull(f["Status"]),
      };
    },
  },
  {
    table: "set_prescriptions",
    envVar: "FEISHU_SET_PRESCRIPTIONS_TABLE_ID",
    pkField: "Prescription ID",
    expected: ["Prescription ID","Template ID","Set Number","Reps","Load","Percent","Percent MAS","Intensity Mode","Intensity Value","Tempo","Rest"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        prescriptionId: code(r, "Prescription ID"),
        templateId: ref(f["Template ID"], "workout_templates", ctx),
        setNumber: fieldNum(f["Set Number"]),
        reps: textOrNull(f["Reps"]),
        load: textOrNull(f["Load"]),
        percent: fieldNum(f["Percent"]),
        percentMas: fieldNum(f["Percent MAS"]),
        intensityMode: textOrNull(f["Intensity Mode"]),
        intensityValue: textOrNull(f["Intensity Value"]),
        tempo: textOrNull(f["Tempo"]),
        rest: textOrNull(f["Rest"]),
      };
    },
  },
  {
    table: "exercise_alternates",
    envVar: "FEISHU_EXERCISE_ALTERNATES_TABLE_ID",
    pkField: "Alternate ID",
    expected: ["Alternate ID", "Template ID", "Exercise ID", "Exercise Name"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        alternateId: code(r, "Alternate ID"),
        templateId: ref(f["Template ID"], "workout_templates", ctx),
        exerciseId: ref(f["Exercise ID"], "exercises", ctx),
        exerciseName: textOrNull(f["Exercise Name"]),
      };
    },
  },
  {
    table: "assigned_workouts",
    envVar: "FEISHU_ASSIGNED_WORKOUTS_TABLE_ID",
    pkField: "Assigned Workout ID",
    expected: ["Assigned Workout ID","Client ID","Program ID","Week","Day","Session Name","Session Name CN","Scheduled Date","Completion Status","Coach Notes","Coach Notes CN","Client Notes","Client Notes CN","Session Type","Session Goal","Estimated Duration","Intensity"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        assignedWorkoutId: code(r, "Assigned Workout ID"),
        clientId: ref(f["Client ID"], "clients", ctx),
        programId: ref(f["Program ID"], "programs", ctx),
        week: fieldNum(f["Week"]),
        day: fieldNum(f["Day"]),
        sessionName: textOrNull(f["Session Name"]),
        sessionNameCn: textOrNull(f["Session Name CN"]),
        sessionType: textOrNull(f["Session Type"]),
        sessionGoal: textOrNull(f["Session Goal"]),
        intensity: textOrNull(f["Intensity"]),
        estimatedDuration: fieldNum(f["Estimated Duration"]),
        scheduledDate: fieldDateMs(f["Scheduled Date"]),
        completionStatus: textOrNull(f["Completion Status"]),
        coachNotes: textOrNull(f["Coach Notes"]),
        coachNotesCn: textOrNull(f["Coach Notes CN"]),
        clientNotes: textOrNull(f["Client Notes"]),
        clientNotesCn: textOrNull(f["Client Notes CN"]),
      };
    },
  },
  {
    table: "workout_logs",
    envVar: "FEISHU_WORKOUT_LOGS_TABLE_ID",
    pkField: "Log ID",
    expected: ["Log ID","Client ID","Assigned Workout ID","Exercise ID","Exercise Name","Date","Set Number","Prescribed Sets","Prescribed Reps","Actual Reps","Actual Weight","Weight Unit","Actual Time","Time Unit","Actual Distance","Distance Unit","Completed","Athlete Notes","Athlete Notes EN","Exercise Order","Created At","Volume","Duration Seconds","Load Score","Coach Reviewed"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        logId: code(r, "Log ID"),
        clientId: ref(f["Client ID"], "clients", ctx),
        assignedWorkoutId: ref(f["Assigned Workout ID"], "assigned_workouts", ctx),
        exerciseId: ref(f["Exercise ID"], "exercises", ctx),
        exerciseName: textOrNull(f["Exercise Name"]),
        date: fieldDateMs(f["Date"]),
        setNumber: fieldNum(f["Set Number"]),
        prescribedSets: fieldNum(f["Prescribed Sets"]),
        prescribedReps: textOrNull(f["Prescribed Reps"]),
        actualReps: fieldNum(f["Actual Reps"]),
        actualWeight: fieldNum(f["Actual Weight"]),
        weightUnit: textOrNull(f["Weight Unit"]),
        actualTime: textOrNull(f["Actual Time"]),
        timeUnit: textOrNull(f["Time Unit"]),
        actualDistance: fieldNum(f["Actual Distance"]),
        distanceUnit: textOrNull(f["Distance Unit"]),
        completed: fieldBool(f["Completed"]),
        coachReviewed: fieldBool(f["Coach Reviewed"]),
        athleteNotes: textOrNull(f["Athlete Notes"]),
        athleteNotesEn: textOrNull(f["Athlete Notes EN"]),
        exerciseOrder: fieldNum(f["Exercise Order"]),
        volume: fieldNum(f["Volume"]),
        durationSeconds: fieldNum(f["Duration Seconds"]),
        loadScore: fieldNum(f["Load Score"]),
        createdAt: fieldDateMs(f["Created At"]),
      };
    },
  },
  {
    table: "exercise_results",
    envVar: "FEISHU_EXERCISE_RESULTS_TABLE_ID",
    pkField: "Result ID",
    expected: ["Result ID","Client ID","Excercise ID","Exercise ID","Exercise Name","Date","Best Weight","Best Reps","Estimated 1 RM","Volume","Source Workout ID"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        resultId: code(r, "Result ID"),
        clientId: ref(f["Client ID"], "clients", ctx),
        exerciseId: ref(f["Excercise ID"] ?? f["Exercise ID"], "exercises", ctx),
        exerciseName: textOrNull(f["Exercise Name"]),
        date: fieldDateMs(f["Date"]),
        bestWeight: fieldNum(f["Best Weight"]),
        bestReps: fieldNum(f["Best Reps"]),
        estimated1rm: fieldNum(f["Estimated 1 RM"]),
        volume: fieldNum(f["Volume"]),
        sourceWorkoutId: textOrNull(f["Source Workout ID"]),
      };
    },
  },
  {
    table: "athlete_metrics",
    envVar: "FEISHU_ATHLETE_METRICS_TABLE_ID",
    pkField: "Metric ID",
    expected: ["Metric ID","Client ID","Client Name","Source Test ID","Metric Name","Metric Type","Metric Value","Unit","Valid From","Valid Until","Notes","Source Test Name","Calculation Method","Source Type","Status"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        metricId: code(r, "Metric ID"),
        clientId: ref(f["Client ID"], "clients", ctx),
        clientName: textOrNull(f["Client Name"]),
        sourceTestId: textOrNull(f["Source Test ID"]),
        metricName: textOrNull(f["Metric Name"]),
        metricType: textOrNull(f["Metric Type"]),
        value: fieldNum(f["Metric Value"]),
        unit: textOrNull(f["Unit"]),
        validFrom: fieldDateMs(f["Valid From"]),
        validUntil: fieldDateMs(f["Valid Until"]),
        sourceTestName: textOrNull(f["Source Test Name"]),
        calculationMethod: textOrNull(f["Calculation Method"]),
        sourceType: textOrNull(f["Source Type"]),
        status: textOrNull(f["Status"]),
        notes: textOrNull(f["Notes"]),
      };
    },
  },
  {
    table: "subscriptions",
    envVar: "FEISHU_SUBSCRIPTIONS_TABLE_ID",
    pkField: "Subscription ID",
    expected: ["Subscription ID","Client ID","Plan","Price","Currency","Billing Cycle","Start Date","Next Billing Date","Status","Coach","Auto Renew","Payment ID","Notes"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        subscriptionId: code(r, "Subscription ID"),
        clientId: ref(f["Client ID"], "clients", ctx),
        plan: textOrNull(f["Plan"]),
        price: money(fieldNum(f["Price"])),
        currency: textOrNull(f["Currency"]),
        billingCycle: textOrNull(f["Billing Cycle"]),
        startDate: fieldDateMs(f["Start Date"]),
        nextBillingDate: fieldDateMs(f["Next Billing Date"]),
        status: textOrNull(f["Status"]),
        coach: textOrNull(f["Coach"]),
        autoRenew: fieldBool(f["Auto Renew"]),
        paymentId: textOrNull(f["Payment ID"]),
        notes: textOrNull(f["Notes"]),
      };
    },
  },
  {
    table: "product_orders",
    envVar: "FEISHU_PRODUCT_ORDERS_TABLE_ID",
    fallbackId: "tbllinXYFDiUboKX",
    pkField: "Order ID",
    expected: ["Order ID","Client ID","Client Name","Product Type","Program ID","Product Name","Amount","Currency","Payment Status","Payment Provider","Payment Reference","Purchased At","Access Start Date","Intake Status","Assign Coach"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        orderId: code(r, "Order ID"),
        clientId: ref(f["Client ID"], "clients", ctx),
        clientName: textOrNull(f["Client Name"]),
        productType: textOrNull(f["Product Type"]),
        programId: ref(f["Program ID"], "programs", ctx),
        productName: textOrNull(f["Product Name"]),
        amount: money(fieldNum(f["Amount"])),
        currency: textOrNull(f["Currency"]),
        paymentStatus: textOrNull(f["Payment Status"]),
        paymentProvider: textOrNull(f["Payment Provider"]),
        paymentReference: textOrNull(f["Payment Reference"]),
        purchasedAt: fieldDateMs(f["Purchased At"]),
        accessStartDate: fieldDateMs(f["Access Start Date"]),
        intakeStatus: textOrNull(f["Intake Status"]),
        assignCoach: textOrNull(f["Assign Coach"]),
      };
    },
  },
  {
    table: "check_ins",
    envVar: "FEISHU_CHECKINS_TABLE_ID",
    pkField: "Check-in ID",
    expected: ["Check-in ID","Client ID","Client","Submitted Date","Body Weight","Sleep Quality","Energy","Mood","Stress","Soreness","Client Notes","Coaches Notes","Reviewed Date"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        checkinId: code(r, "Check-in ID"),
        clientId: ref(f["Client ID"], "clients", ctx),
        clientName: textOrNull(f["Client"]),
        submittedDate: fieldDateMs(f["Submitted Date"]),
        bodyWeight: fieldNum(f["Body Weight"]),
        sleepQuality: fieldNum(f["Sleep Quality"]),
        energy: fieldNum(f["Energy"]),
        mood: textOrNull(f["Mood"]),
        stress: fieldNum(f["Stress"]),
        soreness: fieldNum(f["Soreness"]),
        clientNotes: textOrNull(f["Client Notes"]),
        coachNotes: textOrNull(f["Coaches Notes"]),
        reviewedDate: fieldDateMs(f["Reviewed Date"]),
      };
    },
  },
  {
    table: "form_templates",
    envVar: "FEISHU_FORM_TEMPLATES_TABLE_ID",
    pkField: "Form ID",
    expected: ["Form ID","Name","Name CN","Type","Description","Description CN","Product Type","Public Intake Link","Requires Coach Review"],
    map: (r) => {
      const f = r.fields;
      return {
        formId: code(r, "Form ID"),
        name: textOrNull(f["Name"]) ?? "",
        nameCn: textOrNull(f["Name CN"]),
        type: textOrNull(f["Type"]),
        description: textOrNull(f["Description"]),
        descriptionCn: textOrNull(f["Description CN"]),
        productType: textOrNull(f["Product Type"]),
        publicIntakeLink: textOrNull(f["Public Intake Link"]),
        requiresCoachReview: fieldBool(f["Requires Coach Review"]),
      };
    },
  },
  {
    table: "form_questions",
    envVar: "FEISHU_FORM_QUESTIONS_TABLE_ID",
    pkField: "Question ID",
    expected: ["Question ID","Form ID","Order","Label","Label CN","Question Type","Options","Required","Help text","Help Text CN"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        questionId: code(r, "Question ID"),
        formId: ref(f["Form ID"], "form_templates", ctx),
        orderIndex: fieldNum(f["Order"]),
        label: textOrNull(f["Label"]),
        labelCn: textOrNull(f["Label CN"]),
        questionType: textOrNull(f["Question Type"]),
        options: fieldJson(f["Options"]),
        required: fieldBool(f["Required"]),
        helpText: textOrNull(f["Help text"]),
        helpTextCn: textOrNull(f["Help Text CN"]),
      };
    },
  },
  {
    table: "assigned_forms",
    envVar: "FEISHU_ASSIGNED_FORMS_TABLE_ID",
    pkField: "Assigned Forms ID",
    expected: ["Assigned Forms ID","Form ID","Client ID","Client Code","Assigned Date","Status","Completed At","Product Type","Intake Assessment","Review Status","Reviewed By","Reviewed At"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        assignedFormId: code(r, "Assigned Forms ID"),
        formId: ref(f["Form ID"], "form_templates", ctx),
        clientId: ref(f["Client ID"], "clients", ctx),
        clientCode: textOrNull(f["Client Code"]),
        assignedDate: fieldDateMs(f["Assigned Date"]),
        status: textOrNull(f["Status"]),
        completedAt: fieldDateMs(f["Completed At"]),
        productType: textOrNull(f["Product Type"]),
        intakeAssessment: textOrNull(f["Intake Assessment"]),
        reviewStatus: textOrNull(f["Review Status"]),
        reviewedBy: textOrNull(f["Reviewed By"]),
        reviewedAt: fieldDateMs(f["Reviewed At"]),
      };
    },
  },
  {
    table: "form_responses",
    envVar: "FEISHU_FORM_RESPONSES_TABLE_ID",
    pkField: "Response ID",
    expected: ["Response ID","Assigned Forms ID","Form ID","Client ID","Submitted At","Answers Json","Client Comment","Client Comment EN"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        responseId: code(r, "Response ID"),
        assignedFormId: ref(f["Assigned Forms ID"], "assigned_forms", ctx),
        formId: ref(f["Form ID"], "form_templates", ctx),
        clientId: ref(f["Client ID"], "clients", ctx),
        submittedAt: fieldDateMs(f["Submitted At"]),
        answers: fieldJson(f["Answers Json"]),
        clientComment: textOrNull(f["Client Comment"]),
        clientCommentEn: textOrNull(f["Client Comment EN"]),
      };
    },
  },
  {
    table: "test_templates",
    envVar: "FEISHU_TEST_TEMPLATES_TABLE_ID",
    pkField: "Test Template ID",
    expected: ["Test Template ID", "Name", "Name CN", "Description", "Description CN"],
    map: (r) => {
      const f = r.fields;
      return {
        testTemplateId: code(r, "Test Template ID"),
        name: textOrNull(f["Name"]) ?? "",
        nameCn: textOrNull(f["Name CN"]),
        description: textOrNull(f["Description"]),
        descriptionCn: textOrNull(f["Description CN"]),
      };
    },
  },
  {
    table: "test_items",
    envVar: "FEISHU_TEST_ITEMS_TABLE_ID",
    pkField: "Test Item ID",
    expected: ["Test Item ID","Test Template ID","Order","Test Name","Test Name CN","Metric Type","Unit","Unit CN","Instructions","Instructions CN","Creates Metric","Testing Metric Type","Calculation Method","Metric Name","Metric Unit","Input Unit"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        testItemId: code(r, "Test Item ID"),
        testTemplateId: ref(f["Test Template ID"], "test_templates", ctx),
        orderIndex: fieldNum(f["Order"]),
        testName: textOrNull(f["Test Name"]),
        testNameCn: textOrNull(f["Test Name CN"]),
        metricType: textOrNull(f["Metric Type"]),
        unit: textOrNull(f["Unit"]),
        unitCn: textOrNull(f["Unit CN"]),
        instructions: textOrNull(f["Instructions"]),
        instructionsCn: textOrNull(f["Instructions CN"]),
        createsMetric: fieldBool(f["Creates Metric"]),
        testingMetricType: textOrNull(f["Testing Metric Type"]),
        calculationMethod: textOrNull(f["Calculation Method"]),
        metricName: textOrNull(f["Metric Name"]),
        metricUnit: textOrNull(f["Metric Unit"]),
        inputUnit: textOrNull(f["Input Unit"]),
      };
    },
  },
  {
    table: "assigned_tests",
    envVar: "FEISHU_ASSIGNED_TESTS_TABLE_ID",
    pkField: "Assigned Test ID",
    expected: ["Assigned Test ID","Test Template ID","Client ID","Client Code","Assigned Date","Options","Completd At"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        assignedTestId: code(r, "Assigned Test ID"),
        testTemplateId: ref(f["Test Template ID"], "test_templates", ctx),
        clientId: ref(f["Client ID"], "clients", ctx),
        clientCode: textOrNull(f["Client Code"]),
        assignedDate: fieldDateMs(f["Assigned Date"]),
        options: fieldJson(f["Options"]),
        completedAt: fieldDateMs(f["Completd At"] ?? f["Completed At"]),
      };
    },
  },
  {
    table: "test_results",
    envVar: "FEISHU_TEST_RESULTS_TABLE_ID",
    pkField: "Result ID",
    expected: ["Result ID","Assigned Test ID","Test Template ID","Test Item ID","Client ID","Value","Unit","Notes","Notes EN","Submitted At","Creates Metric","Metric Created"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        resultId: code(r, "Result ID"),
        assignedTestId: ref(f["Assigned Test ID"], "assigned_tests", ctx),
        testTemplateId: ref(f["Test Template ID"], "test_templates", ctx),
        testItemId: ref(f["Test Item ID"], "test_items", ctx),
        clientId: ref(f["Client ID"], "clients", ctx),
        value: textOrNull(f["Value"]),
        unit: textOrNull(f["Unit"]),
        notes: textOrNull(f["Notes"]),
        notesEn: textOrNull(f["Notes EN"]),
        submittedAt: fieldDateMs(f["Submitted At"]),
        createsMetric: fieldBool(f["Creates Metric"]),
        metricCreated: fieldBool(f["Metric Created"]),
      };
    },
  },
  {
    table: "notifications",
    envVar: "FEISHU_NOTIFICATIONS_TABLE_ID",
    pkField: "Notifications ID",
    expected: ["Notifications ID", "Client ID", "Title", "Body", "Type", "Read", "Created At"],
    map: (r, ctx) => {
      const f = r.fields;
      return {
        notificationId: code(r, "Notifications ID"),
        clientId: ref(f["Client ID"], "clients", ctx),
        title: textOrNull(f["Title"]),
        body: textOrNull(f["Body"]),
        type: textOrNull(f["Type"]),
        read: fieldBool(f["Read"]),
        createdAt: fieldDateMs(f["Created At"]),
      };
    },
  },
];

// team_members is derived from the teams "Members" link field. The team's
// "Positions" map is keyed by member record_id; we resolve each member to its
// client code and attach its position so Postgres can rebuild a code-keyed map.
export function deriveTeamMembers(teamRecs: FeishuRecord[], ctx: Ctx) {
  const rows: Record<string, unknown>[] = [];
  const clientMap = ctx.idMaps["clients"];
  for (const rec of teamRecs) {
    let positions: Record<string, string> = {};
    const rawPos = textOrNull(rec.fields["Positions"]);
    if (rawPos) {
      try {
        positions = JSON.parse(rawPos) || {};
      } catch {
        positions = {};
      }
    }
    const memberIds = linkRecordIds(rec.fields["Members"]);
    if (memberIds.length) {
      for (const recordId of memberIds) {
        const clientId = (clientMap && clientMap.get(recordId)) || recordId;
        rows.push({ teamId: rec.record_id, clientId, position: positions[recordId] ?? null });
      }
    } else {
      // Members stored as text codes (no link) — fall back to code resolution.
      for (const clientId of refAll(rec.fields["Members"], "clients", ctx)) {
        rows.push({ teamId: rec.record_id, clientId, position: positions[clientId] ?? null });
      }
    }
  }
  return rows;
}
