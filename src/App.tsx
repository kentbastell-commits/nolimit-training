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
  exerciseName: string;
  order: number;
  sets: string;
  reps: string;
  tempo: string;
  rest: string;
  notes: string;
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
  const [loading, setLoading] = useState(true);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

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

  const openWorkout = async (workout: Workout) => {
    setSelectedWorkout(workout);
    setDetailsLoading(true);

    try {
      const res = await fetch(
        `/api/workoutDetails?programId=${workout.programId}&week=${workout.week}&day=${workout.day}`
      );
      const data = await res.json();
      setWorkoutDetails(data.exercises || []);
    } catch {
      setWorkoutDetails([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const menuItems: { name: Page; count: number }[] = [
    { name: "Clients", count: clients.length },
    { name: "Library", count: 0 },
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
                setActivePage(item.name);
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
              <button className="goldButton">+ Add Client</button>
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
              <section className="placeholder">
                <h2>Exercise Library</h2>
                <p>Your exercise library will appear here.</p>
              </section>
            )}

            {activePage === "Workouts" && (
              <section className="placeholder">
                <h2>Workouts</h2>
                <p>Workout templates and assigned sessions will appear here.</p>
              </section>
            )}

            {activePage === "Check-ins" && (
              <section className="placeholder">
                <h2>Check-ins</h2>
                <p>Readiness, soreness, pain, and weekly check-ins will appear here.</p>
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
                }}
              >
                ← Back
              </button>

              <div className="clientTop">
                <div className="clientAvatar largeAvatar">{selectedClient.initials}</div>
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
                    <p><strong>Client ID:</strong> {selectedClient.clientCode}</p>
                    <p><strong>Name:</strong> {selectedClient.name}</p>
                    <p><strong>Email:</strong> {selectedClient.email || "--"}</p>
                    <p><strong>Phone/WeChat:</strong> {selectedClient.phone || "--"}</p>
                    <p><strong>Coach:</strong> {selectedClient.coach || "--"}</p>
                    <p><strong>Package:</strong> {selectedClient.status || "--"}</p>
                    <p><strong>Start Date:</strong> {selectedClient.startDate || "--"}</p>
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
                  }}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="workout-info">
                  <p><strong>Assigned Workout:</strong> {selectedWorkout.assignedWorkoutId || "--"}</p>
                  <p><strong>Program:</strong> {selectedWorkout.programId || "--"}</p>
                  <p><strong>Date:</strong> {normalizeDate(String(selectedWorkout.scheduledDate))}</p>
                  <p><strong>Workout Logs:</strong> {selectedWorkout.workoutLogs || "--"}</p>
                </div>

                <h3>Exercises</h3>

                {detailsLoading && <p>Loading workout details...</p>}

                {!detailsLoading && workoutDetails.length === 0 && (
                  <p>No exercises found for this workout yet.</p>
                )}

                {workoutDetails.map((exercise, index) => (
                  <div key={exercise.id} className="exercise-card">
                    <h3>
                      {exercise.exerciseName || `Exercise ${index + 1}`}
                    </h3>

                    <div className="exerciseGrid">
                      <p><strong>Sets:</strong> {exercise.sets || "--"}</p>
                      <p><strong>Reps:</strong> {exercise.reps || "--"}</p>
                      <p><strong>Tempo:</strong> {exercise.tempo || "--"}</p>
                      <p><strong>Rest:</strong> {exercise.rest || "--"}</p>
                    </div>

                    <p><strong>Notes:</strong> {exercise.notes || "--"}</p>
                  </div>
                ))}

                <div className="drawerNotes">
                  <h3>Coach Notes</h3>
                  <p>{selectedWorkout.coachNotes || "No coach notes."}</p>

                  <h3>Client Notes</h3>
                  <p>{selectedWorkout.clientNotes || "No client notes."}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;