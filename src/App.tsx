import { useEffect, useState, type DragEvent } from "react";
import "./App.css";

type Page = "Clients" | "Library" | "Workouts" | "Check-ins";
type ClientTab = "Overview" | "Training";
type CalendarView = "1 Day" | "1 Week" | "1 Month";
type WorkoutPageTab = "Saved Programs" | "Builder";
type ToastType = "success" | "error" | "info";
type CheckInFilter = "Due" | "Recent" | "No Check-in" | "All";
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
  coachingNotes: string;
};

type WorkoutHistoryItem = {
  exerciseName: string;
  totalSets: number;
  lastDate: string;
  lastReps: string;
  lastWeight: string;
  bestWeight: number;
  bestReps: number;
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
    coachingNotes: "",
  };
  const remainingLines: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    const match = trimmed.match(/^(Section|Label|Superset|Circuit):\s*(.+)$/i);

    if (!match) {
      remainingLines.push(line);
      return;
    }

    const key = match[1].toLowerCase();
    const value = match[2].trim();

    if (key === "section") meta.sectionName = value;
    if (key === "label") meta.exerciseLabel = value;
    if (key === "superset" || key === "circuit") {
      meta.groupType = key === "superset" ? "Superset" : "Circuit";
      meta.groupName = value;
    }
  });

  meta.coachingNotes = remainingLines.join("\n").trim();

  return meta;
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

function formatCalendarRangeLabel(view: CalendarView, anchorDate: string) {
  if (view === "1 Day") {
    return formatCalendarLabel(anchorDate);
  }

  if (view === "1 Week") {
    return `${formatCalendarLabel(anchorDate)} - ${formatCalendarLabel(
      addDays(anchorDate, 6)
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
  const publicInvitePackage = inviteSearchParams.get("package") || "Pending";
  const [activePage, setActivePage] = useState<Page>("Clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState("All");
  const [checkInSearch, setCheckInSearch] = useState("");
  const [checkInFilter, setCheckInFilter] = useState<CheckInFilter>("Due");
  const [savingCheckInClientId, setSavingCheckInClientId] = useState("");
  const [clientBucket, setClientBucket] = useState<ClientBucket>("All Clients");
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [savingClient, setSavingClient] = useState(false);
  const [updatingClientStatus, setUpdatingClientStatus] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
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
  const [workoutPageTab, setWorkoutPageTab] =
    useState<WorkoutPageTab>("Saved Programs");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [workoutDetails, setWorkoutDetails] = useState<ExerciseDetail[]>([]);
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [editingWorkoutDate, setEditingWorkoutDate] = useState("");
  const [updatingWorkoutDate, setUpdatingWorkoutDate] = useState(false);
  const [draggingWorkoutId, setDraggingWorkoutId] = useState("");
  const [movingWorkoutId, setMovingWorkoutId] = useState("");

  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
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
  const [updatingProgram, setUpdatingProgram] = useState(false);
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
    if (!selectedClient || clientTab !== "Training") return;

    setWorkoutsLoading(true);
    setSelectedWorkout(null);
    setWorkoutDetails([]);
    setSetLogs([]);

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
  }, [selectedClient, clientTab]);

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
    });
  };

  const openNewExerciseForm = () => {
    setEditingExercise(null);
    resetExerciseForm();
    setShowExerciseModal(true);
  };

  const openEditExerciseForm = (exercise: LibraryExercise) => {
    setEditingExercise(exercise);
    setExerciseForm({
      exerciseId: exercise.exerciseId || "",
      exerciseName: exercise.exerciseName || "",
      videoUrl: exercise.videoUrl || "",
      category: exercise.category || "",
      equipment: exercise.equipment || "",
      movementPattern: exercise.movementPattern || "",
      notes: exercise.notes || "",
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

  const updateSavedProgramStatus = async (program: Program, status: string) => {
    setUpdatingProgram(true);

    try {
      const response = await fetch("/api/updateProgram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          programRecordId: program.recordId,
          status,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not update program status.", "error");
        return;
      }

      await loadPrograms();
      notify(`Program marked ${status}.`, "success");
    } catch (error) {
      console.error(error);
      notify("Could not update program.", "error");
    } finally {
      setUpdatingProgram(false);
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

      for (let i = 1; i <= setCount; i++) {
        logs.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName || `Exercise ${exercise.order}`,
          exerciseOrder: exercise.order,
          setNumber: i,
          prescribedSets: exercise.sets,
          prescribedReps: exercise.reps,
          actualReps: exercise.reps,
          actualWeight: "",
          actualTime: "",
          actualDistance: "",
        });
      }
    });

    setSetLogs(logs);
  };

  const openWorkout = async (workout: Workout) => {
    setSelectedWorkout(workout);
    setEditingWorkoutDate(normalizeDate(String(workout.scheduledDate)));
    setDetailsLoading(true);
    setHistoryLoading(true);
    setWorkoutDetails([]);
    setSetLogs([]);
    setWorkoutHistory([]);

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

      setWorkoutDetails(exercises);
      buildSetLogs(exercises);
      setWorkoutHistory(historyData.history || []);
    } catch {
      setWorkoutDetails([]);
      setSetLogs([]);
      setWorkoutHistory([]);
    } finally {
      setDetailsLoading(false);
      setHistoryLoading(false);
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
          assignedWorkoutId: selectedWorkout.assignedWorkoutId,
          assignedWorkoutRecordId: selectedWorkout.id,
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

      notify("Workout saved to Lark.");
      setSelectedWorkout(null);
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

      setSelectedWorkout(null);
    } catch (error) {
      console.error(error);
      notify("Could not update workout date.");
    } finally {
      setUpdatingWorkoutDate(false);
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

  const addExerciseToProgram = (exercise: LibraryExercise) => {
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

  const menuItems: { name: Page; count: number }[] = [
    { name: "Clients", count: clients.length },
    { name: "Library", count: libraryExercises.length },
    { name: "Workouts", count: workouts.length },
    { name: "Check-ins", count: checkInStats.due },
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

  const markClientCheckedInToday = async (client: Client) => {
    const today = dateToInputValue(new Date());

    setSavingCheckInClientId(client.id);

    try {
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

  const calendarDates =
    calendarView === "1 Day"
      ? [calendarAnchorDate]
      : calendarView === "1 Week"
      ? Array.from({ length: 7 }, (_, index) =>
          addDays(calendarAnchorDate, index)
        )
      : getMonthDates(calendarAnchorDate);

  const calendarRangeLabel = formatCalendarRangeLabel(
    calendarView,
    calendarAnchorDate
  );

  const moveCalendarRange = (direction: -1 | 1) => {
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
                N<span className="strikeO">o</span> Limit
              </div>
              <div className="brandSub">Training</div>
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

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandWordmark">
            N<span className="strikeO">o</span> Limit
          </div>
          <div className="brandSub">Training</div>
        </div>

        <nav>
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`navItem ${activePage === item.name ? "active" : ""}`}
              onClick={() => {
                setSelectedClient(null);
                setSelectedWorkout(null);
                setWorkoutDetails([]);
                setSetLogs([]);
                setActivePage(item.name);

                if (item.name === "Library" || item.name === "Workouts") {
                  loadExerciseLibrary();
                }

                if (item.name === "Workouts") {
                  loadPrograms();
                }
              }}
            >
              <span>{item.name}</span>
              <span className="badge">{item.count}</span>
            </button>
          ))}
        </nav>

        <div className="coachBox">
          <div className="avatar">KB</div>
          <div>
            <strong>Kent Bastell</strong>
            <p>Coach</p>
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

              {activePage === "Library" && (
                <button className="goldButton" onClick={loadExerciseLibrary}>
                  Refresh Library
                </button>
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

                      <button
                        className="outlineButton"
                        onClick={loadAnalytics}
                      >
                        {analyticsLoading ? "Loading..." : "Workout Analytics"}
                      </button>
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
                <section className="searchRow">
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

                                <button
                                  className="outlineButton"
                                  onClick={() =>
                                    updateSavedProgramStatus(
                                      selectedSavedProgram,
                                      "Archived"
                                    )
                                  }
                                  disabled={updatingProgram}
                                >
                                  Archive
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
              <section className="tableCard" style={{ padding: "22px" }}>
                <h2 style={{ color: "#f5d77b", marginTop: 0 }}>
                  Multi-Day Program Builder
                </h2>

                <h3 style={{ color: "#f5d77b" }}>Program Details</h3>

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

                <h3 style={{ color: "#f5d77b" }}>Current Session</h3>

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

                <h3 style={{ color: "#f5d77b" }}>Exercise Library</h3>

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

                <h3 style={{ color: "#f5d77b", marginTop: "28px" }}>
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

                <h3 style={{ color: "#f5d77b", marginTop: "28px" }}>
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
            {clientTab === "Overview" && (
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
              <button
                className="outlineButton"
                onClick={() => {
                  setSelectedClient(null);
                  setSelectedWorkout(null);
                  setWorkoutDetails([]);
                  setSetLogs([]);
                }}
              >
                ← Back
              </button>

              <div className="clientTop">
                <div className="clientAvatar largeAvatar">
                  {selectedClient.initials}
                </div>
                <div>
                  <h1>{selectedClient.name}</h1>
                  <p>
                    {selectedClient.status} • {selectedClient.program}
                  </p>
                </div>
                <div className="clientProfileActions">
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
                </div>
              </div>

              <div className="clientTabs">
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

              {clientTab === "Overview" && (
                <div className="overviewGrid">
                  <div className="profileCard">
                    <h3>Client Information</h3>
                    <p>
                      <strong>Name:</strong> {selectedClient.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedClient.email || "--"}
                    </p>
                    <p>
                      <strong>Phone/WeChat:</strong> {selectedClient.phone || "--"}
                    </p>
                    <p>
                      <strong>Coach:</strong> {selectedClient.coach || "--"}
                    </p>
                    <p>
                      <strong>Package:</strong> {selectedClient.status || "--"}
                    </p>
                    <p>
                      <strong>Start Date:</strong> {selectedClient.startDate || "--"}
                    </p>
                  </div>

                  <div className="profileCard">
                    <h3>Coach Notes</h3>
                    <p>{selectedClient.notes || "No notes yet."}</p>
                    <textarea placeholder="Add private coach notes here..." />
                  </div>
                </div>
              )}

              {clientTab === "Training" && (
                <div className="trainingCalendar">
                  <div className="calendarHeader">
                    <h2>Training Calendar</h2>

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
                    </div>
                  </div>

                  <div className="calendarNavigator">
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

                    <button
                      className="outlineButton"
                      onClick={() => setCalendarAnchorDate(dateToInputValue(new Date()))}
                    >
                      Today
                    </button>

                    <input
                      type="date"
                      value={calendarAnchorDate}
                      onChange={(e) => setCalendarAnchorDate(e.target.value)}
                    />
                  </div>

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

                  {workoutsLoading && <p>Loading workouts...</p>}

                  <div
                    className={
                      calendarView === "1 Day"
                        ? "calendarGrid oneDayCalendar"
                        : calendarView === "1 Week"
                        ? "calendarGrid weekCalendar"
                        : "calendarGrid monthCalendar"
                    }
                  >
                    {calendarDates.map((date) => {
                      const dayWorkouts = getWorkoutsForDate(date);

                      return (
                        <div
                          className={`calendarDay ${
                            draggingWorkoutId ? "calendarDropTarget" : ""
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
                        >
                          <strong className="calendarDateLabel">
                            {formatCalendarLabel(date)}
                          </strong>

                          {dayWorkouts.map((workout) => (
                            <button
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
                              draggable
                              title="Drag to another day to reschedule"
                              onDragStart={(event) => {
                                event.dataTransfer.setData("text/plain", workout.id);
                                event.dataTransfer.effectAllowed = "move";
                                setDraggingWorkoutId(workout.id);
                              }}
                              onDragEnd={() => setDraggingWorkoutId("")}
                              onClick={() => openWorkout(workout)}
                              disabled={movingWorkoutId === workout.id}
                            >
                              {workout.sessionName || "Workout"}
                              <span>
                                {movingWorkoutId === workout.id
                                  ? "Moving..."
                                  : workout.completionStatus || "Scheduled"}
                              </span>
                            </button>
                          ))}
                        </div>
                      );
                    })}
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
                  <h2>Workout Analytics</h2>
                  <p>Coach command view for training completion and client attention.</p>
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
          <div className="workout-modal-overlay">
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
                <button
                  className="outlineButton"
                  onClick={() => {
                    setTechnicalCueExercise(null);
                    openEditExerciseForm(technicalCueExercise);
                  }}
                >
                  Edit Cues
                </button>
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

        {showExerciseModal && (
          <div className="workout-modal-overlay">
            <div className="clientFormModal">
              <div className="modal-header">
                <div>
                  <h2>{editingExercise ? "Edit Exercise" : "Add Exercise"}</h2>
                  <p>
                    {editingExercise
                      ? "Update the exercise library record in Lark."
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
                {editingExercise && (
                  <button
                    className="outlineButton"
                    onClick={() => saveExerciseForm(true)}
                    disabled={savingExercise}
                  >
                    Archive
                  </button>
                )}

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
                      ? "Update this client record in Lark."
                      : "Create a client record in Lark."}
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
                  <p>
                    Week {selectedWorkout.week} • Day {selectedWorkout.day} •{" "}
                    {selectedWorkout.completionStatus}
                  </p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => {
                    setSelectedWorkout(null);
                    setWorkoutDetails([]);
                    setSetLogs([]);
                    setWorkoutHistory([]);
                  }}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="workout-info">
                  <div className="workoutDateItem">
                    <p>
                      <strong>Date:</strong>{" "}
                      {normalizeDate(String(selectedWorkout.scheduledDate))}
                    </p>

                    <div className="workoutDateControls">
                      <input
                        type="date"
                        value={editingWorkoutDate}
                        onChange={(e) => setEditingWorkoutDate(e.target.value)}
                      />

                      <button
                        className="outlineButton"
                        onClick={updateWorkoutDate}
                        disabled={updatingWorkoutDate || !editingWorkoutDate}
                      >
                        {updatingWorkoutDate ? "Saving..." : "Move Workout"}
                      </button>
                    </div>
                  </div>
                  <p>
                    <strong>Workout Logs:</strong>{" "}
                    {selectedWorkout.workoutLogs || "--"}
                  </p>
                </div>

                <h3>Workout Logging</h3>

                {detailsLoading && <p>Loading workout details...</p>}

                {!detailsLoading &&
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
                    const history = workoutHistory.find(
                      (item) =>
                        item.exerciseName.toLowerCase() ===
                        exercise.exerciseName.toLowerCase()
                    );

                    return (
                      <div key={exercise.id}>
                        {showSectionHeader && (
                          <h4 className="workoutSectionHeading">
                            {sectionName}
                          </h4>
                        )}

                        <div className="exercise-card">
                        <div className="exerciseTitleRow">
                          <div className="workoutExerciseTitle">
                            <span className="exerciseLabelBadge">
                              {meta.exerciseLabel || makeExerciseLabel(index)}
                            </span>
                            <h3>{exercise.exerciseName}</h3>
                          </div>

                          {exercise.videoUrl && (
                            <a
                              className="videoButton"
                              href={exercise.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              🎥 Video
                            </a>
                          )}
                        </div>

                        <p>
                          Prescription: {exercise.sets} sets x {exercise.reps} reps
                          • Tempo {exercise.tempo} • Rest {exercise.rest}
                        </p>

                        {coachingNotes && (
                          <p className="workoutCoachNotes">{coachingNotes}</p>
                        )}

                        <div className="previousPerformance">
                          <strong>Previous Performance</strong>
                          {historyLoading ? (
                            <span>Loading history...</span>
                          ) : history ? (
                            <>
                              <span>
                                Last: {history.lastWeight || "--"} kg x{" "}
                                {history.lastReps || "--"} reps
                              </span>
                              <span>
                                Best: {history.bestWeight || "--"} kg /{" "}
                                {history.bestReps || "--"} reps
                              </span>
                              <span>{history.totalSets} logged sets</span>
                            </>
                          ) : (
                            <span>No previous logs for this exercise.</span>
                          )}
                        </div>

                        <div className="setLogHeader">
                          <span>Set</span>
                          <span>Target Reps</span>
                          <span>Actual Reps</span>
                          <span>Weight</span>
                          <span>Time</span>
                          <span>Distance</span>
                        </div>

                        {exerciseLogs.map((log) => {
                          const globalIndex = setLogs.findIndex(
                            (item) =>
                              item.exerciseId === log.exerciseId &&
                              item.setNumber === log.setNumber
                          );

                          return (
                            <div
                              className="setLogRow"
                              key={`${log.exerciseId}-${log.setNumber}`}
                            >
                              <div className="setLogStatic">
                                <span>Set</span>
                                <strong>{log.setNumber}</strong>
                              </div>
                              <div className="setLogStatic">
                                <span>Target Reps</span>
                                <strong>{log.prescribedReps}</strong>
                              </div>

                              <label className="setLogField">
                                <span>Actual Reps</span>
                                <input
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

                              <label className="setLogField">
                                <span>Time</span>
                                <input
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

                              <label className="setLogField">
                                <span>Distance</span>
                                <input
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
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    );
                  })}

                <button
                  className="goldButton saveWorkoutButton"
                  onClick={saveWorkout}
                  disabled={savingWorkout}
                >
                  {savingWorkout ? "Saving..." : "Save Workout"}
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

