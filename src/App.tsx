import { useState } from "react";
import "./App.css";

type Page = "Clients" | "Library" | "Workouts" | "Check-ins";

const clients = [
  { initials: "CH", name: "Client Name", activity: "3d ago", training: "75%", program: "Strength Phase 1", status: "Active" },
  { initials: "MY", name: "Client Name", activity: "1w ago", training: "50%", program: "Power Phase", status: "Active" },
  { initials: "ML", name: "Client Name", activity: "2w ago", training: "--", program: "Custom Program", status: "On Hold" },
];

const menuItems: { name: Page; count: number }[] = [
  { name: "Clients", count: 0 },
  { name: "Library", count: 0 },
  { name: "Workouts", count: 0 },
  { name: "Check-ins", count: 0 },
];

function App() {
  const [activePage, setActivePage] = useState<Page>("Clients");

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">NL</div>
          <div className="brandText">No Limit Training</div>
        </div>

        <nav>
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`navItem ${activePage === item.name ? "active" : ""}`}
              onClick={() => setActivePage(item.name)}
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

            <section className="tableCard">
              <div className="tableHeader">
                <span>Name</span>
                <span>Last Activity</span>
                <span>Last 7d Training</span>
                <span>Program</span>
                <span>Status</span>
              </div>

              {clients.map((client, index) => (
                <div className="clientRow" key={index}>
                  <div className="clientName">
                    <div className="clientAvatar">{client.initials}</div>
                    <strong>{client.name}</strong>
                  </div>

                  <span>{client.activity}</span>
                  <span>{client.training}</span>
                  <span>{client.program}</span>
                  <span className={client.status === "Active" ? "status activeStatus" : "status holdStatus"}>
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
      </main>
    </div>
  );
}

export default App;