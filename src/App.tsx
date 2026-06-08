import { useEffect, useState } from "react";
import "./App.css";

type Page = "Clients" | "Library" | "Workouts" | "Check-ins";
type ClientTab = "Overview" | "Training";
type CalendarView = "1 Day" | "1 Week" | "1 Month";

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

type LibraryExercise = {
  recordId: string;
  exerciseId: string;
  exerciseName: string;
  videoUrl: string;
  category?: string;
  equipment?: string;
  movementPattern?: string;
  notes?: string;
};

type ProgramExercise = {
  exerciseRecordId: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: string;
  reps: string;
  tempo: string;
  rest: string;
  coachingNotes: string;
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

function dateToInputValue(date: Date) {
  return date.toISOString().split("T")[0];
}

function addDays(dateString: string, days: number) {
  const date = new Date(dateString + "T00:00:00");
  date.setDate(date.getDate() + days);
  return dateToInputValue(date);
}

function formatCalendarLabel(dateString: string) {
  return new Date(dateString + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
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
  const [activePage, setActivePage] = useState<Page>("Clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientTab, setClientTab] = useState<ClientTab>("Overview");
  const [calendarView, setCalendarView] = useState<CalendarView>("1 Week");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [workoutDetails, setWorkoutDetails] = useState<ExerciseDetail[]>([]);
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [editingWorkoutDate, setEditingWorkoutDate] = useState("");
  const [updatingWorkoutDate, setUpdatingWorkoutDate] = useState(false);

  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");

  const [programs, setPrograms] = useState<Program[]>([]);
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

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        setClients(data.clients || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

  const loadPrograms = async () => {
    try {
      const res = await fetch("/api/programs");
      const data = await res.json();
      setPrograms(data.programs || []);

      if (!selectedAssignProgramId && data.programs?.length > 0) {
        setSelectedAssignProgramId(data.programs[0].programId);
      }
    } catch (err) {
      console.error(err);
      setPrograms([]);
    }
  };

  const selectedAssignProgram = programs.find(
    (program) => program.programId === selectedAssignProgramId
  );

  const loadProgramSessionsForAssignment = async () => {
    if (!selectedAssignProgram) {
      alert("Please select a program.");
      return;
    }

    if (!assignStartDate) {
      alert("Please choose a start date.");
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
        alert("Could not load program templates.");
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
      alert("Could not load program sessions.");
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
      alert("Please select a client and program.");
      return;
    }

    if (assignableWorkouts.length === 0) {
      alert("Please load program sessions first.");
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
        alert("Could not assign program. Check API response.");
        return;
      }

      alert(`Program assigned. Workouts created: ${data.recordsCreated}`);
      setAssignableWorkouts([]);

      const refresh = await fetch(`/api/workouts?clientCode=${selectedClient.clientCode}`);
      const refreshData = await refresh.json();
      setWorkouts(refreshData.workouts || []);
    } catch (error) {
      console.error(error);
      alert("Could not assign program.");
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
    setWorkoutDetails([]);
    setSetLogs([]);

    try {
      const res = await fetch(
        `/api/workoutDetails?programId=${workout.programId}&week=${workout.week}&day=${workout.day}`
      );

      const data = await res.json();
      const exercises = data.exercises || [];

      setWorkoutDetails(exercises);
      buildSetLogs(exercises);
    } catch {
      setWorkoutDetails([]);
      setSetLogs([]);
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
          assignedWorkoutId: selectedWorkout.assignedWorkoutId,
          assignedWorkoutRecordId: selectedWorkout.id,
          workoutDate: normalizeDate(String(selectedWorkout.scheduledDate)),
          logs: setLogs,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        alert("Could not save workout. Check API response.");
        return;
      }

      alert("Workout saved to Lark.");
      setSelectedWorkout(null);
      setWorkoutDetails([]);
      setSetLogs([]);
    } catch (error) {
      console.error(error);
      alert("Could not save workout.");
    } finally {
      setSavingWorkout(false);
    }
  };

  const updateWorkoutDate = async () => {
    if (!selectedWorkout || !selectedClient) return;

    setUpdatingWorkoutDate(true);

    try {
      const response = await fetch("/api/updateAssignedProgramDate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignedWorkoutRecordId: selectedWorkout.id,
          scheduledDate: editingWorkoutDate,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        alert("Could not update workout date.");
        return;
      }

      alert("Workout date updated.");

      const refresh = await fetch(`/api/workouts?clientCode=${selectedClient.clientCode}`);
      const refreshData = await refresh.json();
      setWorkouts(refreshData.workouts || []);

      setSelectedWorkout(null);
    } catch (error) {
      console.error(error);
      alert("Could not update workout date.");
    } finally {
      setUpdatingWorkoutDate(false);
    }
  };

  const addExerciseToProgram = (exercise: LibraryExercise) => {
    const alreadyAdded = selectedProgramExercises.some(
      (item) => item.exerciseRecordId === exercise.recordId
    );

    if (alreadyAdded) return;

    setSelectedProgramExercises([
      ...selectedProgramExercises,
      {
        exerciseRecordId: exercise.recordId,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        order: selectedProgramExercises.length + 1,
        sets: "3",
        reps: "8",
        tempo: "3-1-1",
        rest: "60 sec",
        coachingNotes: "",
      },
    ]);
  };

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
      alert("Please fill Week, Day, and Session Name.");
      return;
    }

    if (selectedProgramExercises.length === 0) {
      alert("Please add at least one exercise to this session.");
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
      alert("Please fill Program Name.");
      return;
    }

    if (programSessions.length === 0 && selectedProgramExercises.length === 0) {
      alert("Please add at least one session.");
      return;
    }

    let sessionsToSave = [...programSessions];

    if (selectedProgramExercises.length > 0) {
      if (!programWeek || !programDay || !sessionName) {
        alert("Current session has exercises but is missing Week, Day, or Session Name.");
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
        alert("Could not create program. Check API response.");
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
              status: "Active",
            })),
          }),
        });

        const templateData = await templateResponse.json();

        if (!templateResponse.ok || !templateData.success) {
          console.error(templateData);
          alert(
            `Program was created, but session "${session.sessionName}" failed. Check API response.`
          );
          return;
        }

        totalRecordsCreated += Number(templateData.recordsCreated || 0);
      }

      alert(
        `Program saved: ${programData.programId}. Sessions: ${sessionsToSave.length}. Template records created: ${totalRecordsCreated}`
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
      alert("Could not save full program.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const filteredLibraryExercises = libraryExercises.filter((exercise) => {
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

  const menuItems: { name: Page; count: number }[] = [
    { name: "Clients", count: clients.length },
    { name: "Library", count: libraryExercises.length },
    { name: "Workouts", count: workouts.length },
    { name: "Check-ins", count: 0 },
  ];

  const calendarDates =
    calendarView === "1 Day"
      ? ["2026-05-27"]
      : calendarView === "1 Week"
      ? [
          "2026-05-27",
          "2026-05-28",
          "2026-05-29",
          "2026-05-30",
          "2026-05-31",
          "2026-06-01",
          "2026-06-02",
        ]
      : [
          "2026-05-27",
          "2026-05-28",
          "2026-05-29",
          "2026-05-30",
          "2026-05-31",
          "2026-06-01",
          "2026-06-02",
          "2026-06-03",
          "2026-06-04",
          "2026-06-05",
          "2026-06-06",
          "2026-06-07",
          "2026-06-08",
          "2026-06-09",
          "2026-06-10",
          "2026-06-11",
          "2026-06-12",
          "2026-06-13",
          "2026-06-14",
          "2026-06-15",
          "2026-06-16",
          "2026-06-17",
          "2026-06-18",
          "2026-06-19",
          "2026-06-20",
          "2026-06-21",
          "2026-06-22",
          "2026-06-23",
        ];

  function getWorkoutsForDate(dateString: string) {
    return workouts.filter(
      (workout) => normalizeDate(String(workout.scheduledDate)) === dateString
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
        {!selectedClient && (
          <>
            <header className="topbar">
              <div>
                <h1>{activePage}</h1>
                <p>NoLimit Training System</p>
              </div>

              {activePage === "Clients" && (
                <button className="goldButton">+ Add Client</button>
              )}

              {activePage === "Library" && (
                <button className="goldButton" onClick={loadExerciseLibrary}>
                  Refresh Library
                </button>
              )}

              {activePage === "Workouts" && (
                <button className="goldButton" onClick={saveFullProgram}>
                  {savingTemplate ? "Saving..." : "Save Full Program"}
                </button>
              )}
            </header>

            {activePage === "Clients" && (
              <>
                <section className="filters">
                  <button>Category: All</button>
                  <button>Status: All</button>
                  <button>Last Activity</button>
                  <button>Last Assigned Workout</button>
                </section>

                <section className="searchRow">
                  <input placeholder="Search client..." />
                  <button className="outlineButton">Workout Analytics</button>
                </section>

                {loading && <p>Loading clients...</p>}

                <section className="tableCard">
                  <div className="tableHeader">
                    <span>Name</span>
                    <span>Last Activity</span>
                    <span>Last 7d Training</span>
                    <span>Program</span>
                    <span>Status</span>
                  </div>

                  {clients.map((client) => (
                    <div
                      className="clientRow clickableRow"
                      key={client.id}
                      onClick={() => {
                        setSelectedClient(client);
                        setClientTab("Overview");
                      }}
                    >
                      <div className="clientName">
                        <div className="clientAvatar">{client.initials}</div>
                        <strong>{client.name}</strong>
                      </div>

                      <span>{client.activity}</span>
                      <span>{client.training}</span>
                      <span>{client.program}</span>
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
                  ))}
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
                  <button className="outlineButton" onClick={loadExerciseLibrary}>
                    Reload
                  </button>
                </section>

                <section className="tableCard">
                  <div
                    className="tableHeader"
                    style={{
                      gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
                    }}
                  >
                    <span>Exercise</span>
                    <span>Category</span>
                    <span>Equipment</span>
                    <span>Pattern</span>
                    <span>Video</span>
                  </div>

                  {libraryLoading && <p>Loading exercises...</p>}

                  {!libraryLoading && filteredLibraryExercises.length === 0 && (
                    <p style={{ padding: "18px 22px" }}>No exercises found.</p>
                  )}

                  {!libraryLoading &&
                    filteredLibraryExercises.map((exercise) => (
                      <div
                        className="clientRow"
                        key={exercise.recordId || exercise.exerciseId}
                        style={{
                          gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
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
                            <p style={{ margin: 0 }}>
                              {exercise.exerciseId || "--"}
                            </p>
                          </div>
                        </div>

                        <span>{exercise.category || "--"}</span>
                        <span>{exercise.equipment || "--"}</span>
                        <span>{exercise.movementPattern || "--"}</span>

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
                      </div>
                    ))}
                </section>
              </>
            )}

            {activePage === "Workouts" && (
              <section className="tableCard" style={{ padding: "22px" }}>
                <h2 style={{ color: "#f5d77b", marginTop: 0 }}>
                  Multi-Day Program Builder
                </h2>

                <h3 style={{ color: "#f5d77b" }}>Program Details</h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr",
                    gap: "14px",
                    marginBottom: "14px",
                  }}
                >
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

                  <label>
                    <span>Sport</span>
                    <input
                      value={programSport}
                      onChange={(e) => setProgramSport(e.target.value)}
                      placeholder="Sport"
                      className="miniSearch"
                    />
                  </label>

                  <label>
                    <span>Level</span>
                    <input
                      value={programLevel}
                      onChange={(e) => setProgramLevel(e.target.value)}
                      placeholder="Level"
                      className="miniSearch"
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr",
                    gap: "14px",
                    marginBottom: "22px",
                  }}
                >
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

                  <label>
                    <span>Coach</span>
                    <input
                      value={programCoach}
                      onChange={(e) => setProgramCoach(e.target.value)}
                      placeholder="Coach"
                      className="miniSearch"
                    />
                  </label>
                </div>

                <h3 style={{ color: "#f5d77b" }}>Current Session</h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 2fr auto",
                    gap: "14px",
                    marginBottom: "22px",
                    alignItems: "end",
                  }}
                >
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

                <div className="tableCard">
                  <div
                    className="tableHeader"
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
                      className="clientRow"
                      key={exercise.recordId || exercise.exerciseId}
                      style={{
                        gridTemplateColumns: "2fr 1fr 1fr auto",
                      }}
                    >
                      <div>
                        <strong>{exercise.exerciseName}</strong>
                        <p style={{ margin: 0 }}>{exercise.exerciseId}</p>
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
                  <div className="exercise-card" key={exercise.exerciseRecordId}>
                    <div className="exerciseTitleRow">
                      <h3>
                        {exercise.order}. {exercise.exerciseName}
                      </h3>

                      <button
                        className="outlineButton"
                        onClick={() => removeProgramExercise(index)}
                      >
                        Remove
                      </button>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 100px 120px 120px 1fr",
                        gap: "12px",
                        marginTop: "12px",
                      }}
                    >
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

                    <textarea
                      style={{
                        width: "100%",
                        marginTop: "12px",
                        minHeight: "80px",
                        background: "#050505",
                        color: "white",
                        border: "1px solid rgba(212, 175, 55, 0.35)",
                        borderRadius: "10px",
                        padding: "12px",
                      }}
                      value={exercise.coachingNotes}
                      onChange={(e) =>
                        updateProgramExercise(index, "coachingNotes", e.target.value)
                      }
                      placeholder="Coaching notes..."
                    />
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

            {activePage === "Check-ins" && (
              <section className="placeholder">
                <h2>Check-ins</h2>
                <p>Client check-ins will be connected here next.</p>
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
                      <strong>Client ID:</strong> {selectedClient.clientCode}
                    </p>
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

                  <section
                    className="tableCard"
                    style={{ padding: "22px", marginTop: "18px" }}
                  >
                    <h3 style={{ color: "#f5d77b", marginTop: 0 }}>
                      Assign Program
                    </h3>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr auto auto",
                        gap: "14px",
                        alignItems: "end",
                      }}
                    >
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
                              {program.programName} ({program.programId})
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
                      <div style={{ marginTop: "20px" }}>
                        <h4 style={{ color: "#f5d77b" }}>Arrange Workouts</h4>

                        {assignableWorkouts.map((workout) => (
                          <div
                            key={workout.localId}
                            className="clientRow"
                            style={{
                              gridTemplateColumns: "1fr 1fr 2fr 1fr",
                            }}
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
                        <div className="calendarDay" key={date}>
                          <strong>{formatCalendarLabel(date)}</strong>

                          {dayWorkouts.map((workout) => (
                            <button
                              className={`workoutBlock ${getStatusClass(
                                workout.completionStatus
                              )}`}
                              key={workout.id}
                              onClick={() => openWorkout(workout)}
                            >
                              {workout.sessionName || "Workout"}
                              <span>{workout.completionStatus || "Scheduled"}</span>
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
                  }}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="workout-info">
                  <p>
                    <strong>Assigned Workout:</strong>{" "}
                    {selectedWorkout.assignedWorkoutId || "--"}
                  </p>
                  <p>
                    <strong>Program:</strong> {selectedWorkout.programId || "--"}
                  </p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {normalizeDate(String(selectedWorkout.scheduledDate))}
                  </p>
                  <p>
                    <strong>Workout Logs:</strong>{" "}
                    {selectedWorkout.workoutLogs || "--"}
                  </p>
                </div>

                <div className="moveWorkoutPanel">
                  <div>
                    <h3>Move Workout Date</h3>
                    <p>Update this assigned workout's scheduled date.</p>
                  </div>

                  <div className="moveWorkoutControls">
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

                <h3>Workout Logging</h3>

                {detailsLoading && <p>Loading workout details...</p>}

                {!detailsLoading &&
                  workoutDetails.map((exercise) => {
                    const exerciseLogs = setLogs.filter(
                      (log) => log.exerciseId === exercise.exerciseId
                    );

                    return (
                      <div key={exercise.id} className="exercise-card">
                        <div className="exerciseTitleRow">
                          <h3>{exercise.exerciseName}</h3>

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
                              <span>{log.setNumber}</span>
                              <span>{log.prescribedReps}</span>

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
                            </div>
                          );
                        })}
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
