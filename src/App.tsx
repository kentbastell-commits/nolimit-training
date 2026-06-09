import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Dumbbell,
  Home,
  Play,
  Plus,
  Trash2,
  UserCircle,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type DragEvent } from "react";
import "./App.css";

type AppMode = "Coach" | "Client";
type Page = "Clients" | "Library" | "Workouts" | "Check-ins";
type ClientTab = "Home" | "Overview" | "Training";
type CalendarView = "1 Day" | "1 Week" | "1 Month";
type WorkoutPageTab = "Saved Programs" | "Builder";
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
  email?: string;
  phone?: string;
  coach?: string;
  notes?: string;
  startDate?: string;
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
};

type Workout = {
  id: string;
  assignedWorkoutId: string;
  clientId: string;
  programId: string;
  week: string;
  day: string;
  sessionName: string;
  scheduledDate: string;
  completionStatus: string;
  coachNotes: string;
  clientNotes: string;
  workoutLogs: string;
};

type ExerciseDetail = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  videoUrl?: string;
  order: number;
  sets: string;
  reps: string;
  tempo: string;
  rest: string;
  notes: string;
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
  videoUrl: string;
  category?: string;
  equipment?: string;
  movementPattern?: string;
  notes?: string;
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
    return new Date(Number(value)).toISOString().split("T")[0];
  }

  return value.split("T")[0].split(" ")[0];
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
  return date.toISOString().split("T")[0];
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

function formatCalendarLabel(dateString: string) {
  return new Date(dateString + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatWeekStripLabel(dateString: string) {
  const date = new Date(dateString + "T00:00:00");

  return {
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    day: date.toLocaleDateString("en-US", { day: "numeric" }),
  };
}

function formatCalendarRangeLabel(view: CalendarView, anchorDate: string) {
  if (view === "1 Day") {
    return formatCalendarLabel(anchorDate);
  }

  if (view === "1 Week") {
    const weekStart = getMondayStart(anchorDate);

    return `${formatCalendarLabel(weekStart)} - ${formatCalendarLabel(
      addDays(weekStart, 6)
    )}`;
  }

  return new Date(anchorDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getStatusClass(status: string) {
  const clean = status.toLowerCase();

  if (clean.includes("complete")) return "completedWorkout";
  if (clean.includes("miss")) return "missedWorkout";
  if (clean.includes("progress")) return "progressWorkout";

  return "scheduledWorkout";
}

function App() {
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
    packageType: "Active",
    startDate: dateToInputValue(new Date()),
    notes: "",
  });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientTab, setClientTab] = useState<ClientTab>("Overview");
  const [calendarView, setCalendarView] = useState<CalendarView>("1 Week");
  const [calendarAnchorDate, setCalendarAnchorDate] = useState(
    dateToInputValue(new Date())
  );
  const [clientCalendarStyle, setClientCalendarStyle] = useState<
    "Week Strip" | "Calendar"
  >("Week Strip");
  const [showCalendarActionMenu, setShowCalendarActionMenu] = useState(false);
  const [workoutPageTab, setWorkoutPageTab] =
    useState<WorkoutPageTab>("Saved Programs");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [workoutDetails, setWorkoutDetails] = useState<ExerciseDetail[]>([]);
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
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
  const [movingWorkoutId, setMovingWorkoutId] = useState("");
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

  const [programWeek, setProgramWeek] = useState("1");
  const [programDay, setProgramDay] = useState("1");
  const [sessionName, setSessionName] = useState("Lower Strength");
  const [builderSearch, setBuilderSearch] = useState("");
  const [selectedProgramExercises, setSelectedProgramExercises] = useState<
    ProgramExercise[]
  >([]);
  const [programSessions, setProgramSessions] = useState<ProgramSession[]>([]);
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
      packageType: "Active",
      startDate: dateToInputValue(new Date()),
      notes: "",
    });
  };

  const openNewClientForm = () => {
    setEditingClient(null);
    setNewClient({
      name: "",
      email: "",
      phone: "",
      coach: "Kent Bastell",
      packageType: "Active",
      startDate: dateToInputValue(new Date()),
      notes: "",
    });
    setShowAddClientModal(true);
  };

  const openEditClientForm = (client: Client) => {
    setEditingClient(client);
    setNewClient({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      coach: client.coach || "Kent Bastell",
      packageType: client.status || "Active",
      startDate:
        client.startDate && client.startDate !== "--" ? client.startDate : "",
      notes: client.notes || "",
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

    loadPrograms();

    fetch(`/api/workouts?clientCode=${selectedClient.clientCode}`)
      .then((res) => res.json())
      .then((data) => {
        setWorkouts(data.workouts || []);
        setWorkoutsLoading(false);
      })
      .catch(() => {
        setWorkouts([]);
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
      setPrograms(data.programs || []);

      if (!selectedAssignProgramId && data.programs?.length > 0) {
        setSelectedAssignProgramId(data.programs[0].programId);
      }

      if (!selectedSavedProgramId && data.programs?.length > 0) {
        setSelectedSavedProgramId(data.programs[0].programId);
      }
    } catch (err) {
      console.error(err);
      setPrograms([]);
    }
  };

  const selectedAssignProgram = programs.find(
    (program) => program.programId === selectedAssignProgramId
  );
  const selectedSavedProgram = programs.find(
    (program) => program.programId === selectedSavedProgramId
  );

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
      setProgramSessions(sessions);
      setSelectedProgramExercises([]);
      setProgramWeek("1");
      setProgramDay("1");
      setSessionName("");
      setWorkoutPageTab("Builder");

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
      setSelectedWorkout(null);
      setWorkoutLoggingStarted(false);
      setSavedExerciseDraftIds([]);
      setWorkoutDetails([]);
      setSetLogs([]);
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

  const moveWorkoutByDays = (workout: Workout, days: number) => {
    const currentDate = normalizeDate(String(workout.scheduledDate));

    if (!currentDate) return;

    void moveWorkoutToDate(workout, addDays(currentDate, days));
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

  const addCurrentSessionToProgram = () => {
    if (!programWeek || !programDay || !sessionName) {
      notify("Please fill Week, Day, and Session Name.");
      return;
    }

    if (selectedProgramExercises.length === 0) {
      notify("Please add at least one exercise to this session.");
      return;
    }

    const newSession: ProgramSession = {
      localId: `${Date.now()}-${Math.random()}`,
      week: programWeek,
      day: programDay,
      sessionName,
      exercises: selectedProgramExercises.map((exercise, index) => ({
        ...exercise,
        order: Number(exercise.order) || index + 1,
      })),
    };

    setProgramSessions([...programSessions, newSession]);
    setSelectedProgramExercises([]);

    const nextDay = String((Number(programDay) || 1) + 1);
    setProgramDay(nextDay);
    setSessionName("");
  };

  const removeProgramSession = (localId: string) => {
    setProgramSessions(programSessions.filter((session) => session.localId !== localId));
  };

  const loadSessionForEditing = (session: ProgramSession) => {
    setProgramWeek(session.week);
    setProgramDay(session.day);
    setSessionName(session.sessionName);
    setSelectedProgramExercises(session.exercises);
    removeProgramSession(session.localId);
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

      sessionsToSave.push({
        localId: `${Date.now()}-${Math.random()}`,
        week: programWeek,
        day: programDay,
        sessionName,
        exercises: selectedProgramExercises.map((exercise, index) => ({
          ...exercise,
          order: Number(exercise.order) || index + 1,
        })),
      });
    }

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

  const checkInStats = {
    due: clients.filter(clientNeedsCheckIn).length,
    recent: clients.filter((client) => {
      const ageDays = getCheckInAgeDays(client);
      return ageDays !== null && ageDays < 7;
    }).length,
    missing: clients.filter((client) => getCheckInAgeDays(client) === null).length,
  };

  const menuItems: { name: Page; count: number; icon: LucideIcon }[] = [
    { name: "Clients", count: clients.length, icon: Users },
    { name: "Library", count: libraryExercises.length, icon: BookOpen },
    { name: "Workouts", count: workouts.length, icon: Dumbbell },
    { name: "Check-ins", count: checkInStats.due, icon: ClipboardCheck },
  ];

  const clientStatusOptions = Array.from(
    new Set(clients.map((client) => client.status).filter(Boolean))
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
    { name: "All Clients", count: clients.length },
    {
      name: "Active",
      count: clients.filter((client) => clientMatchesBucket(client, "Active"))
        .length,
    },
    {
      name: "Premium",
      count: clients.filter((client) => clientMatchesBucket(client, "Premium"))
        .length,
    },
    {
      name: "Online Coaching",
      count: clients.filter((client) =>
        clientMatchesBucket(client, "Online Coaching")
      ).length,
    },
    {
      name: "Paused",
      count: clients.filter((client) => clientMatchesBucket(client, "Paused"))
        .length,
    },
    {
      name: "Needs Contact",
      count: clients.filter(clientNeedsContact).length,
    },
    {
      name: "Needs Programming",
      count: clients.filter(clientNeedsProgramming).length,
    },
    {
      name: "Archived",
      count: clients.filter(clientIsArchived).length,
    },
  ];

  const filteredClients = clients.filter((client) => {
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

  const filteredCheckInClients = clients.filter((client) => {
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
  const selectedClientContact =
    selectedClient?.email || selectedClient?.phone || "No contact saved";

  const saveClientForm = async () => {
    if (!newClient.name.trim()) {
      notify("Please enter a client name.", "error");
      return;
    }

    setSavingClient(true);

    try {
      const response = await fetch(
        editingClient ? "/api/updateClient" : "/api/createClient",
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
          body: JSON.stringify(
            editingClient
              ? { ...newClient, clientRecordId: editingClient.id }
              : newClient
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
    calendarView === "1 Day"
      ? [calendarAnchorDate]
      : calendarView === "1 Week"
      ? Array.from({ length: 7 }, (_, index) =>
          addDays(getMondayStart(calendarAnchorDate), index)
        )
      : getMonthDates(calendarAnchorDate);
  const clientWeekStripDates = Array.from({ length: 7 }, (_, index) =>
    addDays(getMondayStart(calendarAnchorDate), index)
  );

  const calendarRangeLabel = formatCalendarRangeLabel(
    calendarView,
    calendarAnchorDate
  );

  const moveCalendarRange = (direction: -1 | 1) => {
    if (isClientPortal && clientCalendarStyle === "Week Strip") {
      setCalendarAnchorDate(addDays(getMondayStart(calendarAnchorDate), direction * 7));
      return;
    }

    if (calendarView === "1 Day") {
      setCalendarAnchorDate(addDays(calendarAnchorDate, direction));
      return;
    }

    if (calendarView === "1 Week") {
      setCalendarAnchorDate(addDays(calendarAnchorDate, direction * 7));
      return;
    }

    setCalendarAnchorDate(addMonths(calendarAnchorDate, direction));
  };

  function getWorkoutsForDate(dateString: string) {
    return workouts.filter(
      (workout) => normalizeDate(String(workout.scheduledDate)) === dateString
    );
  }

  const todayValue = dateToInputValue(new Date());
  const selectedCalendarDateWorkouts = getWorkoutsForDate(calendarAnchorDate);
  const clientPortalUpcomingWorkouts = workouts
    .filter(
      (workout) =>
        normalizeDate(String(workout.scheduledDate)) >= todayValue &&
        !String(workout.completionStatus || "")
          .toLowerCase()
          .includes("complete")
    )
    .sort(
      (a, b) =>
        normalizeDate(String(a.scheduledDate)).localeCompare(
          normalizeDate(String(b.scheduledDate))
        ) || Number(a.week) - Number(b.week) || Number(a.day) - Number(b.day)
    )
    .slice(0, 5);

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
      } ${isClientPortal ? "clientPortalApp" : ""}`}
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
                }}
              >
                <span className="navItemLabel">
                  <NavIcon size={20} strokeWidth={2.2} />
                  <span>{item.name}</span>
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
            <strong>Kent Bastell</strong>
            <p>{appMode}</p>
          </div>
        </div>
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

              {activePage === "Workouts" && workoutPageTab === "Builder" && (
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

                    </div>

                    {loading && <p>Loading clients...</p>}

                    <section className="tableCard clientTableCard">
                      <div className="tableHeader clientTableHeader">
                        <span></span>
                        <span>Name</span>
                        <span>Contact</span>
                        <span>Program</span>
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
                              setClientTab("Overview");
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
                              className="videoButton"
                              href={exercise.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
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
                  {(["Saved Programs", "Builder"] as WorkoutPageTab[]).map((tab) => (
                    <button
                      key={tab}
                      className={workoutPageTab === tab ? "goldButton" : "outlineButton"}
                      onClick={() => {
                        setWorkoutPageTab(tab);

                        if (tab === "Saved Programs") {
                          loadPrograms();
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
                        {programs.length === 0 && <p>No saved programs found.</p>}

                        {programs
                          .filter((program) => program.status !== "Archived")
                          .map((program) => (
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
                              {program.goal || "--"} / {program.level || "--"}
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
                                  {selectedSavedProgram.status || "--"}
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

                {workoutPageTab === "Builder" && (
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

                <h3 className="builderSectionTitle">Current Session</h3>

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
                    + Add Session
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

                <h3 className="builderSectionTitle builderSectionTitleSpaced">
                  Program Sessions
                </h3>

                {programSessions.length === 0 && <p>No sessions added yet.</p>}

                {programSessions.map((session) => (
                  <div className="exercise-card" key={session.localId}>
                    <div className="exerciseTitleRow">
                      <h3>
                        Week {session.week} / Day {session.day}:{" "}
                        {session.sessionName}
                      </h3>

                      <div style={{ display: "flex", gap: "10px" }}>
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
            {clientTab === "Overview" && !isClientPortal && (
              <aside className="clientListPanel">
                <h4>CLIENTS</h4>
                <h2>All Clients</h2>

                <input className="miniSearch" placeholder="Search client" />

                {clients.map((client) => (
                  <button
                    key={client.id}
                    className={`miniClient ${
                      selectedClient.id === client.id ? "selectedMiniClient" : ""
                    }`}
                    onClick={() => {
                      setSelectedClient(client);
                      setClientTab("Overview");
                    }}
                  >
                    <div className="clientAvatar">{client.initials}</div>
                    <span>{client.name}</span>
                  </button>
                ))}
              </aside>
            )}

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
                  <span>Home</span>
                </button>
                <button
                  className={clientTab === "Training" ? "active" : ""}
                  onClick={() => setClientTab("Training")}
                >
                  <CalendarDays size={21} strokeWidth={2.2} />
                  <span>Training</span>
                </button>
                <button onClick={() => openCheckInQuestionnaire(selectedClient)}>
                  <ClipboardCheck size={21} strokeWidth={2.2} />
                  <span>Check-in</span>
                </button>
                <button
                  className={clientTab === "Overview" ? "active" : ""}
                  onClick={() => setClientTab("Overview")}
                >
                  <UserCircle size={21} strokeWidth={2.2} />
                  <span>Profile</span>
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
                        ? `Hi, ${selectedClient.name.split(" ")[0] || "there"}`
                        : clientTab === "Overview"
                        ? "Profile"
                        : "Training"
                      : selectedClient.name}
                  </h1>
                  <p>
                    {selectedClient.status} • {selectedClient.program}
                  </p>
                </div>
                {!isClientPortal && (
                <div className="clientProfileActions">
                  <button
                    className="goldButton"
                    onClick={() => setClientTab("Training")}
                  >
                    Training
                  </button>

                  <button
                    className="iconActionButton profileIconButton"
                    onClick={loadAnalytics}
                    disabled={analyticsLoading}
                    title="Workout analytics"
                    aria-label={`Open workout analytics for ${selectedClient.name}`}
                  >
                    <BarChart3 size={18} aria-hidden="true" />
                  </button>

                  <button
                    className="outlineButton"
                    onClick={() =>
                      copyToClipboard(
                        buildClientPortalLink(selectedClient),
                        "Client portal link"
                      )
                    }
                  >
                    Copy Portal
                  </button>

                  <button
                    className="outlineButton"
                    onClick={() => openEditClientForm(selectedClient)}
                  >
                    Edit Client
                  </button>

                  <button
                    className="outlineButton"
                    onClick={() => updateClientPackage(selectedClient, "Paused")}
                    disabled={updatingClientStatus}
                  >
                    Pause
                  </button>

                  <button
                    className="outlineButton"
                    onClick={() => updateClientPackage(selectedClient, "Archived")}
                    disabled={updatingClientStatus}
                  >
                    Archive
                  </button>

                  <button
                    className="iconActionButton dangerIconButton"
                    onClick={() => deleteClient(selectedClient)}
                    title="Delete client"
                    aria-label={`Delete ${selectedClient.name}`}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
                )}
              </div>

              <div
                className={
                  isClientPortal || clientTab === "Training"
                    ? "clientSnapshotGrid portalHidden"
                    : "clientSnapshotGrid"
                }
              >
                <div className="clientSnapshotCard">
                  <span>Status</span>
                  <strong>{selectedClient.status || "--"}</strong>
                </div>

                <div className="clientSnapshotCard">
                  <span>Program</span>
                  <strong>{selectedClient.program || "--"}</strong>
                </div>

                <div className="clientSnapshotCard">
                  <span>Check-in</span>
                  <strong>{selectedClientCheckInLabel}</strong>
                </div>

                <div className="clientSnapshotCard">
                  <span>Contact</span>
                  <strong>{selectedClientContact}</strong>
                </div>
              </div>

              <div
                className={
                  isClientPortal || clientTab === "Training"
                    ? "clientTabs portalHidden"
                    : "clientTabs"
                }
              >
                <button
                  className={clientTab === "Overview" ? "tab activeTab" : "tab"}
                  onClick={() => setClientTab("Overview")}
                >
                  Client Overview
                </button>

                <button
                  className={clientTab === "Training" ? "tab activeTab" : "tab"}
                  onClick={() => setClientTab("Training")}
                >
                  Training
                </button>
              </div>

              {clientTab === "Home" && isClientPortal && (
                <div className="clientHomeGrid">
                  <section className="clientHomePanel upcomingHomePanel">
                    <div className="clientHomePanelHeader">
                      <div>
                        <span>Plan</span>
                        <h2>Upcoming Workouts</h2>
                      </div>
                      <button
                        className="outlineButton"
                        onClick={() => setClientTab("Training")}
                      >
                        Calendar
                      </button>
                    </div>

                    <div className="homeWorkoutList">
                      {clientPortalUpcomingWorkouts.length > 0 ? (
                        clientPortalUpcomingWorkouts.slice(0, 4).map((workout) => (
                          <button
                            key={workout.id}
                            className="homeWorkoutItem"
                            onClick={() => openWorkout(workout)}
                          >
                            <span>
                              {formatCalendarLabel(
                                normalizeDate(String(workout.scheduledDate))
                              )}
                            </span>
                            <strong>{workout.sessionName || "Workout"}</strong>
                            <small>
                              Week {workout.week} - Day {workout.day}
                            </small>
                          </button>
                        ))
                      ) : (
                        <p className="homeEmptyText">
                          No upcoming workouts are scheduled yet.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="clientHomePanel progressHomePanel">
                    <div className="clientHomePanelHeader">
                      <div>
                        <span>Progress</span>
                        <h2>Exercise History</h2>
                      </div>
                    </div>

                    <div className="progressControls">
                      <input
                        value={progressSearch}
                        onChange={(e) => setProgressSearch(e.target.value)}
                        placeholder="Search exercise"
                      />
                      <select
                        value={selectedProgressName}
                        onChange={(e) => setSelectedProgressExercise(e.target.value)}
                      >
                        {visibleProgressExerciseOptions.length > 0 ? (
                          visibleProgressExerciseOptions.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))
                        ) : (
                          <option value="">No exercise history yet</option>
                        )}
                      </select>
                    </div>

                    <div className="progressChart" aria-label="Exercise progress chart">
                      {progressHistoryPoints.length > 0 ? (
                        progressHistoryPoints.map((point) => (
                          <div className="progressBarWrap" key={`${point.date}-${point.value}`}>
                            <span>{point.value}{progressUnit && ` ${progressUnit}`}</span>
                            <div
                              className="progressBar"
                              style={{
                                height: `${Math.max(
                                  18,
                                  (point.value / progressMaxValue) * 100
                                )}%`,
                              }}
                            />
                            <small>
                              {new Date(`${point.date}T00:00:00`).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" }
                              )}
                            </small>
                          </div>
                        ))
                      ) : (
                        <p className="homeEmptyText">
                          Log a workout to start building progress charts.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="clientHomePanel focusHomePanel">
                    <div className="clientHomePanelHeader">
                      <div>
                        <span>Readiness</span>
                        <h2>Today's Focus</h2>
                      </div>
                    </div>

                    <div className="homeFocusGrid">
                      <div>
                        <span>Check-in</span>
                        <strong>{selectedClientCheckInLabel}</strong>
                        <button
                          className="outlineButton"
                          onClick={() => openCheckInQuestionnaire(selectedClient)}
                        >
                          Submit Check-in
                        </button>
                      </div>
                      <div>
                        <span>Coach Notes</span>
                        <strong>{selectedClient.notes || "No notes yet."}</strong>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {clientTab === "Overview" && (
                <div className="overviewGrid">
                  <div className="profileCard">
                    <h3>Client Information</h3>
                    <div className="clientInfoRows">
                      <div>
                        <span>Name</span>
                        <strong>{selectedClient.name}</strong>
                      </div>
                      <div>
                        <span>Email</span>
                        <strong>{selectedClient.email || "--"}</strong>
                      </div>
                      <div>
                        <span>Phone/WeChat</span>
                        <strong>{selectedClient.phone || "--"}</strong>
                      </div>
                      <div>
                        <span>Coach</span>
                        <strong>{selectedClient.coach || "--"}</strong>
                      </div>
                      <div>
                        <span>Package</span>
                        <strong>{selectedClient.status || "--"}</strong>
                      </div>
                      <div>
                        <span>Start Date</span>
                        <strong>{selectedClient.startDate || "--"}</strong>
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

              {clientTab === "Training" && (
                <div className="trainingCalendar">
                  {isClientPortal && clientPortalUpcomingWorkouts[0] && (
                    <section className="clientPortalTrainingHero">
                      <div>
                        <span>Next Workout</span>
                        <h2>
                          {clientPortalUpcomingWorkouts[0]?.sessionName ||
                            "Training"}
                        </h2>
                        <p>
                          {clientPortalUpcomingWorkouts[0]
                            ? `${formatCalendarLabel(
                                normalizeDate(
                                  String(
                                    clientPortalUpcomingWorkouts[0].scheduledDate
                                  )
                                )
                              )} • Week ${
                                clientPortalUpcomingWorkouts[0].week
                              } Day ${clientPortalUpcomingWorkouts[0].day}`
                            : "No upcoming workouts are scheduled yet."}
                        </p>
                      </div>

                      {clientPortalUpcomingWorkouts[0] && (
                        <button
                          className="goldButton compactNextWorkoutButton"
                          onClick={() =>
                            openWorkout(clientPortalUpcomingWorkouts[0])
                          }
                        >
                          Start
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
                            {workout.completionStatus || "Scheduled"}
                          </small>
                        </button>
                      ))}
                    </section>
                  )}

                  <div className="calendarHeader">
                    <h2>Training Calendar</h2>

                    {isClientPortal && (
                      <div className="clientCalendarViewToggle">
                        {(["Week Strip", "Calendar"] as const).map((view) => (
                          <button
                            key={view}
                            className={
                              clientCalendarStyle === view ? "active" : ""
                            }
                            onClick={() => setClientCalendarStyle(view)}
                            type="button"
                          >
                            {view === "Week Strip" ? "Week" : "Full"}
                          </button>
                        ))}
                      </div>
                    )}

                    {!isClientPortal && (
                    <div className="calendarControls">
                      {(["1 Day", "1 Week", "1 Month"] as CalendarView[]).map(
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
                                setShowCalendarActionMenu(false);
                                setWorkoutPageTab("Saved Programs");
                                notify("Choose a saved program to assign workouts.");
                              }}
                            >
                              Add Workout
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCalendarActionMenu(false);
                                notify("Check-in program builder is next.");
                              }}
                            >
                              Add Check-in Program
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCalendarActionMenu(false);
                                notify("More form types can be added here.");
                              }}
                            >
                              Add Form
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
                        Previous
                      </button>

                      <strong>{calendarRangeLabel}</strong>

                      <button
                        className="outlineButton"
                        onClick={() => moveCalendarRange(1)}
                      >
                        Next
                      </button>
                    </div>

                    <div className="calendarQuickControls">
                      <button
                        className="outlineButton todayButton"
                        onClick={() => setCalendarAnchorDate(dateToInputValue(new Date()))}
                      >
                        Today
                      </button>

                      <label className="calendarDatePickerButton" title="Choose date">
                        <CalendarDays size={18} strokeWidth={2.2} aria-hidden="true" />
                        <span className="srOnly">Choose date</span>
                        <input
                          type="date"
                          value={calendarAnchorDate}
                          onChange={(e) => setCalendarAnchorDate(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>

                  {!isClientPortal && (
                  <section className="assignProgramPanel">
                    <h3>Assign Program</h3>

                    <div className="assignProgramGrid">
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

                      <label>
                        <span>Start Date</span>
                        <input
                          type="date"
                          className="miniSearch"
                          value={assignStartDate}
                          onChange={(e) => setAssignStartDate(e.target.value)}
                        />
                      </label>

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
                    </div>

                    {assignableWorkouts.length > 0 && (
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
                      isClientPortal && clientCalendarStyle === "Week Strip"
                        ? "calendarGrid clientWeekStripCalendar"
                        : calendarView === "1 Day"
                        ? "calendarGrid oneDayCalendar"
                        : calendarView === "1 Week"
                        ? "calendarGrid weekCalendar"
                        : "calendarGrid monthCalendar"
                    }
                  >
                    {(isClientPortal && clientCalendarStyle === "Week Strip"
                      ? clientWeekStripDates
                      : calendarDates
                    ).map((date) => {
                      const dayWorkouts = getWorkoutsForDate(date);
                      const weekStripLabel = formatWeekStripLabel(date);

                      return (
                        <div
                          className={`calendarDay ${
                            draggingWorkoutId ? "calendarDropTarget" : ""
                          } ${
                            isClientPortal && date === calendarAnchorDate
                              ? "selectedCalendarDay"
                              : ""
                          } ${
                            dayWorkouts.length > 0 ? "hasCalendarWork" : ""
                          }`}
                          key={date}
                          onDragOver={(event: DragEvent<HTMLDivElement>) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(event: DragEvent<HTMLDivElement>) => {
                            event.preventDefault();

                            const workoutId =
                              event.dataTransfer.getData("text/plain") ||
                              draggingWorkoutId;
                            const workout = workouts.find(
                              (item) => item.id === workoutId
                            );

                            if (workout) {
                              void moveWorkoutToDate(workout, date);
                            }
                          }}
                          onClick={() => {
                            if (isClientPortal) {
                              setCalendarAnchorDate(date);
                            }
                          }}
                        >
                          <strong className="calendarDateLabel">
                            {isClientPortal &&
                            clientCalendarStyle === "Week Strip" ? (
                              <>
                                <span>{weekStripLabel.weekday}</span>
                                <b>{weekStripLabel.day}</b>
                              </>
                            ) : (
                              formatCalendarLabel(date)
                            )}
                          </strong>

                          {isClientPortal && (
                            <span className="calendarWorkMarkers" aria-hidden="true">
                              {dayWorkouts.length > 0 ? (
                                dayWorkouts.slice(0, 3).map((workout) => (
                                  <span key={workout.id} />
                                ))
                              ) : (
                                <span className="emptyMarker" />
                              )}
                            </span>
                          )}

                          {(!isClientPortal ||
                            clientCalendarStyle === "Calendar") &&
                            dayWorkouts.map((workout) => (
                            <div
                              className={`workoutBlock ${getStatusClass(
                                workout.completionStatus
                              )} ${
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
                              onClick={() => openWorkout(workout)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openWorkout(workout);
                                }
                              }}
                            >
                              <div className="workoutBlockMain">
                                {workout.sessionName || "Workout"}
                                <span>
                                  {movingWorkoutId === workout.id
                                    ? "Moving..."
                                    : workout.completionStatus || "Scheduled"}
                                </span>
                              </div>

                              {!isClientPortal && (
                                <div
                                  className="workoutMoveControls"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                <button
                                  className="miniMoveButton"
                                  onClick={() => moveWorkoutByDays(workout, -1)}
                                  disabled={movingWorkoutId === workout.id}
                                  type="button"
                                  aria-label="Move workout back one day"
                                >
                                  ‹
                                </button>
                                <input
                                  type="date"
                                  value={normalizeDate(String(workout.scheduledDate))}
                                  onChange={(event) =>
                                    moveWorkoutToDate(workout, event.target.value)
                                  }
                                  disabled={movingWorkoutId === workout.id}
                                  aria-label="Move workout date"
                                />
                                <button
                                  className="miniMoveButton"
                                  onClick={() => moveWorkoutByDays(workout, 1)}
                                  disabled={movingWorkoutId === workout.id}
                                  type="button"
                                  aria-label="Move workout forward one day"
                                >
                                  ›
                                </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  {isClientPortal && clientCalendarStyle === "Week Strip" && (
                    <section className="selectedDayGlance">
                      <div className="selectedDayGlanceHeader">
                        <span>{formatCalendarLabel(calendarAnchorDate)}</span>
                        <strong>
                          {selectedCalendarDateWorkouts.length > 0
                            ? `${selectedCalendarDateWorkouts.length} item${
                                selectedCalendarDateWorkouts.length === 1
                                  ? ""
                                  : "s"
                              }`
                            : "Rest / Recovery"}
                        </strong>
                      </div>

                      {selectedCalendarDateWorkouts.length > 0 ? (
                        selectedCalendarDateWorkouts.map((workout) => (
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
                                {workout.completionStatus || "Scheduled"}
                              </small>
                            </div>
                            <span className="selectedDayWorkoutAction">
                              View
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="homeEmptyText">
                          Nothing scheduled for this day.
                        </p>
                      )}
                    </section>
                  )}
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
                      <span>Overdue</span>
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
                  <h2>{technicalCueExercise.exerciseName}</h2>
                  <p>Technical cues and form instruction from the exercise library.</p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => setTechnicalCueExercise(null)}
                >
                  x
                </button>
              </div>

              <div className="technicalCueBody">
                {technicalCueExercise.notes ? (
                  <pre>{technicalCueExercise.notes}</pre>
                ) : (
                  <p>No technical cues saved for this exercise yet.</p>
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
                  Edit Cues
                </button>
                )}
                <button
                  className="goldButton"
                  onClick={() => setTechnicalCueExercise(null)}
                >
                  Done
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
                  <span>Coach</span>
                  <input
                    value={newClient.coach}
                    onChange={(e) =>
                      setNewClient({ ...newClient, coach: e.target.value })
                    }
                    placeholder="Coach"
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

        {selectedWorkout && (
          <div className="workout-modal-overlay">
            <div className="workout-modal">
              <div className="modal-header">
                <div>
                  <h2>{selectedWorkout.sessionName}</h2>
                  <div className="workoutHeaderMeta">
                    <span>
                      Week {selectedWorkout.week} • Day {selectedWorkout.day}
                    </span>
                    <span>{selectedWorkout.completionStatus || "Scheduled"}</span>
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
                      {updatingWorkoutDate ? "Saving..." : "Move"}
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
                    title="Delete workout"
                    aria-label="Delete workout"
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
                {detailsLoading && <p>Loading workout details...</p>}

                {!detailsLoading &&
                  workoutDetails.length > 0 &&
                  (!isClientPortal || !workoutLoggingStarted) && (
                  <section className="workoutGlancePanel">
                    <h3>At a Glance</h3>
                    {isClientPortal && !workoutLoggingStarted && (
                      <p className="workoutGlanceIntro">
                        Select the first exercise to start logging.
                      </p>
                    )}

                    {workoutDetails.map((exercise, index) => {
                      const meta = parseExerciseNotes(exercise.notes);
                      const previousMeta =
                        index > 0
                          ? parseExerciseNotes(workoutDetails[index - 1].notes)
                          : null;
                      const sectionName = meta.sectionName || "Main";
                      const showSectionHeader =
                        !previousMeta ||
                        sectionName !== (previousMeta.sectionName || "Main");
                      const prescription =
                        exercise.sets && exercise.reps
                          ? `${exercise.sets} x ${exercise.reps}`
                          : "For completion";
                      const prescriptionDetails = [
                        prescription,
                        exercise.tempo ? `Tempo ${exercise.tempo}` : "",
                        exercise.rest ? `Rest ${exercise.rest}` : "",
                      ].filter(Boolean);

                      return (
                        <div key={`${exercise.id}-glance`}>
                          {showSectionHeader && (
                            <h4 className="workoutGlanceSection">
                              {sectionName}
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
                              <strong>{exercise.exerciseName}</strong>
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
                    Back to At a Glance
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
                    const showSectionHeader =
                      !previousMeta ||
                      sectionName !== (previousMeta.sectionName || "Main");
                    const coachingNotes = meta.coachingNotes;
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
                            {sectionName}
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
                            <h3>{exercise.exerciseName}</h3>
                          </div>

                          <div className="workoutExerciseActions">
                            {exercise.videoUrl && (
                              <a
                                className="iconActionButton"
                                href={exercise.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Video"
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
                                  videoUrl: exercise.videoUrl || "",
                                  category: "",
                                  equipment: "",
                                  movementPattern: "",
                                  notes: exercise.notes || "",
                                  status: "Active",
                                })
                              }
                              type="button"
                              title="Technical form"
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
                              title="History"
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
                            <strong>Sets</strong>
                            {exercise.sets || "--"}
                          </span>
                          <span>
                            <strong>Reps</strong>
                            {exercise.reps || "--"}
                          </span>
                          <span>
                            <strong>Tempo</strong>
                            {exercise.tempo || "--"}
                          </span>
                          <span>
                            <strong>Rest</strong>
                            {exercise.rest || "--"}
                          </span>
                        </div>

                        {coachingNotes && (
                          <p className="workoutCoachNotes">{coachingNotes}</p>
                        )}

                        <div className="setLogHeader">
                          <span>Set</span>
                          <span>Actual Reps</span>
                          <span>Weight</span>
                          <span>Time</span>
                          <span>Distance</span>
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
                                  Set {log.setNumber}
                                  {log.side ? ` · ${log.side}` : ""}
                                </strong>
                              </div>
                              {log.side && (
                                <div className="setLogStatic limbCell">
                                  <span>Limb</span>
                                  <strong>{log.side}</strong>
                                </div>
                              )}

                              {showWeightInputs && (
                                <>
                                  <label className="setLogField">
                                    <span>Actual Reps</span>
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
                                    <span>Weight</span>
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
                                  <span>Time</span>
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
                                  <span>Distance</span>
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
                              ? "Exercise Saved"
                              : "Save Exercise"}
                          </button>
                        )}
                        </div>
                      </div>
                    );
                  })}

                {(!isClientPortal || workoutLoggingStarted) && (
                  <button
                    className="goldButton saveWorkoutButton"
                    onClick={saveWorkout}
                    disabled={savingWorkout}
                  >
                    {savingWorkout ? "Submitting..." : "Submit Workout"}
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
                  <p>Recent logged sets for this exercise.</p>
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
                ).length === 0 && <p>No history logged for this exercise yet.</p>}
              </div>

              <div className="modalActions">
                <button
                  className="goldButton"
                  onClick={() => setHistoryExerciseName("")}
                >
                  Done
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
