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

  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");

  const [programId, setProgramId] = useState("PR-0001");
  const [programWeek, setProgramWeek] = useState("1");
  const [programDay, setProgramDay] = useState("1");
  const [sessionName, setSessionName] = useState("Lower Strength");
  const [builderSearch, setBuilderSearch] = useState("");
  const [selectedProgramExercises, setSelectedProgramExercises] = useState<
    ProgramExercise[]
  >([]);
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

  const saveWorkoutTemplate = async () => {
    if (!programId || !programWeek || !programDay || !sessionName) {
      alert("Please fill Program ID, Week, Day, and Session Name.");
      return;
    }

    if (selectedProgramExercises.length === 0) {
      alert("Please add at least one exercise.");
      return;
    }

    setSavingTemplate(true);

    try {
      const response = await fetch("/api/createWorkoutTemplate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          programId,
          week: Number(programWeek),
          day: Number(programDay),
          sessionName,
          exercises: selectedProgramExercises.map((exercise, index) => ({
            ...exercise,
            order: Number(exercise.order) || index + 1,
            sets: Number(exercise.sets) || 1,
            status: "Active",
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        alert("Could not save workout template. Check API response.");
        return;
      }

      alert(`Workout template saved. Records created: ${data.recordsCreated}`);
      setSelectedProgramExercises([]);
    } catch (error) {
      console.error(error);
      alert("Could not save workout template.");
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
                <button className="goldButton" onClick={saveWorkoutTemplate}>
                  {savingTemplate ? "Saving..." : "Save Template"}
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
              <>
                <section className="tableCard" style={{ padding: "22px" }}>
                  <h2 style={{ color: "#f5d77b", marginTop: 0 }}>
                    Program Builder
                  </h2>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr 2fr",
                      gap: "14px",
                      marginBottom: "22px",
                    }}
                  >
                    <input
                      value={programId}
                      onChange={(e) => setProgramId(e.target.value)}
                      placeholder="Program ID"
                      className="miniSearch"
                    />

                    <input
                      value={programWeek}
                      onChange={(e) => setProgramWeek(e.target.value)}
                      placeholder="Week"
                      className="miniSearch"
                    />

                    <input
                      value={programDay}
                      onChange={(e) => setProgramDay(e.target.value)}
                      placeholder="Day"
                      className="miniSearch"
                    />

                    <input
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="Session Name"
                      className="miniSearch"
                    />
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
                    Selected Exercises
                  </h3>

                  {selectedProgramExercises.length === 0 && (
                    <p>No exercises added yet.</p>
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
                              updateProgramExercise(
                                index,
                                "order",
                                e.target.value
                              )
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
                              updateProgramExercise(
                                index,
                                "tempo",
                                e.target.value
                              )
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
                          updateProgramExercise(
                            index,
                            "coachingNotes",
                            e.target.value
                          )
                        }
                        placeholder="Coaching notes..."
                      />
                    </div>
                  ))}

                  <button
                    className="goldButton saveWorkoutButton"
                    onClick={saveWorkoutTemplate}
                    disabled={savingTemplate}
                  >
                    {savingTemplate ? "Saving..." : "Save Workout Template"}
                  </button>
                </section>
              </>
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
                      <strong>Phone/WeChat:</strong>{" "}
                      {selectedClient.phone || "--"}
                    </p>
                    <p>
                      <strong>Coach:</strong> {selectedClient.coach || "--"}
                    </p>
                    <p>
                      <strong>Package:</strong> {selectedClient.status || "--"}
                    </p>
                    <p>
                      <strong>Start Date:</strong>{" "}
                      {selectedClient.startDate || "--"}
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
                              <span>
                                {workout.completionStatus || "Scheduled"}
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
                          Prescription: {exercise.sets} sets x {exercise.reps}{" "}
                          reps • Tempo {exercise.tempo} • Rest {exercise.rest}
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