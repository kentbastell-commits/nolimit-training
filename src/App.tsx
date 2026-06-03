import { useEffect, useState } from "react";
import "./App.css";

type Page = "Clients" | "Library" | "Workouts" | "Check-ins";
type ClientTab = "Overview" | "Training";

type Client = {
  id: string;
  name: string;
  initials: string;
  activity: string;
  training: string;
  program: string;
  status: string;
};

function App() {
  const [activePage, setActivePage] = useState<Page>("Clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientTab, setClientTab] = useState<ClientTab>("Overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        setClients(data.clients || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const menuItems: { name: Page; count: number }[] = [
    { name: "Clients", count: clients.length },
    { name: "Library", count: 0 },
    { name: "Workouts", count: 0 },
    { name: "Check-ins", count: 0 },
  ];

  const calendarDays = [
    "Mon 18", "Tue 19", "Wed 20", "Thu 21", "Fri 22", "Sat 23", "Sun 24",
    "Mon 25", "Tue 26", "Wed 27", "Thu 28", "Fri 29", "Sat 30", "Sun 31",
  ];

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
          </>
        )}

        {selectedClient && (
          <div className="clientPage">
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

            <section className="clientWorkspace">
              <button className="outlineButton" onClick={() => setSelectedClient(null)}>
                ← Back
              </button>

              <div className="clientTop">
                <div className="clientAvatar largeAvatar">
                  {selectedClient.initials}
                </div>
                <div>
                  <h1>{selectedClient.name}</h1>
                  <p>{selectedClient.status} • {selectedClient.program}</p>
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
                    <p><strong>Name:</strong> {selectedClient.name}</p>
                    <p><strong>Status:</strong> {selectedClient.status}</p>
                    <p><strong>Current Program:</strong> {selectedClient.program}</p>
                    <p><strong>Last Activity:</strong> {selectedClient.activity}</p>
                    <p><strong>Last 7d Training:</strong> {selectedClient.training}</p>
                  </div>

                  <div className="profileCard">
                    <h3>Coach Notes</h3>
                    <textarea placeholder="Add private coach notes here..." />
                  </div>
                </div>
              )}

              {clientTab === "Training" && (
                <div className="trainingCalendar">
                  <div className="calendarHeader">
                    <h2>Training Calendar</h2>
                    <div>
                      <button className="outlineButton">1 Week</button>
                      <button className="goldButton">2 Week</button>
                    </div>
                  </div>

                  <div className="calendarGrid">
                    {calendarDays.map((day, index) => (
                      <div className="calendarDay" key={day}>
                        <strong>{day}</strong>

                        {index === 4 && (
                          <div className="workoutBlock">
                            Strength Session
                            <span>+ 4 exercises</span>
                          </div>
                        )}

                        {index === 8 && (
                          <div className="workoutBlock">
                            Back + Pull
                            <span>+ 8 exercises</span>
                          </div>
                        )}

                        {index === 12 && (
                          <div className="workoutBlock">
                            Max Strength
                            <span>+ 6 exercises</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;