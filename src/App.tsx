import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Copy,
  Clock3,
  Dumbbell,
  Home,
  MoreVertical,
  Play,
  Plus,
  Scissors,
  Trash2,
  UserCircle,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type DragEvent, type TouchEvent } from "react";
import { useTranslation } from "react-i18next";
import "./App.css";

type AppMode = "Coach" | "Client";
type Page =
  | "Clients"
  | "Library"
  | "Workouts"
  | "Check-ins"
  | "Orders"
  | "Coaches";
type ClientTab = "Home" | "Programs" | "Overview" | "Training";
type CalendarView = "Week" | "Month" | "Full";
type CalendarDisplayMode = CalendarView;
type ClientProgramScheduleMode = "Month" | "Week" | "Day";
type WorkoutPageTab =
  | "Saved Programs"
  | "Program Builder"
  | "Forms"
  | "Tests"
  | "Assignments";
type ToastType = "success" | "error" | "info";
type CheckInFilter = "Due" | "Recent" | "No Check-in" | "All";
type TrackingType = "Weight" | "Time" | "Distance";
type ClientBucket =
  | "All Clients"
  | "Active"
  | "Premium"
  | "Online Coaching"
  | "Paused"
  | "Needs Contact"
  | "Needs Programming"
  | "Archived";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type CoachAnalytics = {
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

type Client = {
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
};

type Coach = {
  recordId: string;
  coachId: string;
  name: string;
  email?: string;
  phoneWechat?: string;
  role: "Admin" | "Coach" | string;
  status: "Active" | "Inactive" | string;
  bio?: string;
  createdAt?: string;
};

type ProductOrder = {
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

type Program = {
  recordId: string;
  programId: string;
  programName: string;
  goal: string;
  sport: string;
  level: string;
  durationWeeks: string;
  phase: string;
  sessionsPerWeek: string;
  coach: string;
  status: string;
  productType?: string;
  price?: string;
  currency?: string;
  publicStoreVisible?: boolean;
  purchaseLink?: string;
  defaultIntakeFormId?: string;
  accessLengthDays?: string;
  productStatus?: string;
  salesDescription?: string;
  salesDescriptionCn?: string;
  sourceOrderId?: string;
  isOrderPlaceholder?: boolean;
};

type Workout = {
  id: string;
  assignedWorkoutId: string;
  clientId: string;
  programId: string;
  week: string;
  day: string;
  sessionName: string;
  sessionNameCn?: string;
  scheduledDate: string;
  completionStatus: string;
  coachNotes: string;
  coachNotesCn?: string;
  clientNotes: string;
  workoutLogs: string;
};

type CopiedCalendarItem =
  | { action: "copy" | "cut"; type: "workout"; id: string; label: string }
  | { action: "copy" | "cut"; type: "assignment"; id: string; label: string };

type ExerciseDetail = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseNameCn?: string;
  videoUrl?: string;
  videoUrlCn?: string;
  order: number;
  sets: string;
  reps: string;
  tempo: string;
  rest: string;
  notes: string;
  notesCn?: string;
  sectionNameCn?: string;
};

type ExerciseNoteMeta = {
  sectionName: string;
  exerciseLabel: string;
  groupType?: ProgramExercise["groupType"];
  groupName: string;
  trackingType: TrackingType;
  isUnilateral: boolean;
  coachingNotes: string;
};

type WorkoutHistoryLog = {
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

type LibraryExercise = {
  recordId: string;
  exerciseId: string;
  exerciseName: string;
  exerciseNameCn?: string;
  videoUrl: string;
  videoUrlCn?: string;
  category?: string;
  categoryCn?: string;
  equipment?: string;
  equipmentCn?: string;
  movementPattern?: string;
  technicalInstructionsCn?: string;
  coachingCuesCn?: string;
  commonMistakesCn?: string;
  notes?: string;
  notesCn?: string;
  status?: string;
};

type ProgramExercise = {
  exerciseRecordId: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  sectionName: string;
  exerciseLabel: string;
  sets: string;
  reps: string;
  tempo: string;
  rest: string;
  coachingNotes: string;
  trackingType: TrackingType;
  isUnilateral: boolean;
  groupType: "Straight" | "Superset" | "Circuit";
  groupName: string;
};

type ProgramSession = {
  localId: string;
  week: string;
  day: string;
  sessionName: string;
  exercises: ProgramExercise[];
};

type AssignableWorkout = {
  localId: string;
  week: number;
  day: number;
  sessionName: string;
  scheduledDate: string;
};

type SavedProgramTemplate = {
  recordId: string;
  week: number;
  day: number;
  sessionName: string;
  exerciseName: string;
  exerciseId: string;
  order: number;
};

type SavedFormQuestion = {
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

type SavedFormTemplate = {
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

type SavedTestItem = {
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
};

type SavedTestTemplate = {
  recordId: string;
  testTemplateId: string;
  name: string;
  nameCn?: string;
  description: string;
  descriptionCn?: string;
  status: string;
  createdAt: string;
  items: SavedTestItem[];
};

type ContentAssignment = {
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

type ContentResponse = {
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

type ContentResponseGroup = {
  key: string;
  responseType: string;
  title: string;
  submittedAt: string;
  answers: ContentResponse[];
};

type CalendarActionMenuState =
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

type CalendarActionMenuPayload =
  | Omit<Extract<CalendarActionMenuState, { kind: "item" }>, "x" | "y">
  | Omit<Extract<CalendarActionMenuState, { kind: "date" }>, "x" | "y">;

type SetLog = {
  exerciseId: string;
  exerciseName: string;
  exerciseOrder: number;
  setNumber: number;
  side?: "Right" | "Left";
  trackingType: TrackingType;
  prescribedSets: string;
  prescribedReps: string;
  actualReps: string;
  actualWeight: string;
  actualTime: string;
  actualDistance: string;
};

function normalizeDate(value: string) {
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

function normalizeLookupText(value?: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, " ")
    .trim();
}

function lookupTextMatches(source?: string, target?: string) {
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

function makeExerciseLabel(index: number) {
  const groupIndex = Math.floor(index / 4);
  const letter = String.fromCharCode(65 + Math.min(groupIndex, 25));
  const number = (index % 4) + 1;

  return `${letter}${number}`;
}

function parseExerciseNotes(notes = ""): ExerciseNoteMeta {
  const lines = notes.split(/\r?\n/);
  const meta: ExerciseNoteMeta = {
    sectionName: "",
    exerciseLabel: "",
    groupName: "",
    trackingType: "Weight",
    isUnilateral: false,
    coachingNotes: "",
  };
  const remainingLines: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    const match = trimmed.match(
      /^(Section|Label|Superset|Circuit|Tracking|Unilateral):\s*(.+)$/i
    );

    if (!match) {
      remainingLines.push(line);
      return;
    }

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
    if (key === "unilateral") {
      meta.isUnilateral = /^(yes|true|1|y)$/i.test(value);
    }
    if (key === "superset" || key === "circuit") {
      meta.groupType = key === "superset" ? "Superset" : "Circuit";
      meta.groupName = value;
    }
  });

  meta.coachingNotes = remainingLines.join("\n").trim();

  return meta;
}

function composeExerciseNotes(
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

function dateToInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

type SimpleTaskStatus = "Scheduled" | "Completed" | "Missed";

function normalizeTaskStatus(status?: string): SimpleTaskStatus {
  const clean = String(status || "").toLowerCase();

  if (clean.includes("complete")) return "Completed";
  if (clean.includes("miss")) return "Missed";

  return "Scheduled";
}

function isPastCalendarDate(dateString?: string) {
  const date = normalizeDate(String(dateString || ""));

  return Boolean(date) && date < dateToInputValue(new Date());
}

function getDisplayTaskStatus(
  status?: string,
  scheduledDate?: string
): SimpleTaskStatus {
  const normalized = normalizeTaskStatus(status);

  if (normalized === "Scheduled" && isPastCalendarDate(scheduledDate)) {
    return "Missed";
  }

  return normalized;
}

function addDays(dateString: string, days: number) {
  const date = new Date(dateString + "T00:00:00");
  date.setDate(date.getDate() + days);
  return dateToInputValue(date);
}

function addMonths(dateString: string, months: number) {
  const date = new Date(dateString + "T00:00:00");
  date.setMonth(date.getMonth() + months);
  return dateToInputValue(date);
}

function getMondayStart(dateString: string) {
  const date = new Date(dateString + "T00:00:00");
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return dateToInputValue(date);
}

function getMonthDates(dateString: string) {
  const date = new Date(dateString + "T00:00:00");
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) =>
    dateToInputValue(new Date(year, month, index + 1))
  );
}

function getMonthCalendarDates(dateString: string) {
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

function formatCalendarLabel(dateString: string, locale = "en-US") {
  return new Date(dateString + "T00:00:00").toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatMonthTitle(dateString: string, locale = "en-US") {
  return new Date(dateString + "T00:00:00").toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

function formatWeekStripLabel(dateString: string, locale = "en-US") {
  const date = new Date(dateString + "T00:00:00");

  return {
    weekday: date.toLocaleDateString(locale, { weekday: "short" }),
    day: date.toLocaleDateString(locale, { day: "numeric" }),
  };
}

function formatCalendarRangeLabel(
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

function getStatusClass(status: string) {
  const clean = normalizeTaskStatus(status);

  if (clean === "Completed") return "completedWorkout";
  if (clean === "Missed") return "missedWorkout";

  return "scheduledWorkout";
}

function languagePreferenceToCode(language?: string) {
  const clean = String(language || "").toLowerCase();

  return clean.includes("中文") ||
    clean.includes("chinese") ||
    clean.includes("mandarin")
    ? "zh"
    : "en";
}

function App() {
  const { t, i18n } = useTranslation();
  const inviteSearchParams = new URLSearchParams(window.location.search);
  const isClientInvite = inviteSearchParams.get("invite") === "client";
  const isClientPortal = inviteSearchParams.get("portal") === "client";
  const clientPortalCode = (
    inviteSearchParams.get("client") ||
    inviteSearchParams.get("clientCode") ||
    ""
  ).trim();
  const publicInvitePackage = inviteSearchParams.get("package") || "Pending";
  const [activePage, setActivePage] = useState<Page>("Clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [productOrders, setProductOrders] = useState<ProductOrder[]>([]);
  const [coachScope, setCoachScope] = useState("All Coaches");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderProcessingId, setOrderProcessingId] = useState("");
  const [orderStartDates, setOrderStartDates] = useState<Record<string, string>>({});
  const [showManualOrderForm, setShowManualOrderForm] = useState(false);
  const [savingManualOrder, setSavingManualOrder] = useState(false);
  const [manualOrder, setManualOrder] = useState({
    clientName: "",
    email: "",
    phone: "",
    productType: "Digital Program",
    programId: "",
    productName: "",
    amount: "",
    currency: "CNY",
    paymentStatus: "Paid",
    paymentProvider: "WeChat QR",
    paymentReference: "",
    assignedCoach: "Kent Bastell",
    purchasedAt: dateToInputValue(new Date()),
    accessStartDate: dateToInputValue(new Date()),
    accessEndDate: "",
    notes: "",
  });
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [savingCoach, setSavingCoach] = useState(false);
  const [coachForm, setCoachForm] = useState({
    name: "",
    email: "",
    phoneWechat: "",
    role: "Coach",
    status: "Active",
    bio: "",
  });
  const [clientSearch, setClientSearch] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState("All");
  const [checkInSearch, setCheckInSearch] = useState("");
  const [checkInFilter, setCheckInFilter] = useState<CheckInFilter>("Due");
  const [savingCheckInClientId, setSavingCheckInClientId] = useState("");
  const [checkInFormClient, setCheckInFormClient] = useState<Client | null>(null);
  const [checkInForm, setCheckInForm] = useState({
    bodyWeight: "",
    sleepQuality: "",
    energy: "",
    mood: "",
    stress: "",
    soreness: "",
    nutritionNotes: "",
    trainingNotes: "",
    wins: "",
    problemsPain: "",
  });
  const [clientBucket, setClientBucket] = useState<ClientBucket>("All Clients");
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [savingClient, setSavingClient] = useState(false);
  const [updatingClientStatus, setUpdatingClientStatus] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const appMode: AppMode = isClientPortal ? "Client" : "Coach";
  const [analytics, setAnalytics] = useState<CoachAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [coachInvitePackage, setCoachInvitePackage] = useState("Pending");
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    phone: "",
    goals: "",
    notes: "",
  });
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteSubmitted, setInviteSubmitted] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    coach: "Kent Bastell",
    primaryCoachId: "",
    secondaryCoachId: "",
    clientType: "Online Coaching",
    packageType: "Active",
    packageName: "",
    subscriptionStatus: "Active",
    intakeStatus: "Not Sent",
    paymentStatus: "Unpaid",
    source: "Manual Entry",
    purchasedProgramId: "",
    accessStartDate: "",
    accessEndDate: "",
    paymentId: "",
    startDate: dateToInputValue(new Date()),
    notes: "",
    languagePreference: "English",
  });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientTab, setClientTab] = useState<ClientTab>("Home");
  const [calendarView, setCalendarView] = useState<CalendarView>("Week");
  const [calendarAnchorDate, setCalendarAnchorDate] = useState(
    dateToInputValue(new Date())
  );
  const [clientWeekStartDate, setClientWeekStartDate] = useState(
    getMondayStart(dateToInputValue(new Date()))
  );
  const [clientMonthAnchorDate, setClientMonthAnchorDate] = useState(
    dateToInputValue(new Date())
  );
  const [clientCalendarStyle, setClientCalendarStyle] =
    useState<CalendarDisplayMode>("Week");
  const [selectedClientProgramId, setSelectedClientProgramId] = useState("");
  const [clientProgramScheduleMode, setClientProgramScheduleMode] =
    useState<ClientProgramScheduleMode>("Month");
  const [clientProgramStartDate, setClientProgramStartDate] = useState(
    dateToInputValue(new Date())
  );
  const [clientProgramWeekStarts, setClientProgramWeekStarts] = useState<
    Record<string, string>
  >({});
  const [clientProgramDayDates, setClientProgramDayDates] = useState<
    Record<string, string>
  >({});
  const [clientProgramSessions, setClientProgramSessions] = useState<
    AssignableWorkout[]
  >([]);
  const [loadingClientProgramSessions, setLoadingClientProgramSessions] =
    useState(false);
  const [populatingClientProgram, setPopulatingClientProgram] = useState(false);
  const [showCalendarActionMenu, setShowCalendarActionMenu] = useState(false);
  const [showAssignmentDrawer, setShowAssignmentDrawer] = useState(false);
  const [workoutPageTab, setWorkoutPageTab] =
    useState<WorkoutPageTab>("Saved Programs");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [contentAssignments, setContentAssignments] = useState<ContentAssignment[]>(
    []
  );
  const [contentResponses, setContentResponses] = useState<ContentResponse[]>([]);
  const [contentResponsesLoading, setContentResponsesLoading] = useState(false);
  const [selectedContentSubmission, setSelectedContentSubmission] =
    useState<ContentResponseGroup | null>(null);
  const [activeContentAssignment, setActiveContentAssignment] =
    useState<ContentAssignment | null>(null);
  const [contentAssignmentAnswers, setContentAssignmentAnswers] = useState<
    Record<string, string>
  >({});
  const [contentAssignmentComment, setContentAssignmentComment] = useState("");
  const [submittingContentAssignment, setSubmittingContentAssignment] =
    useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [workoutDetails, setWorkoutDetails] = useState<ExerciseDetail[]>([]);
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
  const [workoutSubmissionNote, setWorkoutSubmissionNote] = useState("");
  const [workoutHistoryLogs, setWorkoutHistoryLogs] = useState<WorkoutHistoryLog[]>(
    []
  );
  const [workoutLoggingStarted, setWorkoutLoggingStarted] = useState(false);
  const [savedExerciseDraftIds, setSavedExerciseDraftIds] = useState<string[]>([]);
  const [historyExerciseName, setHistoryExerciseName] = useState("");
  const [loading, setLoading] = useState(true);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [editingWorkoutDate, setEditingWorkoutDate] = useState("");
  const [updatingWorkoutDate, setUpdatingWorkoutDate] = useState(false);
  const [draggingWorkoutId, setDraggingWorkoutId] = useState("");
  const [draggingAssignmentId, setDraggingAssignmentId] = useState("");
  const [movingWorkoutId, setMovingWorkoutId] = useState("");
  const [movingAssignmentId, setMovingAssignmentId] = useState("");
  const [copiedCalendarItem, setCopiedCalendarItem] =
    useState<CopiedCalendarItem | null>(null);
  const [calendarActionMenu, setCalendarActionMenu] =
    useState<CalendarActionMenuState | null>(null);
  const calendarLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const calendarLongPressOpened = useRef(false);
  const [useMobileWorkoutRows, setUseMobileWorkoutRows] = useState(false);

  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [progressSearch, setProgressSearch] = useState("");
  const [selectedProgressExercise, setSelectedProgressExercise] = useState("");
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [technicalCueExercise, setTechnicalCueExercise] =
    useState<LibraryExercise | null>(null);
  const [editingExercise, setEditingExercise] = useState<LibraryExercise | null>(
    null
  );
  const [savingExercise, setSavingExercise] = useState(false);
  const [exerciseForm, setExerciseForm] = useState({
    exerciseId: "",
    exerciseName: "",
    videoUrl: "",
    category: "",
    equipment: "",
    movementPattern: "",
    notes: "",
    trackingType: "Weight" as TrackingType,
    isUnilateral: false,
  });

  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedSavedProgramId, setSelectedSavedProgramId] = useState("");
  const [savedProgramTemplates, setSavedProgramTemplates] = useState<
    SavedProgramTemplate[]
  >([]);
  const [savedTemplatesLoading, setSavedTemplatesLoading] = useState(false);
  const [savedAssignClientId, setSavedAssignClientId] = useState("");
  const [savedAssignStartDate, setSavedAssignStartDate] = useState(
    dateToInputValue(new Date())
  );
  const [savedAssignableWorkouts, setSavedAssignableWorkouts] = useState<
    AssignableWorkout[]
  >([]);
  const [savedAssignLoading, setSavedAssignLoading] = useState(false);
  const [savedAssigningProgram, setSavedAssigningProgram] = useState(false);
  const [savedProgramSearch, setSavedProgramSearch] = useState("");
  const [savedProgramProductFilter, setSavedProgramProductFilter] = useState("All");
  const [selectedAssignProgramId, setSelectedAssignProgramId] = useState("");
  const [assignStartDate, setAssignStartDate] = useState(dateToInputValue(new Date()));
  const [assignableWorkouts, setAssignableWorkouts] = useState<AssignableWorkout[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assigningProgram, setAssigningProgram] = useState(false);

  const [programName, setProgramName] = useState("Foundation Program");
  const [programGoal, setProgramGoal] = useState("General Strength");
  const [programSport, setProgramSport] = useState("Fitness");
  const [programLevel, setProgramLevel] = useState("Beginner");
  const [programDurationWeeks, setProgramDurationWeeks] = useState("4");
  const [programPhase, setProgramPhase] = useState("Foundation");
  const [programSessionsPerWeek, setProgramSessionsPerWeek] = useState("3");
  const [programCoach, setProgramCoach] = useState("Kent Bastell");
  const [programProductType, setProgramProductType] = useState("Digital Program");
  const [programPrice, setProgramPrice] = useState("");
  const [programCurrency, setProgramCurrency] = useState("CNY");
  const [programPublicStoreVisible, setProgramPublicStoreVisible] = useState(false);
  const [programPurchaseLink, setProgramPurchaseLink] = useState("");
  const [programDefaultIntakeFormId, setProgramDefaultIntakeFormId] = useState("");
  const [programAccessLengthDays, setProgramAccessLengthDays] = useState("42");
  const [programProductStatus, setProgramProductStatus] = useState("Draft");
  const [programSalesDescription, setProgramSalesDescription] = useState("");

  const [programWeek, setProgramWeek] = useState("1");
  const [programDay, setProgramDay] = useState("1");
  const [sessionName, setSessionName] = useState("Lower Strength");
  const [builderSearch, setBuilderSearch] = useState("");
  const [formTemplateName, setFormTemplateName] = useState("Weekly Check-in");
  const [formTemplateType, setFormTemplateType] = useState("Check-in");
  const [formQuestions, setFormQuestions] = useState([
    {
      id: "Q1",
      label: "How are you feeling today?",
      questionType: "Scale",
      required: true,
    },
  ]);
  const [savedFormTemplates, setSavedFormTemplates] = useState<
    SavedFormTemplate[]
  >([]);
  const [savedFormSearch, setSavedFormSearch] = useState("");
  const [selectedSavedFormId, setSelectedSavedFormId] = useState("");
  const [editingFormTemplate, setEditingFormTemplate] = useState<{
    recordId: string;
    formId: string;
  } | null>(null);
  const [formTemplatesLoading, setFormTemplatesLoading] = useState(false);
  const [savingFormTemplate, setSavingFormTemplate] = useState(false);
  const [testTemplateName, setTestTemplateName] = useState("Performance Test");
  const [testItems, setTestItems] = useState([
    {
      id: "T1",
      testName: "Back Squat 3RM",
      metricType: "Weight",
      unit: "kg",
    },
  ]);
  const [savedTestTemplates, setSavedTestTemplates] = useState<
    SavedTestTemplate[]
  >([]);
  const [savedTestSearch, setSavedTestSearch] = useState("");
  const [selectedSavedTestId, setSelectedSavedTestId] = useState("");
  const [editingTestTemplate, setEditingTestTemplate] = useState<{
    recordId: string;
    testTemplateId: string;
  } | null>(null);
  const [testTemplatesLoading, setTestTemplatesLoading] = useState(false);
  const [savingTestTemplate, setSavingTestTemplate] = useState(false);
  const [assignmentType, setAssignmentType] = useState("Program");
  const [assignmentClientId, setAssignmentClientId] = useState("");
  const [assignmentTemplateId, setAssignmentTemplateId] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState(
    dateToInputValue(new Date())
  );
  const assignmentHubDateInputRef = useRef<HTMLInputElement>(null);
  const calendarAssignmentDateInputRef = useRef<HTMLInputElement>(null);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [selectedProgramExercises, setSelectedProgramExercises] = useState<
    ProgramExercise[]
  >([]);
  const [programSessions, setProgramSessions] = useState<ProgramSession[]>([]);
  const [editingProgramSessionId, setEditingProgramSessionId] = useState("");
  const [draggedProgramSessionId, setDraggedProgramSessionId] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const notify = (message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();

    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4200);
  };

  const buildInviteLink = (packageType = coachInvitePackage) => {
    const params = new URLSearchParams({
      invite: "client",
      package: packageType,
    });

    return `${window.location.origin}/?${params.toString()}`;
  };

  const coachInviteLink = buildInviteLink();
  const coachInviteMessage = `Hi, here is your NoLimit Training onboarding link. Please fill this out before we get started: ${coachInviteLink}`;
  const fallbackCoaches: Coach[] = [
    {
      recordId: "",
      coachId: "COACH-KENT",
      name: "Kent Bastell",
      role: "Admin",
      status: "Active",
    },
    {
      recordId: "",
      coachId: "COACH-MARIO",
      name: "Mario Artukovic",
      role: "Admin",
      status: "Active",
    },
  ];
  const activeCoaches = (coaches.length > 0 ? coaches : fallbackCoaches).filter(
    (coach) => coach.status !== "Inactive"
  );
  const allCoaches = coaches.length > 0 ? coaches : fallbackCoaches;
  const currentScopedCoach = activeCoaches.find(
    (coach) => coach.name === coachScope
  );
  const canManageCoaches =
    coachScope === "All Coaches" || currentScopedCoach?.role === "Admin";
  const getCoachRecordIdByName = (name: string) =>
    activeCoaches.find((coach) => coach.name === name)?.recordId || "";
  const getCoachDisplayName = (value = "") => {
    const match = activeCoaches.find(
      (coach) =>
        coach.recordId === value ||
        coach.coachId === value ||
        coach.name.toLowerCase() === value.toLowerCase()
    );

    return match?.name || value;
  };
  const clientBelongsToCoach = (client: Client, coach: Coach) => {
    const coachValues = [client.coach, client.primaryCoach, client.secondaryCoach]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    const coachMatches = [
      coach.name,
      coach.recordId,
      coach.coachId,
      getCoachDisplayName(coach.name),
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    return coachValues.some((value) =>
      coachMatches.some((coachValue) => value === coachValue)
    );
  };

  const buildClientPortalLink = (client: Client) =>
    `${window.location.origin}/?portal=client&client=${encodeURIComponent(
      client.clientCode || client.id
    )}`;

  const copyToClipboard = async (text: string, label: string) => {
    if (!navigator.clipboard) {
      notify("Clipboard is not available in this browser.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      notify(`${label} copied.`, "success");
    } catch (error) {
      console.error(error);
      notify(`Could not copy ${label.toLowerCase()}.`, "error");
    }
  };

  const submitInviteForm = async () => {
    if (!inviteForm.name.trim()) {
      notify("Please enter your name.", "error");
      return;
    }

    if (!inviteForm.email.trim() && !inviteForm.phone.trim()) {
      notify("Please add an email or phone/WeChat.", "error");
      return;
    }

    setSubmittingInvite(true);

    try {
      const inviteNotes = [
        "Created from invite intake.",
        inviteForm.goals ? `Goal: ${inviteForm.goals}` : "",
        inviteForm.notes ? `Notes: ${inviteForm.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const response = await fetch("/api/createClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: inviteForm.name,
          email: inviteForm.email,
          phone: inviteForm.phone,
          coach: "Kent Bastell",
          packageType: publicInvitePackage,
          startDate: dateToInputValue(new Date()),
          notes: inviteNotes,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not submit invite form. Please try again.", "error");
        return;
      }

      setInviteSubmitted(true);
      notify("Your intake form was submitted.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not submit invite form.", "error");
    } finally {
      setSubmittingInvite(false);
    }
  };

  const closeClientForm = () => {
    setShowAddClientModal(false);
    setEditingClient(null);
    setNewClient({
      name: "",
      email: "",
      phone: "",
      coach: "Kent Bastell",
      primaryCoachId: "",
      secondaryCoachId: "",
      clientType: "Online Coaching",
      packageType: "Active",
      packageName: "",
      subscriptionStatus: "Active",
      intakeStatus: "Not Sent",
      paymentStatus: "Unpaid",
      source: "Manual Entry",
      purchasedProgramId: "",
      accessStartDate: "",
      accessEndDate: "",
      paymentId: "",
      startDate: dateToInputValue(new Date()),
      notes: "",
      languagePreference: "English",
    });
  };

  const openNewClientForm = () => {
    setEditingClient(null);
    setNewClient({
      name: "",
      email: "",
      phone: "",
      coach: "Kent Bastell",
      primaryCoachId: "",
      secondaryCoachId: "",
      clientType: "Online Coaching",
      packageType: "Active",
      packageName: "",
      subscriptionStatus: "Active",
      intakeStatus: "Not Sent",
      paymentStatus: "Unpaid",
      source: "Manual Entry",
      purchasedProgramId: "",
      accessStartDate: "",
      accessEndDate: "",
      paymentId: "",
      startDate: dateToInputValue(new Date()),
      notes: "",
      languagePreference: "English",
    });
    setShowAddClientModal(true);
  };

  const openEditClientForm = (client: Client) => {
    setEditingClient(client);
    setNewClient({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      coach: getCoachDisplayName(client.coach || client.primaryCoach || "Kent Bastell"),
      primaryCoachId: getCoachRecordIdByName(
        getCoachDisplayName(client.coach || client.primaryCoach || "Kent Bastell")
      ),
      secondaryCoachId: getCoachRecordIdByName(
        getCoachDisplayName(client.secondaryCoach || "")
      ),
      clientType: client.clientType || "Online Coaching",
      packageType: client.status || "Active",
      packageName: client.package || "",
      subscriptionStatus: client.subscriptionStatus || "Active",
      intakeStatus: client.intakeStatus || "Not Sent",
      paymentStatus: client.paymentStatus || "Unpaid",
      source: client.source || "Manual Entry",
      purchasedProgramId: client.purchasedProgramId || "",
      accessStartDate:
        client.accessStartDate && client.accessStartDate !== "--"
          ? client.accessStartDate
          : "",
      accessEndDate:
        client.accessEndDate && client.accessEndDate !== "--"
          ? client.accessEndDate
          : "",
      paymentId: client.paymentId || "",
      startDate:
        client.startDate && client.startDate !== "--" ? client.startDate : "",
      notes: client.notes || "",
      languagePreference: client.languagePreference || "English",
    });
    setShowAddClientModal(true);
  };

  const loadClients = async () => {
    setLoading(true);

    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        setClients(data.clients || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const loadCoaches = async () => {
    try {
      const response = await fetch("/api/coaches");
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        setCoaches([]);
        return;
      }

      setCoaches(data.coaches || []);
    } catch (error) {
      console.error(error);
      setCoaches([]);
    }
  };

  const loadProductOrders = async () => {
    try {
      const response = await fetch("/api/productOrders");
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        setProductOrders([]);
        return;
      }

      setProductOrders(data.orders || []);
    } catch (error) {
      console.error(error);
      setProductOrders([]);
    }
  };

  const closeCoachForm = () => {
    setShowCoachModal(false);
    setEditingCoach(null);
    setCoachForm({
      name: "",
      email: "",
      phoneWechat: "",
      role: "Coach",
      status: "Active",
      bio: "",
    });
  };

  const openNewCoachForm = () => {
    setEditingCoach(null);
    setCoachForm({
      name: "",
      email: "",
      phoneWechat: "",
      role: "Coach",
      status: "Active",
      bio: "",
    });
    setShowCoachModal(true);
  };

  const openEditCoachForm = (coach: Coach) => {
    setEditingCoach(coach);
    setCoachForm({
      name: coach.name || "",
      email: coach.email || "",
      phoneWechat: coach.phoneWechat || "",
      role: coach.role || "Coach",
      status: coach.status || "Active",
      bio: coach.bio || "",
    });
    setShowCoachModal(true);
  };

  const saveCoachForm = async () => {
    if (!coachForm.name.trim()) {
      notify("Please enter a coach name.", "error");
      return;
    }

    setSavingCoach(true);

    try {
      const response = await fetch("/api/upsertCoach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...coachForm,
          recordId: editingCoach?.recordId,
          coachId: editingCoach?.coachId,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not save coach.", "error");
        return;
      }

      await loadCoaches();
      closeCoachForm();
      notify(editingCoach ? "Coach updated." : "Coach created.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not save coach.", "error");
    } finally {
      setSavingCoach(false);
    }
  };

  const updateCoachStatus = async (coach: Coach, status: "Active" | "Inactive") => {
    if (!coach.recordId) {
      notify("This coach needs to exist in Feishu before editing.", "error");
      return;
    }

    setSavingCoach(true);

    try {
      const response = await fetch("/api/upsertCoach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...coach,
          phoneWechat: coach.phoneWechat || "",
          status,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not update coach status.", "error");
        return;
      }

      await loadCoaches();
      notify(`Coach marked ${status}.`, "success");
    } catch (error) {
      console.error(error);
      notify("Could not update coach status.", "error");
    } finally {
      setSavingCoach(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    setShowAnalyticsModal(true);

    try {
      const response = await fetch("/api/analytics");
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        notify("Could not load workout analytics.", "error");
        return;
      }

      setAnalytics(data);
    } catch (error) {
      console.error(error);
      notify("Could not load workout analytics.", "error");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    loadCoaches();
    loadProductOrders();
  }, []);

  useEffect(() => {
    if (!isClientPortal || !clientPortalCode || clients.length === 0) return;

    const normalizedPortalCode = clientPortalCode.toLowerCase();
    const portalClient = clients.find(
      (client) =>
        client.clientCode.toLowerCase() === normalizedPortalCode ||
        client.id.toLowerCase() === normalizedPortalCode
    );

    if (portalClient) {
      setSelectedClient(portalClient);
      setClientTab("Home");
      setActivePage("Clients");
    }
  }, [clients, clientPortalCode, isClientPortal]);

  useEffect(() => {
    if (!isClientPortal || !selectedClient) return;

    const nextLanguage = languagePreferenceToCode(
      selectedClient.languagePreference
    );

    if (i18n.language !== nextLanguage) {
      void i18n.changeLanguage(nextLanguage);
    }
  }, [i18n, isClientPortal, selectedClient]);

  useEffect(() => {
    const openDatePickerFromClick = (event: MouseEvent) => {
      const input = (event.target as HTMLElement | null)?.closest?.(
        'input[type="date"]'
      ) as HTMLInputElement | null;

      if (!input || input.disabled || input.readOnly) return;

      try {
        input.showPicker?.();
      } catch {
        input.focus();
      }
    };

    document.addEventListener("click", openDatePickerFromClick);

    return () => {
      document.removeEventListener("click", openDatePickerFromClick);
    };
  }, []);

  const useChineseClientText =
    isClientPortal &&
    languagePreferenceToCode(selectedClient?.languagePreference) === "zh";
  const clientLocale = useChineseClientText ? "zh-CN" : "en-US";

  const localizeText = (english = "", chinese = "") =>
    useChineseClientText && chinese ? chinese : english;

  const localizedWorkoutName = (workout: Workout) =>
    localizeText(workout.sessionName || "Workout", workout.sessionNameCn || "");

  const localizedExerciseName = (
    exercise: Pick<LibraryExercise, "exerciseName" | "exerciseNameCn"> & {
      exerciseId?: string;
    }
  ) => {
    const libraryMatch = libraryExercises.find(
      (item) =>
        (exercise.exerciseId && item.exerciseId === exercise.exerciseId) ||
        item.exerciseName.toLowerCase() ===
          String(exercise.exerciseName || "").toLowerCase()
    );

    return localizeText(
      exercise.exerciseName || libraryMatch?.exerciseName || "Exercise",
      exercise.exerciseNameCn || libraryMatch?.exerciseNameCn || ""
    );
  };

  const localizedExerciseNotes = (
    exercise: Pick<LibraryExercise, "notes" | "notesCn">
  ) => localizeText(exercise.notes || "", exercise.notesCn || "");

  const localizedCalendarLabel = (dateString: string) =>
    formatCalendarLabel(dateString, clientLocale);

  const localizedMonthTitle = (dateString: string) =>
    formatMonthTitle(dateString, clientLocale);

  const localizedWeekStripLabel = (dateString: string) =>
    formatWeekStripLabel(dateString, clientLocale);

  const updateClientLanguagePreference = async (languagePreference: string) => {
    if (!selectedClient) return;

    setSelectedClient({ ...selectedClient, languagePreference });
    setClients((current) =>
      current.map((client) =>
        client.id === selectedClient.id
          ? { ...client, languagePreference }
          : client
      )
    );
    void i18n.changeLanguage(languagePreferenceToCode(languagePreference));

    try {
      const response = await fetch("/api/updateClient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRecordId: selectedClient.id,
          languagePreference,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        notify("Could not update language preference.", "error");
      }
    } catch (error) {
      console.error(error);
      notify("Could not update language preference.", "error");
    }
  };

  useEffect(() => {
    const updateWorkoutRowMode = () => {
      const narrowViewport = window.innerWidth <= 700;
      const isTouchPhone =
        window.navigator.maxTouchPoints > 0 && narrowViewport;
      setUseMobileWorkoutRows(isTouchPhone);
    };

    updateWorkoutRowMode();
    window.addEventListener("resize", updateWorkoutRowMode);

    return () => window.removeEventListener("resize", updateWorkoutRowMode);
  }, []);

  useEffect(() => {
    if (!selectedClient) return;

    setWorkoutsLoading(true);
    setSelectedWorkout(null);
    setWorkoutDetails([]);
    setSetLogs([]);
    setSavedExerciseDraftIds([]);
    setContentAssignments([]);
    setContentResponses([]);

    loadPrograms();

    Promise.all([
      fetch(`/api/workouts?clientCode=${selectedClient.clientCode}`).then((res) =>
        res.json()
      ),
      loadContentAssignments(selectedClient).then((assignments) => ({ assignments })),
      loadContentResponses(selectedClient).then((responses) => ({ responses })),
    ])
      .then(([workoutData, assignmentData, responseData]) => {
        setWorkouts(workoutData.workouts || []);
        setContentAssignments(assignmentData.assignments || []);
        setContentResponses(responseData.responses || []);
        setWorkoutsLoading(false);
      })
      .catch(() => {
        setWorkouts([]);
        setContentAssignments([]);
        setContentResponses([]);
        setWorkoutsLoading(false);
      });
  }, [selectedClient]);

  useEffect(() => {
    if (!selectedClient) return;

    fetch(`/api/workoutHistory?clientId=${selectedClient.id}`)
      .then((res) => res.json())
      .then((data) => setWorkoutHistoryLogs(data.logs || []))
      .catch(() => setWorkoutHistoryLogs([]));

    if (isClientPortal && libraryExercises.length === 0) {
      loadExerciseLibrary();
    }
  }, [selectedClient, isClientPortal]);

  useEffect(() => {
    if (activePage !== "Workouts" || !selectedSavedProgramId) return;

    loadSavedProgramTemplates(selectedSavedProgramId);
  }, [activePage, selectedSavedProgramId]);

  const loadExerciseLibrary = async () => {
    setLibraryLoading(true);

    try {
      const res = await fetch("/api/exercises");
      const data = await res.json();
      setLibraryExercises(data.exercises || []);
    } catch (err) {
      console.error(err);
      setLibraryExercises([]);
    } finally {
      setLibraryLoading(false);
    }
  };

  const resetExerciseForm = () => {
    setExerciseForm({
      exerciseId: "",
      exerciseName: "",
      videoUrl: "",
      category: "",
      equipment: "",
      movementPattern: "",
      notes: "",
      trackingType: "Weight",
      isUnilateral: false,
    });
  };

  const openNewExerciseForm = () => {
    setEditingExercise(null);
    resetExerciseForm();
    setShowExerciseModal(true);
  };

  const openEditExerciseForm = (exercise: LibraryExercise) => {
    const meta = parseExerciseNotes(exercise.notes || "");

    setEditingExercise(exercise);
    setExerciseForm({
      exerciseId: exercise.exerciseId || "",
      exerciseName: exercise.exerciseName || "",
      videoUrl: exercise.videoUrl || "",
      category: exercise.category || "",
      equipment: exercise.equipment || "",
      movementPattern: exercise.movementPattern || "",
      notes: meta.coachingNotes || "",
      trackingType: meta.trackingType,
      isUnilateral: meta.isUnilateral,
    });
    setShowExerciseModal(true);
  };

  const closeExerciseForm = () => {
    setShowExerciseModal(false);
    setEditingExercise(null);
    resetExerciseForm();
  };

  const saveExerciseForm = async (archive = false) => {
    if (!exerciseForm.exerciseName.trim() && !archive) {
      notify("Please enter an exercise name.", "error");
      return;
    }

    setSavingExercise(true);

    try {
      const response = await fetch("/api/upsertExercise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...exerciseForm,
          notes: composeExerciseNotes(
            exerciseForm.notes,
            exerciseForm.trackingType,
            exerciseForm.isUnilateral
          ),
          recordId: editingExercise?.recordId,
          archive,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(
          data.message || data.error || "Could not save exercise. Check API response.",
          "error"
        );
        return;
      }

      await loadExerciseLibrary();
      closeExerciseForm();
      notify(
        archive
          ? "Exercise archived."
          : editingExercise
          ? data.cueFieldName
            ? `Exercise updated. Cues saved to ${data.cueFieldName}.`
            : "Exercise updated."
          : `Exercise created: ${data.exerciseId}`,
        "success"
      );
    } catch (error) {
      console.error(error);
      notify("Could not save exercise.", "error");
    } finally {
      setSavingExercise(false);
    }
  };

  const loadPrograms = async () => {
    try {
      const res = await fetch("/api/programs");
      const data = await res.json();
      const loadedPrograms = data.programs || [];
      setPrograms(loadedPrograms);

      if (!selectedAssignProgramId && loadedPrograms.length > 0) {
        setSelectedAssignProgramId(loadedPrograms[0].programId);
      }

      if (!selectedSavedProgramId && loadedPrograms.length > 0) {
        setSelectedSavedProgramId(loadedPrograms[0].programId);
      }

      return loadedPrograms as Program[];
    } catch (err) {
      console.error(err);
      setPrograms([]);
      return [];
    }
  };

  const selectedAssignProgram = programs.find(
    (program) => program.programId === selectedAssignProgramId
  );
  const selectedSavedProgram = programs.find(
    (program) => program.programId === selectedSavedProgramId
  );
  const selectedManualOrderProgram = programs.find(
    (program) => program.programId === manualOrder.programId
  );

  const resetManualOrderForm = () => {
    setManualOrder({
      clientName: "",
      email: "",
      phone: "",
      productType: "Digital Program",
      programId: "",
      productName: "",
      amount: "",
      currency: "CNY",
      paymentStatus: "Paid",
      paymentProvider: "WeChat QR",
      paymentReference: "",
      assignedCoach: currentScopedCoach?.name || "Kent Bastell",
      purchasedAt: dateToInputValue(new Date()),
      accessStartDate: dateToInputValue(new Date()),
      accessEndDate: "",
      notes: "",
    });
  };

  const selectManualOrderProgram = (programId: string) => {
    const program = programs.find((item) => item.programId === programId);
    const startDate = manualOrder.accessStartDate || dateToInputValue(new Date());
    const accessLength = Number(program?.accessLengthDays || 0);

    setManualOrder((current) => ({
      ...current,
      programId,
      productName: program?.programName || current.productName,
      productType: program?.productType || current.productType,
      amount: program?.price || current.amount,
      currency: program?.currency || current.currency,
      accessEndDate:
        accessLength > 0 ? addDays(startDate, Math.max(0, accessLength - 1)) : current.accessEndDate,
    }));
  };

  const createManualProductOrder = async () => {
    if (!manualOrder.clientName.trim()) {
      notify("Please enter the client name.", "error");
      return;
    }

    if (!manualOrder.productName.trim() && !manualOrder.programId) {
      notify("Please choose a program or enter a product name.", "error");
      return;
    }

    setSavingManualOrder(true);

    try {
      const response = await fetch("/api/createProductOrder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...manualOrder,
          programId: selectedManualOrderProgram?.programId || manualOrder.programId,
          productName:
            selectedManualOrderProgram?.programName || manualOrder.productName,
          assignedCoach:
            manualOrder.assignedCoach || currentScopedCoach?.name || "Kent Bastell",
          onboardingStatus: "New Order",
          intakeStatus: "Not Sent",
          fulfillmentStatus: "Pending",
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(data.error || "Could not create manual order.", "error");
        return;
      }

      notify(`Manual order created: ${data.orderId}.`, "success");
      resetManualOrderForm();
      setShowManualOrderForm(false);
      await loadProductOrders();
    } catch (error) {
      console.error(error);
      notify("Could not create manual order.", "error");
    } finally {
      setSavingManualOrder(false);
    }
  };
  const loadFormTemplates = async () => {
    setFormTemplatesLoading(true);

    try {
      const response = await fetch("/api/formTemplates");
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        notify(data.message || data.error || "Could not load saved forms.", "error");
        return [];
      }

      const forms = data.forms || [];
      setSavedFormTemplates(forms);

      if (!selectedSavedFormId && forms.length > 0) {
        setSelectedSavedFormId(forms[0].formId);
      }
      return forms;
    } catch (error) {
      console.error(error);
      notify("Could not load saved forms.", "error");
      return [];
    } finally {
      setFormTemplatesLoading(false);
    }
  };

  const loadTestTemplates = async () => {
    setTestTemplatesLoading(true);

    try {
      const response = await fetch("/api/testTemplates");
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        notify(data.message || data.error || "Could not load saved tests.", "error");
        return [];
      }

      const tests = data.tests || [];
      setSavedTestTemplates(tests);

      if (!selectedSavedTestId && tests.length > 0) {
        setSelectedSavedTestId(tests[0].testTemplateId);
      }
      return tests;
    } catch (error) {
      console.error(error);
      notify("Could not load saved tests.", "error");
      return [];
    } finally {
      setTestTemplatesLoading(false);
    }
  };

  const loadContentAssignments = async (client: Client = selectedClient as Client) => {
    if (!client) {
      setContentAssignments([]);
      return [];
    }

    const assignmentParams = new URLSearchParams({
      clientId: client.id,
      clientCode: client.clientCode || "",
      clientName: client.name || "",
    });
    const response = await fetch(
      `/api/contentAssignments?${assignmentParams.toString()}`
    );
    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      throw new Error(data.message || data.error || "Could not load assignments.");
    }

    const assignments = data.assignments || [];
    setContentAssignments(assignments);
    return assignments;
  };

  const loadContentResponses = async (client: Client = selectedClient as Client) => {
    if (!client) {
      setContentResponses([]);
      return [];
    }

    const responseParams = new URLSearchParams({
      clientId: client.id,
      clientName: client.name || "",
    });

    setContentResponsesLoading(true);

    try {
      const response = await fetch(
        `/api/contentResponses?${responseParams.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        throw new Error(data.message || data.error || "Could not load responses.");
      }

      const responses = data.responses || [];
      setContentResponses(responses);
      return responses;
    } catch (error) {
      console.error(error);
      if (!isClientPortal) {
        notify("Could not load questionnaire/test results.", "error");
      }
      return [];
    } finally {
      setContentResponsesLoading(false);
    }
  };

  useEffect(() => {
    if (assignmentType === "Program") return;

    if (assignmentType === "Physical Test") {
      if (savedTestTemplates.length === 0 && !testTemplatesLoading) {
        void loadTestTemplates();
      }
      return;
    }

    if (savedFormTemplates.length === 0 && !formTemplatesLoading) {
      void loadFormTemplates();
    }
  }, [assignmentType, workoutPageTab, activePage, selectedClient]);

  useEffect(() => {
    if (activePage !== "Orders") return;

    if (programs.length === 0) {
      void loadPrograms();
    }

    if (savedFormTemplates.length === 0 && !formTemplatesLoading) {
      void loadFormTemplates();
    }
  }, [activePage]);

  useEffect(() => {
    if (!selectedClient) return;
    if (savedFormTemplates.length === 0 && !formTemplatesLoading) {
      void loadFormTemplates();
    }
    if (savedTestTemplates.length === 0 && !testTemplatesLoading) {
      void loadTestTemplates();
    }
  }, [selectedClient]);

  useEffect(() => {
    const closeOnDocumentClick = () => closeCalendarActionMenu();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCalendarActionMenu();
        setCopiedCalendarItem(null);
      }
    };

    document.addEventListener("click", closeOnDocumentClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("click", closeOnDocumentClick);
      document.removeEventListener("keydown", closeOnEscape);
      clearCalendarLongPress();
    };
  }, []);

  const loadSavedFormIntoBuilder = (form: SavedFormTemplate | undefined) => {
    if (!form) {
      notify("Please select a saved form.");
      return;
    }

    setFormTemplateName(form.name || form.formId || "Untitled Form");
    setFormTemplateType(form.type || "Questionnaire");
    setEditingFormTemplate({
      recordId: form.recordId,
      formId: form.formId,
    });
    setFormQuestions(
      form.questions.length > 0
        ? form.questions.map((question, index) => ({
            id: question.questionId || `Q${index + 1}`,
            label: question.label,
            questionType: question.questionType || "Text",
            required: Boolean(question.required),
          }))
        : [
            {
              id: "Q1",
              label: "New question",
              questionType: "Text",
              required: false,
            },
          ]
    );
    notify("Saved form loaded into builder. Saving will update this template.");
  };

  const duplicateSavedFormIntoBuilder = (form: SavedFormTemplate | undefined) => {
    if (!form) {
      notify("Please select a saved form.");
      return;
    }

    setFormTemplateName(`${form.name || form.formId || "Untitled Form"} Copy`);
    setFormTemplateType(form.type || "Questionnaire");
    setEditingFormTemplate(null);
    setFormQuestions(
      form.questions.length > 0
        ? form.questions.map((question, index) => ({
            id: `Q${index + 1}`,
            label: question.label,
            questionType: question.questionType || "Text",
            required: Boolean(question.required),
          }))
        : [
            {
              id: "Q1",
              label: "New question",
              questionType: "Text",
              required: false,
            },
          ]
    );
    notify("Form duplicated into builder. Saving will create a new template.");
  };

  const loadSavedTestIntoBuilder = (test: SavedTestTemplate | undefined) => {
    if (!test) {
      notify("Please select a saved test.");
      return;
    }

    setTestTemplateName(test.name || test.testTemplateId || "Untitled Test");
    setEditingTestTemplate({
      recordId: test.recordId,
      testTemplateId: test.testTemplateId,
    });
    setTestItems(
      test.items.length > 0
        ? test.items.map((item, index) => ({
            id: item.testItemId || `T${index + 1}`,
            testName: item.testName,
            metricType: item.metricType || "Weight",
            unit: item.unit || "kg",
          }))
        : [
            {
              id: "T1",
              testName: "New Test",
              metricType: "Weight",
              unit: "kg",
            },
          ]
    );
    notify("Saved test loaded into builder. Saving will update this template.");
  };

  const duplicateSavedTestIntoBuilder = (test: SavedTestTemplate | undefined) => {
    if (!test) {
      notify("Please select a saved test.");
      return;
    }

    setTestTemplateName(`${test.name || test.testTemplateId || "Untitled Test"} Copy`);
    setEditingTestTemplate(null);
    setTestItems(
      test.items.length > 0
        ? test.items.map((item, index) => ({
            id: `T${index + 1}`,
            testName: item.testName,
            metricType: item.metricType || "Weight",
            unit: item.unit || "kg",
          }))
        : [
            {
              id: "T1",
              testName: "New Test",
              metricType: "Weight",
              unit: "kg",
            },
          ]
    );
    notify("Test duplicated into builder. Saving will create a new template.");
  };

  const deleteSavedFormTemplate = async (form: SavedFormTemplate) => {
    const name = form.name || form.formId || "this saved form";

    if (!window.confirm(`Delete ${name}? This also removes its saved questions.`)) {
      return;
    }

    try {
      const response = await fetch("/api/formTemplates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: form.recordId,
          formId: form.formId,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(data.message || data.error || "Could not delete saved form.", "error");
        return;
      }

      notify("Saved form deleted.");
      if (selectedSavedFormId === form.formId) {
        setSelectedSavedFormId("");
      }
      if (editingFormTemplate?.formId === form.formId) {
        setEditingFormTemplate(null);
      }
      await loadFormTemplates();
    } catch (error) {
      console.error(error);
      notify("Could not delete saved form.", "error");
    }
  };

  const deleteSavedTestTemplate = async (test: SavedTestTemplate) => {
    const name = test.name || test.testTemplateId || "this saved test";

    if (!window.confirm(`Delete ${name}? This also removes its saved test items.`)) {
      return;
    }

    try {
      const response = await fetch("/api/testTemplates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: test.recordId,
          testTemplateId: test.testTemplateId,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(data.message || data.error || "Could not delete saved test.", "error");
        return;
      }

      notify("Saved test deleted.");
      if (selectedSavedTestId === test.testTemplateId) {
        setSelectedSavedTestId("");
      }
      if (editingTestTemplate?.testTemplateId === test.testTemplateId) {
        setEditingTestTemplate(null);
      }
      await loadTestTemplates();
    } catch (error) {
      console.error(error);
      notify("Could not delete saved test.", "error");
    }
  };

  const saveFormTemplate = async () => {
    if (!formTemplateName.trim()) {
      notify("Please enter a form name.", "error");
      return;
    }

    if (formQuestions.length === 0) {
      notify("Please add at least one question.", "error");
      return;
    }

    setSavingFormTemplate(true);

    try {
      const response = await fetch("/api/formTemplates", {
        method: editingFormTemplate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: editingFormTemplate?.recordId,
          formId: editingFormTemplate?.formId,
          name: formTemplateName,
          type: formTemplateType,
          status: "Active",
          createdBy: "Kent Bastell",
          questions: formQuestions,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(data.message || data.error || "Could not save form template.", "error");
        return;
      }

      notify(
        editingFormTemplate
          ? `Form updated. Questions saved: ${data.questionRecordsCreated}`
          : `Form saved. Questions created: ${data.questionRecordsCreated}`
      );
      await loadFormTemplates();
      setSelectedSavedFormId(data.formId);
      setEditingFormTemplate({
        recordId: data.formRecordId,
        formId: data.formId,
      });
    } catch (error) {
      console.error(error);
      notify("Could not save form template.", "error");
    } finally {
      setSavingFormTemplate(false);
    }
  };

  const saveTestTemplate = async () => {
    if (!testTemplateName.trim()) {
      notify("Please enter a test template name.", "error");
      return;
    }

    if (testItems.length === 0) {
      notify("Please add at least one test item.", "error");
      return;
    }

    setSavingTestTemplate(true);

    try {
      const response = await fetch("/api/testTemplates", {
        method: editingTestTemplate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: editingTestTemplate?.recordId,
          testTemplateId: editingTestTemplate?.testTemplateId,
          name: testTemplateName,
          status: "Active",
          items: testItems,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(data.message || data.error || "Could not save test template.", "error");
        return;
      }

      notify(
        editingTestTemplate
          ? `Test template updated. Items saved: ${data.itemRecordsCreated}`
          : `Test template saved. Items created: ${data.itemRecordsCreated}`
      );
      await loadTestTemplates();
      setSelectedSavedTestId(data.testTemplateId);
      setEditingTestTemplate({
        recordId: data.testRecordId,
        testTemplateId: data.testTemplateId,
      });
    } catch (error) {
      console.error(error);
      notify("Could not save test template.", "error");
    } finally {
      setSavingTestTemplate(false);
    }
  };

  const assignmentTemplateOptions =
    assignmentType === "Program"
      ? programs.map((program) => ({
          id: program.programId,
          label: program.programName || program.programId || "Untitled Program",
          meta: `${program.durationWeeks || "--"} weeks`,
        }))
      : assignmentType === "Physical Test"
      ? savedTestTemplates
          .filter((test) => test.status !== "Archived")
          .map((test) => ({
            id: test.testTemplateId,
            label: test.name || test.testTemplateId || "Untitled Test",
            meta: `${test.items.length} test${test.items.length === 1 ? "" : "s"}`,
          }))
      : savedFormTemplates
          .filter((form) => form.status !== "Archived")
          .filter((form) => {
            const type = form.type.toLowerCase();

            if (assignmentType === "Check-in") {
              return type.includes("check") || type.includes("readiness");
            }

            return true;
          })
          .map((form) => ({
            id: form.formId,
            label: form.name || form.formId || "Untitled Form",
            meta: `${form.type || assignmentType || "Form"} - ${
              form.questions.length
            } question${
              form.questions.length === 1 ? "" : "s"
            }`,
          }));
  const visibleSavedPrograms = programs
    .filter((program) => program.status !== "Archived")
    .filter((program) => {
      if (savedProgramProductFilter === "All") return true;
      return (program.productType || "Internal Coaching Template") === savedProgramProductFilter;
    })
    .filter((program) => {
      const search = savedProgramSearch.toLowerCase();

      return (
        program.programName.toLowerCase().includes(search) ||
        program.goal.toLowerCase().includes(search) ||
        program.phase.toLowerCase().includes(search) ||
        String(program.productType || "").toLowerCase().includes(search)
      );
    });
  const visibleSavedForms = savedFormTemplates.filter((form) => {
    const search = savedFormSearch.toLowerCase();

    return (
      form.status !== "Archived" &&
      (form.name.toLowerCase().includes(search) ||
        form.type.toLowerCase().includes(search) ||
        form.description.toLowerCase().includes(search))
    );
  });
  const visibleSavedTests = savedTestTemplates.filter((test) => {
    const search = savedTestSearch.toLowerCase();

    return (
      test.status !== "Archived" &&
      (test.name.toLowerCase().includes(search) ||
        test.description.toLowerCase().includes(search) ||
        test.items.some((item) => item.testName.toLowerCase().includes(search)))
    );
  });

  const createContentAssignment = async (
    overrides: Partial<{
      assignmentType: string;
      assignmentTemplateId: string;
      assignmentClientId: string;
      assignmentDueDate: string;
    }> = {}
  ) => {
    const nextAssignmentType = overrides.assignmentType || assignmentType;
    const nextTemplateId = overrides.assignmentTemplateId || assignmentTemplateId;
    const nextClientId = overrides.assignmentClientId || assignmentClientId;
    const nextDueDate = normalizeDate(
      overrides.assignmentDueDate || assignmentDueDate
    );
    const client =
      clients.find((item) => item.id === nextClientId) || selectedClient;
    const selectedAssignmentTemplate = assignmentTemplateOptions.find(
      (option) => option.id === nextTemplateId
    );

    if (!client) {
      notify("Please select a client.", "error");
      return;
    }

    if (!nextTemplateId) {
      notify("Please select a saved item to assign.", "error");
      return;
    }

    if (nextAssignmentType === "Program") {
      const program = programs.find((item) => item.programId === nextTemplateId);

      setSelectedSavedProgramId(nextTemplateId);
      setSavedAssignClientId(client.id);
      setWorkoutPageTab("Saved Programs");
      notify(
        `Program selected: ${program?.programName || "Saved Program"}. Load sessions there to assign workout dates.`
      );
      return;
    }

    setCreatingAssignment(true);

    try {
      const response = await fetch("/api/assignContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentType: nextAssignmentType,
          templateId: nextTemplateId,
          templateName: selectedAssignmentTemplate?.label || "",
          clientId: client.id,
          clientCode: client.clientCode,
          clientName: client.name,
          assignedDate: dateToInputValue(new Date()),
          dueDate: nextDueDate,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(data.message || data.error || "Could not create assignment.", "error");
        return;
      }

      if (selectedClient?.id === client.id) {
        await loadContentAssignments(client);
      }

      setCalendarAnchorDate(nextDueDate);
      setAssignmentDueDate(dateToInputValue(new Date()));
      notify(`${nextAssignmentType} assigned to ${client.name}.`, "success");
      setShowAssignmentDrawer(false);
    } catch (error) {
      console.error(error);
      notify("Could not create assignment.", "error");
    } finally {
      setCreatingAssignment(false);
    }
  };

  const savedProgramSessions = Array.from(
    savedProgramTemplates
      .reduce((sessions, template) => {
        const key = `${template.week}-${template.day}-${template.sessionName}`;

        if (!sessions.has(key)) {
          sessions.set(key, {
            localId: key,
            week: String(template.week),
            day: String(template.day),
            sessionName: template.sessionName,
            exercises: [] as ProgramExercise[],
          });
        }

        sessions.get(key)?.exercises.push({
          exerciseRecordId: "",
          exerciseId: template.exerciseId,
          exerciseName: template.exerciseName,
          order: template.order,
          sectionName: "Main",
          exerciseLabel: makeExerciseLabel(
            sessions.get(key)?.exercises.length || 0
          ),
          sets: "",
          reps: "",
          tempo: "",
          rest: "",
          coachingNotes: "",
          trackingType: "Weight",
          isUnilateral: false,
          groupType: "Straight",
          groupName: "",
        });

        return sessions;
      }, new Map<string, ProgramSession>())
      .values()
  ).sort((a, b) => {
    if (Number(a.week) !== Number(b.week)) return Number(a.week) - Number(b.week);
    return Number(a.day) - Number(b.day);
  });

  const loadSavedProgramTemplates = async (programId: string) => {
    if (!programId) return;

    setSavedTemplatesLoading(true);
    setSavedProgramTemplates([]);
    setSavedAssignableWorkouts([]);

    try {
      const response = await fetch(`/api/programTemplates?programId=${programId}`);
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        notify("Could not load saved program templates.");
        return;
      }

      setSavedProgramTemplates(data.templates || []);
    } catch (error) {
      console.error(error);
      notify("Could not load saved program templates.");
    } finally {
      setSavedTemplatesLoading(false);
    }
  };

  const loadSavedProgramSessionsForAssignment = async () => {
    if (!selectedSavedProgram) {
      notify("Please select a program.");
      return;
    }

    if (!savedAssignStartDate) {
      notify("Please choose a start date.");
      return;
    }

    setSavedAssignLoading(true);

    try {
      let templates = savedProgramTemplates;

      if (templates.length === 0) {
        const response = await fetch(
          `/api/programTemplates?programId=${selectedSavedProgram.programId}`
        );
        const data = await response.json();

        if (!response.ok) {
          console.error(data);
          notify("Could not load program templates.");
          return;
        }

        templates = data.templates || [];
        setSavedProgramTemplates(templates);
      }

      const uniqueSessionsMap = new Map<string, AssignableWorkout>();

      templates.forEach((template) => {
        const key = `${template.week}-${template.day}-${template.sessionName}`;

        if (!uniqueSessionsMap.has(key)) {
          const offsetDays =
            (Number(template.week) - 1) * 7 + (Number(template.day) - 1) * 2;

          uniqueSessionsMap.set(key, {
            localId: key,
            week: Number(template.week),
            day: Number(template.day),
            sessionName: template.sessionName,
            scheduledDate: addDays(savedAssignStartDate, offsetDays),
          });
        }
      });

      setSavedAssignableWorkouts(Array.from(uniqueSessionsMap.values()));
    } catch (error) {
      console.error(error);
      notify("Could not load program sessions.");
    } finally {
      setSavedAssignLoading(false);
    }
  };

  const updateSavedAssignableWorkoutDate = (
    localId: string,
    scheduledDate: string
  ) => {
    setSavedAssignableWorkouts((prev) =>
      prev.map((workout) =>
        workout.localId === localId ? { ...workout, scheduledDate } : workout
      )
    );
  };

  const assignSavedProgramToClient = async () => {
    const client = clients.find((item) => item.id === savedAssignClientId);

    if (!client || !selectedSavedProgram) {
      notify("Please select a client and program.");
      return;
    }

    if (savedAssignableWorkouts.length === 0) {
      notify("Please load sessions first.");
      return;
    }

    setSavedAssigningProgram(true);

    try {
      const response = await fetch("/api/assignProgram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: client.id,
          programRecordId: selectedSavedProgram.recordId,
          scheduledWorkouts: savedAssignableWorkouts.map((workout) => ({
            week: workout.week,
            day: workout.day,
            sessionName: workout.sessionName,
            scheduledDate: workout.scheduledDate,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not assign program. Check API response.");
        return;
      }

      notify(`Program assigned to ${client.name}. Workouts created: ${data.recordsCreated}`);
      setSavedAssignableWorkouts([]);
    } catch (error) {
      console.error(error);
      notify("Could not assign program.");
    } finally {
      setSavedAssigningProgram(false);
    }
  };

  const loadSavedProgramIntoBuilder = async () => {
    if (!selectedSavedProgram) {
      notify("Please select a program.");
      return;
    }

    setSavedTemplatesLoading(true);

    try {
      const templateResponse = await fetch(
        `/api/programTemplates?programId=${selectedSavedProgram.programId}`
      );
      const templateData = await templateResponse.json();

      if (!templateResponse.ok) {
        console.error(templateData);
        notify("Could not load program templates.");
        return;
      }

      const templates: SavedProgramTemplate[] = templateData.templates || [];
      const uniqueSessions = Array.from(
        templates
          .reduce((sessions, template) => {
            const key = `${template.week}-${template.day}-${template.sessionName}`;

            if (!sessions.has(key)) {
              sessions.set(key, {
                week: template.week,
                day: template.day,
                sessionName: template.sessionName,
              });
            }

            return sessions;
          }, new Map<string, { week: number; day: number; sessionName: string }>())
          .values()
      );

      const sessions: ProgramSession[] = await Promise.all(
        uniqueSessions.map(async (session) => {
          const detailsResponse = await fetch(
            `/api/workoutDetails?programId=${selectedSavedProgram.programId}&week=${session.week}&day=${session.day}`
          );
          const detailsData = await detailsResponse.json();
          const exercises: ExerciseDetail[] = detailsData.exercises || [];

          return {
            localId: `${selectedSavedProgram.programId}-${session.week}-${session.day}`,
            week: String(session.week),
            day: String(session.day),
            sessionName: session.sessionName,
            exercises: exercises.map((exercise, index) => {
              const meta = parseExerciseNotes(exercise.notes);

              return {
                exerciseRecordId: "",
                exerciseId: exercise.exerciseId,
                exerciseName: exercise.exerciseName,
                order: Number(exercise.order) || index + 1,
                sectionName: meta.sectionName || "Main",
                exerciseLabel: meta.exerciseLabel || makeExerciseLabel(index),
                sets: exercise.sets,
                reps: exercise.reps,
                tempo: exercise.tempo,
                rest: exercise.rest,
                coachingNotes: meta.coachingNotes,
                trackingType: meta.trackingType,
                isUnilateral: meta.isUnilateral,
                groupType: meta.groupType || "Straight",
                groupName: meta.groupName,
              };
            }),
          };
        })
      );

      setProgramName(`${selectedSavedProgram.programName} Copy`);
      setProgramGoal(selectedSavedProgram.goal);
      setProgramSport(selectedSavedProgram.sport);
      setProgramLevel(selectedSavedProgram.level);
      setProgramDurationWeeks(selectedSavedProgram.durationWeeks || "4");
      setProgramPhase(selectedSavedProgram.phase);
      setProgramSessionsPerWeek(selectedSavedProgram.sessionsPerWeek || "3");
      setProgramCoach(selectedSavedProgram.coach || "Kent Bastell");
      setProgramProductType(selectedSavedProgram.productType || "Digital Program");
      setProgramPrice(selectedSavedProgram.price || "");
      setProgramCurrency(selectedSavedProgram.currency || "CNY");
      setProgramPublicStoreVisible(Boolean(selectedSavedProgram.publicStoreVisible));
      setProgramPurchaseLink(selectedSavedProgram.purchaseLink || "");
      setProgramDefaultIntakeFormId(selectedSavedProgram.defaultIntakeFormId || "");
      setProgramAccessLengthDays(selectedSavedProgram.accessLengthDays || "42");
      setProgramProductStatus(selectedSavedProgram.productStatus || "Draft");
      setProgramSalesDescription(selectedSavedProgram.salesDescription || "");
      setProgramSessions(sessions);
      setSelectedProgramExercises([]);
      setProgramWeek("1");
      setProgramDay("1");
      setSessionName("");
      setWorkoutPageTab("Program Builder");

      notify("Program loaded into builder. Saving will create a new program version.");
    } catch (error) {
      console.error(error);
      notify("Could not load program into builder.");
    } finally {
      setSavedTemplatesLoading(false);
    }
  };

  const loadProgramSessionsForAssignment = async () => {
    if (!selectedAssignProgram) {
      notify("Please select a program.");
      return;
    }

    if (!assignStartDate) {
      notify("Please choose a start date.");
      return;
    }

    setAssignLoading(true);

    try {
      const res = await fetch(
        `/api/programTemplates?programId=${selectedAssignProgram.programId}`
      );

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        notify("Could not load program templates.");
        return;
      }

      const templates = data.templates || [];
      const uniqueSessionsMap = new Map<string, AssignableWorkout>();

      templates.forEach((template: any) => {
        const key = `${template.week}-${template.day}-${template.sessionName}`;

        if (!uniqueSessionsMap.has(key)) {
          const offsetDays =
            (Number(template.week) - 1) * 7 + (Number(template.day) - 1) * 2;

          uniqueSessionsMap.set(key, {
            localId: key,
            week: Number(template.week),
            day: Number(template.day),
            sessionName: template.sessionName,
            scheduledDate: addDays(assignStartDate, offsetDays),
          });
        }
      });

      setAssignableWorkouts(Array.from(uniqueSessionsMap.values()));
    } catch (err) {
      console.error(err);
      notify("Could not load program sessions.");
    } finally {
      setAssignLoading(false);
    }
  };

  const updateAssignableWorkoutDate = (localId: string, scheduledDate: string) => {
    setAssignableWorkouts((prev) =>
      prev.map((workout) =>
        workout.localId === localId ? { ...workout, scheduledDate } : workout
      )
    );
  };

  const shiftAssignableWorkoutsToStartDate = (scheduledDate: string) => {
    const nextDate = normalizeDate(scheduledDate);

    setAssignStartDate(nextDate);
    setCalendarAnchorDate(nextDate);
    setAssignableWorkouts((current) =>
      current.map((workout) => {
        const offsetDays = (Number(workout.week) - 1) * 7 + (Number(workout.day) - 1) * 2;

        return {
          ...workout,
          scheduledDate: addDays(nextDate, offsetDays),
        };
      })
    );
  };

  const assignProgramToClient = async () => {
    if (!selectedClient || !selectedAssignProgram) {
      notify("Please select a client and program.");
      return;
    }

    if (assignableWorkouts.length === 0) {
      notify("Please load program sessions first.");
      return;
    }

    setAssigningProgram(true);

    try {
      const response = await fetch("/api/assignProgram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: selectedClient.id,
          programRecordId: selectedAssignProgram.recordId,
          scheduledWorkouts: assignableWorkouts.map((workout) => ({
            week: workout.week,
            day: workout.day,
            sessionName: workout.sessionName,
            scheduledDate: workout.scheduledDate,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not assign program. Check API response.");
        return;
      }

      notify(`Program assigned. Workouts created: ${data.recordsCreated}`);
      setAssignableWorkouts([]);
      setShowAssignmentDrawer(false);

      const refresh = await fetch(`/api/workouts?clientCode=${selectedClient.clientCode}`);
      const refreshData = await refresh.json();
      setWorkouts(refreshData.workouts || []);
    } catch (error) {
      console.error(error);
      notify("Could not assign program.");
    } finally {
      setAssigningProgram(false);
    }
  };

  const buildSetLogs = (exercises: ExerciseDetail[]) => {
    const logs: SetLog[] = [];

    exercises.forEach((exercise) => {
      const setCount = Number(exercise.sets) || 1;
      const meta = parseExerciseNotes(exercise.notes);
      const sides: Array<SetLog["side"]> = meta.isUnilateral
        ? ["Right", "Left"]
        : [undefined];

      for (let i = 1; i <= setCount; i++) {
        sides.forEach((side) => {
          const exerciseName = exercise.exerciseName || `Exercise ${exercise.order}`;

          logs.push({
            exerciseId: exercise.exerciseId,
            exerciseName: side ? `${exerciseName} - ${side}` : exerciseName,
            exerciseOrder: exercise.order,
            setNumber: i,
            side,
            trackingType: meta.trackingType,
            prescribedSets: exercise.sets,
            prescribedReps: exercise.reps,
            actualReps: meta.trackingType === "Weight" ? exercise.reps : "",
            actualWeight: "",
            actualTime: "",
            actualDistance: "",
          });
        });
      }
    });

    return logs;
  };

  const getWorkoutDraftKey = (
    workout: Workout | null = selectedWorkout,
    client: Client | null = selectedClient
  ) => {
    if (!workout || !client) return "";

    return `nolimit-workout-draft:${client.id}:${workout.id}`;
  };

  const saveExerciseDraft = (exerciseId: string) => {
    const draftKey = getWorkoutDraftKey();

    if (!draftKey) return;

    const nextSavedExerciseIds = Array.from(
      new Set([...savedExerciseDraftIds, exerciseId])
    );

    window.localStorage.setItem(
      draftKey,
      JSON.stringify({
        logs: setLogs,
        savedExerciseIds: nextSavedExerciseIds,
        updatedAt: new Date().toISOString(),
      })
    );

    setSavedExerciseDraftIds(nextSavedExerciseIds);
    notify("Exercise saved. You can come back and keep editing.", "success");
  };

  const openWorkout = async (workout: Workout) => {
    setSelectedWorkout(workout);
    setWorkoutLoggingStarted(false);
    setEditingWorkoutDate(normalizeDate(String(workout.scheduledDate)));
    setDetailsLoading(true);
    setWorkoutDetails([]);
    setSetLogs([]);
    setWorkoutHistoryLogs([]);
    setSavedExerciseDraftIds([]);
    setWorkoutSubmissionNote("");

    try {
      const [detailsResponse, historyResponse] = await Promise.all([
        fetch(
          `/api/workoutDetails?programId=${workout.programId}&week=${workout.week}&day=${workout.day}`
        ),
        fetch(`/api/workoutHistory?clientId=${selectedClient?.id || ""}`),
      ]);

      const data = await detailsResponse.json();
      const exercises = data.exercises || [];
      const historyData = await historyResponse.json();
      const baseLogs = buildSetLogs(exercises);
      const draftKey = getWorkoutDraftKey(workout, selectedClient);
      const savedDraft = draftKey
        ? window.localStorage.getItem(draftKey)
        : null;

      if (savedDraft) {
        try {
          const parsedDraft = JSON.parse(savedDraft);
          setSetLogs(parsedDraft.logs || baseLogs);
          setSavedExerciseDraftIds(parsedDraft.savedExerciseIds || []);
        } catch {
          setSetLogs(baseLogs);
          setSavedExerciseDraftIds([]);
        }
      } else {
        setSetLogs(baseLogs);
        setSavedExerciseDraftIds([]);
      }

      setWorkoutDetails(exercises);
      setWorkoutHistoryLogs(historyData.logs || []);
    } catch {
      setWorkoutDetails([]);
      setSetLogs([]);
      setSavedExerciseDraftIds([]);
      setWorkoutHistoryLogs([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateSetLog = (index: number, field: keyof SetLog, value: string) => {
    const updated = [...setLogs];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    setSetLogs(updated);
  };

  const saveWorkout = async () => {
    if (!selectedWorkout || !selectedClient) return;

    setSavingWorkout(true);

    try {
      const response = await fetch("/api/saveWorkoutLog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: selectedClient.id,
          clientCode: selectedClient.clientCode,
          assignedWorkoutId: selectedWorkout.assignedWorkoutId,
          assignedWorkoutRecordId: selectedWorkout.id,
          programId: selectedWorkout.programId,
          workoutDate: normalizeDate(String(selectedWorkout.scheduledDate)),
          logs: setLogs,
          submissionNote: workoutSubmissionNote.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        notify("Could not save workout. Check API response.");
        return;
      }

      if (data.exerciseResults?.errors?.length > 0) {
        notify("Workout saved, but exercise results need table field review.", "error");
      } else {
        notify("Workout submitted.");
      }
      const draftKey = getWorkoutDraftKey();
      if (draftKey) {
        window.localStorage.removeItem(draftKey);
      }
      setWorkouts((current) =>
        current.map((workout) =>
          workout.id === selectedWorkout.id
            ? { ...workout, completionStatus: "Completed" }
            : workout
        )
      );
      setSelectedWorkout(null);
      setWorkoutLoggingStarted(false);
      setSavedExerciseDraftIds([]);
      setWorkoutDetails([]);
      setSetLogs([]);
      setWorkoutSubmissionNote("");
    } catch (error) {
      console.error(error);
      notify("Could not save workout.");
    } finally {
      setSavingWorkout(false);
    }
  };

  const updateAssignedWorkoutScheduledDate = async (
    assignedWorkoutRecordId: string,
    scheduledDate: string
  ) => {
    const response = await fetch("/api/updateAssignedProgramDate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assignedWorkoutRecordId,
        assignedWorkoutId:
          selectedWorkout?.id === assignedWorkoutRecordId
            ? selectedWorkout.assignedWorkoutId
            : workouts.find((workout) => workout.id === assignedWorkoutRecordId)
                ?.assignedWorkoutId,
        scheduledDate,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error(data);
      throw new Error("Could not update workout date.");
    }

    return data;
  };

  const updateWorkoutDate = async () => {
    if (!selectedWorkout || !selectedClient) return;

    setUpdatingWorkoutDate(true);

    try {
      await updateAssignedWorkoutScheduledDate(selectedWorkout.id, editingWorkoutDate);

      notify("Workout date updated.");

      const refresh = await fetch(`/api/workouts?clientCode=${selectedClient.clientCode}`);
      const refreshData = await refresh.json();
      setWorkouts(refreshData.workouts || []);
      const updatedWorkout = refreshData.workouts?.find(
        (workout: Workout) => workout.id === selectedWorkout.id
      );

      if (updatedWorkout) {
        setSelectedWorkout(updatedWorkout);
        setEditingWorkoutDate(normalizeDate(String(updatedWorkout.scheduledDate)));
      }
    } catch (error) {
      console.error(error);
      notify("Could not update workout date.");
    } finally {
      setUpdatingWorkoutDate(false);
    }
  };

  const deleteWorkout = async (workout: Workout) => {
    if (!selectedClient) return;
    if (!window.confirm(`Delete ${workout.sessionName || "this workout"}?`)) return;

    try {
      const response = await fetch("/api/deleteRecord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resource: "workout",
          recordId: workout.id,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not delete workout.", "error");
        return;
      }

      setSelectedWorkout(null);
      setWorkoutDetails([]);
      setSetLogs([]);

      const refresh = await fetch(`/api/workouts?clientCode=${selectedClient.clientCode}`);
      const refreshData = await refresh.json();
      setWorkouts(refreshData.workouts || []);
      notify("Workout deleted.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not delete workout.", "error");
    }
  };

  const deleteContentAssignment = async (assignment: ContentAssignment) => {
    if (!selectedClient) return;
    const name = getAssignmentDisplayName(assignment);

    if (!window.confirm(`Delete ${name} from the calendar?`)) return;

    try {
      const isTest = assignment.assignmentType.toLowerCase().includes("test");
      const response = await fetch("/api/deleteRecord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resource: isTest ? "assignedTest" : "assignedForm",
          recordId: assignment.recordId,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not delete assigned item.", "error");
        return;
      }

      await loadContentAssignments(selectedClient);
      notify("Assigned item deleted.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not delete assigned item.", "error");
    }
  };

  const getAssignmentDisplayName = (assignment: ContentAssignment) => {
    const isTest = assignment.assignmentType.toLowerCase().includes("test");
    const savedTemplate = isTest
      ? savedTestTemplates.find(
          (test) =>
            test.testTemplateId === assignment.templateId ||
            test.recordId === assignment.templateId ||
            test.name === assignment.templateName
        )
      : savedFormTemplates.find(
          (form) =>
            form.formId === assignment.templateId ||
            form.recordId === assignment.templateId ||
            form.name === assignment.templateName
        );

    if (isTest && savedTemplate && "name" in savedTemplate) {
      return savedTemplate.name || assignment.templateName || "Physical Test";
    }

    if (!isTest && savedTemplate && "name" in savedTemplate) {
      return savedTemplate.name || assignment.templateName || "Questionnaire";
    }

    return (
      assignment.templateName ||
      assignment.assignmentType ||
      "Assigned item"
    );
  };

  const closeCalendarActionMenu = () => setCalendarActionMenu(null);

  const clearCalendarLongPress = () => {
    if (calendarLongPressTimer.current) {
      clearTimeout(calendarLongPressTimer.current);
      calendarLongPressTimer.current = null;
    }
  };

  const openCalendarActionMenu = (
    x: number,
    y: number,
    menu: CalendarActionMenuPayload
  ) => {
    const menuWidth = 190;
    const menuHeight = 190;
    const maxX = Math.max(12, window.innerWidth - menuWidth - 12);
    const maxY = Math.max(12, window.innerHeight - menuHeight - 12);

    setCalendarActionMenu({
      ...menu,
      x: Math.min(Math.max(12, x), maxX),
      y: Math.min(Math.max(12, y), maxY),
    } as CalendarActionMenuState);
  };

  const startCalendarLongPress = (
    event: TouchEvent,
    menu: CalendarActionMenuPayload
  ) => {
    if (isClientPortal) return;
    clearCalendarLongPress();
    calendarLongPressOpened.current = false;
    const touch = event.touches[0];

    calendarLongPressTimer.current = setTimeout(() => {
      calendarLongPressOpened.current = true;
      openCalendarActionMenu(touch.clientX, touch.clientY, menu);
    }, 520);
  };

  const consumeCalendarLongPressClick = () => {
    if (!calendarLongPressOpened.current) return false;
    calendarLongPressOpened.current = false;
    return true;
  };

  const moveWorkoutToDate = async (workout: Workout, scheduledDate: string) => {
    if (!selectedClient) return;

    const currentDate = normalizeDate(String(workout.scheduledDate));

    if (!scheduledDate || currentDate === scheduledDate || movingWorkoutId) {
      return;
    }

    const previousWorkouts = workouts;

    setMovingWorkoutId(workout.id);
    setWorkouts((prev) =>
      prev.map((item) =>
        item.id === workout.id ? { ...item, scheduledDate } : item
      )
    );

    try {
      await updateAssignedWorkoutScheduledDate(workout.id, scheduledDate);

      const refresh = await fetch(`/api/workouts?clientCode=${selectedClient.clientCode}`);
      const refreshData = await refresh.json();
      setWorkouts(refreshData.workouts || []);
    } catch (error) {
      console.error(error);
      setWorkouts(previousWorkouts);
      notify("Could not move workout. The calendar has been restored.");
    } finally {
      setMovingWorkoutId("");
      setDraggingWorkoutId("");
    }
  };

  const moveContentAssignmentToDate = async (
    assignment: ContentAssignment,
    scheduledDate: string
  ) => {
    if (!selectedClient) return;

    const currentDate = normalizeDate(
      String(assignment.dueDate || assignment.assignedDate)
    );

    if (!scheduledDate || currentDate === scheduledDate || movingAssignmentId) {
      return;
    }

    const previousAssignments = contentAssignments;

    setMovingAssignmentId(assignment.recordId);
    setContentAssignments((current) =>
      current.map((item) =>
        item.recordId === assignment.recordId
          ? { ...item, dueDate: scheduledDate }
          : item
      )
    );

    try {
      const response = await fetch("/api/updateContentAssignmentDate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentType: assignment.assignmentType,
          recordId: assignment.recordId,
          scheduledDate,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        throw new Error("Could not move assigned item.");
      }

      await loadContentAssignments(selectedClient);
      notify("Assigned item moved.", "success");
    } catch (error) {
      console.error(error);
      setContentAssignments(previousAssignments);
      notify("Could not move assigned item. The calendar has been restored.", "error");
    } finally {
      setMovingAssignmentId("");
      setDraggingAssignmentId("");
    }
  };

  const copyCalendarWorkout = (workout: Workout, action: "copy" | "cut") => {
    setCopiedCalendarItem({
      action,
      type: "workout",
      id: workout.id,
      label: localizedWorkoutName(workout),
    });
    notify(
      `${action === "copy" ? "Copied" : "Cut"} ${localizedWorkoutName(
        workout
      )}. Choose Paste on a date.`
    );
  };

  const copyCalendarAssignment = (
    assignment: ContentAssignment,
    action: "copy" | "cut"
  ) => {
    const label = getAssignmentDisplayName(assignment);

    setCopiedCalendarItem({
      action,
      type: "assignment",
      id: assignment.recordId,
      label,
    });
    notify(`${action === "copy" ? "Copied" : "Cut"} ${label}. Choose Paste on a date.`);
  };

  const pasteCalendarItemToDate = async (scheduledDate: string) => {
    if (!copiedCalendarItem) return;

    if (copiedCalendarItem.type === "workout") {
      const workout = workouts.find((item) => item.id === copiedCalendarItem.id);

      if (!workout) {
        notify("Copied workout is no longer available.", "error");
        setCopiedCalendarItem(null);
        return;
      }

      if (copiedCalendarItem.action === "cut") {
        await moveWorkoutToDate(workout, scheduledDate);
      } else {
        const response = await fetch("/api/duplicateAssignedWorkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignedWorkoutRecordId: workout.id,
            scheduledDate,
          }),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          console.error(data);
          notify("Could not copy workout.", "error");
          return;
        }

        if (selectedClient) {
          const refresh = await fetch(
            `/api/workouts?clientCode=${selectedClient.clientCode}`
          );
          const refreshData = await refresh.json();
          setWorkouts(refreshData.workouts || []);
        }
        notify("Workout copied.", "success");
      }
      setCopiedCalendarItem(null);
      return;
    }

    const assignment = contentAssignments.find(
      (item) => item.recordId === copiedCalendarItem.id
    );

    if (!assignment) {
      notify("Copied assignment is no longer available.", "error");
      setCopiedCalendarItem(null);
      return;
    }

    if (copiedCalendarItem.action === "cut") {
      await moveContentAssignmentToDate(assignment, scheduledDate);
    } else {
      const client =
        selectedClient || clients.find((item) => item.id === assignment.clientId);

      if (!client) {
        notify("Could not find the client for this assignment.", "error");
        return;
      }

      const response = await fetch("/api/assignContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentType: assignment.assignmentType,
          templateId: assignment.templateId,
          templateName: assignment.templateName,
          clientId: client.id,
          clientCode: client.clientCode,
          clientName: client.name,
          assignedDate: dateToInputValue(new Date()),
          dueDate: scheduledDate,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not copy assigned item.", "error");
        return;
      }

      await loadContentAssignments(client);
      notify("Assigned item copied.", "success");
    }
    setCopiedCalendarItem(null);
  };

  const addExerciseToProgram = (exercise: LibraryExercise) => {
    const meta = parseExerciseNotes(exercise.notes || "");

    setSelectedProgramExercises([
      ...selectedProgramExercises,
      {
        exerciseRecordId: exercise.recordId,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        order: selectedProgramExercises.length + 1,
        sectionName:
          selectedProgramExercises[selectedProgramExercises.length - 1]
            ?.sectionName || "Main",
        exerciseLabel: makeExerciseLabel(selectedProgramExercises.length),
        sets: "3",
        reps: "8",
        tempo: "3-1-1",
        rest: "60 sec",
        coachingNotes: "",
        trackingType: meta.trackingType,
        isUnilateral: meta.isUnilateral,
        groupType: "Straight",
        groupName: "",
      },
    ]);
  };

  const normalizeProgramExerciseOrder = (exercises: ProgramExercise[]) =>
    exercises.map((exercise, index) => ({
      ...exercise,
      order: index + 1,
    }));

  const updateProgramExercise = (
    index: number,
    field: keyof ProgramExercise,
    value: string
  ) => {
    const updated = [...selectedProgramExercises];

    updated[index] = {
      ...updated[index],
      [field]: field === "order" ? Number(value) : value,
    };

    setSelectedProgramExercises(updated);
  };

  const moveProgramExercise = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= selectedProgramExercises.length) {
      return;
    }

    const updated = [...selectedProgramExercises];
    const [movedExercise] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, movedExercise);

    setSelectedProgramExercises(normalizeProgramExerciseOrder(updated));
  };

  const updateExerciseGrouping = (
    index: number,
    groupType: ProgramExercise["groupType"],
    groupName: string
  ) => {
    const updated = [...selectedProgramExercises];

    updated[index] = {
      ...updated[index],
      groupType,
      groupName: groupType === "Straight" ? "" : groupName,
    };

    setSelectedProgramExercises(updated);
  };

  const linkExerciseWithPrevious = (
    index: number,
    groupType: "Superset" | "Circuit"
  ) => {
    if (index === 0) {
      notify(`Add another exercise above this before creating a ${groupType.toLowerCase()}.`);
      return;
    }

    const groupName =
      selectedProgramExercises[index - 1].groupName ||
      `${groupType} ${String.fromCharCode(65 + index - 1)}`;
    const updated = [...selectedProgramExercises];

    updated[index - 1] = {
      ...updated[index - 1],
      groupType,
      groupName,
    };
    updated[index] = {
      ...updated[index],
      groupType,
      groupName,
    };

    setSelectedProgramExercises(updated);
  };

  const buildExerciseCoachingNotes = (exercise: ProgramExercise) => {
    const meta = [
      exercise.sectionName ? `Section: ${exercise.sectionName}` : "",
      exercise.exerciseLabel ? `Label: ${exercise.exerciseLabel}` : "",
      `Tracking: ${exercise.trackingType || "Weight"}`,
      `Unilateral: ${exercise.isUnilateral ? "Yes" : "No"}`,
      exercise.groupType !== "Straight" && exercise.groupName
        ? `${exercise.groupType}: ${exercise.groupName}`
        : "",
    ].filter(Boolean);

    return [...meta, exercise.coachingNotes].filter(Boolean).join("\n\n");
  };

  const removeProgramExercise = (index: number) => {
    const updated = selectedProgramExercises
      .filter((_, itemIndex) => itemIndex !== index)
      .map((exercise, itemIndex) => ({
        ...exercise,
        order: itemIndex + 1,
      }));

    setSelectedProgramExercises(updated);
  };

  const buildCurrentProgramSession = (localId?: string): ProgramSession | null => {
    if (!programWeek || !programDay || !sessionName) {
      return null;
    }

    if (selectedProgramExercises.length === 0) {
      return null;
    }

    return {
      localId: localId || `${Date.now()}-${Math.random()}`,
      week: programWeek,
      day: programDay,
      sessionName,
      exercises: selectedProgramExercises.map((exercise, index) => ({
        ...exercise,
        order: Number(exercise.order) || index + 1,
      })),
    };
  };

  const renumberProgramSessionsByWeek = (sessions: ProgramSession[]) => {
    const dayCounters: Record<string, number> = {};

    return sessions.map((session) => {
      const week = String(Number(session.week) || 1);
      const nextDay = (dayCounters[week] || 0) + 1;
      dayCounters[week] = nextDay;

      return {
        ...session,
        week,
        day: String(nextDay),
      };
    });
  };

  const clearCurrentProgramSession = (advanceDay = true) => {
    const nextDay = String((Number(programDay) || 1) + 1);

    setSelectedProgramExercises([]);
    setEditingProgramSessionId("");
    setProgramDay(advanceDay ? nextDay : "1");
    setSessionName("");
  };

  const saveCurrentSessionToProgram = (
    closeAfterSave = false,
    advanceAfterClose = true
  ) => {
    if (!programWeek || !programDay || !sessionName) {
      notify("Please fill Week, Day, and Session Name.");
      return;
    }

    if (selectedProgramExercises.length === 0) {
      notify("Please add at least one exercise to this session.");
      return;
    }

    const localId = editingProgramSessionId || `${Date.now()}-${Math.random()}`;
    const savedSession = buildCurrentProgramSession(localId);

    if (!savedSession) return;

    setProgramSessions((current) => {
      const hasExisting = current.some((session) => session.localId === localId);
      const nextSessions = hasExisting
        ? current.map((session) =>
            session.localId === localId ? savedSession : session
          )
        : [...current, savedSession];

      return renumberProgramSessionsByWeek(nextSessions);
    });

    setEditingProgramSessionId(closeAfterSave ? "" : localId);

    if (closeAfterSave) {
      clearCurrentProgramSession(advanceAfterClose);
    }

    notify(
      closeAfterSave && advanceAfterClose
        ? "Day saved. Ready for the next day."
        : "Day saved."
    );
  };

  const addCurrentSessionToProgram = () => {
    saveCurrentSessionToProgram(true, true);
  };

  const reorderProgramSession = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    setProgramSessions((current) => {
      const sourceIndex = current.findIndex(
        (session) => session.localId === sourceId
      );
      const targetIndex = current.findIndex(
        (session) => session.localId === targetId
      );

      if (sourceIndex < 0 || targetIndex < 0) return current;

      const nextSessions = [...current];
      const [movedSession] = nextSessions.splice(sourceIndex, 1);
      nextSessions.splice(targetIndex, 0, movedSession);

      return renumberProgramSessionsByWeek(nextSessions);
    });
  };

  const removeProgramSession = (localId: string) => {
    setProgramSessions(programSessions.filter((session) => session.localId !== localId));

    if (editingProgramSessionId === localId) {
      clearCurrentProgramSession(false);
    }
  };

  const loadSessionForEditing = (session: ProgramSession) => {
    setProgramWeek(session.week);
    setProgramDay(session.day);
    setSessionName(session.sessionName);
    setSelectedProgramExercises(session.exercises);
    setEditingProgramSessionId(session.localId);
  };

  const saveFullProgram = async () => {
    if (!programName) {
      notify("Please fill Program Name.");
      return;
    }

    if (programSessions.length === 0 && selectedProgramExercises.length === 0) {
      notify("Please add at least one session.");
      return;
    }

    let sessionsToSave = [...programSessions];

    if (selectedProgramExercises.length > 0) {
      if (!programWeek || !programDay || !sessionName) {
        notify("Current session has exercises but is missing Week, Day, or Session Name.");
        return;
      }

      const currentSession = buildCurrentProgramSession(
        editingProgramSessionId || `${Date.now()}-${Math.random()}`
      );

      if (!currentSession) {
        notify("Current session could not be saved.");
        return;
      }

      sessionsToSave = sessionsToSave.some(
        (session) => session.localId === currentSession.localId
      )
        ? sessionsToSave.map((session) =>
            session.localId === currentSession.localId ? currentSession : session
          )
        : [...sessionsToSave, currentSession];
    }

    sessionsToSave = renumberProgramSessionsByWeek(sessionsToSave);

    setSavingTemplate(true);

    try {
      const programResponse = await fetch("/api/createProgram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          programName,
          goal: programGoal,
          sport: programSport,
          level: programLevel,
          durationWeeks: Number(programDurationWeeks),
          phase: programPhase,
          sessionsPerWeek: Number(programSessionsPerWeek),
          coach: programCoach,
          status: "Active",
          productType: programProductType,
          price: programPrice,
          currency: programCurrency,
          publicStoreVisible: programPublicStoreVisible,
          purchaseLink: programPurchaseLink,
          defaultIntakeFormId: programDefaultIntakeFormId,
          accessLengthDays: programAccessLengthDays,
          productStatus: programProductStatus,
          salesDescription: programSalesDescription,
        }),
      });

      const programData = await programResponse.json();

      if (!programResponse.ok || !programData.success) {
        console.error(programData);
        notify("Could not create program. Check API response.");
        return;
      }

      let totalRecordsCreated = 0;

      for (const session of sessionsToSave) {
        const templateResponse = await fetch("/api/createWorkoutTemplate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            programId: programData.programId,
            programRecordId: programData.programRecordId,
            week: Number(session.week),
            day: Number(session.day),
            sessionName: session.sessionName,
            exercises: session.exercises.map((exercise, index) => ({
              ...exercise,
              order: Number(exercise.order) || index + 1,
              sets: Number(exercise.sets) || 1,
              coachingNotes: buildExerciseCoachingNotes(exercise),
              status: "Active",
            })),
          }),
        });

        const templateData = await templateResponse.json();

        if (!templateResponse.ok || !templateData.success) {
          console.error(templateData);
          notify(
            `Program was created, but session "${session.sessionName}" failed. Check API response.`
          );
          return;
        }

        totalRecordsCreated += Number(templateData.recordsCreated || 0);
      }

      notify(
        `Program saved. Sessions: ${sessionsToSave.length}. Template records created: ${totalRecordsCreated}`
      );

      setProgramSessions([]);
      setSelectedProgramExercises([]);
      setProgramName("");
      setProgramGoal("");
      setProgramSport("");
      setProgramLevel("");
      setProgramDurationWeeks("4");
      setProgramPhase("");
      setProgramSessionsPerWeek("3");
      setProgramProductType("Digital Program");
      setProgramPrice("");
      setProgramCurrency("CNY");
      setProgramPublicStoreVisible(false);
      setProgramPurchaseLink("");
      setProgramDefaultIntakeFormId("");
      setProgramAccessLengthDays("42");
      setProgramProductStatus("Draft");
      setProgramSalesDescription("");
      setSessionName("");
      setProgramWeek("1");
      setProgramDay("1");
      loadPrograms();
    } catch (error) {
      console.error(error);
      notify("Could not save full program.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const filteredLibraryExercises = libraryExercises.filter((exercise) => {
    if (String(exercise.notes || "").startsWith("[Archived]")) {
      return false;
    }

    const search = librarySearch.toLowerCase();

    return (
      exercise.exerciseName?.toLowerCase().includes(search) ||
      exercise.exerciseId?.toLowerCase().includes(search) ||
      exercise.category?.toLowerCase().includes(search) ||
      exercise.equipment?.toLowerCase().includes(search) ||
      exercise.movementPattern?.toLowerCase().includes(search)
    );
  });

  const builderExercises = libraryExercises.filter((exercise) => {
    const search = builderSearch.toLowerCase();

    return (
      exercise.exerciseName?.toLowerCase().includes(search) ||
      exercise.exerciseId?.toLowerCase().includes(search) ||
      exercise.category?.toLowerCase().includes(search) ||
      exercise.equipment?.toLowerCase().includes(search) ||
      exercise.movementPattern?.toLowerCase().includes(search)
    );
  });

  const addFormQuestion = () => {
    setFormQuestions((current) => [
      ...current,
      {
        id: `Q${current.length + 1}`,
        label: "",
        questionType: "Text",
        required: false,
      },
    ]);
  };

  const updateFormQuestion = (
    index: number,
    field: keyof (typeof formQuestions)[number],
    value: string | boolean
  ) => {
    setFormQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, [field]: value } : question
      )
    );
  };

  const removeFormQuestion = (index: number) => {
    setFormQuestions((current) =>
      current.filter((_, questionIndex) => questionIndex !== index)
    );
  };

  const addTestItem = () => {
    setTestItems((current) => [
      ...current,
      {
        id: `T${current.length + 1}`,
        testName: "",
        metricType: "Weight",
        unit: "kg",
      },
    ]);
  };

  const updateTestItem = (
    index: number,
    field: keyof (typeof testItems)[number],
    value: string
  ) => {
    setTestItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeTestItem = (index: number) => {
    setTestItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const getCheckInAgeDays = (client: Client) => {
    if (!client.activity || client.activity === "--") return null;

    const checkInDate = new Date(`${normalizeDate(client.activity)}T00:00:00`);

    if (Number.isNaN(checkInDate.getTime())) return null;

    const today = new Date(`${dateToInputValue(new Date())}T00:00:00`);
    return Math.max(
      0,
      Math.floor((today.getTime() - checkInDate.getTime()) / 86400000)
    );
  };

  const clientNeedsCheckIn = (client: Client) => {
    const ageDays = getCheckInAgeDays(client);
    return ageDays === null || ageDays >= 7;
  };

  const clientBelongsToCoachScope = (client: Client) => {
    if (coachScope === "All Coaches") return true;

    const scopedCoach = activeCoaches.find((coach) => coach.name === coachScope);
    const coachValues = [
      client.coach,
      client.primaryCoach,
      client.secondaryCoach,
    ]
      .filter(Boolean)
      .map((value) => getCoachDisplayName(String(value)).toLowerCase());

    return coachValues.some(
      (value) =>
        value === coachScope.toLowerCase() ||
        value === scopedCoach?.recordId.toLowerCase() ||
        value === scopedCoach?.coachId.toLowerCase()
    );
  };

  const coachVisibleClients = clients.filter(clientBelongsToCoachScope);

  const checkInStats = {
    due: coachVisibleClients.filter(clientNeedsCheckIn).length,
    recent: coachVisibleClients.filter((client) => {
      const ageDays = getCheckInAgeDays(client);
      return ageDays !== null && ageDays < 7;
    }).length,
    missing: coachVisibleClients.filter((client) => getCheckInAgeDays(client) === null).length,
  };

  const menuItems: { name: Page; label: string; count: number; icon: LucideIcon }[] =
    [
      {
        name: "Clients",
        label: "Clients",
        count: coachVisibleClients.length,
        icon: Users,
      },
      {
        name: "Library",
        label: "Library",
        count: libraryExercises.length,
        icon: BookOpen,
      },
      {
        name: "Workouts",
        label: "Programming",
        count: workouts.length,
        icon: Dumbbell,
      },
      {
        name: "Orders",
        label: "Orders",
        count: productOrders.length,
        icon: ClipboardList,
      },
      ...(canManageCoaches
        ? [
            {
              name: "Coaches" as Page,
              label: "Coaches",
              count: allCoaches.length,
              icon: Users,
            },
          ]
        : []),
    ];

  useEffect(() => {
    if (activePage === "Coaches" && !canManageCoaches) {
      setActivePage("Clients");
    }
  }, [activePage, canManageCoaches]);

  const clientStatusOptions = Array.from(
    new Set(coachVisibleClients.map((client) => client.status).filter(Boolean))
  );

  const clientNeedsProgramming = (client: Client) =>
    !client.program || client.program === "--";
  const clientNeedsContact = (client: Client) => !client.email && !client.phone;
  const clientIsArchived = (client: Client) =>
    client.status.toLowerCase().includes("archived");
  const clientMatchesBucket = (client: Client, bucket: ClientBucket) => {
    const status = client.status.toLowerCase();

    if (bucket === "All Clients") return true;
    if (bucket === "Active") return status.includes("active");
    if (bucket === "Premium") return status.includes("premium");
    if (bucket === "Online Coaching") return status.includes("online");
    if (bucket === "Paused") return status.includes("paused");
    if (bucket === "Needs Contact") return clientNeedsContact(client);
    if (bucket === "Needs Programming") return clientNeedsProgramming(client);
    if (bucket === "Archived") return clientIsArchived(client);

    return true;
  };

  const clientBuckets: { name: ClientBucket; count: number }[] = [
    { name: "All Clients", count: coachVisibleClients.length },
    {
      name: "Active",
      count: coachVisibleClients.filter((client) => clientMatchesBucket(client, "Active"))
        .length,
    },
    {
      name: "Premium",
      count: coachVisibleClients.filter((client) => clientMatchesBucket(client, "Premium"))
        .length,
    },
    {
      name: "Online Coaching",
      count: coachVisibleClients.filter((client) =>
        clientMatchesBucket(client, "Online Coaching")
      ).length,
    },
    {
      name: "Paused",
      count: coachVisibleClients.filter((client) => clientMatchesBucket(client, "Paused"))
        .length,
    },
    {
      name: "Needs Contact",
      count: coachVisibleClients.filter(clientNeedsContact).length,
    },
    {
      name: "Needs Programming",
      count: coachVisibleClients.filter(clientNeedsProgramming).length,
    },
    {
      name: "Archived",
      count: coachVisibleClients.filter(clientIsArchived).length,
    },
  ];

  const filteredClients = coachVisibleClients.filter((client) => {
    const search = clientSearch.toLowerCase();
    const matchesSearch =
      client.name.toLowerCase().includes(search) ||
      client.clientCode.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.phone?.toLowerCase().includes(search);
    const matchesStatus =
      clientStatusFilter === "All" || client.status === clientStatusFilter;
    const matchesBucket = clientMatchesBucket(client, clientBucket);

    return matchesSearch && matchesStatus && matchesBucket;
  });

  const filteredCheckInClients = coachVisibleClients.filter((client) => {
    const search = checkInSearch.toLowerCase();
    const ageDays = getCheckInAgeDays(client);
    const matchesSearch =
      client.name.toLowerCase().includes(search) ||
      client.clientCode.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.phone?.toLowerCase().includes(search);
    const matchesFilter =
      checkInFilter === "All" ||
      (checkInFilter === "Due" && clientNeedsCheckIn(client)) ||
      (checkInFilter === "Recent" && ageDays !== null && ageDays < 7) ||
      (checkInFilter === "No Check-in" && ageDays === null);

    return matchesSearch && matchesFilter;
  });

  const refreshSelectedClient = (updatedClients: Client[]) => {
    if (!selectedClient) return;

    const updatedSelectedClient = updatedClients.find(
      (client) => client.id === selectedClient.id
    );

    if (updatedSelectedClient) {
      setSelectedClient(updatedSelectedClient);
    }
  };

  const selectedClientCheckInAge = selectedClient
    ? getCheckInAgeDays(selectedClient)
    : null;
  const selectedClientCheckInLabel =
    selectedClientCheckInAge === null
      ? "No check-in"
      : selectedClientCheckInAge === 0
        ? "Today"
        : `${selectedClientCheckInAge}d ago`;
  const selectedClientOrders = selectedClient
    ? productOrders.filter(
        (order) =>
          lookupTextMatches(order.clientId, selectedClient.id) ||
          lookupTextMatches(order.clientId, selectedClient.clientCode) ||
          lookupTextMatches(order.clientId, selectedClient.name) ||
          lookupTextMatches(order.clientName, selectedClient.name) ||
          lookupTextMatches(order.clientName, selectedClient.clientCode)
      )
    : [];
  const selectedClientLatestOrder = selectedClientOrders[0];
  const todayInputValue = dateToInputValue(new Date());
  const getOrderClient = (order: ProductOrder) =>
    clients.find((client) => {
      return (
        lookupTextMatches(order.clientId, client.id) ||
        lookupTextMatches(order.clientId, client.clientCode) ||
        lookupTextMatches(order.clientId, client.name) ||
        lookupTextMatches(order.clientName, client.name) ||
        lookupTextMatches(order.clientName, client.clientCode)
      );
    });
  const getOrderProgram = (order: ProductOrder, sourcePrograms = programs) =>
    sourcePrograms.find((program) => {
      return (
        lookupTextMatches(order.programId, program.programId) ||
        lookupTextMatches(order.programId, program.recordId) ||
        lookupTextMatches(order.programId, program.programName) ||
        lookupTextMatches(order.productName, program.programName) ||
        lookupTextMatches(order.productName, program.programId)
      );
    });
  const getOrderStartDate = (order: ProductOrder) =>
    normalizeDate(
      orderStartDates[order.recordId] ||
        order.accessStartDate ||
        order.purchasedAt ||
        todayInputValue
    );
  const updateProductOrder = async (
    order: ProductOrder,
    updates: Record<string, string | undefined>
  ) => {
    try {
      const response = await fetch("/api/updateProductOrder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recordId: order.recordId,
          ...updates,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.warn("Product order pipeline update skipped", data);
        return false;
      }

      if (data.omittedFields?.length) {
        console.info("Optional product order columns not found", data.omittedFields);
      }

      await loadProductOrders();
      return true;
    } catch (error) {
      console.warn("Product order pipeline update failed", error);
      return false;
    }
  };
  const getOrderPipelineStatus = (order: ProductOrder) => {
    const statusText = `${order.onboardingStatus || ""} ${
      order.fulfillmentStatus || ""
    }`.toLowerCase();
    const intakeStatus = String(order.intakeStatus || "").toLowerCase();

    if (
      statusText.includes("program loaded") ||
      statusText.includes("fulfilled")
    ) {
      return "Program Loaded";
    }

    if (statusText.includes("program ready") || intakeStatus.includes("reviewed")) {
      return "Program Ready";
    }

    if (intakeStatus.includes("submitted")) return "Intake Submitted";
    if (
      statusText.includes("intake sent") ||
      intakeStatus.includes("sent") ||
      intakeStatus.includes("assigned")
    ) {
      return "Intake Sent";
    }

    if (statusText.includes("client created") || getOrderClient(order)) {
      return "Client Created";
    }

    return order.onboardingStatus || "New Order";
  };
  const orderPipelineStages = [
    "New Order",
    "Client Created",
    "Intake Sent",
    "Intake Submitted",
    "Program Ready",
    "Program Loaded",
  ];
  const getOrderStageIndex = (order: ProductOrder) =>
    Math.max(0, orderPipelineStages.indexOf(getOrderPipelineStatus(order)));
  const getOrderClientType = (order: ProductOrder) => {
    const type = `${order.productType} ${order.productName}`.toLowerCase();

    if (type.includes("in-person") || type.includes("personal")) {
      return "In-Person Training";
    }

    if (type.includes("online") || type.includes("coaching")) {
      return "Online Coaching";
    }

    return "Digital Program";
  };
  const getOrderPrimaryCoach = (order: ProductOrder) => {
    const assignedCoach = getCoachDisplayName(order.assignedCoach || "");

    if (assignedCoach) return assignedCoach;
    if (currentScopedCoach) return currentScopedCoach.name;
    return "Kent Bastell";
  };
  const getOrderIntakeTemplate = (order: ProductOrder) => {
    const program = getOrderProgram(order);
    const defaultFormId = program?.defaultIntakeFormId || "";
    const activeForms = savedFormTemplates.filter(
      (form) => form.status !== "Archived"
    );

    return (
      activeForms.find((form) => form.formId === defaultFormId) ||
      activeForms.find((form) => {
        const text = `${form.name} ${form.type} ${form.description}`.toLowerCase();
        return (
          text.includes("intake") ||
          text.includes("onboarding") ||
          text.includes("readiness")
        );
      })
    );
  };
  const orderBelongsToCoachScope = (order: ProductOrder) => {
    if (coachScope === "All Coaches") return true;

    const matchedClient = getOrderClient(order);

    if (matchedClient) return clientBelongsToCoachScope(matchedClient);

    return getCoachDisplayName(order.assignedCoach || "").toLowerCase() ===
      coachScope.toLowerCase();
  };
  const visibleProductOrders = productOrders
    .filter(orderBelongsToCoachScope)
    .filter((order) => {
      const search = orderSearch.toLowerCase();

      if (!search) return true;

      return [
        order.orderId,
        order.clientName,
        order.productName,
        order.productType,
        order.paymentStatus,
        order.intakeStatus,
      ].some((value) => String(value || "").toLowerCase().includes(search));
    });
  const openOrdersCount = visibleProductOrders.filter(
    (order) => getOrderPipelineStatus(order) !== "Program Loaded"
  ).length;
  const readyOrdersCount = visibleProductOrders.filter(
    (order) => getOrderPipelineStatus(order) === "Program Ready"
  ).length;

  const createClientFromOrder = async (order: ProductOrder) => {
    const existingClient = getOrderClient(order);

    if (existingClient) return existingClient;

    const primaryCoachName = getOrderPrimaryCoach(order);
    const primaryCoachId = getCoachRecordIdByName(primaryCoachName);
    const program = getOrderProgram(order);

    setOrderProcessingId(order.recordId);

    try {
      const response = await fetch("/api/createClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: order.clientName || `Order ${order.orderId}`,
          email: order.email || "",
          phone: order.phone || "",
          coach: primaryCoachName,
          primaryCoachId,
          clientType: getOrderClientType(order),
          packageType: "Active",
          packageName: order.productName || order.productType || "Purchased Program",
          subscriptionStatus: "Active",
          intakeStatus: order.intakeStatus || "Not Sent",
          paymentStatus: order.paymentStatus || "Paid",
          purchasedProgramId: program?.programId || order.programId,
          accessStartDate: order.accessStartDate || getOrderStartDate(order),
          accessEndDate: order.accessEndDate || "",
          source: "Product Order",
          paymentId: order.orderId,
          startDate: getOrderStartDate(order),
          notes: `Created from product order ${order.orderId}.`,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not create client from order.", "error");
        return null;
      }

      const clientsResponse = await fetch("/api/clients");
      const clientsData = await clientsResponse.json();
      const refreshedClients = clientsData.clients || [];
      setClients(refreshedClients);

      const createdClient =
        refreshedClients.find((client: Client) => client.id === data.recordId) ||
        refreshedClients.find(
          (client: Client) =>
            client.clientCode === data.clientId ||
            client.name.toLowerCase() === String(order.clientName).toLowerCase()
        );

      await updateProductOrder(order, {
        clientRecordId: createdClient?.id || data.recordId,
        clientCode: createdClient?.clientCode || data.clientId,
        clientName: createdClient?.name || order.clientName,
        onboardingStatus: "Client Created",
        paymentStatus: order.paymentStatus || "Paid",
        programId: program?.programId || order.programId,
        programName: program?.programName || order.productName,
      });
      notify(`Client created from order: ${order.clientName}.`, "success");
      return createdClient || null;
    } catch (error) {
      console.error(error);
      notify("Could not create client from order.", "error");
      return null;
    } finally {
      setOrderProcessingId("");
    }
  };

  const assignOrderIntake = async (order: ProductOrder) => {
    if (savedFormTemplates.length === 0 && !formTemplatesLoading) {
      await loadFormTemplates();
    }

    const client = getOrderClient(order) || (await createClientFromOrder(order));
    const intakeTemplate = getOrderIntakeTemplate(order);

    if (!client) {
      notify("Create or match the client before sending intake.", "error");
      return;
    }

    if (!intakeTemplate) {
      notify("No intake form found. Create one or set a default intake form.", "error");
      return;
    }

    setOrderProcessingId(order.recordId);

    try {
      const assignmentType = intakeTemplate.type
        .toLowerCase()
        .includes("check")
        ? "Check-in"
        : "Questionnaire";
      const response = await fetch("/api/assignContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentType,
          templateId: intakeTemplate.formId,
          templateName: intakeTemplate.name,
          clientId: client.id,
          clientCode: client.clientCode,
          clientName: client.name,
          assignedDate: todayInputValue,
          dueDate: getOrderStartDate(order),
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not assign intake.", "error");
        return;
      }

      await fetch("/api/updateClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: client.id,
          intakeStatus: "Sent",
          paymentStatus: order.paymentStatus || client.paymentStatus || "Paid",
          purchasedProgramId: getOrderProgram(order)?.programId || order.programId,
        }),
      });
      await updateProductOrder(order, {
        clientRecordId: client.id,
        clientCode: client.clientCode,
        clientName: client.name,
        intakeAssignmentId: data.recordId,
        intakeStatus: "Sent",
        onboardingStatus: "Intake Sent",
        paymentStatus: order.paymentStatus || "Paid",
        programId: getOrderProgram(order)?.programId || order.programId,
        programName: getOrderProgram(order)?.programName || order.productName,
      });
      await loadClients();
      notify(`Intake assigned to ${client.name}.`, "success");
    } catch (error) {
      console.error(error);
      notify("Could not assign intake.", "error");
    } finally {
      setOrderProcessingId("");
    }
  };

  const markOrderIntakeReviewed = async (order: ProductOrder) => {
    const client = getOrderClient(order);

    if (!client) {
      notify("Create or match the client before reviewing intake.", "error");
      return;
    }

    setOrderProcessingId(order.recordId);

    try {
      await fetch("/api/updateClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: client.id,
          intakeStatus: "Reviewed",
        }),
      });
      await updateProductOrder(order, {
        clientRecordId: client.id,
        clientCode: client.clientCode,
        clientName: client.name,
        intakeStatus: "Reviewed",
        onboardingStatus: "Program Ready",
      });
      await loadClients();
      notify(`${client.name}'s intake is marked reviewed.`, "success");
    } catch (error) {
      console.error(error);
      notify("Could not mark intake reviewed.", "error");
    } finally {
      setOrderProcessingId("");
    }
  };

  const buildProgramWorkoutsForOrder = async (program: Program, startDate: string) => {
    const response = await fetch(`/api/programTemplates?programId=${program.programId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || "Could not load program sessions.");
    }

    const sessions = new Map<string, AssignableWorkout>();

    (data.templates || []).forEach((template: any) => {
      const key = `${template.week}-${template.day}-${template.sessionName}`;

      if (!sessions.has(key)) {
        const offsetDays =
          (Number(template.week) - 1) * 7 + (Number(template.day) - 1) * 2;

        sessions.set(key, {
          localId: key,
          week: Number(template.week),
          day: Number(template.day),
          sessionName: template.sessionName,
          scheduledDate: addDays(startDate, offsetDays),
        });
      }
    });

    return Array.from(sessions.values());
  };

  const selectedClientPurchasedPrograms = selectedClient
    ? programs.filter((program) => {
        const directClientProgramMatch =
          lookupTextMatches(selectedClient.purchasedProgramId, program.programId) ||
          lookupTextMatches(selectedClient.purchasedProgramId, program.recordId) ||
          lookupTextMatches(selectedClient.purchasedProgramId, program.programName);
        const orderMatch = selectedClientOrders.some((order) => {
          return (
            lookupTextMatches(order.programId, program.programId) ||
            lookupTextMatches(order.programId, program.recordId) ||
            lookupTextMatches(order.programId, program.programName) ||
            lookupTextMatches(order.productName, program.programName) ||
            lookupTextMatches(order.productName, program.programId)
          );
        });

        return directClientProgramMatch || orderMatch;
      })
    : [];
  const selectedClientPurchasedOrderPrograms = selectedClientOrders
    .filter((order) => {
      const paymentStatus = normalizeLookupText(order.paymentStatus);
      const productText = normalizeLookupText(
        `${order.productType} ${order.productName}`
      );

      return (
        (!paymentStatus || paymentStatus.includes("paid")) &&
        (!productText ||
          productText.includes("digital") ||
          productText.includes("program"))
      );
    })
    .map((order) => {
      const matchedProgram = getOrderProgram(order);

      if (matchedProgram) return matchedProgram;

      return {
        recordId: `order-${order.recordId}`,
        programId: order.programId || order.orderId,
        programName: order.productName || order.programId || "Purchased Program",
        goal: "",
        sport: "",
        level: "",
        durationWeeks: "",
        phase: "",
        sessionsPerWeek: "",
        coach: getCoachDisplayName(order.assignedCoach || ""),
        status: order.paymentStatus || "Paid",
        productType: order.productType || "Digital Program",
        price: order.amount,
        currency: order.currency,
        productStatus: order.intakeStatus,
        sourceOrderId: order.recordId,
        isOrderPlaceholder: true,
      } satisfies Program;
    });
  const uniqueClientPurchasedPrograms = Array.from(
    new Map(
      [...selectedClientPurchasedPrograms, ...selectedClientPurchasedOrderPrograms].map(
        (program) => [program.programId || program.recordId, program]
      )
    ).values()
  );
  const selectedClientProgram =
    uniqueClientPurchasedPrograms.find(
      (program) => program.recordId === selectedClientProgramId
    ) || uniqueClientPurchasedPrograms[0];
  const localizedProgramName = (program: Program) => {
    const programNameCn =
      (program as Program & { programNameCn?: string; nameCn?: string })
        .programNameCn ||
      (program as Program & { programNameCn?: string; nameCn?: string }).nameCn;

    return useChineseClientText && programNameCn ? programNameCn : program.programName;
  };

  const getClientProgramScheduledWorkouts = (
    sessions = clientProgramSessions
  ) => {
    const scheduleStart = normalizeDate(clientProgramStartDate || todayInputValue);

    return sessions.map((session) => {
      const defaultDate = addDays(
        scheduleStart,
        (Number(session.week) - 1) * 7 + (Number(session.day) - 1) * 2
      );
      const scheduledDate =
        clientProgramScheduleMode === "Day"
          ? clientProgramDayDates[session.localId] || defaultDate
          : clientProgramScheduleMode === "Week"
            ? addDays(
                clientProgramWeekStarts[String(session.week)] ||
                  addDays(scheduleStart, (Number(session.week) - 1) * 7),
                (Number(session.day) - 1) * 2
              )
            : defaultDate;

      return {
        ...session,
        scheduledDate: normalizeDate(scheduledDate || defaultDate),
      };
    });
  };

  const loadClientProgramSessions = async (program = selectedClientProgram) => {
    if (!program) return;

    setLoadingClientProgramSessions(true);

    try {
      const startDate = normalizeDate(
        clientProgramStartDate ||
          selectedClient?.accessStartDate ||
          selectedClientLatestOrder?.accessStartDate ||
          todayInputValue
      );
      const sessions = await buildProgramWorkoutsForOrder(program, startDate);
      const weekStarts = sessions.reduce<Record<string, string>>((weeks, session) => {
        const weekKey = String(session.week);
        if (!weeks[weekKey]) {
          weeks[weekKey] = addDays(startDate, (Number(session.week) - 1) * 7);
        }
        return weeks;
      }, {});
      const dayDates = sessions.reduce<Record<string, string>>((dates, session) => {
        dates[session.localId] = session.scheduledDate;
        return dates;
      }, {});

      setClientProgramStartDate(startDate);
      setClientProgramSessions(sessions);
      setClientProgramWeekStarts(weekStarts);
      setClientProgramDayDates(dayDates);

      if (sessions.length === 0) {
        notify("No saved sessions found for this program.", "info");
      }
    } catch (error) {
      console.error(error);
      notify("Could not load this program schedule.", "error");
    } finally {
      setLoadingClientProgramSessions(false);
    }
  };

  const populateClientProgramCalendar = async () => {
    if (!selectedClient || !selectedClientProgram) {
      notify("Please select a program first.", "error");
      return;
    }

    const programForAssignment =
      programs.find(
        (program) =>
          lookupTextMatches(selectedClientProgram.programId, program.programId) ||
          lookupTextMatches(selectedClientProgram.programId, program.recordId) ||
          lookupTextMatches(selectedClientProgram.programName, program.programName)
      ) || selectedClientProgram;

    if (selectedClientProgram.isOrderPlaceholder || programForAssignment.isOrderPlaceholder) {
      notify(
        "This order is visible, but it needs to match a saved Program record before it can populate the calendar.",
        "error"
      );
      return;
    }

    const scheduledWorkouts = getClientProgramScheduledWorkouts();

    if (scheduledWorkouts.length === 0) {
      notify("Please preview this program schedule first.", "error");
      return;
    }

    setPopulatingClientProgram(true);

    try {
      const response = await fetch("/api/assignProgram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: selectedClient.id,
          programRecordId: programForAssignment.recordId,
          scheduledWorkouts: scheduledWorkouts.map((workout) => ({
            week: workout.week,
            day: workout.day,
            sessionName: workout.sessionName,
            scheduledDate: workout.scheduledDate,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not populate your calendar.", "error");
        return;
      }

      notify("Program added to your calendar.", "success");
      const refresh = await fetch(`/api/workouts?clientCode=${selectedClient.clientCode}`);
      const refreshData = await refresh.json();
      setWorkouts(refreshData.workouts || []);
      setClientTab("Training");
    } catch (error) {
      console.error(error);
      notify("Could not populate your calendar.", "error");
    } finally {
      setPopulatingClientProgram(false);
    }
  };

  const clientProgramScheduledWorkouts = getClientProgramScheduledWorkouts();
  const clientProgramWeekNumbers = Array.from(
    new Set(clientProgramSessions.map((session) => Number(session.week)))
  ).sort((a, b) => a - b);

  const assignOrderProgram = async (order: ProductOrder) => {
    const availablePrograms = programs.length > 0 ? programs : await loadPrograms();

    const client = getOrderClient(order) || (await createClientFromOrder(order));
    const program = getOrderProgram(order, availablePrograms);

    if (!client) {
      notify("Create or match the client before loading the program.", "error");
      return;
    }

    if (!program) {
      notify("No saved program matches this order.", "error");
      return;
    }

    setOrderProcessingId(order.recordId);

    try {
      const scheduledWorkouts = await buildProgramWorkoutsForOrder(
        program,
        getOrderStartDate(order)
      );

      if (scheduledWorkouts.length === 0) {
        notify("This program has no saved workout sessions.", "error");
        return;
      }

      const response = await fetch("/api/assignProgram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: client.id,
          programRecordId: program.recordId,
          scheduledWorkouts,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not load program from order.", "error");
        return;
      }

      await fetch("/api/updateClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: client.id,
          program: program.programName,
          purchasedProgramId: program.programId,
          paymentStatus: order.paymentStatus || client.paymentStatus || "Paid",
          accessStartDate: order.accessStartDate || getOrderStartDate(order),
          accessEndDate: order.accessEndDate || client.accessEndDate || "",
        }),
      });
      await updateProductOrder(order, {
        clientRecordId: client.id,
        clientCode: client.clientCode,
        clientName: client.name,
        onboardingStatus: "Program Loaded",
        fulfillmentStatus: "Fulfilled",
        fulfilledAt: todayInputValue,
        programId: program.programId,
        programName: program.programName,
        paymentStatus: order.paymentStatus || "Paid",
        accessStartDate: order.accessStartDate || getOrderStartDate(order),
        accessEndDate: order.accessEndDate || client.accessEndDate || "",
      });
      await loadClients();
      notify(
        `${program.programName} loaded for ${client.name}. Workouts created: ${data.recordsCreated}`,
        "success"
      );
    } catch (error) {
      console.error(error);
      notify("Could not load program from order.", "error");
    } finally {
      setOrderProcessingId("");
    }
  };
  const saveClientForm = async () => {
    if (!newClient.name.trim()) {
      notify("Please enter a client name.", "error");
      return;
    }

    setSavingClient(true);

    try {
      const primaryCoachId =
        newClient.primaryCoachId || getCoachRecordIdByName(newClient.coach);
      const selectedPrimaryCoach =
        activeCoaches.find((coach) => coach.recordId === primaryCoachId)?.name ||
        newClient.coach;
      const clientPayload = {
        ...newClient,
        coach: selectedPrimaryCoach,
        primaryCoachId,
      };
      const response = await fetch(
        editingClient ? "/api/updateClient" : "/api/createClient",
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
          body: JSON.stringify(
            editingClient
              ? { ...clientPayload, clientRecordId: editingClient.id }
              : clientPayload
          ),
        }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not save client. Check API response.", "error");
        return;
      }

      const clientsResponse = await fetch("/api/clients");
      const clientsData = await clientsResponse.json();
      const refreshedClients = clientsData.clients || [];

      setClients(refreshedClients);
      refreshSelectedClient(refreshedClients);
      closeClientForm();
      notify(
        editingClient ? "Client updated." : `Client created: ${data.clientId}`,
        "success"
      );
    } catch (error) {
      console.error(error);
      notify("Could not save client.", "error");
    } finally {
      setSavingClient(false);
    }
  };

  const updateClientPackage = async (client: Client, packageType: string) => {
    setUpdatingClientStatus(true);

    try {
      const response = await fetch("/api/updateClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: client.id,
          packageType,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not update client status.", "error");
        return;
      }

      const clientsResponse = await fetch("/api/clients");
      const clientsData = await clientsResponse.json();
      const refreshedClients = clientsData.clients || [];

      setClients(refreshedClients);
      refreshSelectedClient(refreshedClients);
      notify(`Client marked ${packageType}.`, "success");
    } catch (error) {
      console.error(error);
      notify("Could not update client status.", "error");
    } finally {
      setUpdatingClientStatus(false);
    }
  };

  const deleteClient = async (client: Client) => {
    if (!window.confirm(`Delete ${client.name}? This cannot be undone.`)) return;

    try {
      const response = await fetch("/api/deleteRecord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resource: "client",
          recordId: client.id,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not delete client.", "error");
        return;
      }

      setSelectedClient(null);
      await loadClients();
      notify("Client deleted.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not delete client.", "error");
    }
  };

  const deleteExercise = async (exercise: LibraryExercise) => {
    if (!window.confirm(`Delete ${exercise.exerciseName}? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch("/api/deleteRecord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resource: "exercise",
          recordId: exercise.recordId,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not delete exercise.", "error");
        return;
      }

      await loadExerciseLibrary();
      notify("Exercise deleted.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not delete exercise.", "error");
    }
  };

  const markClientCheckedInToday = async (client: Client) => {
    const today = dateToInputValue(new Date());

    setSavingCheckInClientId(client.id);

    try {
      const checkInResponse = await fetch("/api/checkIns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: client.clientCode || client.id,
          clientRecordId: client.id,
          submittedDate: today,
          status: "Submitted",
          coachReviewed: false,
        }),
      });
      const checkInData = await checkInResponse.json();

      if (!checkInResponse.ok || !checkInData.success) {
        console.error(checkInData);
        notify("Could not create check-in record.", "error");
        return;
      }

      const response = await fetch("/api/updateClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: client.id,
          lastCheckInDate: today,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not update check-in.", "error");
        return;
      }

      const clientsResponse = await fetch("/api/clients");
      const clientsData = await clientsResponse.json();
      const refreshedClients = clientsData.clients || [];

      setClients(refreshedClients);
      refreshSelectedClient(refreshedClients);
      notify(`${client.name} checked in today.`, "success");
    } catch (error) {
      console.error(error);
      notify("Could not update check-in.", "error");
    } finally {
      setSavingCheckInClientId("");
    }
  };

  const openCheckInQuestionnaire = (client: Client) => {
    setCheckInFormClient(client);
    setCheckInForm({
      bodyWeight: "",
      sleepQuality: "",
      energy: "",
      mood: "",
      stress: "",
      soreness: "",
      nutritionNotes: "",
      trainingNotes: "",
      wins: "",
      problemsPain: "",
    });
  };

  const submitCheckInQuestionnaire = async () => {
    if (!checkInFormClient) return;

    const today = dateToInputValue(new Date());

    setSavingCheckInClientId(checkInFormClient.id);

    try {
      const checkInResponse = await fetch("/api/checkIns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: checkInFormClient.clientCode || checkInFormClient.id,
          clientRecordId: checkInFormClient.id,
          submittedDate: today,
          status: "Submitted",
          coachReviewed: false,
          ...checkInForm,
        }),
      });
      const checkInData = await checkInResponse.json();

      if (!checkInResponse.ok || !checkInData.success) {
        console.error(checkInData);
        notify("Could not submit check-in.", "error");
        return;
      }

      const response = await fetch("/api/updateClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: checkInFormClient.id,
          lastCheckInDate: today,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Check-in saved, but client date did not update.", "error");
      }

      const clientsResponse = await fetch("/api/clients");
      const clientsData = await clientsResponse.json();
      const refreshedClients = clientsData.clients || [];

      setClients(refreshedClients);
      refreshSelectedClient(refreshedClients);
      setCheckInFormClient(null);
      notify("Check-in questionnaire submitted.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not submit check-in.", "error");
    } finally {
      setSavingCheckInClientId("");
    }
  };

  const calendarDates =
    calendarView === "Week"
      ? Array.from({ length: 7 }, (_, index) =>
          addDays(getMondayStart(calendarAnchorDate), index)
        )
      : getMonthDates(calendarAnchorDate);
  const clientWeekStripDates = Array.from({ length: 7 }, (_, index) =>
    addDays(clientWeekStartDate, index)
  );
  const clientMonthCalendarDates = getMonthCalendarDates(clientMonthAnchorDate);
  const coachMonthCalendarDates = getMonthCalendarDates(calendarAnchorDate);
  const clientWeekRangeLabel = `${localizedCalendarLabel(
    clientWeekStartDate
  )} - ${localizedCalendarLabel(addDays(clientWeekStartDate, 6))}`;

  const calendarRangeLabel = formatCalendarRangeLabel(
    calendarView,
    calendarAnchorDate,
    clientLocale
  );

  const moveCalendarRange = (direction: -1 | 1) => {
    if (isClientPortal && clientCalendarStyle === "Week") {
      const nextWeekStart = addDays(clientWeekStartDate, direction * 7);

      setClientWeekStartDate(nextWeekStart);
      setCalendarAnchorDate(nextWeekStart);
      return;
    }

    if (isClientPortal && clientCalendarStyle === "Month") {
      moveClientMonth(direction);
      return;
    }

    if (isClientPortal && clientCalendarStyle === "Full") {
      const nextMonth = addMonths(calendarAnchorDate, direction);

      setCalendarAnchorDate(nextMonth);
      setClientMonthAnchorDate(nextMonth);
      setClientWeekStartDate(getMondayStart(nextMonth));
      return;
    }

    if (calendarView === "Week") {
      setCalendarAnchorDate(addDays(calendarAnchorDate, direction * 7));
      return;
    }

    setCalendarAnchorDate(addMonths(calendarAnchorDate, direction));
  };

  const selectClientCalendarDate = (date: string, syncWeek = true) => {
    setCalendarAnchorDate(date);
    if (syncWeek) {
      setClientWeekStartDate(getMondayStart(date));
    }
    setClientMonthAnchorDate(date);
  };

  const jumpClientCalendarToToday = () => {
    const today = dateToInputValue(new Date());

    selectClientCalendarDate(today);
  };

  const openAssignmentHubFromCalendar = (
    type: "Program" | "Check-in" | "Questionnaire" | "Physical Test" = "Program",
    date: string = calendarAnchorDate
  ) => {
    if (selectedClient) {
      setAssignmentClientId(selectedClient.id);
    }

    setAssignmentType(type);
    if (type === "Program") {
      setAssignmentTemplateId("");
    } else if (type === "Physical Test") {
      const activeTests = savedTestTemplates.filter(
        (test) => test.status !== "Archived"
      );

      setAssignmentTemplateId(
        activeTests.length === 1 ? activeTests[0].testTemplateId : ""
      );
    } else {
      const formsForType = savedFormTemplates.filter((form) => {
        const formType = form.type.toLowerCase();
        return (
          form.status !== "Archived" &&
          (type === "Check-in"
            ? formType.includes("check") || formType.includes("readiness")
            : true)
        );
      });

      setAssignmentTemplateId(formsForType.length === 1 ? formsForType[0].formId : "");
    }
    setAssignmentDueDate(date);
    setAssignStartDate(date);
    setSelectedWorkout(null);
    setShowCalendarActionMenu(false);
    setShowAssignmentDrawer(true);
  };

  const closeAssignmentDrawer = () => {
    setShowAssignmentDrawer(false);
    setAssignableWorkouts([]);
  };

  const moveClientMonth = (direction: -1 | 1) => {
    setClientMonthAnchorDate((current) => addMonths(current, direction));
  };

  function getWorkoutsForDate(dateString: string) {
    return workouts.filter(
      (workout) => normalizeDate(String(workout.scheduledDate)) === dateString
    );
  }

  function getAssignmentsForDate(dateString: string) {
    return contentAssignments.filter(
      (assignment) =>
        normalizeDate(String(assignment.dueDate || assignment.assignedDate)) ===
        dateString
    );
  }

  function getCalendarItemCountForDate(dateString: string) {
    return getWorkoutsForDate(dateString).length + getAssignmentsForDate(dateString).length;
  }

  const handleOpenContentAssignment = async (assignment: ContentAssignment) => {
    if (!isClientPortal && !window.confirm("Open this assigned item?")) {
      return;
    }

    const assignmentType = assignment.assignmentType.toLowerCase();
    const isTest = assignmentType.includes("test");
    const availableForms: SavedFormTemplate[] =
      !isTest && savedFormTemplates.length === 0
        ? await loadFormTemplates()
        : savedFormTemplates;
    const availableTests: SavedTestTemplate[] =
      isTest && savedTestTemplates.length === 0
        ? await loadTestTemplates()
        : savedTestTemplates;
    const template = isTest
      ? availableTests.find(
          (test) =>
            test.testTemplateId === assignment.templateId ||
            test.name === assignment.templateName
        )
      : availableForms.find(
          (form) =>
            form.formId === assignment.templateId || form.name === assignment.templateName
        );

    if (!template) {
      notify("Could not find the saved template for this assignment.", "error");
      return;
    }

    setActiveContentAssignment(assignment);
    setContentAssignmentAnswers({});
    setContentAssignmentComment("");
  };

  const activeAssignmentIsTest =
    !!activeContentAssignment &&
    activeContentAssignment.assignmentType.toLowerCase().includes("test");
  const activeFormTemplate =
    activeContentAssignment && !activeAssignmentIsTest
      ? savedFormTemplates.find(
          (form) =>
            form.formId === activeContentAssignment.templateId ||
            form.name === activeContentAssignment.templateName
        )
      : undefined;
  const activeTestTemplate =
    activeContentAssignment && activeAssignmentIsTest
      ? savedTestTemplates.find(
          (test) =>
            test.testTemplateId === activeContentAssignment.templateId ||
            test.name === activeContentAssignment.templateName
        )
      : undefined;

  const submitActiveContentAssignment = async () => {
    if (!activeContentAssignment || !selectedClient) return;

    const clientComment = contentAssignmentComment.trim();
    const responses = activeAssignmentIsTest
      ? [
          ...(activeTestTemplate?.items || []).map((item) => ({
          itemId: item.testItemId,
          label: localizeText(item.testName, item.testNameCn),
          unit: item.unit,
          value: contentAssignmentAnswers[item.testItemId] || "",
          notes: contentAssignmentAnswers[`${item.testItemId}__notes`] || "",
          })),
          ...(clientComment
            ? [
                {
                  itemId: "__client_comment",
                  label: "Client Comment",
                  unit: "",
                  value: clientComment,
                  notes: "",
                },
              ]
            : []),
        ]
      : [
          ...(activeFormTemplate?.questions || []).map((question) => ({
          questionId: question.questionId,
          label: localizeText(question.label, question.labelCn),
          value: contentAssignmentAnswers[question.questionId] || "",
          })),
          ...(clientComment
            ? [
                {
                  questionId: "__client_comment",
                  label: "Client Comment",
                  value: clientComment,
                },
              ]
            : []),
        ];

    const missingRequired = activeAssignmentIsTest
      ? (activeTestTemplate?.items || []).filter(
          (item) => !contentAssignmentAnswers[item.testItemId]
        )
      : (activeFormTemplate?.questions || []).filter(
          (question) =>
            question.required && !contentAssignmentAnswers[question.questionId]
        );

    if (missingRequired.length > 0) {
      notify(
        activeAssignmentIsTest
          ? "Please enter a result for each test item."
          : "Please answer all required questions.",
        "error"
      );
      return;
    }

    setSubmittingContentAssignment(true);

    try {
      const response = await fetch("/api/submitContentResponse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentType: activeContentAssignment.assignmentType,
          assignmentId: activeContentAssignment.assignmentId,
          assignmentRecordId: activeContentAssignment.recordId,
          templateId: activeContentAssignment.templateId,
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          responses,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(data.message || data.error || "Could not submit assignment.", "error");
        return;
      }

      notify("Assignment submitted.", "success");
      setContentAssignments((current) =>
        current.map((assignment) =>
          assignment.recordId === activeContentAssignment.recordId
            ? { ...assignment, status: "Completed" }
            : assignment
        )
      );
      void loadContentAssignments(selectedClient);
      void loadContentResponses(selectedClient);
      setActiveContentAssignment(null);
      setContentAssignmentAnswers({});
      setContentAssignmentComment("");
    } catch (error) {
      console.error(error);
      notify("Could not submit assignment.", "error");
    } finally {
      setSubmittingContentAssignment(false);
    }
  };

  const todayValue = dateToInputValue(new Date());
  const selectedCalendarDateWorkouts = getWorkoutsForDate(calendarAnchorDate);
  const selectedCalendarDateAssignments = getAssignmentsForDate(calendarAnchorDate);
  const selectedCalendarDateItemCount =
    selectedCalendarDateWorkouts.length + selectedCalendarDateAssignments.length;
  const clientPortalUpcomingWorkouts = workouts
    .filter(
      (workout) =>
        normalizeDate(String(workout.scheduledDate)) >= todayValue &&
        normalizeTaskStatus(workout.completionStatus) !== "Completed"
    )
    .sort(
      (a, b) =>
        normalizeDate(String(a.scheduledDate)).localeCompare(
          normalizeDate(String(b.scheduledDate))
        ) || Number(a.week) - Number(b.week) || Number(a.day) - Number(b.day)
    )
    .slice(0, 5);
  const clientPortalUpcomingAssignments = contentAssignments
    .filter(
      (assignment) =>
        normalizeDate(String(assignment.dueDate || assignment.assignedDate)) >=
          todayValue &&
        normalizeTaskStatus(assignment.status) !== "Completed"
    )
    .sort((a, b) =>
      normalizeDate(String(a.dueDate || a.assignedDate)).localeCompare(
        normalizeDate(String(b.dueDate || b.assignedDate))
      )
    );
  const clientPortalUpcomingTasks = [
    ...clientPortalUpcomingWorkouts.map((workout) => ({
      type: "workout" as const,
      id: workout.id,
      date: normalizeDate(String(workout.scheduledDate)),
      title: localizedWorkoutName(workout),
      meta: `${t("week")} ${workout.week} - ${t("day")} ${workout.day}`,
      status: getDisplayTaskStatus(workout.completionStatus, workout.scheduledDate),
      open: () => openWorkout(workout),
    })),
    ...clientPortalUpcomingAssignments.map((assignment) => ({
      type: "assignment" as const,
      id: assignment.recordId,
      date: normalizeDate(String(assignment.dueDate || assignment.assignedDate)),
      title: getAssignmentDisplayName(assignment),
      meta: assignment.assignmentType || "Questionnaire",
      status: getDisplayTaskStatus(
        assignment.status,
        assignment.dueDate || assignment.assignedDate
      ),
      open: () => handleOpenContentAssignment(assignment),
    })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const allSelectedClientTasks = [
    ...workouts.map((workout) => ({
      type: "workout" as const,
      id: workout.id,
      date: normalizeDate(String(workout.scheduledDate)),
      title: localizedWorkoutName(workout),
      meta: `${t("week")} ${workout.week} - ${t("day")} ${workout.day}`,
      status: getDisplayTaskStatus(workout.completionStatus, workout.scheduledDate),
      open: () => openWorkout(workout),
    })),
    ...contentAssignments.map((assignment) => ({
      type: "assignment" as const,
      id: assignment.recordId,
      date: normalizeDate(String(assignment.dueDate || assignment.assignedDate)),
      title: getAssignmentDisplayName(assignment),
      meta: assignment.assignmentType || "Questionnaire",
      status: getDisplayTaskStatus(
        assignment.status,
        assignment.dueDate || assignment.assignedDate
      ),
      open: () => handleOpenContentAssignment(assignment),
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const dueTodayTasks = allSelectedClientTasks.filter(
    (task) => task.date === todayValue && task.status === "Scheduled"
  );
  const completedTodayTasks = allSelectedClientTasks.filter(
    (task) => task.date === todayValue && task.status === "Completed"
  );
  const localizeTaskStatus = (status: SimpleTaskStatus) => {
    if (status === "Completed") return t("completed");
    if (status === "Missed") return t("missed");
    return t("scheduled");
  };
  const jumpToTaskDate = (date: string) => {
    if (!date) return;

    setCalendarAnchorDate(date);
    setClientTab("Training");
  };

  const groupedContentResponses = Object.values(
    contentResponses.reduce<Record<string, ContentResponseGroup>>((groups, response) => {
      const key =
        response.assignmentRecordId ||
        response.assignmentId ||
        `${response.templateId}-${response.submittedAt}`;
      const matchingAssignment = contentAssignments.find(
        (assignment) =>
          assignment.recordId === response.assignmentRecordId ||
          assignment.assignmentId === response.assignmentId ||
          assignment.templateId === response.templateId
      );
      const templateTitle = matchingAssignment
        ? getAssignmentDisplayName(matchingAssignment)
        : response.responseType;

      if (!groups[key]) {
        groups[key] = {
          key,
          responseType: response.responseType,
          title: templateTitle,
          submittedAt: response.submittedAt,
          answers: [],
        };
      }

      groups[key].answers.push(response);

      if (response.submittedAt > groups[key].submittedAt) {
        groups[key].submittedAt = response.submittedAt;
      }

      return groups;
    }, {})
  ).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const recentQuestionnaireResponses = groupedContentResponses
    .filter((submission) =>
      submission.responseType.toLowerCase().includes("question")
    )
    .slice(0, 4);
  const recentTestResponses = groupedContentResponses
    .filter((submission) => submission.responseType.toLowerCase().includes("test"))
    .slice(0, 4);
  const recentWorkoutSubmissions = workouts
    .filter((workout) => {
      const status = normalizeTaskStatus(workout.completionStatus);
      return (
        status === "Completed" ||
        String(workout.workoutLogs || "").trim()
      );
    })
    .sort((a, b) =>
      normalizeDate(String(b.scheduledDate)).localeCompare(
        normalizeDate(String(a.scheduledDate))
      )
    )
    .slice(0, 4);

  const getContentResponseLabel = (response: ContentResponse) => {
    if (response.label) return response.label;

    const matchingTest = savedTestTemplates.find(
      (test) => test.testTemplateId === response.templateId
    );
    const matchingItem = matchingTest?.items.find(
      (item) => item.testItemId === response.itemId
    );

    if (matchingItem) {
      return localizeText(matchingItem.testName, matchingItem.testNameCn);
    }

    return response.responseType === "Physical Test" ? "Test Result" : "Answer";
  };

  const questionnaireScaleAnswers = contentResponses
    .filter((response) =>
      response.responseType.toLowerCase().includes("question")
    )
    .map((response) => ({
      ...response,
      numericAnswer: Number(response.answer),
    }))
    .filter((response) => Number.isFinite(response.numericAnswer))
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

  const readinessTrendPoints = questionnaireScaleAnswers.slice(-8);
  const latestReadinessScore =
    readinessTrendPoints[readinessTrendPoints.length - 1]?.numericAnswer || 0;
  const averageReadinessScore =
    readinessTrendPoints.length > 0
      ? Math.round(
          (readinessTrendPoints.reduce(
            (sum, point) => sum + point.numericAnswer,
            0
          ) /
            readinessTrendPoints.length) *
            10
        ) / 10
      : 0;
  const completedWorkoutCount = workouts.filter(
    (workout) => normalizeTaskStatus(workout.completionStatus) === "Completed"
  ).length;
  const completedAssignmentCount = contentAssignments.filter(
    (assignment) => normalizeTaskStatus(assignment.status) === "Completed"
  ).length;
  const totalTaskCount = workouts.length + contentAssignments.length;
  const completedTaskCount = completedWorkoutCount + completedAssignmentCount;
  const completionRate =
    totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0;
  const needsAttentionItems = [
    ...workouts.map((workout) => ({
      key: `workout-${workout.id}`,
      type: "Workout",
      title: localizedWorkoutName(workout),
      date: normalizeDate(String(workout.scheduledDate)),
      status: getDisplayTaskStatus(workout.completionStatus, workout.scheduledDate),
      open: () => openWorkout(workout),
    })),
    ...contentAssignments.map((assignment) => ({
      key: `assignment-${assignment.recordId}`,
      type: assignment.assignmentType || "Task",
      title: getAssignmentDisplayName(assignment),
      date: normalizeDate(String(assignment.dueDate || assignment.assignedDate)),
      status: getDisplayTaskStatus(
        assignment.status,
        assignment.dueDate || assignment.assignedDate
      ),
      open: () => handleOpenContentAssignment(assignment),
    })),
  ]
    .filter((item) => item.status === "Missed")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const progressExerciseOptions = Array.from(
    new Set([
      ...libraryExercises.map((exercise) => exercise.exerciseName).filter(Boolean),
      ...workoutHistoryLogs.map((log) => log.exerciseName).filter(Boolean),
    ])
  )
    .filter((name) =>
      name.toLowerCase().includes(progressSearch.toLowerCase())
    )
    .sort((a, b) => a.localeCompare(b));

  const selectedProgressName =
    selectedProgressExercise ||
    progressExerciseOptions[0] ||
    workoutHistoryLogs[0]?.exerciseName ||
    "";
  const visibleProgressExerciseOptions =
    selectedProgressName &&
    !progressExerciseOptions.includes(selectedProgressName)
      ? [selectedProgressName, ...progressExerciseOptions]
      : progressExerciseOptions;
  const getLocalizedProgressExerciseName = (name: string) => {
    const exercise = libraryExercises.find(
      (item) => item.exerciseName.toLowerCase() === name.toLowerCase()
    );

    return exercise ? localizedExerciseName(exercise) : name;
  };

  const progressHistoryPoints = workoutHistoryLogs
    .filter((log) =>
      log.exerciseName
        .toLowerCase()
        .startsWith(selectedProgressName.toLowerCase())
    )
    .map((log) => {
      const weight = Number(log.actualWeight);
      const distance = Number(log.actualDistance);
      const time = Number(log.actualTime);
      const value = weight || distance || time || 0;
      const unit = weight ? "kg" : distance ? "m" : time ? "sec" : "";

      return {
        date: normalizeDate(log.date),
        value,
        unit,
      };
    })
    .filter((point) => point.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-8);

  const progressMaxValue = Math.max(
    1,
    ...progressHistoryPoints.map((point) => point.value)
  );
  const progressUnit = progressHistoryPoints.find((point) => point.unit)?.unit || "";

  const openWorkoutExerciseFromGlance = (index: number) => {
    if (isClientPortal) {
      setWorkoutLoggingStarted(true);
    }

    window.setTimeout(() => {
      document.getElementById(`workout-exercise-${index}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  if (isClientInvite) {
    return (
      <div className="invitePage">
        <div className="toastStack">
          {toasts.map((toast) => (
            <div className={`toast toast-${toast.type}`} key={toast.id}>
              {toast.message}
            </div>
          ))}
        </div>

        <main className="inviteShell">
          <div className="inviteBrand">
            <div>
              <div className="brandWordmark">
                N<span className="brandSlashO">O</span> LIMIT
              </div>
              <div className="brandTagline">INSPIRED BY MOVEMENT.</div>
            </div>
            <span>{publicInvitePackage}</span>
          </div>

          {inviteSubmitted ? (
            <section className="inviteSuccess">
              <h1>You're In</h1>
              <p>
                Your intake form has been sent to Kent. He will review your
                details and follow up with the next step.
              </p>
            </section>
          ) : (
            <section className="inviteCard">
              <div className="inviteIntro">
                <h1>Client Intake</h1>
                <p>
                  Share the basics so your training profile can be set up before
                  your first program is assigned.
                </p>
              </div>

              <div className="inviteFormGrid">
                <label>
                  <span>Full Name</span>
                  <input
                    value={inviteForm.name}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, name: e.target.value })
                    }
                    placeholder="Your name"
                  />
                </label>

                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, email: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </label>

                <label>
                  <span>Phone / WeChat</span>
                  <input
                    value={inviteForm.phone}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, phone: e.target.value })
                    }
                    placeholder="Best contact"
                  />
                </label>

                <label>
                  <span>Main Goal</span>
                  <input
                    value={inviteForm.goals}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, goals: e.target.value })
                    }
                    placeholder="Strength, climbing, fat loss..."
                  />
                </label>

                <label className="inviteWideField">
                  <span>Anything Kent should know?</span>
                  <textarea
                    value={inviteForm.notes}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, notes: e.target.value })
                    }
                    placeholder="Training history, injuries, schedule, equipment..."
                  />
                </label>
              </div>

              <div className="inviteActions">
                <button
                  className="goldButton"
                  onClick={submitInviteForm}
                  disabled={submittingInvite}
                >
                  {submittingInvite ? "Submitting..." : "Submit Intake"}
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  if (isClientPortal && !selectedClient) {
    const portalMessage = !clientPortalCode
      ? "This client portal link is missing a client code."
      : loading
      ? "Loading your training portal..."
      : "We could not find this client portal.";

    return (
      <div className="clientPortalShell">
        <div className="toastStack">
          {toasts.map((toast) => (
            <div className={`toast toast-${toast.type}`} key={toast.id}>
              {toast.message}
            </div>
          ))}
        </div>

        <section className="clientPortalEmpty">
          <div className="brandWordmark">
            N<span className="brandSlashO">O</span> LIMIT
          </div>
          <h1>Client Portal</h1>
          <p>{portalMessage}</p>
        </section>
      </div>
    );
  }

  return (
    <div
      className={`app ${
        selectedClient ? "clientLayerActive" : "coachLayerActive"
      } ${isClientPortal ? "clientPortalApp" : ""} ${
        useChineseClientText ? "chineseLocaleApp" : ""
      }`}
    >
      <aside className="sidebar">
        <div className="brand">
          <div className="brandWordmark">
            N<span className="brandSlashO">O</span> LIMIT
          </div>
          <div className="brandTagline">BUILT FOR TRAINING.</div>
        </div>

        <nav>
          {menuItems.map((item) => {
            const NavIcon = item.icon;

            return (
              <button
                key={item.name}
                className={`navItem ${activePage === item.name ? "active" : ""}`}
                onClick={() => {
                  setSelectedClient(null);
                  setSelectedWorkout(null);
                  setWorkoutDetails([]);
                  setSetLogs([]);
                  setSavedExerciseDraftIds([]);
                  setActivePage(item.name);

                  if (item.name === "Library" || item.name === "Workouts") {
                    loadExerciseLibrary();
                  }

                  if (item.name === "Workouts") {
                    loadPrograms();
                  }

                  if (item.name === "Orders") {
                    loadProductOrders();
                    loadPrograms();
                    loadFormTemplates();
                  }
                }}
              >
                <span className="navItemLabel">
                  <NavIcon size={20} strokeWidth={2.2} />
                  <span>{item.label}</span>
                </span>
                <span className="badge">{item.count}</span>
              </button>
            );
          })}
        </nav>

        <div className="coachBox">
          <div className="avatar monogramAvatar">
            <span className="monogramMark">
              N<span>L</span>
            </span>
          </div>
          <div>
            <strong>{coachScope === "All Coaches" ? "Admin View" : coachScope}</strong>
            <p>{appMode}</p>
          </div>
        </div>

        {!isClientPortal && (
          <label className="coachScopeControl">
            <span>View as</span>
            <select
              value={coachScope}
              onChange={(event) => setCoachScope(event.target.value)}
            >
              <option>All Coaches</option>
              {activeCoaches.map((coach) => (
                <option key={coach.recordId || coach.coachId} value={coach.name}>
                  {coach.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </aside>

      <main className="main">
        <div className="toastStack">
          {toasts.map((toast) => (
            <div className={`toast toast-${toast.type}`} key={toast.id}>
              {toast.message}
            </div>
          ))}
        </div>

        {!selectedClient && (
          <>
            <header className="topbar">
              <div>
                <h1>{activePage}</h1>
                <p>NoLimit Training System</p>
              </div>

              {activePage === "Clients" && (
                <div className="topbarActions">
                  <button
                    className="goldButton"
                    onClick={openNewClientForm}
                  >
                    + Add Client
                  </button>
                  <button
                    className="outlineButton"
                    onClick={() => setShowInviteModal(true)}
                  >
                    Invite Client
                  </button>
                </div>
              )}

              {activePage === "Coaches" && canManageCoaches && (
                <div className="topbarActions">
                  <button className="goldButton" onClick={openNewCoachForm}>
                    + Add Coach
                  </button>
                </div>
              )}

              {activePage === "Orders" && (
                <div className="topbarActions">
                  <button className="outlineButton" onClick={loadProductOrders}>
                    Reload Orders
                  </button>
                </div>
              )}

              {activePage === "Workouts" && workoutPageTab === "Program Builder" && (
                <button className="goldButton" onClick={saveFullProgram}>
                  {savingTemplate ? "Saving..." : "Save Full Program"}
                </button>
              )}
            </header>

            {activePage === "Clients" && (
              <>
                <section className="clientCommandCenter">
                  <aside className="clientBucketsPanel">
                    <div className="clientBucketsHeader">
                      <h3>Clients</h3>
                      <button className="iconTextButton" onClick={loadClients}>
                        Refresh
                      </button>
                    </div>

                    {clientBuckets.map((bucket) => (
                      <button
                        key={bucket.name}
                        className={
                          clientBucket === bucket.name
                            ? "clientBucket activeClientBucket"
                            : "clientBucket"
                        }
                        onClick={() => {
                          setClientBucket(bucket.name);
                          setClientStatusFilter("All");
                        }}
                      >
                        <span>{bucket.name}</span>
                        <strong>{bucket.count}</strong>
                      </button>
                    ))}

                    <div className="inviteLinkBox">
                      <span>Invite Link</span>
                      <button
                        className="outlineButton"
                        onClick={() =>
                          copyToClipboard(coachInviteLink, "Invite link")
                        }
                      >
                        Copy Invite
                      </button>
                    </div>
                  </aside>

                  <section className="clientTableWorkspace">
                    <div className="clientToolbar">
                      <input
                        placeholder="Search client"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                      />

                      <select
                        value={clientStatusFilter}
                        onChange={(e) => setClientStatusFilter(e.target.value)}
                      >
                        <option value="All">All Statuses</option>
                        {clientStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      <select
                        value={coachScope}
                        onChange={(event) => setCoachScope(event.target.value)}
                      >
                        <option>All Coaches</option>
                        {activeCoaches.map((coach) => (
                          <option
                            key={coach.recordId || coach.coachId}
                            value={coach.name}
                          >
                            {coach.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {loading && <p>Loading clients...</p>}

                    <section className="tableCard clientTableCard">
                      <div className="tableHeader clientTableHeader">
                        <span></span>
                        <span>Name</span>
                        <span>Contact</span>
                        <span>Program</span>
                        <span>Coach</span>
                        <span>Last Activity</span>
                        <span>Last 7d</span>
                        <span>Attention</span>
                        <span>Status</span>
                      </div>

                      {!loading && filteredClients.length === 0 && (
                        <p className="emptyTableMessage">
                          No clients match your filters.
                        </p>
                      )}

                      {filteredClients.map((client) => {
                        const attentionItems = [
                          clientNeedsProgramming(client) ? "Needs program" : "",
                          clientNeedsContact(client) ? "Needs contact" : "",
                        ].filter(Boolean);

                        return (
                          <div
                            className="clientRow clickableRow clientTableRow"
                            key={client.id}
                            onClick={() => {
                              setSelectedClient(client);
                              setClientTab("Home");
                            }}
                          >
                            <input
                              type="checkbox"
                              onClick={(event) => event.stopPropagation()}
                            />

                            <div className="clientName">
                              <div className="clientAvatar">{client.initials}</div>
                              <div>
                                <strong>{client.name}</strong>
                              </div>
                            </div>

                            <span className="clientContactCell">
                              {client.email || client.phone || "--"}
                            </span>
                            <span>{client.program}</span>
                            <span>{getCoachDisplayName(client.coach || client.primaryCoach || "--")}</span>
                            <span>{client.activity}</span>
                            <span>{client.training}</span>
                            <span className="attentionCell">
                              {attentionItems.length === 0
                                ? "--"
                                : attentionItems.map((item) => (
                                    <span className="attentionChip" key={item}>
                                      {item}
                                    </span>
                                  ))}
                            </span>
                            <span
                              className={
                                client.status === "Active"
                                  ? "status activeStatus"
                                  : "status holdStatus"
                              }
                            >
                              {client.status}
                            </span>
                          </div>
                        );
                      })}
                    </section>
                  </section>
                </section>
              </>
            )}

            {activePage === "Coaches" && canManageCoaches && (
              <section className="coachManagementPage">
                <div className="coachManagementSummary">
                  <div>
                    <span>Team</span>
                    <strong>{allCoaches.length}</strong>
                    <small>Total coaches</small>
                  </div>
                  <div>
                    <span>Active</span>
                    <strong>{activeCoaches.length}</strong>
                    <small>Assignable now</small>
                  </div>
                  <div>
                    <span>Admins</span>
                    <strong>
                      {
                        allCoaches.filter(
                          (coach) => coach.role?.toLowerCase() === "admin"
                        ).length
                      }
                    </strong>
                    <small>Can manage team</small>
                  </div>
                </div>

                <section className="tableCard coachTableCard">
                  <div className="tableHeader coachTableHeader">
                    <span>Coach</span>
                    <span>Role</span>
                    <span>Status</span>
                    <span>Assigned Clients</span>
                    <span>Contact</span>
                    <span>Actions</span>
                  </div>

                  {allCoaches.map((coach) => {
                    const assignedClients = clients.filter((client) =>
                      clientBelongsToCoach(client, coach)
                    );

                    return (
                      <div
                        className="clientRow coachTableRow"
                        key={coach.recordId || coach.coachId || coach.name}
                      >
                        <div className="clientName">
                          <div className="clientAvatar">
                            {coach.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <strong>{coach.name}</strong>
                            <small>{coach.coachId || "Coach record"}</small>
                          </div>
                        </div>
                        <span>{coach.role || "Coach"}</span>
                        <span
                          className={
                            coach.status === "Active"
                              ? "status activeStatus"
                              : "status holdStatus"
                          }
                        >
                          {coach.status || "Active"}
                        </span>
                        <span>{assignedClients.length}</span>
                        <span>{coach.email || coach.phoneWechat || "--"}</span>
                        <div className="coachRowActions">
                          <button
                            className="outlineButton"
                            onClick={() => openEditCoachForm(coach)}
                          >
                            Edit
                          </button>
                          <button
                            className="outlineButton"
                            disabled={savingCoach}
                            onClick={() =>
                              updateCoachStatus(
                                coach,
                                coach.status === "Inactive" ? "Active" : "Inactive"
                              )
                            }
                          >
                            {coach.status === "Inactive" ? "Activate" : "Deactivate"}
                          </button>
                          <button
                            className="outlineButton"
                            onClick={() => {
                              setCoachScope(coach.name);
                              setActivePage("Clients");
                            }}
                          >
                            View Roster
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </section>
              </section>
            )}

            {activePage === "Orders" && (
              <section className="ordersWorkspace">
                <div className="ordersSummary">
                  <div>
                    <span>Total Orders</span>
                    <strong>{visibleProductOrders.length}</strong>
                  </div>
                  <div>
                    <span>In Pipeline</span>
                    <strong>{openOrdersCount}</strong>
                  </div>
                  <div>
                    <span>Ready to Load</span>
                    <strong>{readyOrdersCount}</strong>
                  </div>
                </div>

                <div className="ordersToolbar">
                  <input
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Search orders, clients, or products"
                  />
                  <button
                    className="goldButton"
                    onClick={() => setShowManualOrderForm((current) => !current)}
                  >
                    {showManualOrderForm ? "Close Order Form" : "+ Manual Order"}
                  </button>
                  <button className="outlineButton" onClick={loadProductOrders}>
                    Reload
                  </button>
                </div>

                {showManualOrderForm && (
                  <section className="manualOrderPanel">
                    <div className="manualOrderHeader">
                      <div>
                        <span>External Sale</span>
                        <h3>Create Manual Order</h3>
                        <p>
                          Use this after a WeChat QR, transfer, or external payment.
                          The order will enter the onboarding pipeline.
                        </p>
                      </div>
                      <button
                        className="outlineButton"
                        onClick={resetManualOrderForm}
                        disabled={savingManualOrder}
                      >
                        Clear
                      </button>
                    </div>

                    <div className="manualOrderGrid">
                      <label>
                        <span>Client Name</span>
                        <input
                          value={manualOrder.clientName}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              clientName: event.target.value,
                            })
                          }
                          placeholder="Client name"
                        />
                      </label>

                      <label>
                        <span>Phone / WeChat</span>
                        <input
                          value={manualOrder.phone}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              phone: event.target.value,
                            })
                          }
                          placeholder="wechat_id"
                        />
                      </label>

                      <label>
                        <span>Email</span>
                        <input
                          value={manualOrder.email}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              email: event.target.value,
                            })
                          }
                          placeholder="Optional"
                        />
                      </label>

                      <label>
                        <span>Coach</span>
                        <select
                          value={manualOrder.assignedCoach}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              assignedCoach: event.target.value,
                            })
                          }
                        >
                          <option value="">Unassigned</option>
                          {activeCoaches.map((coach) => (
                            <option key={coach.recordId || coach.name} value={coach.name}>
                              {coach.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>Saved Program</span>
                        <select
                          value={manualOrder.programId}
                          onChange={(event) =>
                            selectManualOrderProgram(event.target.value)
                          }
                        >
                          <option value="">Manual product only</option>
                          {programs
                            .filter((program) => program.status !== "Archived")
                            .map((program) => (
                              <option key={program.programId} value={program.programId}>
                                {program.programName}
                              </option>
                            ))}
                        </select>
                      </label>

                      <label>
                        <span>Product Name</span>
                        <input
                          value={manualOrder.productName}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              productName: event.target.value,
                            })
                          }
                          placeholder="Program or product name"
                        />
                      </label>

                      <label>
                        <span>Product Type</span>
                        <select
                          value={manualOrder.productType}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              productType: event.target.value,
                            })
                          }
                        >
                          <option>Digital Program</option>
                          <option>Online Coaching</option>
                          <option>In-Person Training</option>
                          <option>Internal Coaching Template</option>
                        </select>
                      </label>

                      <label>
                        <span>Payment</span>
                        <select
                          value={manualOrder.paymentStatus}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              paymentStatus: event.target.value,
                            })
                          }
                        >
                          <option>Paid</option>
                          <option>Pending</option>
                          <option>Comped</option>
                          <option>Refunded</option>
                        </select>
                      </label>

                      <label>
                        <span>Amount</span>
                        <input
                          value={manualOrder.amount}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              amount: event.target.value,
                            })
                          }
                          placeholder="0"
                        />
                      </label>

                      <label>
                        <span>Currency</span>
                        <select
                          value={manualOrder.currency}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              currency: event.target.value,
                            })
                          }
                        >
                          <option>CNY</option>
                          <option>USD</option>
                          <option>CAD</option>
                        </select>
                      </label>

                      <label>
                        <span>Payment Method</span>
                        <select
                          value={manualOrder.paymentProvider}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              paymentProvider: event.target.value,
                            })
                          }
                        >
                          <option>WeChat QR</option>
                          <option>Alipay QR</option>
                          <option>Bank Transfer</option>
                          <option>Cash</option>
                          <option>External Payment</option>
                        </select>
                      </label>

                      <label>
                        <span>Payment Reference</span>
                        <input
                          value={manualOrder.paymentReference}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              paymentReference: event.target.value,
                            })
                          }
                          placeholder="Receipt, screenshot, or note"
                        />
                      </label>

                      <label>
                        <span>Purchase Date</span>
                        <input
                          type="date"
                          value={manualOrder.purchasedAt}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              purchasedAt: event.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        <span>Program Start</span>
                        <input
                          type="date"
                          value={manualOrder.accessStartDate}
                          onChange={(event) => {
                            const accessLength = Number(
                              selectedManualOrderProgram?.accessLengthDays || 0
                            );
                            setManualOrder({
                              ...manualOrder,
                              accessStartDate: event.target.value,
                              accessEndDate:
                                accessLength > 0
                                  ? addDays(
                                      event.target.value,
                                      Math.max(0, accessLength - 1)
                                    )
                                  : manualOrder.accessEndDate,
                            });
                          }}
                        />
                      </label>

                      <label>
                        <span>Access End</span>
                        <input
                          type="date"
                          value={manualOrder.accessEndDate}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              accessEndDate: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>

                    <label className="manualOrderNotes">
                      <span>Internal Notes</span>
                      <textarea
                        value={manualOrder.notes}
                        onChange={(event) =>
                          setManualOrder({
                            ...manualOrder,
                            notes: event.target.value,
                          })
                        }
                        placeholder="Example: Paid by WeChat QR. Intake should be sent after payment confirmation."
                      />
                    </label>

                    <div className="manualOrderActions">
                      <button
                        className="goldButton"
                        onClick={createManualProductOrder}
                        disabled={savingManualOrder}
                      >
                        {savingManualOrder ? "Creating..." : "Create Order"}
                      </button>
                    </div>
                  </section>
                )}

                <div className="ordersGrid">
                  {visibleProductOrders.length === 0 && (
                    <section className="orderCard emptyOrderCard">
                      <h3>No product orders found.</h3>
                      <p>
                        New store purchases and manual product orders will appear here.
                      </p>
                    </section>
                  )}

                  {visibleProductOrders.map((order) => {
                    const matchedClient = getOrderClient(order);
                    const matchedProgram = getOrderProgram(order);
                    const intakeTemplate = getOrderIntakeTemplate(order);
                    const processing = orderProcessingId === order.recordId;
                    const pipelineStatus = getOrderPipelineStatus(order);
                    const pipelineIndex = getOrderStageIndex(order);

                    return (
                      <section
                        className="orderCard"
                        key={order.recordId || order.orderId}
                      >
                        <div className="orderCardHeader">
                          <div>
                            <span>{order.productType || "Product Order"}</span>
                            <h3>{order.productName || "Untitled Product"}</h3>
                            <p>
                              {order.clientName || "Unnamed client"} ·{" "}
                              {order.orderId || "No order ID"}
                            </p>
                          </div>
                          <span
                            className={
                              pipelineStatus === "Program Loaded"
                                ? "status activeStatus onboardingStatusChip"
                                : "status holdStatus onboardingStatusChip"
                            }
                          >
                            {pipelineStatus}
                          </span>
                        </div>

                        <div className="onboardingTimeline">
                          {orderPipelineStages.map((stage, stageIndex) => (
                            <span
                              key={stage}
                              className={[
                                "onboardingStage",
                                stageIndex < pipelineIndex ? "complete" : "",
                                stageIndex === pipelineIndex ? "current" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {stage}
                            </span>
                          ))}
                        </div>

                        <div className="orderPipeline">
                          <div className={matchedClient ? "complete" : ""}>
                            <strong>Client</strong>
                            <span>
                              {matchedClient
                                ? matchedClient.name
                                : "Needs client record"}
                            </span>
                          </div>
                          <div className={intakeTemplate ? "complete" : ""}>
                            <strong>Intake</strong>
                            <span>
                              {intakeTemplate
                                ? intakeTemplate.name
                                : "No intake form matched"}
                            </span>
                          </div>
                          <div className={matchedProgram ? "complete" : ""}>
                            <strong>Program</strong>
                            <span>
                              {matchedProgram
                                ? matchedProgram.programName
                                : "No program matched"}
                            </span>
                          </div>
                        </div>

                        <div className="orderMetaGrid">
                          <div>
                            <span>Coach</span>
                            <strong>{getOrderPrimaryCoach(order)}</strong>
                          </div>
                          <div>
                            <span>Purchased</span>
                            <strong>{order.purchasedAt || "--"}</strong>
                          </div>
                          <div>
                            <span>Payment</span>
                            <strong>{order.paymentStatus || "Unknown"}</strong>
                          </div>
                          <label>
                            <span>Program Start</span>
                            <input
                              type="date"
                              value={getOrderStartDate(order)}
                              onChange={(event) =>
                                setOrderStartDates((current) => ({
                                  ...current,
                                  [order.recordId]: event.target.value,
                                }))
                              }
                            />
                          </label>
                        </div>

                        <div className="orderActions">
                          <button
                            className="outlineButton"
                            onClick={() => void createClientFromOrder(order)}
                            disabled={processing || Boolean(matchedClient)}
                          >
                            {matchedClient ? "Client Matched" : "Create Client"}
                          </button>
                          <button
                            className="outlineButton"
                            onClick={() => void assignOrderIntake(order)}
                            disabled={processing || !intakeTemplate}
                          >
                            Send Intake
                          </button>
                          <button
                            className="outlineButton"
                            onClick={() => void markOrderIntakeReviewed(order)}
                            disabled={processing || !matchedClient}
                          >
                            Mark Intake Reviewed
                          </button>
                          <button
                            className="goldButton"
                            onClick={() => void assignOrderProgram(order)}
                            disabled={processing || !matchedProgram}
                          >
                            {processing ? "Working..." : "Load Program"}
                          </button>
                        </div>
                      </section>
                    );
                  })}
                </div>
              </section>
            )}

            {activePage === "Library" && (
              <>
                <section className="searchRow librarySearchRow">
                  <input
                    placeholder="Search exercise..."
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                  />
                  <button className="goldButton" onClick={openNewExerciseForm}>
                    + Add Exercise
                  </button>
                  <button className="outlineButton" onClick={loadExerciseLibrary}>
                    Reload
                  </button>
                </section>

                <section className="tableCard exerciseLibraryTable">
                  <div
                    className="tableHeader exerciseTableHeader"
                    style={{
                      gridTemplateColumns: "minmax(220px, 2fr) minmax(120px, 1fr) 72px 110px 90px",
                    }}
                  >
                    <span>Exercise</span>
                    <span>Category</span>
                    <span>Cues</span>
                    <span>Video</span>
                    <span>Actions</span>
                  </div>

                  {libraryLoading && <p>Loading exercises...</p>}

                  {!libraryLoading && filteredLibraryExercises.length === 0 && (
                    <p style={{ padding: "18px 22px" }}>No exercises found.</p>
                  )}

                  {!libraryLoading &&
                    filteredLibraryExercises.map((exercise) => (
                      <div
                        className="clientRow exerciseTableRow"
                        key={exercise.recordId || exercise.exerciseId}
                        style={{
                          gridTemplateColumns: "minmax(220px, 2fr) minmax(120px, 1fr) 72px 110px 90px",
                        }}
                      >
                        <div className="clientName">
                          <div className="clientAvatar">
                            {exercise.exerciseName
                              ? exercise.exerciseName.slice(0, 2).toUpperCase()
                              : "EX"}
                          </div>
                          <div>
                            <strong>
                              {exercise.exerciseName || "Unnamed Exercise"}
                            </strong>
                          </div>
                        </div>

                        <span>{exercise.category || "--"}</span>

                        <span className="iconCell">
                          <button
                            className="cueIconButton"
                            onClick={() => setTechnicalCueExercise(exercise)}
                            title="View technical cues"
                            aria-label={`View technical cues for ${
                              exercise.exerciseName || "exercise"
                            }`}
                          >
                            <span className="dumbbellGlyph" aria-hidden="true" />
                          </button>
                        </span>

                        <span>
                          {exercise.videoUrl ? (
                            <a
                              className="iconActionButton libraryVideoButton"
                              href={exercise.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Open video for ${
                                exercise.exerciseName || "exercise"
                              }`}
                              aria-label={`Open video for ${
                                exercise.exerciseName || "exercise"
                              }`}
                            >
                              🎥 Video
                            </a>
                          ) : (
                            "--"
                          )}
                        </span>

                        <span className="rowActions">
                          <button
                            className="outlineButton"
                            onClick={() => openEditExerciseForm(exercise)}
                          >
                            Edit
                          </button>
                          <button
                            className="iconActionButton dangerIconButton"
                            onClick={() => deleteExercise(exercise)}
                            title="Delete exercise"
                            aria-label={`Delete ${exercise.exerciseName || "exercise"}`}
                          >
                            <Trash2 size={17} aria-hidden="true" />
                          </button>
                        </span>
                      </div>
                    ))}
                </section>
              </>
            )}

            {activePage === "Workouts" && (
              <>
                <div className="workoutPageTabs">
                  {(["Saved Programs", "Program Builder", "Forms", "Tests", "Assignments"] as WorkoutPageTab[]).map((tab) => (
                    <button
                      key={tab}
                      className={workoutPageTab === tab ? "goldButton" : "outlineButton"}
                      onClick={() => {
                        setWorkoutPageTab(tab);

                        if (tab === "Saved Programs") {
                          loadPrograms();
                        }

                        if (tab === "Forms") {
                          loadFormTemplates();
                        }

                        if (tab === "Tests") {
                          loadTestTemplates();
                        }

                        if (tab === "Assignments") {
                          loadPrograms();
                          loadFormTemplates();
                          loadTestTemplates();
                          setAssignmentTemplateId("");
                        }
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {workoutPageTab === "Saved Programs" && (
                  <section className="programLibraryPanel">
                    <div className="programLibraryHeader">
                      <div>
                        <h2>Saved Programs</h2>
                        <p>View saved program templates, load them into the builder, or assign them to a client.</p>
                      </div>

                      <button className="outlineButton" onClick={loadPrograms}>
                        Refresh Programs
                      </button>
                    </div>

                    <div className="programLibraryLayout">
                      <aside className="programListPanel">
                        <input
                          className="templateSearchInput"
                          value={savedProgramSearch}
                          onChange={(event) =>
                            setSavedProgramSearch(event.target.value)
                          }
                          placeholder="Search programs..."
                        />

                        <select
                          className="templateSearchInput"
                          value={savedProgramProductFilter}
                          onChange={(event) =>
                            setSavedProgramProductFilter(event.target.value)
                          }
                        >
                          <option value="All">All program types</option>
                          <option value="Digital Program">Digital programs</option>
                          <option value="Online Coaching">Online coaching</option>
                          <option value="In-Person Training">In-person training</option>
                          <option value="Internal Coaching Template">
                            Internal templates
                          </option>
                        </select>

                        {programs.length === 0 && <p>No saved programs found.</p>}
                        {programs.length > 0 && visibleSavedPrograms.length === 0 && (
                          <p>No programs match your search.</p>
                        )}

                        {visibleSavedPrograms.map((program) => (
                          <button
                            key={program.recordId}
                            className={
                              selectedSavedProgramId === program.programId
                                ? "programListItem selectedProgramListItem"
                                : "programListItem"
                            }
                            onClick={() => {
                              setSelectedSavedProgramId(program.programId);
                              setSavedAssignableWorkouts([]);
                            }}
                          >
                            <strong>{program.programName}</strong>
                            <small>
                              {program.productType || "Internal Template"} /{" "}
                              {program.goal || "--"}
                            </small>
                          </button>
                        ))}
                      </aside>

                      <section className="programDetailPanel">
                        {!selectedSavedProgram && <p>Select a program to view details.</p>}

                        {selectedSavedProgram && (
                          <>
                            <div className="programDetailTop">
                              <div>
                                <h3>{selectedSavedProgram.programName}</h3>
                                <p>
                                  {selectedSavedProgram.productType ||
                                    "Internal Coaching Template"}{" "}
                                  / {selectedSavedProgram.status || "--"}
                                </p>
                              </div>

                              <div className="rowActions">
                                <button
                                  className="goldButton"
                                  onClick={loadSavedProgramIntoBuilder}
                                  disabled={savedTemplatesLoading}
                                >
                                  Duplicate in Builder
                                </button>

                              </div>
                            </div>

                            <div className="programMetaGrid">
                              <span>
                                <strong>Goal</strong>
                                {selectedSavedProgram.goal || "--"}
                              </span>
                              <span>
                                <strong>Sport</strong>
                                {selectedSavedProgram.sport || "--"}
                              </span>
                              <span>
                                <strong>Level</strong>
                                {selectedSavedProgram.level || "--"}
                              </span>
                              <span>
                                <strong>Duration</strong>
                                {selectedSavedProgram.durationWeeks || "--"} weeks
                              </span>
                              <span>
                                <strong>Phase</strong>
                                {selectedSavedProgram.phase || "--"}
                              </span>
                              <span>
                                <strong>Sessions / Week</strong>
                                {selectedSavedProgram.sessionsPerWeek || "--"}
                              </span>
                              <span>
                                <strong>Product Type</strong>
                                {selectedSavedProgram.productType || "--"}
                              </span>
                              <span>
                                <strong>Price</strong>
                                {selectedSavedProgram.price
                                  ? `${selectedSavedProgram.price} ${
                                      selectedSavedProgram.currency || "CNY"
                                    }`
                                  : "--"}
                              </span>
                              <span>
                                <strong>Store Visible</strong>
                                {selectedSavedProgram.publicStoreVisible ? "Yes" : "No"}
                              </span>
                              <span>
                                <strong>Product Status</strong>
                                {selectedSavedProgram.productStatus || "--"}
                              </span>
                              <span>
                                <strong>Access</strong>
                                {selectedSavedProgram.accessLengthDays
                                  ? `${selectedSavedProgram.accessLengthDays} days`
                                  : "--"}
                              </span>
                              <span>
                                <strong>Default Intake</strong>
                                {selectedSavedProgram.defaultIntakeFormId || "--"}
                              </span>
                            </div>

                            <div className="savedAssignPanel">
                              <h3>Assign to Client</h3>

                              <div className="savedAssignGrid">
                                <label>
                                  <span>Client</span>
                                  <select
                                    className="miniSearch"
                                    value={savedAssignClientId}
                                    onChange={(e) => setSavedAssignClientId(e.target.value)}
                                  >
                                    <option value="">Select client</option>
                                    {clients.map((client) => (
                                      <option key={client.id} value={client.id}>
                                        {client.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label>
                                  <span>Start Date</span>
                                  <input
                                    type="date"
                                    className="miniSearch"
                                    value={savedAssignStartDate}
                                    onChange={(e) =>
                                      setSavedAssignStartDate(e.target.value)
                                    }
                                  />
                                </label>

                                <button
                                  className="outlineButton"
                                  onClick={loadSavedProgramSessionsForAssignment}
                                  disabled={savedAssignLoading}
                                >
                                  {savedAssignLoading ? "Loading..." : "Load Sessions"}
                                </button>

                                <button
                                  className="goldButton"
                                  onClick={assignSavedProgramToClient}
                                  disabled={savedAssigningProgram}
                                >
                                  {savedAssigningProgram ? "Assigning..." : "Assign Program"}
                                </button>
                              </div>

                              {savedAssignableWorkouts.length > 0 && (
                                <div className="arrangeWorkouts">
                                  <h4>Arrange Workouts</h4>

                                  {savedAssignableWorkouts.map((workout) => (
                                    <div
                                      key={workout.localId}
                                      className="arrangeWorkoutRow"
                                    >
                                      <span>Week {workout.week}</span>
                                      <span>Day {workout.day}</span>
                                      <strong>{workout.sessionName}</strong>

                                      <input
                                        type="date"
                                        className="miniSearch"
                                        value={workout.scheduledDate}
                                        onChange={(e) =>
                                          updateSavedAssignableWorkoutDate(
                                            workout.localId,
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="savedProgramSessions">
                              <div className="exerciseTitleRow">
                                <h3>Program Sessions</h3>
                                {savedTemplatesLoading && <span>Loading...</span>}
                              </div>

                              {!savedTemplatesLoading &&
                                savedProgramSessions.length === 0 && (
                                  <p>No template records found for this program.</p>
                                )}

                              {savedProgramSessions.map((session) => (
                                <div className="exercise-card" key={session.localId}>
                                  <h3>
                                    Week {session.week} / Day {session.day}:{" "}
                                    {session.sessionName}
                                  </h3>

                                  {session.exercises.map((exercise) => (
                                    <p key={`${session.localId}-${exercise.order}`}>
                                      {exercise.order}. {exercise.exerciseName || "--"}
                                    </p>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </section>
                    </div>
                  </section>
                )}

                {workoutPageTab === "Program Builder" && (
              <section className="tableCard programBuilderPanel">
                <h2 className="builderPageTitle">
                  Multi-Day Program Builder
                </h2>

                <h3 className="builderSectionTitle">Program Details</h3>

                <div className="programDetailsGrid programDetailsPrimary">
                  <label>
                    <span>Program Name</span>
                    <input
                      value={programName}
                      onChange={(e) => setProgramName(e.target.value)}
                      placeholder="Program Name"
                      className="miniSearch"
                    />
                  </label>

                  <label>
                    <span>Goal</span>
                    <input
                      value={programGoal}
                      onChange={(e) => setProgramGoal(e.target.value)}
                      placeholder="Goal"
                      className="miniSearch"
                    />
                  </label>
                </div>

                <div className="programDetailsGrid programDetailsSecondary">
                  <label>
                    <span>Duration Weeks</span>
                    <input
                      value={programDurationWeeks}
                      onChange={(e) => setProgramDurationWeeks(e.target.value)}
                      placeholder="Duration Weeks"
                      className="miniSearch"
                    />
                  </label>

                  <label>
                    <span>Phase</span>
                    <input
                      value={programPhase}
                      onChange={(e) => setProgramPhase(e.target.value)}
                      placeholder="Phase"
                      className="miniSearch"
                    />
                  </label>

                  <label>
                    <span>Sessions / Week</span>
                    <input
                      value={programSessionsPerWeek}
                      onChange={(e) => setProgramSessionsPerWeek(e.target.value)}
                      placeholder="Sessions / Week"
                      className="miniSearch"
                    />
                  </label>
                </div>

                <h3 className="builderSectionTitle">Product Settings</h3>

                <div className="programProductGrid">
                  <label>
                    <span>Program Type</span>
                    <select
                      value={programProductType}
                      onChange={(e) => setProgramProductType(e.target.value)}
                      className="miniSearch"
                    >
                      <option>Digital Program</option>
                      <option>Online Coaching</option>
                      <option>In-Person Training</option>
                      <option>Internal Coaching Template</option>
                    </select>
                  </label>

                  <label>
                    <span>Price</span>
                    <input
                      value={programPrice}
                      onChange={(e) => setProgramPrice(e.target.value)}
                      placeholder="Price"
                      className="miniSearch"
                    />
                  </label>

                  <label>
                    <span>Currency</span>
                    <select
                      value={programCurrency}
                      onChange={(e) => setProgramCurrency(e.target.value)}
                      className="miniSearch"
                    >
                      <option>CNY</option>
                      <option>USD</option>
                      <option>CAD</option>
                    </select>
                  </label>

                  <label>
                    <span>Access Days</span>
                    <input
                      value={programAccessLengthDays}
                      onChange={(e) => setProgramAccessLengthDays(e.target.value)}
                      placeholder="42"
                      className="miniSearch"
                    />
                  </label>

                  <label>
                    <span>Product Status</span>
                    <select
                      value={programProductStatus}
                      onChange={(e) => setProgramProductStatus(e.target.value)}
                      className="miniSearch"
                    >
                      <option>Draft</option>
                      <option>Active</option>
                      <option>Hidden</option>
                      <option>Archived</option>
                    </select>
                  </label>

                  <label>
                    <span>Default Intake</span>
                    <select
                      value={programDefaultIntakeFormId}
                      onChange={(e) => setProgramDefaultIntakeFormId(e.target.value)}
                      className="miniSearch"
                    >
                      <option value="">No default intake</option>
                      {savedFormTemplates.map((form) => (
                        <option key={form.formId} value={form.formId}>
                          {form.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="programStoreToggle">
                    <input
                      type="checkbox"
                      checked={programPublicStoreVisible}
                      onChange={(e) => setProgramPublicStoreVisible(e.target.checked)}
                    />
                    <span>Show in digital store</span>
                  </label>

                  <label>
                    <span>Purchase Link</span>
                    <input
                      value={programPurchaseLink}
                      onChange={(e) => setProgramPurchaseLink(e.target.value)}
                      placeholder="Optional checkout link"
                      className="miniSearch"
                    />
                  </label>
                </div>

                <label className="programSalesDescription">
                  <span>Sales Description</span>
                  <textarea
                    value={programSalesDescription}
                    onChange={(e) => setProgramSalesDescription(e.target.value)}
                    placeholder="Short product description for the store or order workflow."
                  />
                </label>

                <div className="builderSectionHeader">
                  <div>
                    <h3 className="builderSectionTitle">Current Session</h3>
                    {editingProgramSessionId && (
                      <p className="builderSessionHint">
                        Editing an existing day. Save it here, then choose another
                        session below.
                      </p>
                    )}
                  </div>
                  {editingProgramSessionId && (
                    <button
                      className="outlineButton"
                      onClick={() => clearCurrentProgramSession(false)}
                    >
                      Close Editor
                    </button>
                  )}
                </div>

                <div className="currentSessionGrid">
                  <label>
                    <span>Week</span>
                    <input
                      value={programWeek}
                      onChange={(e) => setProgramWeek(e.target.value)}
                      placeholder="Week"
                      className="miniSearch"
                    />
                  </label>

                  <label>
                    <span>Day</span>
                    <input
                      value={programDay}
                      onChange={(e) => setProgramDay(e.target.value)}
                      placeholder="Day"
                      className="miniSearch"
                    />
                  </label>

                  <label>
                    <span>Session Name</span>
                    <input
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="Session Name"
                      className="miniSearch"
                    />
                  </label>

                  <button className="goldButton" onClick={addCurrentSessionToProgram}>
                    Save & Next
                  </button>
                </div>

                <div className="searchRow">
                  <input
                    placeholder="Search exercise library..."
                    value={builderSearch}
                    onChange={(e) => setBuilderSearch(e.target.value)}
                  />

                  <button className="outlineButton" onClick={loadExerciseLibrary}>
                    Load Exercises
                  </button>
                </div>

                <h3 className="builderSectionTitle">Exercise Library</h3>

                <div className="tableCard builderLibraryTable">
                  <div
                    className="tableHeader builderLibraryHeader"
                    style={{
                      gridTemplateColumns: "2fr 1fr 1fr auto",
                    }}
                  >
                    <span>Exercise</span>
                    <span>Equipment</span>
                    <span>Pattern</span>
                    <span>Add</span>
                  </div>

                  {builderExercises.slice(0, 8).map((exercise) => (
                    <div
                      className="clientRow builderLibraryRow"
                      key={exercise.recordId || exercise.exerciseId}
                      style={{
                        gridTemplateColumns: "2fr 1fr 1fr auto",
                      }}
                    >
                      <div>
                        <strong>{exercise.exerciseName}</strong>
                      </div>

                      <span>{exercise.equipment || "--"}</span>
                      <span>{exercise.movementPattern || "--"}</span>

                      <button
                        className="goldButton"
                        onClick={() => addExerciseToProgram(exercise)}
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>

                <h3 className="builderSectionTitle builderSectionTitleSpaced">
                  Current Session Exercises
                </h3>

                {selectedProgramExercises.length === 0 && (
                  <p>No exercises added to current session yet.</p>
                )}

                {selectedProgramExercises.map((exercise, index) => (
                  <div
                    className={`exercise-card builderExerciseCard ${
                      exercise.groupType !== "Straight" ? "groupedExerciseCard" : ""
                    }`}
                    key={`${exercise.exerciseRecordId}-${index}`}
                  >
                    <div className="exerciseTitleRow">
                      <div>
                        <div className="builderExerciseTitle">
                          <span className="exerciseLabelBadge">
                            {exercise.exerciseLabel || exercise.order}
                          </span>
                          <div>
                            <span className="exerciseSectionName">
                              {exercise.sectionName || "Main"}
                            </span>
                            <h3>{exercise.exerciseName}</h3>
                          </div>
                        </div>
                        {exercise.groupType !== "Straight" && exercise.groupName && (
                          <span className="exerciseGroupPill">
                            {exercise.groupType}: {exercise.groupName}
                          </span>
                        )}
                      </div>

                      <div className="builderExerciseActions">
                        <button
                          className="outlineButton"
                          onClick={() => moveProgramExercise(index, -1)}
                          disabled={index === 0}
                        >
                          Up
                        </button>
                        <button
                          className="outlineButton"
                          onClick={() => moveProgramExercise(index, 1)}
                          disabled={index === selectedProgramExercises.length - 1}
                        >
                          Down
                        </button>
                        <button
                          className="outlineButton"
                          onClick={() => linkExerciseWithPrevious(index, "Superset")}
                        >
                          Superset
                        </button>
                        <button
                          className="outlineButton"
                          onClick={() => linkExerciseWithPrevious(index, "Circuit")}
                        >
                          Circuit
                        </button>
                        <button
                          className="outlineButton"
                          onClick={() => removeProgramExercise(index)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="builderPrescriptionGrid">
                      <label>
                        <span>Label</span>
                        <input
                          className="miniSearch"
                          value={exercise.exerciseLabel}
                          onChange={(e) =>
                            updateProgramExercise(
                              index,
                              "exerciseLabel",
                              e.target.value
                            )
                          }
                          placeholder="A1"
                        />
                      </label>

                      <label>
                        <span>Section</span>
                        <input
                          className="miniSearch"
                          value={exercise.sectionName}
                          onChange={(e) =>
                            updateProgramExercise(
                              index,
                              "sectionName",
                              e.target.value
                            )
                          }
                          placeholder="Prep, Power..."
                        />
                      </label>

                      <label>
                        <span>Order</span>
                        <input
                          className="miniSearch"
                          value={exercise.order}
                          onChange={(e) =>
                            updateProgramExercise(index, "order", e.target.value)
                          }
                          placeholder="Order"
                        />
                      </label>

                      <label>
                        <span>Sets</span>
                        <input
                          className="miniSearch"
                          value={exercise.sets}
                          onChange={(e) =>
                            updateProgramExercise(index, "sets", e.target.value)
                          }
                          placeholder="Sets"
                        />
                      </label>

                      <label>
                        <span>Reps</span>
                        <input
                          className="miniSearch"
                          value={exercise.reps}
                          onChange={(e) =>
                            updateProgramExercise(index, "reps", e.target.value)
                          }
                          placeholder="Reps"
                        />
                      </label>

                      <label>
                        <span>Tempo</span>
                        <input
                          className="miniSearch"
                          value={exercise.tempo}
                          onChange={(e) =>
                            updateProgramExercise(index, "tempo", e.target.value)
                          }
                          placeholder="Tempo"
                        />
                      </label>

                      <label>
                        <span>Rest</span>
                        <input
                          className="miniSearch"
                          value={exercise.rest}
                          onChange={(e) =>
                            updateProgramExercise(index, "rest", e.target.value)
                          }
                          placeholder="Rest"
                        />
                      </label>
                    </div>

                    <div className="builderGroupGrid">
                      <label>
                        <span>Structure</span>
                        <select
                          className="miniSearch"
                          value={exercise.groupType}
                          onChange={(e) =>
                            updateExerciseGrouping(
                              index,
                              e.target.value as ProgramExercise["groupType"],
                              exercise.groupName || "Group A"
                            )
                          }
                        >
                          <option>Straight</option>
                          <option>Superset</option>
                          <option>Circuit</option>
                        </select>
                      </label>

                      <label>
                        <span>Group Label</span>
                        <input
                          className="miniSearch"
                          value={exercise.groupName}
                          onChange={(e) =>
                            updateProgramExercise(index, "groupName", e.target.value)
                          }
                          placeholder="A, B, Upper Circuit..."
                          disabled={exercise.groupType === "Straight"}
                        />
                      </label>

                      <label className="builderWideField">
                        <span>Personalized Coach Notes</span>
                        <textarea
                          value={exercise.coachingNotes}
                          onChange={(e) =>
                            updateProgramExercise(
                              index,
                              "coachingNotes",
                              e.target.value
                            )
                          }
                          placeholder="Coach-specific notes for this client or session..."
                        />
                      </label>
                    </div>
                  </div>
                ))}

                {selectedProgramExercises.length > 0 && (
                  <div className="builderSessionSaveBar">
                    <div>
                      <strong>
                        {editingProgramSessionId ? "Editing day" : "New day"}
                      </strong>
                      <span>
                        Week {programWeek || "--"} / Day {programDay || "--"}:{" "}
                        {sessionName || "Untitled Session"}
                      </span>
                    </div>
                    <div>
                      <button
                        className="outlineButton"
                        onClick={() => saveCurrentSessionToProgram(true, false)}
                      >
                        Save Day
                      </button>
                      <button className="goldButton" onClick={addCurrentSessionToProgram}>
                        Save & Next
                      </button>
                    </div>
                  </div>
                )}

                <h3 className="builderSectionTitle builderSectionTitleSpaced">
                  Program Sessions
                </h3>

                {programSessions.length === 0 && <p>No sessions added yet.</p>}

                {programSessions.map((session) => (
                  <div
                    className={`exercise-card programSessionCard ${
                      editingProgramSessionId === session.localId
                        ? "editingSessionCard"
                        : ""
                    }`}
                    key={session.localId}
                    draggable
                    onDragStart={() => setDraggedProgramSessionId(session.localId)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      reorderProgramSession(draggedProgramSessionId, session.localId);
                      setDraggedProgramSessionId("");
                    }}
                    onDragEnd={() => setDraggedProgramSessionId("")}
                  >
                    <div className="exerciseTitleRow">
                      <div className="programSessionTitle">
                        <span className="dragHandle" aria-hidden="true">
                          Drag
                        </span>
                        <h3>
                          Week {session.week} / Day {session.day}:{" "}
                          {session.sessionName}
                        </h3>
                      </div>

                      <div className="programSessionActions">
                        <button
                          className="outlineButton"
                          onClick={() => loadSessionForEditing(session)}
                        >
                          Edit
                        </button>

                        <button
                          className="outlineButton"
                          onClick={() => removeProgramSession(session.localId)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <p>{session.exercises.length} exercises</p>

                    {session.exercises.map((exercise) => (
                      <p key={exercise.exerciseRecordId} style={{ margin: "4px 0" }}>
                        {exercise.order}. {exercise.exerciseName} — {exercise.sets} x{" "}
                        {exercise.reps}, Tempo {exercise.tempo}, Rest {exercise.rest}
                      </p>
                    ))}
                  </div>
                ))}

                <button
                  className="goldButton saveWorkoutButton"
                  onClick={saveFullProgram}
                  disabled={savingTemplate}
                >
                  {savingTemplate ? "Saving..." : "Save Full Program"}
                </button>
              </section>
                )}

                {workoutPageTab === "Forms" && (
                  <section className="tableCard builderHubPanel">
                    <div className="builderHubHeader">
                      <div>
                        <h2>Form & Questionnaire Builder</h2>
                        <p>
                          Build check-ins, intake forms, readiness surveys, and custom questionnaires for coach assignment.
                        </p>
                      </div>
                      <div className="builderHubActions">
                        <details className="savedTemplateDropdown">
                          <summary className="outlineButton">
                            Saved Forms
                            <span>{savedFormTemplates.length}</span>
                          </summary>
                          <div className="savedTemplateDropdownMenu">
                            <div className="savedTemplateHeader">
                              <h3>Saved Forms</h3>
                              <button
                                className="outlineButton"
                                onClick={(event) => {
                                  event.preventDefault();
                                  void loadFormTemplates();
                                }}
                              >
                                Reload
                              </button>
                            </div>

                            <input
                              className="templateSearchInput"
                              value={savedFormSearch}
                              onChange={(event) =>
                                setSavedFormSearch(event.target.value)
                              }
                              placeholder="Search forms..."
                            />

                            {formTemplatesLoading && (
                              <p className="emptyState">Loading forms...</p>
                            )}

                            {!formTemplatesLoading &&
                              savedFormTemplates.length === 0 && (
                                <p className="emptyState">No saved forms yet.</p>
                              )}

                            {!formTemplatesLoading &&
                              savedFormTemplates.length > 0 &&
                              visibleSavedForms.length === 0 && (
                                <p className="emptyState">No forms match your search.</p>
                              )}

                            <div className="savedTemplateList">
                              {visibleSavedForms.map((form) => (
                                <div
                                  key={form.recordId}
                                  className={`savedTemplateItem savedTemplateCard ${
                                    selectedSavedFormId === form.formId
                                      ? "selectedSavedTemplateItem"
                                      : ""
                                  }`}
                                >
                                  <button
                                    type="button"
                                    className="savedTemplateMainButton"
                                    onClick={() => {
                                      setSelectedSavedFormId(form.formId);
                                      loadSavedFormIntoBuilder(form);
                                    }}
                                  >
                                    <strong>
                                      {form.name || form.formId || "Untitled Form"}
                                    </strong>
                                    <span>{form.type || "Form"}</span>
                                    <small>{form.questions.length} questions</small>
                                  </button>
                                  <details className="templateActionMenu">
                                    <summary aria-label="Template actions">...</summary>
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => loadSavedFormIntoBuilder(form)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          duplicateSavedFormIntoBuilder(form)
                                        }
                                      >
                                        Duplicate
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteSavedFormTemplate(form)}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </details>
                                </div>
                              ))}
                            </div>
                          </div>
                        </details>

                        <button
                          className="goldButton"
                          onClick={saveFormTemplate}
                          disabled={savingFormTemplate}
                        >
                          {savingFormTemplate
                            ? "Saving..."
                            : editingFormTemplate
                            ? "Update Form Template"
                            : "Save Form Template"}
                        </button>
                      </div>
                    </div>

                    <div className="builderHubMain">
                        <div className="builderHubGrid">
                          <label>
                            <span>Form Name</span>
                            <input
                              className="miniSearch"
                              value={formTemplateName}
                              onChange={(e) => setFormTemplateName(e.target.value)}
                            />
                          </label>
                          <label>
                            <span>Type</span>
                            <select
                              className="miniSearch"
                              value={formTemplateType}
                              onChange={(e) => setFormTemplateType(e.target.value)}
                            >
                              <option>Check-in</option>
                              <option>Questionnaire</option>
                              <option>Intake</option>
                              <option>Readiness</option>
                              <option>Custom</option>
                            </select>
                          </label>
                        </div>

                        <div className="builderHubList">
                          <div className="exerciseTitleRow">
                            <h3>Questions</h3>
                            <button className="outlineButton" onClick={addFormQuestion}>
                              + Add Question
                            </button>
                          </div>

                          {formQuestions.map((question, index) => (
                            <div className="builderHubRow" key={`${question.id}-${index}`}>
                              <label>
                                <span>Question</span>
                                <input
                                  className="miniSearch"
                                  value={question.label}
                                  onChange={(e) =>
                                    updateFormQuestion(index, "label", e.target.value)
                                  }
                                  placeholder="Question text"
                                />
                              </label>
                              <label>
                                <span>Type</span>
                                <select
                                  className="miniSearch"
                                  value={question.questionType}
                                  onChange={(e) =>
                                    updateFormQuestion(
                                      index,
                                      "questionType",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option>Text</option>
                                  <option>Long Text</option>
                                  <option>Number</option>
                                  <option>Scale</option>
                                  <option>Single Select</option>
                                  <option>Multi Select</option>
                                  <option>Yes/No</option>
                                  <option>Date</option>
                                </select>
                              </label>
                              <label className="builderCheckboxLabel">
                                <input
                                  type="checkbox"
                                  checked={question.required}
                                  onChange={(e) =>
                                    updateFormQuestion(
                                      index,
                                      "required",
                                      e.target.checked
                                    )
                                  }
                                />
                                <span>Required</span>
                              </label>
                              <button
                                className="outlineButton"
                                onClick={() => removeFormQuestion(index)}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                    </div>
                  </section>
                )}

                {workoutPageTab === "Tests" && (
                  <section className="tableCard builderHubPanel">
                    <div className="builderHubHeader">
                      <div>
                        <h2>Physical Test Builder</h2>
                        <p>
                          Build test batteries for strength, speed, power, mobility, or return-to-training checkpoints.
                        </p>
                      </div>
                      <div className="builderHubActions">
                        <details className="savedTemplateDropdown">
                          <summary className="outlineButton">
                            Saved Tests
                            <span>{savedTestTemplates.length}</span>
                          </summary>
                          <div className="savedTemplateDropdownMenu">
                            <div className="savedTemplateHeader">
                              <h3>Saved Tests</h3>
                              <button
                                className="outlineButton"
                                onClick={(event) => {
                                  event.preventDefault();
                                  void loadTestTemplates();
                                }}
                              >
                                Reload
                              </button>
                            </div>

                            <input
                              className="templateSearchInput"
                              value={savedTestSearch}
                              onChange={(event) =>
                                setSavedTestSearch(event.target.value)
                              }
                              placeholder="Search tests..."
                            />

                            {testTemplatesLoading && (
                              <p className="emptyState">Loading tests...</p>
                            )}

                            {!testTemplatesLoading && savedTestTemplates.length === 0 && (
                              <p className="emptyState">No saved tests yet.</p>
                            )}

                            {!testTemplatesLoading &&
                              savedTestTemplates.length > 0 &&
                              visibleSavedTests.length === 0 && (
                                <p className="emptyState">No tests match your search.</p>
                              )}

                            <div className="savedTemplateList">
                              {visibleSavedTests.map((test) => (
                                <div
                                  key={test.recordId}
                                  className={`savedTemplateItem savedTemplateCard ${
                                    selectedSavedTestId === test.testTemplateId
                                      ? "selectedSavedTemplateItem"
                                      : ""
                                  }`}
                                >
                                  <button
                                    type="button"
                                    className="savedTemplateMainButton"
                                    onClick={() => {
                                      setSelectedSavedTestId(test.testTemplateId);
                                      loadSavedTestIntoBuilder(test);
                                    }}
                                  >
                                    <strong>
                                      {test.name ||
                                        test.testTemplateId ||
                                        "Untitled Test"}
                                    </strong>
                                    <span>{test.status || "Active"}</span>
                                    <small>{test.items.length} test items</small>
                                  </button>
                                  <details className="templateActionMenu">
                                    <summary aria-label="Template actions">...</summary>
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => loadSavedTestIntoBuilder(test)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          duplicateSavedTestIntoBuilder(test)
                                        }
                                      >
                                        Duplicate
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteSavedTestTemplate(test)}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </details>
                                </div>
                              ))}
                            </div>
                          </div>
                        </details>

                        <button
                          className="goldButton"
                          onClick={saveTestTemplate}
                          disabled={savingTestTemplate}
                        >
                          {savingTestTemplate
                            ? "Saving..."
                            : editingTestTemplate
                            ? "Update Test Template"
                            : "Save Test Template"}
                        </button>
                      </div>
                    </div>

                    <div className="builderHubMain">
                        <div className="builderHubGrid">
                          <label>
                            <span>Test Template Name</span>
                            <input
                              className="miniSearch"
                              value={testTemplateName}
                              onChange={(e) => setTestTemplateName(e.target.value)}
                            />
                          </label>
                        </div>

                        <div className="builderHubList">
                          <div className="exerciseTitleRow">
                            <h3>Test Items</h3>
                            <button className="outlineButton" onClick={addTestItem}>
                              + Add Test
                            </button>
                          </div>

                          {testItems.map((item, index) => (
                            <div className="builderHubRow testBuilderRow" key={`${item.id}-${index}`}>
                              <label>
                                <span>Test Name</span>
                                <input
                                  className="miniSearch"
                                  value={item.testName}
                                  onChange={(e) =>
                                    updateTestItem(index, "testName", e.target.value)
                                  }
                                  placeholder="Countermovement jump, 5RM squat..."
                                />
                              </label>
                              <label>
                                <span>Metric</span>
                                <select
                                  className="miniSearch"
                                  value={item.metricType}
                                  onChange={(e) =>
                                    updateTestItem(index, "metricType", e.target.value)
                                  }
                                >
                                  <option>Weight</option>
                                  <option>Reps</option>
                                  <option>Time</option>
                                  <option>Distance</option>
                                  <option>Height</option>
                                  <option>Power</option>
                                  <option>Speed</option>
                                  <option>Score</option>
                                  <option>Yes/No</option>
                                </select>
                              </label>
                              <label>
                                <span>Unit</span>
                                <select
                                  className="miniSearch"
                                  value={item.unit}
                                  onChange={(e) =>
                                    updateTestItem(index, "unit", e.target.value)
                                  }
                                >
                                  <option>kg</option>
                                  <option>lb</option>
                                  <option>reps</option>
                                  <option>sec</option>
                                  <option>min</option>
                                  <option>m</option>
                                  <option>cm</option>
                                  <option>watts</option>
                                  <option>m/s</option>
                                  <option>score</option>
                                  <option>none</option>
                                </select>
                              </label>
                              <button
                                className="outlineButton"
                                onClick={() => removeTestItem(index)}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                    </div>
                  </section>
                )}

                {workoutPageTab === "Assignments" && (
                  <section className="tableCard builderHubPanel">
                    <div className="builderHubHeader">
                      <div>
                        <h2>Assignment Hub</h2>
                        <p>
                          Send programs, forms, check-ins, and tests to clients. Assigned items will appear in the client portal as tasks.
                        </p>
                      </div>
                    </div>

                    <div className="builderHubGrid assignmentHubGrid">
                      <label>
                        <span>Assignment Type</span>
                        <select
                          className="miniSearch"
                          value={assignmentType}
                          onChange={(e) => {
                            setAssignmentType(e.target.value);
                            setAssignmentTemplateId("");
                          }}
                        >
                          <option>Program</option>
                          <option>Check-in</option>
                          <option>Questionnaire</option>
                          <option>Physical Test</option>
                        </select>
                      </label>
                      <label>
                        <span>Client</span>
                        <select
                          className="miniSearch"
                          value={assignmentClientId}
                          onChange={(e) => setAssignmentClientId(e.target.value)}
                        >
                          <option value="">Select client</option>
                          {coachVisibleClients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>
                          {assignmentType === "Program"
                            ? "Saved Program"
                            : assignmentType === "Physical Test"
                            ? "Saved Test"
                            : "Saved Form"}
                        </span>
                        <select
                          key={assignmentType}
                          className="miniSearch"
                          value={assignmentTemplateId}
                          onChange={(e) => setAssignmentTemplateId(e.target.value)}
                        >
                          <option value="">
                            {assignmentTemplateOptions.length === 0
                              ? assignmentType === "Program"
                                ? "No saved programs"
                                : assignmentType === "Physical Test"
                                ? "No saved tests"
                                : "No saved forms"
                              : "Select saved item"}
                          </option>
                          {assignmentTemplateOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label} ({option.meta})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Start Date</span>
                        <input
                          ref={assignmentHubDateInputRef}
                          className="miniSearch"
                          type="date"
                          value={assignmentDueDate}
                          onChange={(e) => {
                            const nextDate = normalizeDate(e.target.value);
                            setAssignmentDueDate(nextDate);
                            setCalendarAnchorDate(nextDate);
                          }}
                        />
                      </label>
                      <button
                        className="goldButton"
                        onClick={() =>
                          createContentAssignment({
                            assignmentDueDate: normalizeDate(
                              assignmentHubDateInputRef.current?.value ||
                                assignmentDueDate
                            ),
                          })
                        }
                        disabled={creatingAssignment}
                      >
                        {creatingAssignment ? "Creating..." : "Create Assignment"}
                      </button>
                    </div>

                    <div className="assignmentTypeGrid">
                      <div>
                        <strong>Programs</strong>
                        <span>Use saved programs to create scheduled workouts.</span>
                      </div>
                      <div>
                        <strong>Check-ins</strong>
                        <span>Assign recurring or one-off readiness questionnaires.</span>
                      </div>
                      <div>
                        <strong>Questionnaires</strong>
                        <span>Send intake, feedback, travel, pain, or custom forms.</span>
                      </div>
                      <div>
                        <strong>Physical Tests</strong>
                        <span>Assign test batteries and collect structured results.</span>
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}

            {activePage === "Check-ins" && (
              <section className="checkInsPage">
                <div className="checkInStatsGrid">
                  <div className="clientStat">
                    <span>Due Now</span>
                    <strong>{checkInStats.due}</strong>
                  </div>
                  <div className="clientStat">
                    <span>Recent</span>
                    <strong>{checkInStats.recent}</strong>
                  </div>
                  <div className="clientStat">
                    <span>No Check-in</span>
                    <strong>{checkInStats.missing}</strong>
                  </div>
                </div>

                <div className="clientToolbar checkInToolbar">
                  <input
                    placeholder="Search check-ins"
                    value={checkInSearch}
                    onChange={(e) => setCheckInSearch(e.target.value)}
                  />

                  <select
                    value={checkInFilter}
                    onChange={(e) =>
                      setCheckInFilter(e.target.value as CheckInFilter)
                    }
                  >
                    <option value="Due">Due</option>
                    <option value="Recent">Recent</option>
                    <option value="No Check-in">No Check-in</option>
                    <option value="All">All</option>
                  </select>

                  <button className="outlineButton" onClick={loadClients}>
                    Refresh
                  </button>
                </div>

                <section className="checkInList">
                  {!loading && filteredCheckInClients.length === 0 && (
                    <p className="emptyTableMessage">
                      No clients match this check-in view.
                    </p>
                  )}

                  {filteredCheckInClients.map((client) => {
                    const ageDays = getCheckInAgeDays(client);
                    const isDue = clientNeedsCheckIn(client);
                    const lastCheckIn =
                      ageDays === null
                        ? "No check-in recorded"
                        : ageDays === 0
                        ? "Checked in today"
                        : `${ageDays} days since check-in`;

                    return (
                      <article
                        className={`checkInCard ${isDue ? "checkInDueCard" : ""}`}
                        key={client.id}
                      >
                        <div className="clientName">
                          <div className="clientAvatar">{client.initials}</div>
                          <div>
                            <strong>{client.name}</strong>
                            <p>{client.status || "Active"}</p>
                          </div>
                        </div>

                        <div className="checkInMeta">
                          <span>Last Check-in</span>
                          <strong>{client.activity || "--"}</strong>
                          <p>{lastCheckIn}</p>
                        </div>

                        <div className="checkInMeta">
                          <span>Program</span>
                          <strong>{client.program || "--"}</strong>
                          <p>{client.email || client.phone || "No contact saved"}</p>
                        </div>

                        <div className="checkInActions">
                          <button
                            className={isDue ? "goldButton" : "outlineButton"}
                            onClick={() => markClientCheckedInToday(client)}
                            disabled={savingCheckInClientId === client.id}
                          >
                            {savingCheckInClientId === client.id
                              ? "Saving..."
                              : "Mark Today"}
                          </button>
                          <button
                            className="outlineButton"
                            onClick={() => openCheckInQuestionnaire(client)}
                          >
                            Questionnaire
                          </button>
                          <button
                            className="outlineButton"
                            onClick={() => {
                              setSelectedClient(client);
                              setClientTab("Overview");
                            }}
                          >
                            Open Client
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </section>
              </section>
            )}
          </>
        )}

        {selectedClient && (
          <div
            className={
              clientTab === "Training" ? "clientPage trainingFocus" : "clientPage"
            }
          >

            <section className="clientWorkspace">
              {!isClientPortal && (
              <button
                className="outlineButton"
                onClick={() => {
                  setSelectedClient(null);
                  setSelectedWorkout(null);
                  setWorkoutDetails([]);
                  setSetLogs([]);
                  setSavedExerciseDraftIds([]);
                }}
              >
                ← Back
              </button>

              )}

              <nav className="mobileClientBottomNav" aria-label="Client navigation">
                <button
                  className={clientTab === "Home" ? "active" : ""}
                  onClick={() => setClientTab("Home")}
                >
                  <Home size={21} strokeWidth={2.2} />
                  <span>{t("home")}</span>
                </button>
                <button
                  className={clientTab === "Training" ? "active" : ""}
                  onClick={() => setClientTab("Training")}
                >
                  <CalendarDays size={21} strokeWidth={2.2} />
                  <span>{t("calendar")}</span>
                </button>
                <button
                  className={clientTab === "Programs" ? "active" : ""}
                  onClick={() => setClientTab("Programs")}
                >
                  <BookOpen size={21} strokeWidth={2.2} />
                  <span>{t("myPrograms")}</span>
                </button>
                <button
                  className={clientTab === "Overview" ? "active" : ""}
                  onClick={() => setClientTab("Overview")}
                >
                  <UserCircle size={21} strokeWidth={2.2} />
                  <span>{t("profile")}</span>
                </button>
              </nav>

              <div className="clientTop">
                {isClientPortal ? (
                  <div className="clientPortalMonogram" aria-hidden="true">
                    <span className="monogramMark">
                      N<span>L</span>
                    </span>
                  </div>
                ) : (
                  <div className="clientAvatar largeAvatar">
                    {selectedClient.initials}
                  </div>
                )}
                <div>
                  <h1>
                    {isClientPortal
                      ? clientTab === "Home"
                        ? t("hi", {
                            name: selectedClient.name.split(" ")[0] || "there",
                          })
                        : clientTab === "Overview"
                        ? t("profile")
                        : clientTab === "Programs"
                        ? t("myPrograms")
                        : t("calendar")
                      : selectedClient.name}
                  </h1>
                  <p>
                    {isClientPortal
                      ? `${selectedClient.status} - ${selectedClient.program}`
                      : `${selectedClient.clientCode || "Client"} - ${
                          getCoachDisplayName(
                            selectedClient.coach || selectedClient.primaryCoach || "Coach view"
                          )
                        }`}
                  </p>
                  {!isClientPortal && (
                    <div className="clientLayerBadges">
                      <span>{selectedClient.clientType || "Client"}</span>
                      <span>
                        Intake: {selectedClient.intakeStatus || "Not Sent"}
                      </span>
                      <span>
                        Payment: {selectedClient.paymentStatus || "Unpaid"}
                      </span>
                    </div>
                  )}
                  <div
                    className="clientPortalLanguageSwitch"
                    aria-label={t("languagePreference")}
                  >
                    <button
                      type="button"
                      className={
                        languagePreferenceToCode(
                          selectedClient.languagePreference
                        ) === "en"
                          ? "active"
                          : ""
                      }
                      onClick={() => updateClientLanguagePreference("English")}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      className={
                        languagePreferenceToCode(
                          selectedClient.languagePreference
                        ) === "zh"
                          ? "active"
                          : ""
                      }
                      onClick={() => updateClientLanguagePreference("Mandarin")}
                    >
                      中文
                    </button>
                  </div>
                </div>
                {!isClientPortal && (
                <div className="clientProfileActions">
                  <details className="clientActionMenu">
                    <summary
                      className="iconActionButton profileIconButton"
                      aria-label="Client actions"
                    >
                      <MoreVertical size={18} aria-hidden="true" />
                    </summary>
                    <div className="clientActionDropdown">
                      <button
                        onClick={() =>
                          copyToClipboard(
                            buildClientPortalLink(selectedClient),
                            "Client portal link"
                          )
                        }
                      >
                        Copy portal link
                      </button>
                      <button onClick={() => openEditClientForm(selectedClient)}>
                        Edit / assign coach
                      </button>
                      <button
                        onClick={() => updateClientPackage(selectedClient, "Archived")}
                        disabled={updatingClientStatus}
                      >
                        Archive client
                      </button>
                      <button
                        className="dangerMenuItem"
                        onClick={() => deleteClient(selectedClient)}
                      >
                        Delete client
                      </button>
                    </div>
                  </details>
                </div>
                )}
              </div>

              <div
                className={
                  isClientPortal
                    ? "clientTabs portalHidden"
                    : "clientTabs"
                }
              >
                <button
                  className={clientTab === "Home" ? "tab activeTab" : "tab"}
                  onClick={() => setClientTab("Home")}
                >
                  {t("dashboard")}
                </button>

                <button
                  className={clientTab === "Training" ? "tab activeTab" : "tab"}
                  onClick={() => setClientTab("Training")}
                >
                  {t("calendar")}
                </button>

                <button
                  className={clientTab === "Overview" ? "tab activeTab" : "tab"}
                  onClick={() => setClientTab("Overview")}
                >
                  {t("clientOverview")}
                </button>
              </div>

              {clientTab === "Home" && (
                <div className="clientHomeGrid">
                  <section className="clientHomePanel upcomingHomePanel">
                    <div className="clientHomePanelHeader">
                      <div>
                        <span>{t("program")}</span>
                        <h2>{isClientPortal ? "Upcoming Tasks" : "Upcoming Tasks"}</h2>
                      </div>
                      <button
                        className="outlineButton"
                        onClick={() => setClientTab("Training")}
                      >
                        {t("calendar")}
                      </button>
                    </div>

                    {dueTodayTasks.length > 0 && (
                      <div className="dueTodayStrip">
                        <div>
                          <span>{t("dueToday")}</span>
                          <strong>{dueTodayTasks.length}</strong>
                        </div>
                        <div className="dueTodayActions">
                          {dueTodayTasks.slice(0, 3).map((task) => (
                            <button
                              key={`due-${task.type}-${task.id}`}
                              type="button"
                              onClick={task.open}
                            >
                              {task.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="homeWorkoutList">
                      {clientPortalUpcomingTasks.length > 0 ? (
                        clientPortalUpcomingTasks.slice(0, 4).map((task) => (
                          <button
                            key={`${task.type}-${task.id}`}
                            className={`homeWorkoutItem ${
                              task.date === todayValue ? "dueTodayTaskItem" : ""
                            }`}
                            onClick={task.open}
                          >
                            <span>{localizedCalendarLabel(task.date)}</span>
                            <strong>{task.title}</strong>
                            <small>
                              {task.meta} - {localizeTaskStatus(task.status)}
                            </small>
                          </button>
                        ))
                      ) : (
                        <p className="homeEmptyText">
                          {t("noUpcomingWorkouts")}
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="clientHomePanel progressHomePanel">
                    <div className="clientHomePanelHeader">
                      <div>
                        <span>{t("progress")}</span>
                        <h2>{t("exerciseHistory")}</h2>
                      </div>
                    </div>

                    <div className="progressControls">
                      <input
                        value={progressSearch}
                        onChange={(e) => setProgressSearch(e.target.value)}
                        placeholder={t("searchExercise")}
                      />
                      <select
                        value={selectedProgressName}
                        onChange={(e) => setSelectedProgressExercise(e.target.value)}
                      >
                        {visibleProgressExerciseOptions.length > 0 ? (
                          visibleProgressExerciseOptions.map((name) => (
                            <option key={name} value={name}>
                              {getLocalizedProgressExerciseName(name)}
                            </option>
                          ))
                        ) : (
                          <option value="">{t("noExerciseHistory")}</option>
                        )}
                      </select>
                    </div>

                    <div className="progressChartCard" aria-label="Exercise progress chart">
                      {progressHistoryPoints.length > 0 ? (
                        <>
                          <div className="progressChartSummary">
                            <div>
                              <span>{t("best")}</span>
                              <strong>
                                {progressMaxValue}
                                {progressUnit && ` ${progressUnit}`}
                              </strong>
                            </div>
                            <div>
                              <span>{t("latest")}</span>
                              <strong>
                                {progressHistoryPoints[progressHistoryPoints.length - 1]
                                  ?.value || "--"}
                                {progressUnit && ` ${progressUnit}`}
                              </strong>
                            </div>
                          </div>

                          <ResponsiveContainer width="100%" height={210}>
                            <AreaChart
                              data={progressHistoryPoints.map((point) => ({
                                ...point,
                                label: new Date(
                                  `${point.date}T00:00:00`
                                ).toLocaleDateString(clientLocale, {
                                  month: "short",
                                  day: "numeric",
                                }),
                              }))}
                              margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="progressGold" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#151515" stopOpacity={0.9} />
                                  <stop offset="95%" stopColor="#9f7a26" stopOpacity={0.08} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid stroke="#e5dfd2" vertical={false} />
                              <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: "#68645d", fontSize: 11, fontWeight: 800 }}
                              />
                              <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: "#68645d", fontSize: 11, fontWeight: 800 }}
                              />
                              <Tooltip
                                contentStyle={{
                                  border: "1px solid #d8d1c4",
                                  borderRadius: 10,
                                  color: "#111",
                                  fontWeight: 800,
                                }}
                                formatter={(value) => [
                                  `${value}${progressUnit ? ` ${progressUnit}` : ""}`,
                                  "Result",
                                ]}
                              />
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#111"
                                strokeWidth={3}
                                fill="url(#progressGold)"
                                dot={{ r: 4, fill: "#111", stroke: "#d5b24c", strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: "#d5b24c", stroke: "#111", strokeWidth: 2 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </>
                      ) : (
                        <p className="homeEmptyText">
                          {t("noExerciseHistory")}
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="clientHomePanel focusHomePanel">
                    <div className="clientHomePanelHeader">
                      <div>
                        <span>{isClientPortal ? t("readiness") : "Coach View"}</span>
                        <h2>{isClientPortal ? t("todaysFocus") : "Client Snapshot"}</h2>
                      </div>
                    </div>

                    {isClientPortal ? (
                      <div className="homeFocusGrid">
                        <div>
                          <span>{t("currentProgram")}</span>
                          <strong>
                            {selectedClient.program || t("noProgramAssigned")}
                          </strong>
                        </div>
                        <div>
                          <span>{t("checkInStatus")}</span>
                          <strong>{selectedClientCheckInLabel}</strong>
                        </div>
                        <div>
                          <span>{t("coachNotes")}</span>
                          <strong>{selectedClient.notes || t("noNotesYet")}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="coachSnapshotGrid">
                        <button
                          className="coachAlertCard missedAlertCard"
                          type="button"
                          onClick={() => {
                            if (needsAttentionItems[0]?.date) {
                              jumpToTaskDate(needsAttentionItems[0].date);
                            }
                          }}
                        >
                          <span>Missed</span>
                          <strong>{needsAttentionItems.length}</strong>
                          <small>Tasks needing follow-up</small>
                        </button>

                        <button
                          className="coachAlertCard"
                          type="button"
                          onClick={() => jumpToTaskDate(todayValue)}
                        >
                          <span>Completed Today</span>
                          <strong>{completedTodayTasks.length}</strong>
                          <small>{dueTodayTasks.length} still scheduled</small>
                        </button>

                        <button
                          className="coachAlertCard"
                          type="button"
                          onClick={() => setClientTab("Overview")}
                        >
                          <span>Check-in</span>
                          <strong>{clientNeedsCheckIn(selectedClient) ? "Due" : "OK"}</strong>
                          <small>{selectedClientCheckInLabel}</small>
                        </button>

                        <div className="snapshotMetricCard">
                          <span>Completion</span>
                          <strong>{completionRate}%</strong>
                          <small>
                            {completedTaskCount}/{totalTaskCount || 0} assigned tasks
                          </small>
                        </div>

                        <div className="snapshotMetricCard">
                          <span>Readiness</span>
                          <strong>
                            {latestReadinessScore ? latestReadinessScore : "--"}
                          </strong>
                          <small>
                            {averageReadinessScore
                              ? `${averageReadinessScore} avg`
                              : "No scale answers yet"}
                          </small>
                        </div>

                        <div className="snapshotTrendCard">
                          <span>Questionnaire Trend</span>
                          <div className="readinessSparkline">
                            {readinessTrendPoints.length > 0 ? (
                              readinessTrendPoints.map((point) => (
                                <div
                                  className="readinessSparkBar"
                                  key={`${point.recordId}-${point.itemId}`}
                                  style={{
                                    height: `${Math.max(
                                      14,
                                      Math.min(100, point.numericAnswer * 20)
                                    )}%`,
                                  }}
                                  title={`${getContentResponseLabel(point)}: ${
                                    point.numericAnswer
                                  }`}
                                />
                              ))
                            ) : (
                              <p className="homeEmptyText">No questionnaire data yet.</p>
                            )}
                          </div>
                        </div>

                        <div className="snapshotAttentionCard">
                          <div className="snapshotAttentionHeader">
                            <span>Needs Attention</span>
                            <strong>{needsAttentionItems.length}</strong>
                          </div>

                          {needsAttentionItems.length > 0 ? (
                            <div className="attentionTaskList">
                              {needsAttentionItems.map((item) => (
                                <button
                                  className="attentionTaskRow"
                                  key={item.key}
                                  onClick={item.open}
                                  type="button"
                                >
                                  <span>
                                    <strong>{item.title}</strong>
                                    <small>
                                      {item.type} / {item.date || "--"}
                                    </small>
                                  </span>
                                  <em>Missed</em>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="homeEmptyText">
                              No missed tasks right now.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </section>

                  {!isClientPortal && (
                    <section className="clientHomePanel submissionsHomePanel">
                      <div className="clientHomePanelHeader">
                        <div>
                          <span>Results</span>
                          <h2>Recent Submissions</h2>
                        </div>
                        <button
                          className="outlineButton"
                          onClick={() => loadContentResponses(selectedClient)}
                          disabled={contentResponsesLoading}
                        >
                          {contentResponsesLoading ? "Loading" : "Reload"}
                        </button>
                      </div>

                      <div className="submissionList">
                        <div className="submissionCategory">
                          <h3>Workouts</h3>
                          {recentWorkoutSubmissions.length > 0 ? (
                            recentWorkoutSubmissions.map((workout) => (
                              <button
                                className="submissionSummaryButton"
                                key={workout.id}
                                onClick={() => openWorkout(workout)}
                              >
                                <span>{localizedWorkoutName(workout)}</span>
                                <time>
                                  {normalizeDate(String(workout.scheduledDate)) || "--"}
                                </time>
                              </button>
                            ))
                          ) : (
                            <p className="homeEmptyText">No workout submissions yet.</p>
                          )}
                        </div>

                        <div className="submissionCategory">
                          <h3>Questionnaires</h3>
                          {recentQuestionnaireResponses.length > 0 ? (
                            recentQuestionnaireResponses.map((submission) => (
                              <button
                                className="submissionSummaryButton"
                                key={submission.key}
                                onClick={() => setSelectedContentSubmission(submission)}
                              >
                                <span>{submission.title}</span>
                                <time>{submission.submittedAt || "--"}</time>
                              </button>
                            ))
                          ) : (
                            <p className="homeEmptyText">
                              No questionnaire submissions yet.
                            </p>
                          )}
                        </div>

                        <div className="submissionCategory">
                          <h3>Tests</h3>
                          {recentTestResponses.length > 0 ? (
                            recentTestResponses.map((submission) => (
                              <button
                                className="submissionSummaryButton"
                                key={submission.key}
                                onClick={() => setSelectedContentSubmission(submission)}
                              >
                                <span>{submission.title}</span>
                                <time>{submission.submittedAt || "--"}</time>
                              </button>
                            ))
                          ) : (
                            <p className="homeEmptyText">No test submissions yet.</p>
                          )}
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              )}

              {clientTab === "Overview" && (
                <div className="overviewGrid">
                  <div className="profileCard">
                    <h3>{t("clientInformation")}</h3>
                    <div className="clientInfoRows">
                        <div>
                          <span>{t("languagePreference")}</span>
                          <select
                            value={selectedClient.languagePreference || "English"}
                            onChange={(event) =>
                              updateClientLanguagePreference(event.target.value)
                            }
                          >
                            <option value="English">{t("english")}</option>
                            <option value="Mandarin">{t("mandarin")}</option>
                          </select>
                        </div>
                      <div>
                        <span>{t("name")}</span>
                        <strong>{selectedClient.name}</strong>
                      </div>
                      <div>
                        <span>{t("email")}</span>
                        <strong>{selectedClient.email || "--"}</strong>
                      </div>
                      <div>
                        <span>{t("phoneWechat")}</span>
                        <strong>{selectedClient.phone || "--"}</strong>
                      </div>
                      <div>
                        <span>{t("coach")}</span>
                        <strong>
                          {getCoachDisplayName(
                            selectedClient.coach || selectedClient.primaryCoach || "--"
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Client Type</span>
                        <strong>{selectedClient.clientType || "--"}</strong>
                      </div>
                      <div>
                        <span>{t("package")}</span>
                        <strong>
                          {selectedClient.package ||
                            selectedClient.status ||
                            "--"}
                        </strong>
                      </div>
                      <div>
                        <span>Subscription</span>
                        <strong>{selectedClient.subscriptionStatus || "--"}</strong>
                      </div>
                      <div>
                        <span>Intake</span>
                        <strong>{selectedClient.intakeStatus || "--"}</strong>
                      </div>
                      <div>
                        <span>Payment</span>
                        <strong>{selectedClient.paymentStatus || "--"}</strong>
                      </div>
                      <div>
                        <span>Latest Order</span>
                        <strong>
                          {selectedClientLatestOrder
                            ? `${selectedClientLatestOrder.productName || "Order"} - ${
                                selectedClientLatestOrder.paymentStatus || "--"
                              }`
                            : "--"}
                        </strong>
                      </div>
                      <div>
                        <span>Source</span>
                        <strong>{selectedClient.source || "--"}</strong>
                      </div>
                      <div>
                        <span>{t("startDate")}</span>
                        <strong>{selectedClient.startDate || "--"}</strong>
                      </div>
                      <div>
                        <span>Access Window</span>
                        <strong>
                          {selectedClient.accessStartDate || "--"} to{" "}
                          {selectedClient.accessEndDate || "--"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {!isClientPortal && (
                  <div className="profileCard">
                    <h3>Coach Notes</h3>
                    <p className="coachNotesPreview">
                      {selectedClient.notes || "No notes yet."}
                    </p>
                    <textarea placeholder="Add private coach notes here..." />
                  </div>
                  )}
                </div>
              )}

              {clientTab === "Programs" && (
                <div className="clientProgramsPage">
                  <section className="clientProgramsPanel">
                    <div className="clientProgramsHeader">
                      <div>
                        <span>{t("purchasedPrograms")}</span>
                        <h2>{t("myPrograms")}</h2>
                      </div>
                      {clientProgramSessions.length > 0 && (
                        <strong>
                          {t("sessionsReady", {
                            count: clientProgramSessions.length,
                          })}
                        </strong>
                      )}
                    </div>

                    {uniqueClientPurchasedPrograms.length > 0 ? (
                      <>
                        <div className="clientProgramPicker">
                          <label>
                            {t("chooseProgram")}
                            <select
                              value={
                                selectedClientProgram?.recordId ||
                                selectedClientProgramId
                              }
                              onChange={(event) => {
                                setSelectedClientProgramId(event.target.value);
                                setClientProgramSessions([]);
                                setClientProgramDayDates({});
                                setClientProgramWeekStarts({});
                              }}
                            >
                              {uniqueClientPurchasedPrograms.map((program) => (
                                <option
                                  value={program.recordId}
                                  key={program.recordId}
                                >
                                  {localizedProgramName(program)}
                                </option>
                              ))}
                            </select>
                          </label>

                          {selectedClientProgram && (
                            <div className="clientProgramCard">
                              <div>
                                <span>{selectedClientProgram.productType || "Program"}</span>
                                <h3>{localizedProgramName(selectedClientProgram)}</h3>
                              </div>
                              <p>
                                {selectedClientProgram.durationWeeks || "--"} {t("week")}
                                {Number(selectedClientProgram.durationWeeks) === 1
                                  ? ""
                                  : "s"}{" "}
                                • {selectedClientProgram.sessionsPerWeek || "--"} sessions/week
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="clientProgramScheduler">
                          <div>
                            <span>{t("scheduleMethod")}</span>
                            <div className="clientProgramModeToggle">
                              {(["Month", "Week", "Day"] as ClientProgramScheduleMode[]).map(
                                (mode) => (
                                  <button
                                    key={mode}
                                    type="button"
                                    className={
                                      clientProgramScheduleMode === mode
                                        ? "active"
                                        : ""
                                    }
                                    onClick={() => setClientProgramScheduleMode(mode)}
                                  >
                                    {mode === "Day" ? t("dayByDay") : t(mode.toLowerCase())}
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          <label>
                            {t("programStartDate")}
                            <input
                              type="date"
                              value={clientProgramStartDate}
                              onChange={(event) =>
                                setClientProgramStartDate(event.target.value)
                              }
                            />
                          </label>

                          <button
                            type="button"
                            className="outlineButton"
                            onClick={() => loadClientProgramSessions()}
                            disabled={
                              loadingClientProgramSessions || !selectedClientProgram
                            }
                          >
                            {loadingClientProgramSessions
                              ? t("loadingWorkouts")
                              : t("previewDates")}
                          </button>
                        </div>

                        {clientProgramScheduleMode === "Week" &&
                          clientProgramWeekNumbers.length > 0 && (
                            <div className="clientProgramDateGrid">
                              {clientProgramWeekNumbers.map((week) => (
                                <label key={week}>
                                  {t("weekStarts", { week })}
                                  <input
                                    type="date"
                                    value={
                                      clientProgramWeekStarts[String(week)] ||
                                      addDays(
                                        clientProgramStartDate,
                                        (Number(week) - 1) * 7
                                      )
                                    }
                                    onChange={(event) =>
                                      setClientProgramWeekStarts((current) => ({
                                        ...current,
                                        [String(week)]: event.target.value,
                                      }))
                                    }
                                  />
                                </label>
                              ))}
                            </div>
                          )}

                        {clientProgramScheduleMode === "Day" &&
                          clientProgramSessions.length > 0 && (
                            <div className="clientProgramDayList">
                              {clientProgramScheduledWorkouts.map((workout) => (
                                <label key={workout.localId}>
                                  <span>
                                    {workout.sessionName} • {t("week")}{" "}
                                    {workout.week}, {t("day")} {workout.day}
                                  </span>
                                  <input
                                    type="date"
                                    value={workout.scheduledDate}
                                    onChange={(event) =>
                                      setClientProgramDayDates((current) => ({
                                        ...current,
                                        [workout.localId]: event.target.value,
                                      }))
                                    }
                                  />
                                </label>
                              ))}
                            </div>
                          )}

                        {clientProgramScheduledWorkouts.length > 0 && (
                          <div className="clientProgramPreview">
                            <div className="clientProgramPreviewHeader">
                              <h3>{t("atAGlance")}</h3>
                              <button
                                type="button"
                                className="primaryButton"
                                onClick={populateClientProgramCalendar}
                                disabled={populatingClientProgram}
                              >
                                {populatingClientProgram
                                  ? t("submitting")
                                  : t("populateCalendar")}
                              </button>
                            </div>
                            <div className="clientProgramPreviewRows">
                              {clientProgramScheduledWorkouts.map((workout) => (
                                <div
                                  className="clientProgramPreviewRow"
                                  key={workout.localId}
                                >
                                  <div>
                                    <strong>{workout.sessionName}</strong>
                                    <span>
                                      {t("week")} {workout.week} • {t("day")}{" "}
                                      {workout.day}
                                    </span>
                                  </div>
                                  <time>{localizedCalendarLabel(workout.scheduledDate)}</time>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="clientProgramEmpty">
                        <BookOpen size={34} strokeWidth={1.8} />
                        <h3>{t("noPurchasedPrograms")}</h3>
                        <p>
                          Your purchased digital programs will appear here after
                          checkout or coach setup.
                        </p>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {clientTab === "Training" && (
                <div className="trainingCalendar">
                  {isClientPortal && clientPortalUpcomingWorkouts[0] && (
                    <section className="clientPortalTrainingHero">
                      <div>
                        <span>{t("nextWorkout")}</span>
                        <h2>
                          {clientPortalUpcomingWorkouts[0]
                            ? localizedWorkoutName(clientPortalUpcomingWorkouts[0])
                            : t("calendar")}
                        </h2>
                        <p>
                          {clientPortalUpcomingWorkouts[0]
                            ? `${localizedCalendarLabel(
                                normalizeDate(
                                  String(
                                    clientPortalUpcomingWorkouts[0].scheduledDate
                                  )
                                )
                              )} • ${t("week")} ${
                                clientPortalUpcomingWorkouts[0].week
                              } ${t("day")} ${clientPortalUpcomingWorkouts[0].day}`
                            : t("noUpcomingWorkouts")}
                        </p>
                      </div>

                      {clientPortalUpcomingWorkouts[0] && (
                        <button
                          className="goldButton compactNextWorkoutButton"
                          onClick={() =>
                            openWorkout(clientPortalUpcomingWorkouts[0])
                          }
                        >
                          {t("start")}
                        </button>
                      )}
                    </section>
                  )}

                  {false && isClientPortal && clientPortalUpcomingWorkouts.length > 0 && (
                    <section className="clientPortalWorkoutList">
                      <h3>Upcoming Workouts</h3>
                      {clientPortalUpcomingWorkouts.map((workout) => (
                        <button
                          key={workout.id}
                          className="clientPortalWorkoutItem"
                          onClick={() => openWorkout(workout)}
                        >
                          <span>
                            {formatCalendarLabel(
                              normalizeDate(String(workout.scheduledDate))
                            )}
                          </span>
                          <strong>{workout.sessionName || "Workout"}</strong>
                          <small>
                            Week {workout.week} • Day {workout.day} •{" "}
                            {getDisplayTaskStatus(
                              workout.completionStatus,
                              workout.scheduledDate
                            )}
                          </small>
                        </button>
                      ))}
                    </section>
                  )}

                  <div className="calendarHeader">
                    <h2>{t("trainingCalendar")}</h2>

                    {isClientPortal && (
                      <div className="clientCalendarViewToggle">
                        {(["Week", "Month", "Full"] as const).map((view) => (
                          <button
                            key={view}
                            className={
                              clientCalendarStyle === view ? "active" : ""
                            }
                            onClick={() => setClientCalendarStyle(view)}
                            type="button"
                          >
                            {t(view.toLowerCase())}
                          </button>
                        ))}
                      </div>
                    )}

                    {!isClientPortal && (
                    <div className="calendarControls">
                      {(["Week", "Month", "Full"] as CalendarView[]).map(
                        (view) => (
                          <button
                            key={view}
                            className={
                              calendarView === view ? "goldButton" : "outlineButton"
                            }
                            onClick={() => setCalendarView(view)}
                          >
                            {view}
                          </button>
                        )
                      )}

                      <div className="calendarAddMenuWrap">
                        <button
                          className="iconActionButton calendarAddButton"
                          onClick={() =>
                            setShowCalendarActionMenu((current) => !current)
                          }
                          type="button"
                          title="Add to calendar"
                          aria-label="Add to calendar"
                        >
                          <Plus size={19} aria-hidden="true" />
                        </button>

                        {showCalendarActionMenu && (
                          <div className="calendarAddMenu">
                            <button
                              type="button"
                              onClick={() => {
                                openAssignmentHubFromCalendar("Program");
                              }}
                            >
                              Add Workout
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                openAssignmentHubFromCalendar("Check-in");
                              }}
                            >
                              Add Check-in Program
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                openAssignmentHubFromCalendar("Questionnaire");
                              }}
                            >
                              Add Form
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                openAssignmentHubFromCalendar("Physical Test");
                              }}
                            >
                              Add Physical Test
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    )}
                  </div>

                  <div className="calendarNavigator">
                    <div className="calendarRangeControls">
                      <button
                        className="outlineButton"
                        onClick={() => moveCalendarRange(-1)}
                      >
                        {t("previous")}
                      </button>

                      <strong>
                        {isClientPortal && clientCalendarStyle === "Week"
                          ? clientWeekRangeLabel
                          : isClientPortal && clientCalendarStyle === "Month"
                          ? localizedMonthTitle(clientMonthAnchorDate)
                          : isClientPortal && clientCalendarStyle === "Full"
                          ? localizedMonthTitle(calendarAnchorDate)
                          : calendarRangeLabel}
                      </strong>

                      <button
                        className="outlineButton"
                        onClick={() => moveCalendarRange(1)}
                      >
                        {t("next")}
                      </button>
                    </div>

                    <div className="calendarQuickControls">
                      <button
                        className="outlineButton todayButton"
                        onClick={() => {
                          if (isClientPortal) {
                            jumpClientCalendarToToday();
                            return;
                          }

                          setCalendarAnchorDate(dateToInputValue(new Date()));
                        }}
                      >
                        {t("today")}
                      </button>

                      <label className="calendarDatePickerButton" title="Choose date">
                        <CalendarDays size={18} strokeWidth={2.2} aria-hidden="true" />
                        <span className="srOnly">{t("chooseDate")}</span>
                        <input
                          type="date"
                          value={calendarAnchorDate}
                          onChange={(e) => {
                            const nextDate = normalizeDate(e.target.value);
                            if (isClientPortal) {
                              selectClientCalendarDate(nextDate);
                              return;
                            }

                            setCalendarAnchorDate(nextDate);
                            setAssignStartDate(nextDate);
                            setAssignmentDueDate(nextDate);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {false && !isClientPortal && (
                  <section className="assignProgramPanel">
                    <h3>Assign Task</h3>

                    <div className="assignProgramGrid">
                      <label>
                        <span>Type</span>
                        <select
                          className="miniSearch"
                          value={assignmentType}
                          onChange={(e) => {
                            const nextType = e.target.value;
                            setAssignmentType(nextType);
                            setAssignmentTemplateId("");
                            setAssignableWorkouts([]);
                            if (selectedClient) {
                              setAssignmentClientId(selectedClient.id);
                            }
                            setAssignmentDueDate(calendarAnchorDate);
                            setAssignStartDate(calendarAnchorDate);
                          }}
                        >
                          <option>Program</option>
                          <option>Check-in</option>
                          <option>Questionnaire</option>
                          <option>Physical Test</option>
                        </select>
                      </label>

                      {assignmentType === "Program" ? (
                        <label>
                          <span>Program</span>
                          <select
                            className="miniSearch"
                            value={selectedAssignProgramId}
                            onChange={(e) => {
                              setSelectedAssignProgramId(e.target.value);
                              setAssignableWorkouts([]);
                            }}
                          >
                            {programs.map((program) => (
                              <option key={program.recordId} value={program.programId}>
                                {program.programName}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <label>
                          <span>
                            {assignmentType === "Physical Test"
                              ? "Saved Test"
                              : "Saved Form"}
                          </span>
                          <select
                            key={assignmentType}
                            className="miniSearch"
                            value={assignmentTemplateId}
                            onChange={(e) => setAssignmentTemplateId(e.target.value)}
                          >
                            <option value="">
                              {assignmentTemplateOptions.length === 0
                                ? assignmentType === "Physical Test"
                                  ? "No saved tests"
                                  : "No saved forms"
                                : "Select saved item"}
                            </option>
                            {assignmentTemplateOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label} ({option.meta})
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      <label>
                        <span>Start Date</span>
                        <input
                          ref={calendarAssignmentDateInputRef}
                          type="date"
                          className="miniSearch"
                          value={
                            assignmentType === "Program"
                              ? assignStartDate
                              : calendarAnchorDate
                          }
                          onChange={(e) => {
                            const nextDate = normalizeDate(e.target.value);
                            if (assignmentType === "Program") {
                              shiftAssignableWorkoutsToStartDate(nextDate);
                            } else {
                              setCalendarAnchorDate(nextDate);
                            }
                          }}
                        />
                      </label>

                      {assignmentType === "Program" ? (
                        <>
                          <button
                            className="outlineButton"
                            onClick={loadProgramSessionsForAssignment}
                            disabled={assignLoading}
                          >
                            {assignLoading ? "Loading..." : "Load Sessions"}
                          </button>

                          <button
                            className="goldButton"
                            onClick={assignProgramToClient}
                            disabled={assigningProgram}
                          >
                            {assigningProgram ? "Assigning..." : "Assign Program"}
                          </button>
                        </>
                      ) : (
                        <button
                          className="goldButton"
                          onClick={() => {
                            void createContentAssignment({
                              assignmentType,
                              assignmentTemplateId,
                              assignmentClientId: selectedClient?.id || "",
                              assignmentDueDate: normalizeDate(
                                calendarAssignmentDateInputRef.current?.value ||
                                  calendarAnchorDate
                              ),
                            });
                          }}
                          disabled={creatingAssignment}
                        >
                          {creatingAssignment ? "Assigning..." : "Assign Task"}
                        </button>
                      )}
                    </div>

                    {assignmentType === "Program" && assignableWorkouts.length > 0 && (
                      <div className="arrangeWorkouts">
                        <h4>Arrange Workouts</h4>

                        {assignableWorkouts.map((workout) => (
                          <div
                            key={workout.localId}
                            className="arrangeWorkoutRow"
                          >
                            <span>Week {workout.week}</span>
                            <span>Day {workout.day}</span>
                            <strong>{workout.sessionName}</strong>

                            <input
                              type="date"
                              className="miniSearch"
                              value={workout.scheduledDate}
                              onChange={(e) =>
                                updateAssignableWorkoutDate(
                                  workout.localId,
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                  )}

                  {workoutsLoading && <p>Loading workouts...</p>}

                  <div
                    className={
                      isClientPortal && clientCalendarStyle === "Week"
                        ? "clientTrainingCalendarSolo"
                        : "clientTrainingCalendarSolo"
                    }
                  >
                    <div className="clientTrainingWeekPanel">
                  <div
                    className={
                      isClientPortal && clientCalendarStyle === "Week"
                        ? "calendarGrid clientWeekStripCalendar"
                        : isClientPortal && clientCalendarStyle === "Month"
                        ? "clientCalendarHidden"
                        : isClientPortal && clientCalendarStyle === "Full"
                        ? "calendarGrid monthCalendar clientFullCalendar"
                        : !isClientPortal && calendarView === "Month"
                        ? "clientCalendarHidden"
                        : calendarView === "Week"
                        ? "calendarGrid weekCalendar"
                        : "calendarGrid monthCalendar"
                    }
                  >
                    {(isClientPortal && clientCalendarStyle === "Week"
                      ? clientWeekStripDates
                      : isClientPortal && clientCalendarStyle === "Full"
                      ? getMonthDates(calendarAnchorDate)
                      : !isClientPortal && calendarView === "Month"
                      ? []
                      : calendarDates
                    ).map((date) => {
                      const dayWorkouts = getWorkoutsForDate(date);
                      const dayAssignments = getAssignmentsForDate(date);
                      const dayItemCount = dayWorkouts.length + dayAssignments.length;
                      const weekStripLabel = localizedWeekStripLabel(date);

                      return (
                        <div
                          className={`calendarDay ${
                            draggingWorkoutId || draggingAssignmentId
                              ? "calendarDropTarget"
                              : ""
                          } ${
                            isClientPortal && date === calendarAnchorDate
                              ? "selectedCalendarDay"
                              : ""
                          } ${
                            dayItemCount > 0 ? "hasCalendarWork" : ""
                          }`}
                          key={date}
                          onDragOver={(event: DragEvent<HTMLDivElement>) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(event: DragEvent<HTMLDivElement>) => {
                            event.preventDefault();

                            const transferType = event.dataTransfer.getData(
                              "application/x-nolimit-type"
                            );
                            const transferId =
                              event.dataTransfer.getData("text/plain") ||
                              draggingWorkoutId ||
                              draggingAssignmentId;
                            const assignment =
                              transferType === "assignment"
                                ? contentAssignments.find(
                                    (item) => item.recordId === transferId
                                  )
                                : undefined;

                            if (assignment) {
                              void moveContentAssignmentToDate(assignment, date);
                              return;
                            }

                            const workout = workouts.find(
                              (item) => item.id === transferId
                            );

                            if (workout) {
                              void moveWorkoutToDate(workout, date);
                            }
                          }}
                          onContextMenu={(event) => {
                            if (isClientPortal || !copiedCalendarItem) return;
                            event.preventDefault();
                            event.stopPropagation();
                            openCalendarActionMenu(event.clientX, event.clientY, {
                              kind: "date",
                              date,
                            });
                          }}
                          onTouchStart={(event) => {
                            if (!copiedCalendarItem) return;
                            startCalendarLongPress(event, {
                              kind: "date",
                              date,
                            });
                          }}
                          onTouchMove={clearCalendarLongPress}
                          onTouchEnd={clearCalendarLongPress}
                          onTouchCancel={clearCalendarLongPress}
                          onClick={() => {
                            if (consumeCalendarLongPressClick()) return;
                            if (isClientPortal) {
                              selectClientCalendarDate(
                                date,
                                clientCalendarStyle !== "Week"
                              );
                            } else {
                              setCalendarAnchorDate(date);
                              setAssignStartDate(date);
                              setAssignmentDueDate(date);
                            }
                          }}
                        >
                          <strong className="calendarDateLabel">
                            {isClientPortal &&
                            clientCalendarStyle === "Week" ? (
                              <>
                                <span>{weekStripLabel.weekday}</span>
                                <b>{weekStripLabel.day}</b>
                              </>
                            ) : (
                              localizedCalendarLabel(date)
                            )}
                          </strong>

                          {!isClientPortal &&
                            (calendarView === "Week" || calendarView === "Full") && (
                              <div className="calendarDayActions">
                                {copiedCalendarItem && (
                                  <button
                                    className="calendarDayActionButton pasteDayButton"
                                    type="button"
                                    aria-label={`Paste ${copiedCalendarItem.label} on ${localizedCalendarLabel(date)}`}
                                    title={`Paste ${copiedCalendarItem.label}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void pasteCalendarItemToDate(date);
                                    }}
                                  >
                                    {copiedCalendarItem.action === "copy"
                                      ? "Paste Copy"
                                      : "Paste Cut"}
                                  </button>
                                )}
                                <button
                                  className="calendarDayActionButton"
                                  type="button"
                                  aria-label={`Add item on ${localizedCalendarLabel(date)}`}
                                  title="Add item"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openAssignmentHubFromCalendar("Program", date);
                                  }}
                                >
                                  <Plus size={16} aria-hidden="true" />
                                </button>
                              </div>
                            )}

                          {isClientPortal && (
                            <span className="calendarWorkMarkers" aria-hidden="true">
                              {dayItemCount > 0 ? (
                                <>
                                  {Array.from({
                                    length: Math.min(dayItemCount, 3),
                                  }).map((_, index) => (
                                    <span key={`${date}-marker-${index}`} />
                                  ))}
                                </>
                              ) : (
                                <span className="emptyMarker" />
                              )}
                            </span>
                          )}

                          {(!isClientPortal ||
                            clientCalendarStyle === "Full") &&
                            dayWorkouts.map((workout) => (
                            <div
                              className={`workoutBlock ${getStatusClass(
                                getDisplayTaskStatus(
                                  workout.completionStatus,
                                  workout.scheduledDate
                                )
                              )} ${
                                normalizeDate(String(workout.scheduledDate)) ===
                                  todayValue &&
                                getDisplayTaskStatus(
                                  workout.completionStatus,
                                  workout.scheduledDate
                                ) === "Scheduled"
                                  ? "dueTodayCalendarItem"
                                  : ""
                              } ${
                                draggingWorkoutId === workout.id
                                  ? "draggingWorkout"
                                  : ""
                              } ${
                                movingWorkoutId === workout.id
                                  ? "movingWorkout"
                                  : ""
                              }`}
                              key={workout.id}
                              draggable={!isClientPortal}
                              role="button"
                              tabIndex={0}
                              title={
                                isClientPortal
                                  ? "Open workout"
                                  : "Drag to another day to reschedule"
                              }
                              onDragStart={(event) => {
                                if (isClientPortal) return;
                                event.dataTransfer.setData("text/plain", workout.id);
                                event.dataTransfer.effectAllowed = "move";
                                setDraggingWorkoutId(workout.id);
                              }}
                              onDragEnd={() => setDraggingWorkoutId("")}
                              onContextMenu={(event) => {
                                if (isClientPortal) return;
                                event.preventDefault();
                                event.stopPropagation();
                                openCalendarActionMenu(event.clientX, event.clientY, {
                                  kind: "item",
                                  item: { type: "workout", workout },
                                });
                              }}
                              onTouchStart={(event) => {
                                event.stopPropagation();
                                startCalendarLongPress(event, {
                                  kind: "item",
                                  item: { type: "workout", workout },
                                });
                              }}
                              onTouchMove={clearCalendarLongPress}
                              onTouchEnd={clearCalendarLongPress}
                              onTouchCancel={clearCalendarLongPress}
                              onClick={() => {
                                if (consumeCalendarLongPressClick()) return;
                                openWorkout(workout);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openWorkout(workout);
                                }
                              }}
                            >
                              <div className="workoutBlockMain">
                                {localizedWorkoutName(workout)}
                                <span>
                                  {movingWorkoutId === workout.id
                                    ? "Moving..."
                                    : getDisplayTaskStatus(
                                        workout.completionStatus,
                                        workout.scheduledDate
                                      )}
                                </span>
                              </div>

                            </div>
                          ))}

                          {(!isClientPortal ||
                            clientCalendarStyle === "Full") &&
                            dayAssignments.map((assignment) => (
                              <div
                                className={`workoutBlock ${getStatusClass(
                                  getDisplayTaskStatus(
                                    assignment.status,
                                    assignment.dueDate || assignment.assignedDate
                                  )
                                )} ${
                                  normalizeDate(
                                    String(
                                      assignment.dueDate ||
                                        assignment.assignedDate
                                    )
                                  ) === todayValue &&
                                  getDisplayTaskStatus(
                                    assignment.status,
                                    assignment.dueDate ||
                                      assignment.assignedDate
                                  ) === "Scheduled"
                                    ? "dueTodayCalendarItem"
                                    : ""
                                } assignmentBlock ${
                                  draggingAssignmentId === assignment.recordId
                                    ? "draggingWorkout"
                                    : ""
                                } ${
                                  movingAssignmentId === assignment.recordId
                                    ? "movingWorkout"
                                    : ""
                                }`}
                                key={assignment.recordId}
                                role="button"
                                tabIndex={0}
                                draggable={!isClientPortal}
                                title="Open assignment"
                                onDragStart={(event) => {
                                  if (isClientPortal) return;
                                  event.dataTransfer.setData(
                                    "application/x-nolimit-type",
                                    "assignment"
                                  );
                                  event.dataTransfer.setData(
                                    "text/plain",
                                    assignment.recordId
                                  );
                                  event.dataTransfer.effectAllowed = "move";
                                  setDraggingAssignmentId(assignment.recordId);
                                }}
                                onDragEnd={() => setDraggingAssignmentId("")}
                                onContextMenu={(event) => {
                                  if (isClientPortal) return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  openCalendarActionMenu(event.clientX, event.clientY, {
                                    kind: "item",
                                    item: { type: "assignment", assignment },
                                  });
                                }}
                                onTouchStart={(event) => {
                                  event.stopPropagation();
                                  startCalendarLongPress(event, {
                                    kind: "item",
                                    item: { type: "assignment", assignment },
                                  });
                                }}
                                onTouchMove={clearCalendarLongPress}
                                onTouchEnd={clearCalendarLongPress}
                                onTouchCancel={clearCalendarLongPress}
                                onClick={() => {
                                  if (consumeCalendarLongPressClick()) return;
                                  handleOpenContentAssignment(assignment);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    handleOpenContentAssignment(assignment);
                                  }
                                }}
                              >
                                <div className="workoutBlockMain">
                                  {getAssignmentDisplayName(assignment)}
                                  <span>
                                    {movingAssignmentId === assignment.recordId
                                      ? "Moving..."
                                      : getDisplayTaskStatus(
                                          assignment.status,
                                          assignment.dueDate ||
                                            assignment.assignedDate
                                        )}
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      );
                    })}
                  </div>

                  {isClientPortal && clientCalendarStyle === "Week" && (
                    <section className="selectedDayGlance">
                      <div className="selectedDayGlanceHeader">
                        <span>{localizedCalendarLabel(calendarAnchorDate)}</span>
                        <strong>
                          {selectedCalendarDateItemCount > 0
                            ? t("itemCount", {
                                count: selectedCalendarDateItemCount,
                              })
                            : t("nothingScheduled")}
                        </strong>
                      </div>

                      {selectedCalendarDateItemCount > 0 ? (
                        <>
                        {selectedCalendarDateWorkouts.map((workout) => (
                          <button
                            className="selectedDayWorkout"
                            key={workout.id}
                            onClick={() => openWorkout(workout)}
                          >
                            <div>
                              <span>
                                {t("week")} {workout.week} - {t("day")} {workout.day}
                              </span>
                              <strong>{localizedWorkoutName(workout)}</strong>
                              <small>
                                {getDisplayTaskStatus(
                                  workout.completionStatus,
                                  workout.scheduledDate
                                )}
                              </small>
                            </div>
                            <span className="selectedDayWorkoutAction">
                              {t("view")}
                            </span>
                          </button>
                        ))}
                        {selectedCalendarDateAssignments.map((assignment) => (
                          <button
                            className="selectedDayWorkout selectedDayAssignment"
                            key={assignment.recordId}
                            onClick={() => handleOpenContentAssignment(assignment)}
                          >
                            <div>
                              <span>{assignment.assignmentType || "Questionnaire"}</span>
                              <strong>
                                {getAssignmentDisplayName(assignment)}
                              </strong>
                              <small>
                                {getDisplayTaskStatus(
                                  assignment.status,
                                  assignment.dueDate || assignment.assignedDate
                                )}
                              </small>
                            </div>
                            <span className="selectedDayWorkoutAction">
                              {String(assignment.assignmentType)
                                .toLowerCase()
                                .includes("test")
                                ? t("start")
                                : "Answer"}
                            </span>
                            {!isClientPortal && (
                              <span
                                className="selectedDayDeleteAction"
                                role="button"
                                tabIndex={0}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void deleteContentAssignment(assignment);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    void deleteContentAssignment(assignment);
                                  }
                                }}
                              >
                                Delete
                              </span>
                            )}
                          </button>
                        ))}
                        </>
                      ) : (
                        <p className="homeEmptyText">
                          {t("nothingScheduled")}
                        </p>
                      )}
                    </section>
                  )}
                    </div>

                    {isClientPortal && clientCalendarStyle === "Month" && (
                      <aside className="clientMonthCalendarCard standaloneClientMonthCalendar">
                        <div className="clientMonthCalendarHeader">
                          <button
                            type="button"
                            className="clientMonthArrow"
                            onClick={() => moveClientMonth(-1)}
                            aria-label="Previous month"
                          >
                            {"<"}
                          </button>
                          <strong>{localizedMonthTitle(clientMonthAnchorDate)}</strong>
                          <button
                            type="button"
                            className="clientMonthArrow"
                            onClick={() => moveClientMonth(1)}
                            aria-label="Next month"
                          >
                            {">"}
                          </button>
                        </div>

                        <div className="clientMonthWeekdays">
                          {(useChineseClientText
                            ? ["一", "二", "三", "四", "五", "六", "日"]
                            : ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]
                          ).map((day) => (
                            <span key={day}>{day}</span>
                          ))}
                        </div>

                        <div className="clientMonthGrid">
                          {clientMonthCalendarDates.map((date, index) => {
                            if (!date) {
                              return (
                                <span
                                  className="clientMonthDay emptyClientMonthDay"
                                  key={`empty-${index}`}
                                />
                              );
                            }

                            const dateItemCount = getCalendarItemCountForDate(date);
                            const dayNumber = new Date(`${date}T00:00:00`).getDate();

                            return (
                              <button
                                type="button"
                                key={date}
                                className={`clientMonthDay ${
                                  date === calendarAnchorDate
                                    ? "selectedClientMonthDay"
                                    : ""
                                } ${
                                  date === todayValue ? "todayClientMonthDay" : ""
                                } ${
                                  dateItemCount > 0 ? "hasClientMonthWork" : ""
                                }`}
                                onClick={() => selectClientCalendarDate(date)}
                              >
                                <span>{dayNumber}</span>
                                <span
                                  className="calendarWorkMarkers"
                                  aria-hidden="true"
                                >
                                  {dateItemCount > 0 ? (
                                    Array.from({
                                      length: Math.min(dateItemCount, 3),
                                    }).map((_, markerIndex) => (
                                      <span key={`${date}-month-marker-${markerIndex}`} />
                                    ))
                                  ) : (
                                    <span className="emptyMarker" />
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </aside>
                    )}

                    {isClientPortal && clientCalendarStyle === "Month" && (
                      <section className="selectedDayGlance monthSelectedDayGlance">
                        <div className="selectedDayGlanceHeader">
                          <span>{localizedCalendarLabel(calendarAnchorDate)}</span>
                          <strong>
                            {selectedCalendarDateItemCount > 0
                              ? t("taskCount", {
                                  count: selectedCalendarDateItemCount,
                                })
                              : t("nothingScheduled")}
                          </strong>
                        </div>

                        {selectedCalendarDateItemCount > 0 ? (
                          <>
                          {selectedCalendarDateWorkouts.map((workout) => (
                            <button
                              className="selectedDayWorkout"
                              key={workout.id}
                              onClick={() => openWorkout(workout)}
                            >
                              <div>
                                <span>
                                  {t("program")} - {t("week")} {workout.week}, {t("day")} {workout.day}
                                </span>
                                <strong>{localizedWorkoutName(workout)}</strong>
                                <small>
                                  {getDisplayTaskStatus(
                                    workout.completionStatus,
                                    workout.scheduledDate
                                  )}
                                </small>
                              </div>
                              <span className="selectedDayWorkoutAction">
                                {t("start")}
                              </span>
                            </button>
                          ))}
                          {selectedCalendarDateAssignments.map((assignment) => (
                            <button
                              className="selectedDayWorkout selectedDayAssignment"
                              key={assignment.recordId}
                              onClick={() => handleOpenContentAssignment(assignment)}
                            >
                              <div>
                                <span>
                                  {assignment.assignmentType || "Questionnaire"}
                                </span>
                                <strong>
                                  {getAssignmentDisplayName(assignment)}
                                </strong>
                                <small>
                                  {getDisplayTaskStatus(
                                    assignment.status,
                                    assignment.dueDate || assignment.assignedDate
                                  )}
                                </small>
                              </div>
                              <span className="selectedDayWorkoutAction">
                                {String(assignment.assignmentType)
                                  .toLowerCase()
                                  .includes("test")
                                  ? t("start")
                                  : "Answer"}
                              </span>
                              {!isClientPortal && (
                                <span
                                  className="selectedDayDeleteAction"
                                  role="button"
                                  tabIndex={0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void deleteContentAssignment(assignment);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      void deleteContentAssignment(assignment);
                                    }
                                  }}
                                >
                                  Delete
                                </span>
                              )}
                            </button>
                          ))}
                          </>
                        ) : (
                          <p className="homeEmptyText">
                            {t("nothingScheduled")}
                          </p>
                        )}
                      </section>
                    )}

                    {!isClientPortal && calendarView === "Month" && (
                      <div className="coachMonthSchedule">
                        <aside className="clientMonthCalendarCard standaloneClientMonthCalendar">
                          <div className="clientMonthCalendarHeader">
                            <button
                              type="button"
                              className="clientMonthArrow"
                              onClick={() => moveCalendarRange(-1)}
                              aria-label="Previous month"
                            >
                              {"<"}
                            </button>
                            <strong>{formatMonthTitle(calendarAnchorDate)}</strong>
                            <button
                              type="button"
                              className="clientMonthArrow"
                              onClick={() => moveCalendarRange(1)}
                              aria-label="Next month"
                            >
                              {">"}
                            </button>
                          </div>

                          <div className="clientMonthWeekdays">
                            {["MO", "TU", "WE", "TH", "FR", "SA", "SU"].map(
                              (day) => (
                                <span key={day}>{day}</span>
                              )
                            )}
                          </div>

                          <div className="clientMonthGrid">
                            {coachMonthCalendarDates.map((date, index) => {
                              if (!date) {
                                return (
                                  <span
                                    className="clientMonthDay emptyClientMonthDay"
                                    key={`coach-empty-${index}`}
                                  />
                                );
                              }

                              const dateWorkouts = getWorkoutsForDate(date);
                              const dateItemCount =
                                dateWorkouts.length + getAssignmentsForDate(date).length;
                              const dayNumber = new Date(
                                `${date}T00:00:00`
                              ).getDate();

                              return (
                                <button
                                  type="button"
                                  key={date}
                                  className={`clientMonthDay ${
                                    date === calendarAnchorDate
                                      ? "selectedClientMonthDay"
                                      : ""
                                  } ${
                                    date === todayValue ? "todayClientMonthDay" : ""
                                  } ${
                                    dateItemCount > 0 ? "hasClientMonthWork" : ""
                                  }`}
                                  onClick={() => {
                                    setCalendarAnchorDate(date);
                                    setAssignStartDate(date);
                                    setAssignmentDueDate(date);
                                  }}
                                >
                                  <span>{dayNumber}</span>
                                  <span
                                    className="calendarWorkMarkers"
                                    aria-hidden="true"
                                  >
                                    {dateItemCount > 0 ? (
                                      Array.from({
                                        length: Math.min(dateItemCount, 3),
                                      }).map((_, markerIndex) => (
                                        <span
                                          key={`${date}-coach-month-marker-${markerIndex}`}
                                        />
                                      ))
                                    ) : (
                                      <span className="emptyMarker" />
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </aside>

                        <section className="selectedDayGlance coachSelectedDayGlance">
                          <div className="selectedDayGlanceHeader">
                            <span>{formatCalendarLabel(calendarAnchorDate)}</span>
                            <strong>
                              {selectedCalendarDateItemCount > 0
                                ? `${selectedCalendarDateItemCount} task${
                                    selectedCalendarDateItemCount === 1
                                      ? ""
                                      : "s"
                                  }`
                                : "Nothing scheduled"}
                            </strong>
                          </div>

                          {selectedCalendarDateItemCount > 0 ? (
                            <>
                            {selectedCalendarDateWorkouts.map((workout) => (
                              <button
                                className="selectedDayWorkout"
                                key={workout.id}
                                onClick={() => openWorkout(workout)}
                              >
                                <div>
                                  <span>
                                    Week {workout.week} - Day {workout.day}
                                  </span>
                                  <strong>{workout.sessionName || "Workout"}</strong>
                                  <small>
                                    {getDisplayTaskStatus(
                                      workout.completionStatus,
                                      workout.scheduledDate
                                    )}
                                  </small>
                                </div>
                                <span className="selectedDayWorkoutAction">
                                  Open
                                </span>
                              </button>
                            ))}
                            {selectedCalendarDateAssignments.map((assignment) => (
                              <button
                                className="selectedDayWorkout selectedDayAssignment"
                                key={assignment.recordId}
                                onClick={() => handleOpenContentAssignment(assignment)}
                              >
                                <div>
                                  <span>
                                    {assignment.assignmentType || "Questionnaire"}
                                  </span>
                                  <strong>
                                    {getAssignmentDisplayName(assignment)}
                                  </strong>
                                  <small>
                                    {getDisplayTaskStatus(
                                      assignment.status,
                                      assignment.dueDate || assignment.assignedDate
                                    )}
                                  </small>
                                </div>
                                <span className="selectedDayWorkoutAction">
                                  Open
                                </span>
                                <span
                                  className="selectedDayDeleteAction"
                                  role="button"
                                  tabIndex={0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void deleteContentAssignment(assignment);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      void deleteContentAssignment(assignment);
                                    }
                                  }}
                                >
                                  Delete
                                </span>
                              </button>
                            ))}
                            </>
                          ) : (
                            <p className="homeEmptyText">
                              Nothing scheduled for this date.
                            </p>
                          )}
                          {!isClientPortal && (
                            <>
                            {copiedCalendarItem && (
                              <button
                                className="outlineButton selectedDayAddButton selectedDayPasteButton"
                                type="button"
                                onClick={() =>
                                  void pasteCalendarItemToDate(calendarAnchorDate)
                                }
                              >
                                {copiedCalendarItem.action === "copy" ? (
                                  <Copy size={16} aria-hidden="true" />
                                ) : (
                                  <Scissors size={16} aria-hidden="true" />
                                )}
                                {copiedCalendarItem.action === "copy"
                                  ? "Paste copied item"
                                  : "Paste cut item"}
                              </button>
                            )}
                            <button
                              className="outlineButton selectedDayAddButton"
                              type="button"
                              onClick={() =>
                                openAssignmentHubFromCalendar(
                                  "Program",
                                  calendarAnchorDate
                                )
                              }
                            >
                              <Plus size={16} aria-hidden="true" />
                              Add item to this date
                            </button>
                            </>
                          )}
                        </section>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {showAnalyticsModal && (
          <div className="workout-modal-overlay">
            <div className="workout-modal analyticsModal">
              <div className="modal-header">
                <div>
                  <h2>
                    Workout Analytics
                    {selectedClient ? `: ${selectedClient.name}` : ""}
                  </h2>
                  <p>
                    {selectedClient
                      ? "Client-linked training completion and attention view."
                      : "Coach command view for training completion and client attention."}
                  </p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => setShowAnalyticsModal(false)}
                >
                  x
                </button>
              </div>

              {analyticsLoading && <p>Loading analytics...</p>}

              {!analyticsLoading && analytics && (
                <>
                  <section className="analyticsGrid">
                    <div className="analyticsCard">
                      <span>Completion Rate</span>
                      <strong>{analytics.summary.completionRate}%</strong>
                    </div>
                    <div className="analyticsCard">
                      <span>Completed Workouts</span>
                      <strong>{analytics.summary.completedWorkouts}</strong>
                    </div>
                    <div className="analyticsCard">
                      <span>Upcoming 7d</span>
                      <strong>{analytics.summary.upcomingWorkouts}</strong>
                    </div>
                    <div className="analyticsCard">
                      <span>Missed</span>
                      <strong>{analytics.summary.overdueWorkouts}</strong>
                    </div>
                    <div className="analyticsCard">
                      <span>Needs Programming</span>
                      <strong>{analytics.summary.needsProgramming}</strong>
                    </div>
                    <div className="analyticsCard">
                      <span>Needs Contact</span>
                      <strong>{analytics.summary.needsContact}</strong>
                    </div>
                  </section>

                  <section className="analyticsSection">
                    <div className="exerciseTitleRow">
                      <h3>Clients Needing Attention</h3>
                      <button className="outlineButton" onClick={loadAnalytics}>
                        Refresh
                      </button>
                    </div>

                    {analytics.attentionClients.length === 0 && (
                      <p>No attention items right now.</p>
                    )}

                    {analytics.attentionClients.map((client) => (
                      <div className="analyticsClientRow" key={client.clientId}>
                        <div>
                          <strong>{client.name}</strong>
                          <p>{client.clientId || "--"} / {client.status || "--"}</p>
                        </div>
                        <span>{client.overdueWorkouts} overdue</span>
                        <span>
                          {client.completedWorkouts}/{client.totalWorkouts} complete
                        </span>
                        <span className="attentionCell">
                          {client.needsProgram && (
                            <span className="attentionChip">Needs program</span>
                          )}
                          {client.needsContact && (
                            <span className="attentionChip">Needs contact</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </section>
                </>
              )}
            </div>
          </div>
        )}

        {technicalCueExercise && (
          <div className="workout-modal-overlay technicalCueOverlay">
            <div className="clientFormModal technicalCueModal">
              <div className="modal-header">
                <div>
                  <h2>{localizedExerciseName(technicalCueExercise)}</h2>
                  <p>{t("formInstructions")}</p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => setTechnicalCueExercise(null)}
                >
                  x
                </button>
              </div>

              <div className="technicalCueBody">
                {localizedExerciseNotes(technicalCueExercise) ? (
                  <pre>{localizedExerciseNotes(technicalCueExercise)}</pre>
                ) : (
                  <p>{t("noTechnicalCues")}</p>
                )}
              </div>

              <div className="modalActions">
                {!isClientPortal && (
                <button
                  className="outlineButton"
                  onClick={() => {
                    setTechnicalCueExercise(null);
                    openEditExerciseForm(technicalCueExercise);
                  }}
                >
                  {t("editCues")}
                </button>
                )}
                <button
                  className="goldButton"
                  onClick={() => setTechnicalCueExercise(null)}
                >
                  {t("done")}
                </button>
              </div>
            </div>
          </div>
        )}

        {checkInFormClient && (
          <div className="workout-modal-overlay">
            <div className="clientFormModal">
              <div className="modal-header">
                <div>
                  <h2>Check-in</h2>
                  <p>{checkInFormClient.name}</p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => setCheckInFormClient(null)}
                >
                  <X size={28} strokeWidth={3} aria-hidden="true" />
                </button>
              </div>

              <div className="clientFormGrid">
                {[
                  ["Body Weight", "bodyWeight", "kg"],
                  ["Sleep Quality", "sleepQuality", "1-10"],
                  ["Energy", "energy", "1-10"],
                  ["Mood", "mood", "Good, tired, stressed..."],
                  ["Stress", "stress", "1-10"],
                  ["Soreness", "soreness", "1-10"],
                ].map(([label, key, placeholder]) => (
                  <label key={key}>
                    <span>{label}</span>
                    <input
                      value={checkInForm[key as keyof typeof checkInForm]}
                      onChange={(e) =>
                        setCheckInForm({
                          ...checkInForm,
                          [key]: e.target.value,
                        })
                      }
                      placeholder={placeholder}
                    />
                  </label>
                ))}

                {[
                  ["Nutrition Notes", "nutritionNotes"],
                  ["Training Notes", "trainingNotes"],
                  ["Wins", "wins"],
                  ["Problems / Pain", "problemsPain"],
                ].map(([label, key]) => (
                  <label className="clientNotesField" key={key}>
                    <span>{label}</span>
                    <textarea
                      value={checkInForm[key as keyof typeof checkInForm]}
                      onChange={(e) =>
                        setCheckInForm({
                          ...checkInForm,
                          [key]: e.target.value,
                        })
                      }
                    />
                  </label>
                ))}
              </div>

              <div className="modalActions">
                <button
                  className="outlineButton"
                  onClick={() => setCheckInFormClient(null)}
                >
                  Cancel
                </button>
                <button
                  className="goldButton"
                  onClick={submitCheckInQuestionnaire}
                  disabled={savingCheckInClientId === checkInFormClient.id}
                >
                  {savingCheckInClientId === checkInFormClient.id
                    ? "Submitting..."
                    : "Submit Check-in"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAssignmentDrawer && !isClientPortal && selectedClient && (
          <div
            className="assignmentDrawerOverlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeAssignmentDrawer();
              }
            }}
          >
            <aside className="assignmentDrawer">
              <div className="assignmentDrawerHeader">
                <div>
                  <span>Assign</span>
                  <h2>New Task</h2>
                  <p>
                    {selectedClient.name} / {formatCalendarLabel(assignmentDueDate)}
                  </p>
                </div>
                <button
                  className="drawerClose"
                  onClick={closeAssignmentDrawer}
                  type="button"
                >
                  x
                </button>
              </div>

              <div className="assignmentDrawerTypes">
                {(["Program", "Questionnaire", "Physical Test", "Check-in"] as const).map(
                  (type) => (
                    <button
                      key={type}
                      className={assignmentType === type ? "active" : ""}
                      type="button"
                      onClick={() => {
                        setAssignmentType(type);
                        if (type === "Program") {
                          setAssignmentTemplateId("");
                        } else if (type === "Physical Test") {
                          const activeTests = savedTestTemplates.filter(
                            (test) => test.status !== "Archived"
                          );

                          setAssignmentTemplateId(
                            activeTests.length === 1
                              ? activeTests[0].testTemplateId
                              : ""
                          );
                        } else {
                          const formsForType = savedFormTemplates.filter((form) => {
                            const formType = form.type.toLowerCase();
                            return (
                              form.status !== "Archived" &&
                              (type === "Check-in"
                                ? formType.includes("check") ||
                                    formType.includes("readiness")
                                : true)
                            );
                          });

                          setAssignmentTemplateId(
                            formsForType.length === 1 ? formsForType[0].formId : ""
                          );
                        }
                        setAssignableWorkouts([]);
                        setAssignmentClientId(selectedClient.id);
                        setAssignmentDueDate(calendarAnchorDate);
                        setAssignStartDate(calendarAnchorDate);
                      }}
                    >
                      {type}
                    </button>
                  )
                )}
              </div>

              <div className="assignmentDrawerForm">
                <label>
                  <span>Client</span>
                  <input value={selectedClient.name} readOnly />
                </label>

                <label>
                  <span>Start Date</span>
                  <input
                    ref={calendarAssignmentDateInputRef}
                    type="date"
                    value={
                      assignmentType === "Program"
                        ? assignStartDate
                        : assignmentDueDate
                    }
                    onChange={(event) => {
                      const nextDate = normalizeDate(event.target.value);

                      setCalendarAnchorDate(nextDate);
                      setAssignmentDueDate(nextDate);

                      if (assignmentType === "Program") {
                        shiftAssignableWorkoutsToStartDate(nextDate);
                      }
                    }}
                  />
                </label>

                {assignmentType === "Program" ? (
                  <label className="assignmentDrawerWide">
                    <span>Saved Program</span>
                    <select
                      value={selectedAssignProgramId}
                      onChange={(event) => {
                        setSelectedAssignProgramId(event.target.value);
                        setAssignableWorkouts([]);
                      }}
                    >
                      {programs.length > 0 ? (
                        programs.map((program) => (
                          <option key={program.recordId} value={program.programId}>
                            {program.programName}
                          </option>
                        ))
                      ) : (
                        <option value="">No saved programs</option>
                      )}
                    </select>
                  </label>
                ) : (
                  <label className="assignmentDrawerWide">
                    <span>
                      {assignmentType === "Physical Test"
                        ? "Saved Test"
                        : "Saved Form"}
                    </span>
                    <select
                      key={assignmentType}
                      value={assignmentTemplateId}
                      onChange={(event) =>
                        setAssignmentTemplateId(event.target.value)
                      }
                    >
                      <option value="">
                        {assignmentTemplateOptions.length === 0
                          ? assignmentType === "Physical Test"
                            ? "No saved tests"
                            : "No saved forms"
                          : "Select saved item"}
                      </option>
                      {assignmentTemplateOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label} ({option.meta})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {assignmentType === "Program" && assignableWorkouts.length > 0 && (
                <div className="assignmentDrawerSessions">
                  <div>
                    <span>Program Preview</span>
                    <strong>{assignableWorkouts.length} sessions</strong>
                  </div>
                  {assignableWorkouts.map((workout) => (
                    <label key={workout.localId} className="drawerSessionRow">
                      <span>
                        Week {workout.week}, Day {workout.day}
                        <strong>{workout.sessionName}</strong>
                      </span>
                      <input
                        type="date"
                        value={workout.scheduledDate}
                        onChange={(event) =>
                          updateAssignableWorkoutDate(
                            workout.localId,
                            event.target.value
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              )}

              <div className="assignmentDrawerActions">
                <button
                  className="outlineButton"
                  onClick={closeAssignmentDrawer}
                  type="button"
                >
                  Cancel
                </button>

                {assignmentType === "Program" && (
                  <button
                    className="outlineButton"
                    onClick={loadProgramSessionsForAssignment}
                    disabled={assignLoading}
                    type="button"
                  >
                    {assignLoading ? "Loading..." : "Load Sessions"}
                  </button>
                )}

                <button
                  className="goldButton"
                  disabled={
                    assignmentType === "Program"
                      ? assigningProgram
                      : creatingAssignment
                  }
                  onClick={() => {
                    if (assignmentType === "Program") {
                      void assignProgramToClient();
                      return;
                    }

                    void createContentAssignment({
                      assignmentType,
                      assignmentTemplateId,
                      assignmentClientId: selectedClient.id,
                      assignmentDueDate: normalizeDate(
                        calendarAssignmentDateInputRef.current?.value ||
                          assignmentDueDate
                      ),
                    });
                  }}
                  type="button"
                >
                  {assignmentType === "Program"
                    ? assigningProgram
                      ? "Assigning..."
                      : "Assign Program"
                    : creatingAssignment
                    ? "Assigning..."
                    : "Assign Task"}
                </button>
              </div>
            </aside>
          </div>
        )}

        {showExerciseModal && (
          <div className="workout-modal-overlay">
            <div className="clientFormModal">
              <div className="modal-header">
                <div>
                  <h2>{editingExercise ? "Edit Exercise" : "Add Exercise"}</h2>
                  <p>
                    {editingExercise
                      ? "Update the exercise library record in Feishu."
                      : "Create a new exercise for programming and form cues."}
                  </p>
                </div>

                <button className="drawerClose" onClick={closeExerciseForm}>
                  x
                </button>
              </div>

              <div className="clientFormGrid">
                <label>
                  <span>Exercise Name</span>
                  <input
                    value={exerciseForm.exerciseName}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        exerciseName: e.target.value,
                      })
                    }
                    placeholder="Back Squat"
                  />
                </label>

                <label>
                  <span>Category</span>
                  <input
                    value={exerciseForm.category}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        category: e.target.value,
                      })
                    }
                    placeholder="Strength"
                  />
                </label>

                <label>
                  <span>Record</span>
                  <select
                    value={exerciseForm.trackingType}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        trackingType: e.target.value as TrackingType,
                      })
                    }
                  >
                    <option>Weight</option>
                    <option>Time</option>
                    <option>Distance</option>
                  </select>
                </label>

                <label className="toggleField">
                  <span>Unilateral</span>
                  <input
                    type="checkbox"
                    checked={exerciseForm.isUnilateral}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        isUnilateral: e.target.checked,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Video URL</span>
                  <input
                    value={exerciseForm.videoUrl}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        videoUrl: e.target.value,
                      })
                    }
                    placeholder="https://..."
                  />
                </label>

                <label className="clientNotesField">
                  <span>Form Instructions / Library Notes</span>
                  <textarea
                    value={exerciseForm.notes}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Setup, technique cues, common mistakes..."
                  />
                </label>
              </div>

              <div className="modalActions">
                <button className="outlineButton" onClick={closeExerciseForm}>
                  Cancel
                </button>

                <button
                  className="goldButton"
                  onClick={() => saveExerciseForm(false)}
                  disabled={savingExercise}
                >
                  {savingExercise
                    ? "Saving..."
                    : editingExercise
                    ? "Save Exercise"
                    : "Create Exercise"}
                </button>
              </div>
            </div>
          </div>
        )}

        {calendarActionMenu && (
          <div
            className="calendarContextMenu"
            style={{
              left: calendarActionMenu.x,
              top: calendarActionMenu.y,
            }}
            onClick={(event) => event.stopPropagation()}
            role="menu"
          >
            {calendarActionMenu.kind === "item" ? (
              <>
                <strong>
                  {calendarActionMenu.item.type === "workout"
                    ? localizedWorkoutName(calendarActionMenu.item.workout)
                    : getAssignmentDisplayName(calendarActionMenu.item.assignment)}
                </strong>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (calendarActionMenu.item.type === "workout") {
                      copyCalendarWorkout(calendarActionMenu.item.workout, "copy");
                    } else {
                      copyCalendarAssignment(
                        calendarActionMenu.item.assignment,
                        "copy"
                      );
                    }
                    closeCalendarActionMenu();
                  }}
                >
                  <Copy size={15} aria-hidden="true" />
                  Copy
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (calendarActionMenu.item.type === "workout") {
                      copyCalendarWorkout(calendarActionMenu.item.workout, "cut");
                    } else {
                      copyCalendarAssignment(
                        calendarActionMenu.item.assignment,
                        "cut"
                      );
                    }
                    closeCalendarActionMenu();
                  }}
                >
                  <Scissors size={15} aria-hidden="true" />
                  Cut
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="dangerContextAction"
                  onClick={() => {
                    if (calendarActionMenu.item.type === "workout") {
                      void deleteWorkout(calendarActionMenu.item.workout);
                    } else {
                      void deleteContentAssignment(
                        calendarActionMenu.item.assignment
                      );
                    }
                    closeCalendarActionMenu();
                  }}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  Delete
                </button>
              </>
            ) : (
              <>
                <strong>{formatCalendarLabel(calendarActionMenu.date)}</strong>
                {copiedCalendarItem && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      void pasteCalendarItemToDate(calendarActionMenu.date);
                      closeCalendarActionMenu();
                    }}
                  >
                    {copiedCalendarItem.action === "copy" ? (
                      <Copy size={15} aria-hidden="true" />
                    ) : (
                      <Scissors size={15} aria-hidden="true" />
                    )}
                    {copiedCalendarItem.action === "copy"
                      ? "Paste copy"
                      : "Paste cut"}
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setCopiedCalendarItem(null);
                    closeCalendarActionMenu();
                  }}
                >
                  <X size={15} aria-hidden="true" />
                  Cancel
                </button>
              </>
            )}
          </div>
        )}

        {showInviteModal && (
          <div className="workout-modal-overlay">
            <div className="clientFormModal inviteModal">
              <div className="modal-header">
                <div>
                  <h2>Invite Client</h2>
                  <p>
                    Send a private onboarding link that creates a pending client
                    record when submitted.
                  </p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => setShowInviteModal(false)}
                >
                  x
                </button>
              </div>

              <div className="clientFormGrid">
                <label>
                  <span>Default Status</span>
                  <select
                    value={coachInvitePackage}
                    onChange={(e) => setCoachInvitePackage(e.target.value)}
                  >
                    <option>Pending</option>
                    <option>Active</option>
                    <option>Premium</option>
                    <option>Online Coaching</option>
                  </select>
                </label>

                <label className="clientNotesField">
                  <span>Invite Link</span>
                  <div className="inviteCopyRow">
                    <input value={coachInviteLink} readOnly />
                    <button
                      className="outlineButton"
                      onClick={() =>
                        copyToClipboard(coachInviteLink, "Invite link")
                      }
                    >
                      Copy
                    </button>
                  </div>
                </label>

                <label className="clientNotesField">
                  <span>Message</span>
                  <textarea value={coachInviteMessage} readOnly />
                </label>
              </div>

              <div className="modalActions">
                <button
                  className="outlineButton"
                  onClick={() =>
                    copyToClipboard(coachInviteMessage, "Invite message")
                  }
                >
                  Copy Message
                </button>

                <button
                  className="goldButton"
                  onClick={() =>
                    copyToClipboard(coachInviteLink, "Invite link")
                  }
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddClientModal && (
          <div className="workout-modal-overlay">
            <div className="clientFormModal">
              <div className="modal-header">
                <div>
                  <h2>{editingClient ? "Edit Client" : "Add Client"}</h2>
                  <p>
                    {editingClient
                      ? "Update this client record in Feishu."
                      : "Create a client record in Feishu."}
                  </p>
                </div>

                <button
                  className="drawerClose"
                  onClick={closeClientForm}
                >
                  x
                </button>
              </div>

              <div className="clientFormGrid">
                <label>
                  <span>Name</span>
                  <input
                    value={newClient.name}
                    onChange={(e) =>
                      setNewClient({ ...newClient, name: e.target.value })
                    }
                    placeholder="Client name"
                  />
                </label>

                <label>
                  <span>Client Type</span>
                  <select
                    value={newClient.clientType}
                    onChange={(e) =>
                      setNewClient({ ...newClient, clientType: e.target.value })
                    }
                  >
                    <option>Digital Program</option>
                    <option>Online Coaching</option>
                    <option>In-Person Training</option>
                  </select>
                </label>

                <label>
                  <span>Primary Coach</span>
                  <select
                    value={newClient.primaryCoachId || newClient.coach}
                    onChange={(e) => {
                      const selectedCoach = activeCoaches.find(
                        (coach) =>
                          coach.recordId === e.target.value ||
                          coach.name === e.target.value
                      );

                      setNewClient({
                        ...newClient,
                        coach: selectedCoach?.name || e.target.value,
                        primaryCoachId: selectedCoach?.recordId || "",
                      });
                    }}
                  >
                    {activeCoaches.map((coach) => (
                      <option
                        key={coach.recordId || coach.coachId}
                        value={coach.recordId || coach.name}
                      >
                        {coach.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Secondary Coach</span>
                  <select
                    value={newClient.secondaryCoachId}
                    onChange={(e) =>
                      setNewClient({
                        ...newClient,
                        secondaryCoachId: e.target.value,
                      })
                    }
                  >
                    <option value="">None</option>
                    {activeCoaches.map((coach) => (
                      <option
                        key={coach.recordId || coach.coachId}
                        value={coach.recordId}
                      >
                        {coach.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Package Type</span>
                  <select
                    value={newClient.packageType}
                    onChange={(e) =>
                      setNewClient({ ...newClient, packageType: e.target.value })
                    }
                  >
                    <option>Active</option>
                    <option>Premium</option>
                    <option>Online Coaching</option>
                    <option>Paused</option>
                  </select>
                </label>

                <label>
                  <span>Package</span>
                  <input
                    value={newClient.packageName}
                    onChange={(e) =>
                      setNewClient({ ...newClient, packageName: e.target.value })
                    }
                    placeholder="Monthly, 3 months, digital plan..."
                  />
                </label>

                <label>
                  <span>{t("languagePreference")}</span>
                  <select
                    value={newClient.languagePreference}
                    onChange={(e) =>
                      setNewClient({
                        ...newClient,
                        languagePreference: e.target.value,
                      })
                    }
                  >
                    <option value="English">{t("english")}</option>
                    <option value="中文">{t("mandarin")}</option>
                  </select>
                </label>

                <label>
                  <span>Email</span>
                  <input
                    value={newClient.email}
                    onChange={(e) =>
                      setNewClient({ ...newClient, email: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </label>

                <label>
                  <span>Phone/WeChat</span>
                  <input
                    value={newClient.phone}
                    onChange={(e) =>
                      setNewClient({ ...newClient, phone: e.target.value })
                    }
                    placeholder="Phone or WeChat"
                  />
                </label>

                <label>
                  <span>Start Date</span>
                  <input
                    type="date"
                    value={newClient.startDate}
                    onChange={(e) =>
                      setNewClient({ ...newClient, startDate: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Subscription Status</span>
                  <select
                    value={newClient.subscriptionStatus}
                    onChange={(e) =>
                      setNewClient({
                        ...newClient,
                        subscriptionStatus: e.target.value,
                      })
                    }
                  >
                    <option>Active</option>
                    <option>Trial</option>
                    <option>Paused</option>
                    <option>Cancelled</option>
                    <option>Expired</option>
                  </select>
                </label>

                <label>
                  <span>Intake Status</span>
                  <select
                    value={newClient.intakeStatus}
                    onChange={(e) =>
                      setNewClient({ ...newClient, intakeStatus: e.target.value })
                    }
                  >
                    <option>Not Sent</option>
                    <option>Sent</option>
                    <option>Submitted</option>
                    <option>Reviewed</option>
                  </select>
                </label>

                <label>
                  <span>Payment Status</span>
                  <select
                    value={newClient.paymentStatus}
                    onChange={(e) =>
                      setNewClient({ ...newClient, paymentStatus: e.target.value })
                    }
                  >
                    <option>Unpaid</option>
                    <option>Paid</option>
                    <option>Failed</option>
                    <option>Refunded</option>
                  </select>
                </label>

                <label>
                  <span>Source</span>
                  <select
                    value={newClient.source}
                    onChange={(e) =>
                      setNewClient({ ...newClient, source: e.target.value })
                    }
                  >
                    <option>Store</option>
                    <option>Coach Invite</option>
                    <option>Manual Entry</option>
                    <option>Referral</option>
                  </select>
                </label>

                <label>
                  <span>Purchased Program ID</span>
                  <input
                    value={newClient.purchasedProgramId}
                    onChange={(e) =>
                      setNewClient({
                        ...newClient,
                        purchasedProgramId: e.target.value,
                      })
                    }
                    placeholder="Program ID"
                  />
                </label>

                <label>
                  <span>Access Start Date</span>
                  <input
                    type="date"
                    value={newClient.accessStartDate}
                    onChange={(e) =>
                      setNewClient({ ...newClient, accessStartDate: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Access End Date</span>
                  <input
                    type="date"
                    value={newClient.accessEndDate}
                    onChange={(e) =>
                      setNewClient({ ...newClient, accessEndDate: e.target.value })
                    }
                  />
                </label>

                <label className="clientNotesField">
                  <span>Notes</span>
                  <textarea
                    value={newClient.notes}
                    onChange={(e) =>
                      setNewClient({ ...newClient, notes: e.target.value })
                    }
                    placeholder="Initial coach notes..."
                  />
                </label>
              </div>

              <div className="modalActions">
                <button
                  className="outlineButton"
                  onClick={closeClientForm}
                >
                  Cancel
                </button>

                <button
                  className="goldButton"
                  onClick={saveClientForm}
                  disabled={savingClient}
                >
                  {savingClient
                    ? editingClient
                      ? "Saving..."
                      : "Creating..."
                    : editingClient
                    ? "Save Client"
                    : "Create Client"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showCoachModal && (
          <div className="workout-modal-overlay">
            <div className="clientFormModal">
              <div className="modal-header">
                <div>
                  <h2>{editingCoach ? "Edit Coach" : "Add Coach"}</h2>
                  <p>
                    {editingCoach
                      ? "Update coach access and assignment details."
                      : "Create a coach record for client ownership."}
                  </p>
                </div>

                <button className="drawerClose" onClick={closeCoachForm}>
                  x
                </button>
              </div>

              <div className="clientFormGrid">
                <label>
                  <span>Name</span>
                  <input
                    value={coachForm.name}
                    onChange={(e) =>
                      setCoachForm({ ...coachForm, name: e.target.value })
                    }
                    placeholder="Coach name"
                  />
                </label>

                <label>
                  <span>Role</span>
                  <select
                    value={coachForm.role}
                    onChange={(e) =>
                      setCoachForm({ ...coachForm, role: e.target.value })
                    }
                  >
                    <option>Coach</option>
                    <option>Admin</option>
                  </select>
                </label>

                <label>
                  <span>Status</span>
                  <select
                    value={coachForm.status}
                    onChange={(e) =>
                      setCoachForm({ ...coachForm, status: e.target.value })
                    }
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>

                <label>
                  <span>Email</span>
                  <input
                    value={coachForm.email}
                    onChange={(e) =>
                      setCoachForm({ ...coachForm, email: e.target.value })
                    }
                    placeholder="coach@example.com"
                  />
                </label>

                <label>
                  <span>Phone/WeChat</span>
                  <input
                    value={coachForm.phoneWechat}
                    onChange={(e) =>
                      setCoachForm({
                        ...coachForm,
                        phoneWechat: e.target.value,
                      })
                    }
                    placeholder="Phone or WeChat"
                  />
                </label>

                <label className="clientNotesField">
                  <span>Bio / Notes</span>
                  <textarea
                    value={coachForm.bio}
                    onChange={(e) =>
                      setCoachForm({ ...coachForm, bio: e.target.value })
                    }
                    placeholder="Specialty, schedule, internal notes..."
                  />
                </label>
              </div>

              <div className="modalActions">
                <button className="outlineButton" onClick={closeCoachForm}>
                  Cancel
                </button>

                <button
                  className="goldButton"
                  onClick={saveCoachForm}
                  disabled={savingCoach}
                >
                  {savingCoach
                    ? "Saving..."
                    : editingCoach
                    ? "Save Coach"
                    : "Create Coach"}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedContentSubmission && (
          <div className="workout-modal-overlay">
            <div className="clientFormModal submissionResultsModal">
              <div className="modal-header">
                <div>
                  <h2>{selectedContentSubmission.title}</h2>
                  <p>
                    {selectedContentSubmission.responseType} submitted on{" "}
                    {selectedContentSubmission.submittedAt || "--"}
                  </p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => setSelectedContentSubmission(null)}
                >
                  x
                </button>
              </div>

              <div className="submissionAnswerGrid submissionResultsGrid">
                {selectedContentSubmission.answers.map((answer) => (
                  <div className="submissionAnswer" key={answer.recordId}>
                    <span>{getContentResponseLabel(answer)}</span>
                    <strong>
                      {answer.answer || "--"}
                      {answer.unit ? ` ${answer.unit}` : ""}
                    </strong>
                    {answer.notes ? <small>{answer.notes}</small> : null}
                  </div>
                ))}
              </div>

              <div className="modalActions">
                <button
                  className="goldButton"
                  onClick={() => setSelectedContentSubmission(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {activeContentAssignment && (
          <div className="workout-modal-overlay">
            <div className="clientFormModal contentAssignmentModal">
              <div className="modal-header">
                <div>
                  <h2>
                    {activeAssignmentIsTest
                      ? localizeText(
                          activeTestTemplate?.name ||
                            activeContentAssignment.templateName ||
                            getAssignmentDisplayName(activeContentAssignment),
                          activeTestTemplate?.nameCn
                        )
                      : localizeText(
                          activeFormTemplate?.name ||
                            activeContentAssignment.templateName ||
                            getAssignmentDisplayName(activeContentAssignment),
                          activeFormTemplate?.nameCn
                        )}
                  </h2>
                  <p>
                    {activeAssignmentIsTest
                      ? localizeText(
                          activeTestTemplate?.description || "Record your test results.",
                          activeTestTemplate?.descriptionCn
                        )
                      : localizeText(
                          activeFormTemplate?.description ||
                            "Answer the assigned questionnaire.",
                          activeFormTemplate?.descriptionCn
                        )}
                  </p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => {
                    setActiveContentAssignment(null);
                    setContentAssignmentComment("");
                  }}
                >
                  x
                </button>
              </div>

              <div className="contentAssignmentFields">
                {activeAssignmentIsTest
                  ? (activeTestTemplate?.items || []).map((item) => (
                      <div className="testResultField" key={item.testItemId}>
                        <label>
                          <span>
                            {localizeText(item.testName, item.testNameCn)}
                            {item.unit ? ` (${item.unit})` : ""}
                          </span>
                          {item.instructions || item.instructionsCn ? (
                            <small>
                              {localizeText(
                                item.instructions || "",
                                item.instructionsCn
                              )}
                            </small>
                          ) : null}
                          <input
                            type="number"
                            inputMode="decimal"
                            value={contentAssignmentAnswers[item.testItemId] || ""}
                            onChange={(event) =>
                              setContentAssignmentAnswers((current) => ({
                                ...current,
                                [item.testItemId]: event.target.value,
                              }))
                            }
                            placeholder={item.unit || "Result"}
                          />
                        </label>
                        <label className="testResultNotesField">
                          <span>Notes</span>
                          <input
                            value={
                              contentAssignmentAnswers[
                                `${item.testItemId}__notes`
                              ] || ""
                            }
                            onChange={(event) =>
                              setContentAssignmentAnswers((current) => ({
                                ...current,
                                [`${item.testItemId}__notes`]:
                                  event.target.value,
                              }))
                            }
                            placeholder="Optional notes"
                          />
                        </label>
                      </div>
                    ))
                  : (activeFormTemplate?.questions || []).map((question) => (
                      <label key={question.questionId}>
                        <span>
                          {localizeText(question.label, question.labelCn)}
                          {question.required ? " *" : ""}
                        </span>
                        {question.helpText || question.helpTextCn ? (
                          <small>
                            {localizeText(question.helpText || "", question.helpTextCn)}
                          </small>
                        ) : null}
                        {question.questionType.toLowerCase().includes("scale") ? (
                          <select
                            value={contentAssignmentAnswers[question.questionId] || ""}
                            onChange={(event) =>
                              setContentAssignmentAnswers((current) => ({
                                ...current,
                                [question.questionId]: event.target.value,
                              }))
                            }
                          >
                            <option value="">Select</option>
                            {[1, 2, 3, 4, 5].map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        ) : question.questionType.toLowerCase().includes("long") ? (
                          <textarea
                            value={contentAssignmentAnswers[question.questionId] || ""}
                            onChange={(event) =>
                              setContentAssignmentAnswers((current) => ({
                                ...current,
                                [question.questionId]: event.target.value,
                              }))
                            }
                            placeholder="Answer"
                          />
                        ) : (
                          <input
                            value={contentAssignmentAnswers[question.questionId] || ""}
                            onChange={(event) =>
                              setContentAssignmentAnswers((current) => ({
                                ...current,
                                [question.questionId]: event.target.value,
                              }))
                            }
                            placeholder="Answer"
                          />
                        )}
                      </label>
                    ))}

                <label className="submissionCommentField">
                  <span>{t("clientComment")}</span>
                  <textarea
                    value={contentAssignmentComment}
                    onChange={(event) =>
                      setContentAssignmentComment(event.target.value)
                    }
                    placeholder={t("clientCommentPlaceholder")}
                  />
                </label>
              </div>

              <div className="modalActions">
                <button
                  className="outlineButton"
                  onClick={() => {
                    setActiveContentAssignment(null);
                    setContentAssignmentComment("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="goldButton"
                  onClick={submitActiveContentAssignment}
                  disabled={submittingContentAssignment}
                >
                  {submittingContentAssignment ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedWorkout && (
          <div className="workout-modal-overlay">
            <div className="workout-modal">
              <div className="modal-header">
                <div>
                  <h2>{localizedWorkoutName(selectedWorkout)}</h2>
                  <div className="workoutHeaderMeta">
                    <span>
                      {t("week")} {selectedWorkout.week} • {t("day")} {selectedWorkout.day}
                    </span>
                    <span>
                      {getDisplayTaskStatus(
                        selectedWorkout.completionStatus,
                        selectedWorkout.scheduledDate
                      )}
                    </span>
                    {!isClientPortal && (
                      <>
                    <label className="headerDateControl">
                      <input
                        type="date"
                        value={editingWorkoutDate}
                        onChange={(e) => setEditingWorkoutDate(e.target.value)}
                      />
                    </label>
                    <button
                      className="miniMoveWorkoutButton"
                      onClick={updateWorkoutDate}
                      disabled={updatingWorkoutDate || !editingWorkoutDate}
                    >
                      {updatingWorkoutDate ? t("saving") : t("move")}
                    </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="modalHeaderActions">
                  {!isClientPortal && (
                  <button
                    className="iconActionButton dangerIconButton"
                    onClick={() => deleteWorkout(selectedWorkout)}
                    title={t("deleteWorkout")}
                    aria-label={t("deleteWorkout")}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                  )}

                  <button
                    className="drawerClose"
                    onClick={() => {
                      setSelectedWorkout(null);
                      setWorkoutLoggingStarted(false);
                      setWorkoutDetails([]);
                      setSetLogs([]);
                      setSavedExerciseDraftIds([]);
                      setWorkoutHistoryLogs([]);
                      setHistoryExerciseName("");
                    }}
                  >
                    <X size={28} strokeWidth={3} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="modal-body">
                {detailsLoading && <p>{t("loadingWorkouts")}</p>}

                {!detailsLoading &&
                  workoutDetails.length > 0 &&
                  (!isClientPortal || !workoutLoggingStarted) && (
                  <section className="workoutGlancePanel">
                    <h3>{t("atAGlance")}</h3>
                    {isClientPortal && !workoutLoggingStarted && (
                      <p className="workoutGlanceIntro">
                        {t("selectFirstExercise")}
                      </p>
                    )}

                    {workoutDetails.map((exercise, index) => {
                      const meta = parseExerciseNotes(exercise.notes);
                      const previousMeta =
                        index > 0
                          ? parseExerciseNotes(workoutDetails[index - 1].notes)
                          : null;
                      const sectionName = meta.sectionName || "Main";
                      const sectionNameDisplay = localizeText(
                        sectionName,
                        exercise.sectionNameCn || ""
                      );
                      const showSectionHeader =
                        !previousMeta ||
                        sectionName !== (previousMeta.sectionName || "Main");
                      const prescription =
                        exercise.sets && exercise.reps
                          ? `${exercise.sets} x ${exercise.reps}`
                          : t("forCompletion");
                      const prescriptionDetails = [
                        prescription,
                        exercise.tempo ? `${t("tempo")} ${exercise.tempo}` : "",
                        exercise.rest ? `${t("rest")} ${exercise.rest}` : "",
                      ].filter(Boolean);

                      return (
                        <div key={`${exercise.id}-glance`}>
                          {showSectionHeader && (
                            <h4 className="workoutGlanceSection">
                              {sectionNameDisplay}
                            </h4>
                          )}

                          <button
                            className="workoutGlanceRow"
                            type="button"
                            onClick={() => openWorkoutExerciseFromGlance(index)}
                          >
                            <span className="exerciseLabelBadge">
                              {meta.exerciseLabel || makeExerciseLabel(index)}
                            </span>
                            <span>
                              <strong>{localizedExerciseName(exercise)}</strong>
                              <small>{prescriptionDetails.join(" • ")}</small>
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </section>
                )}

                {!detailsLoading && isClientPortal && workoutLoggingStarted && (
                  <button
                    className="outlineButton workoutGlanceBackButton"
                    onClick={() => setWorkoutLoggingStarted(false)}
                  >
                    {t("backToAtAGlance")}
                  </button>
                )}

                {!detailsLoading &&
                  (!isClientPortal || workoutLoggingStarted) &&
                  workoutDetails.map((exercise, index) => {
                    const exerciseLogs = setLogs.filter(
                      (log) => log.exerciseId === exercise.exerciseId
                    );
                    const meta = parseExerciseNotes(exercise.notes);
                    const previousMeta =
                      index > 0
                        ? parseExerciseNotes(workoutDetails[index - 1].notes)
                        : null;
                    const sectionName = meta.sectionName || "Main";
                    const sectionNameDisplay = localizeText(
                      sectionName,
                      exercise.sectionNameCn || ""
                    );
                    const showSectionHeader =
                      !previousMeta ||
                      sectionName !== (previousMeta.sectionName || "Main");
                    const coachingNotes = localizeText(
                      meta.coachingNotes,
                      exercise.notesCn || ""
                    );
                    const exerciseHistoryLogs = workoutHistoryLogs
                      .filter((log) =>
                        log.exerciseName
                          .toLowerCase()
                          .startsWith(exercise.exerciseName.toLowerCase())
                      )
                      .slice(0, 12);

                    return (
                      <div key={exercise.id}>
                        {showSectionHeader && (
                          <h4 className="workoutSectionHeading">
                            {sectionNameDisplay}
                          </h4>
                        )}

                        <div
                          className="exercise-card workoutLogExerciseCard"
                          id={`workout-exercise-${index}`}
                        >
                        <div className="exerciseTitleRow workoutExerciseHeader">
                          <div className="workoutExerciseTitle">
                            <span className="exerciseLabelBadge">
                              {meta.exerciseLabel || makeExerciseLabel(index)}
                            </span>
                            <h3>{localizedExerciseName(exercise)}</h3>
                          </div>

                          <div className="workoutExerciseActions">
                            {localizeText(exercise.videoUrl || "", exercise.videoUrlCn || "") && (
                              <a
                                className="iconActionButton"
                                href={localizeText(exercise.videoUrl || "", exercise.videoUrlCn || "")}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={t("video")}
                                aria-label={`Open video for ${exercise.exerciseName}`}
                              >
                                <Play size={18} fill="currentColor" aria-hidden="true" />
                              </a>
                            )}

                            <button
                              className="iconActionButton"
                              onClick={() =>
                                setTechnicalCueExercise({
                                  recordId: exercise.id,
                                  exerciseId: exercise.exerciseId,
                                  exerciseName: exercise.exerciseName,
                                  exerciseNameCn: exercise.exerciseNameCn,
                                  videoUrl: exercise.videoUrl || "",
                                  videoUrlCn: exercise.videoUrlCn,
                                  category: "",
                                  equipment: "",
                                  movementPattern: "",
                                  notes: exercise.notes || "",
                                  notesCn: exercise.notesCn,
                                  status: "Active",
                                })
                              }
                              type="button"
                              title={t("technicalForm")}
                              aria-label={`View technical form for ${exercise.exerciseName}`}
                            >
                              <ClipboardList size={18} aria-hidden="true" />
                            </button>

                            <button
                              className="iconActionButton"
                              onClick={() =>
                                setHistoryExerciseName(exercise.exerciseName)
                              }
                              type="button"
                              title={t("history")}
                              aria-label={`View history for ${exercise.exerciseName}`}
                            >
                              <Clock3 size={18} aria-hidden="true" />
                              {exerciseHistoryLogs.length > 0 && (
                                <small>{exerciseHistoryLogs.length}</small>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="workoutPrescriptionGrid">
                          <span>
                            <strong>{t("sets")}</strong>
                            {exercise.sets || "--"}
                          </span>
                          <span>
                            <strong>{t("reps")}</strong>
                            {exercise.reps || "--"}
                          </span>
                          <span>
                            <strong>{t("tempo")}</strong>
                            {exercise.tempo || "--"}
                          </span>
                          <span>
                            <strong>{t("rest")}</strong>
                            {exercise.rest || "--"}
                          </span>
                        </div>

                        {coachingNotes && (
                          <p className="workoutCoachNotes">{coachingNotes}</p>
                        )}

                        <div className="setLogHeader">
                          <span>{t("set")}</span>
                          <span>{t("actualReps")}</span>
                          <span>{t("weight")}</span>
                          <span>{t("time")}</span>
                          <span>{t("distance")}</span>
                        </div>

                        {exerciseLogs.map((log) => {
                          const globalIndex = setLogs.findIndex(
                            (item) =>
                              item.exerciseId === log.exerciseId &&
                              item.setNumber === log.setNumber &&
                              item.side === log.side
                          );
                          const showWeightInputs = log.trackingType === "Weight";
                          const showTimeInput = log.trackingType === "Time";
                          const showDistanceInput = log.trackingType === "Distance";
                          const sideLabel =
                            log.side === "Right"
                              ? t("right")
                              : log.side === "Left"
                              ? t("left")
                              : log.side;

                          return (
                            <div
                              className={
                                useMobileWorkoutRows
                                  ? "setLogRow mobileSetLogRow"
                                  : "desktopWorkoutSetRow"
                              }
                              key={`${log.exerciseId}-${log.setNumber}-${log.side || "both"}`}
                            >
                              <div
                                className={
                                  useMobileWorkoutRows
                                    ? "setBanner"
                                    : "desktopWorkoutSetLabel"
                                }
                              >
                                <strong>
                                  {t("set", { number: log.setNumber })}
                                  {sideLabel ? ` · ${sideLabel}` : ""}
                                </strong>
                              </div>
                              {log.side && (
                                <div className="setLogStatic limbCell">
                                  <span>{t("limb")}</span>
                                  <strong>{sideLabel}</strong>
                                </div>
                              )}

                              {showWeightInputs && (
                                <>
                                  <label className="setLogField">
                                    <span>{t("actualReps")}</span>
                                    <input
                                      inputMode="numeric"
                                      value={log.actualReps}
                                      onChange={(e) =>
                                        updateSetLog(
                                          globalIndex,
                                          "actualReps",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>

                                  <label className="setLogField">
                                    <span>{t("weight")}</span>
                                    <input
                                      inputMode="decimal"
                                      value={log.actualWeight}
                                      placeholder="kg"
                                      onChange={(e) =>
                                        updateSetLog(
                                          globalIndex,
                                          "actualWeight",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>
                                </>
                              )}

                              {showTimeInput && (
                                <label className="setLogField">
                                  <span>{t("time")}</span>
                                  <input
                                    inputMode="decimal"
                                    value={log.actualTime}
                                    placeholder="sec"
                                    onChange={(e) =>
                                      updateSetLog(
                                        globalIndex,
                                        "actualTime",
                                        e.target.value
                                      )
                                    }
                                  />
                                </label>
                              )}

                              {showDistanceInput && (
                                <label className="setLogField">
                                  <span>{t("distance")}</span>
                                  <input
                                    inputMode="decimal"
                                    value={log.actualDistance}
                                    placeholder="m"
                                    onChange={(e) =>
                                      updateSetLog(
                                        globalIndex,
                                        "actualDistance",
                                        e.target.value
                                      )
                                    }
                                  />
                                </label>
                              )}
                            </div>
                          );
                        })}

                        {isClientPortal && (
                          <button
                            className={
                              savedExerciseDraftIds.includes(exercise.exerciseId)
                                ? "outlineButton saveExerciseButton savedExerciseButton"
                                : "outlineButton saveExerciseButton"
                            }
                            onClick={() => saveExerciseDraft(exercise.exerciseId)}
                            type="button"
                          >
                            {savedExerciseDraftIds.includes(exercise.exerciseId)
                              ? t("exerciseSaved")
                              : t("saveExercise")}
                          </button>
                        )}
                        </div>
                      </div>
                    );
                  })}

                {(!isClientPortal || workoutLoggingStarted) && (
                  <label className="workoutSubmissionNoteField">
                    <span>{t("workoutComment")}</span>
                    <textarea
                      value={workoutSubmissionNote}
                      onChange={(event) =>
                        setWorkoutSubmissionNote(event.target.value)
                      }
                      placeholder={t("workoutCommentPlaceholder")}
                    />
                  </label>
                )}

                {(!isClientPortal || workoutLoggingStarted) && (
                  <button
                    className="goldButton saveWorkoutButton"
                    onClick={saveWorkout}
                    disabled={savingWorkout}
                  >
                    {savingWorkout ? t("submitting") : t("submitWorkout")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {historyExerciseName && (
          <div className="workout-modal-overlay">
            <div className="clientFormModal historyModal">
              <div className="modal-header">
                <div>
                  <h2>{historyExerciseName}</h2>
                  <p>{t("recentLoggedSets")}</p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => setHistoryExerciseName("")}
                >
                  x
                </button>
              </div>

              <div className="historyLogList">
                {workoutHistoryLogs
                  .filter((log) =>
                    log.exerciseName
                      .toLowerCase()
                      .startsWith(historyExerciseName.toLowerCase())
                  )
                  .slice(0, 20)
                  .map((log) => (
                    <div className="historyLogRow" key={log.recordId}>
                      <div>
                        <strong>{log.date || "--"}</strong>
                        <span>
                          Set {log.setNumber || "--"} • {log.exerciseName}
                        </span>
                      </div>
                      <span>{log.actualReps ? `${log.actualReps} reps` : "--"}</span>
                      <span>{log.actualWeight ? `${log.actualWeight} kg` : "--"}</span>
                      <span>{log.actualTime ? `${log.actualTime} sec` : "--"}</span>
                      <span>
                        {log.actualDistance ? `${log.actualDistance} m` : "--"}
                      </span>
                    </div>
                  ))}

                {workoutHistoryLogs.filter((log) =>
                  log.exerciseName
                    .toLowerCase()
                    .startsWith(historyExerciseName.toLowerCase())
                ).length === 0 && <p>{t("noHistoryLogged")}</p>}
              </div>

              <div className="modalActions">
                <button
                  className="goldButton"
                  onClick={() => setHistoryExerciseName("")}
                >
                  {t("done")}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;


