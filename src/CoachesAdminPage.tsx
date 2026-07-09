// Coaches (admin) — redesigned into the light system: header, dark KPI board,
// All/Active/Admins segmented tabs + search, and a card-row table. Clicking a row
// opens the edit slide-over (CoachEditModal). View-layer restyle; every prop and
// handler kept as-is.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import "./CoachesAdminPage.css";
import { ChevronRight, Plus, Search } from "lucide-react";

const initialsOf = (name: string) =>
  String(name || "")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

function avatarStyle(coach: any) {
  const active = (coach.status || "Active") === "Active";
  const admin = coach.role === "Admin";
  if (!active) return { background: "#eae4d6", color: "#8a8372" };
  return admin
    ? { background: "#efe4c5", color: "#8a6d24" }
    : { background: "#e6ecf6", color: "#3560ac" };
}

export default function CoachesAdminPage(props: { [key: string]: any }) {
  const {
    activeCoaches,
    allCoaches,
    clientBelongsToCoach,
    clients,
    openEditCoachForm,
  } = props;

  const [filter, setFilter] = useState<"all" | "active" | "admins">("all");
  const [search, setSearch] = useState("");

  const coaches = (allCoaches as any[]) || [];
  const assignedCount = (coach: any) =>
    (clients as any[]).filter((cl) => clientBelongsToCoach(cl, coach)).length;

  // ---- board metrics ----
  const adminCount = coaches.filter(
    (c) => c.role === "Admin" && c.status !== "Inactive"
  ).length;
  const inactiveCount = coaches.filter((c) => c.status === "Inactive").length;
  const totalAssigned = coaches.reduce((n, c) => n + assignedCount(c), 0);
  const busiest = useMemo(() => {
    let best: any = null;
    let bestN = -1;
    for (const c of coaches) {
      const n = assignedCount(c);
      if (n > bestN) {
        bestN = n;
        best = c;
      }
    }
    return { name: best?.name || "—", count: Math.max(0, bestN) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coaches, clients]);

  // ---- filter + search ----
  const counts = {
    all: coaches.length,
    active: (activeCoaches as any[]).length,
    admins: adminCount,
  };
  const filtered = coaches.filter((c) => {
    if (filter === "active" && c.status !== "Active") return false;
    if (filter === "admins" && !(c.role === "Admin" && c.status !== "Inactive"))
      return false;
    const q = search.trim().toLowerCase();
    if (
      q &&
      !(
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.bio || "").toLowerCase().includes(q)
      )
    )
      return false;
    return true;
  });

  return (
    <div className="capPage">
      {/* header */}
      <div className="capHead">
        <div>
          <span className="capEyebrow">Team · Coaches</span>
          <h1>Coaches</h1>
          <p>
            Manage coach access, client ownership, and roster assignment across
            your team.
          </p>
        </div>
        <button
          type="button"
          className="capAddBtn"
          onClick={() => openEditCoachForm(null)}
        >
          <Plus size={17} /> Add coach
        </button>
      </div>

      {/* KPI board */}
      <div className="capBoard">
        <div className="capBoardDark">
          <div className="capBoardGlow" />
          <span className="capBoardEyebrow">Your team</span>
          <div className="capBoardBig">
            <span>{coaches.length}</span>
            <small>coaches on staff</small>
          </div>
          <div className="capBoardBreak">
            <span>
              <strong>{(activeCoaches as any[]).length}</strong> active
            </span>
            <span>
              <strong>{adminCount}</strong> admins
            </span>
            <span>
              <strong>{inactiveCount}</strong> inactive
            </span>
          </div>
        </div>
        <div className="capBoardLight">
          <span className="capBoardEyebrowLight">Clients coached</span>
          <div className="capBoardBig">
            <span className="capBoardBigDark">{totalAssigned}</span>
            <small>assigned</small>
          </div>
          <p>
            Busiest: <strong>{busiest.name}</strong> — {busiest.count} clients
          </p>
        </div>
      </div>

      {/* tabs + search */}
      <div className="capFilters">
        <div className="capTabs">
          {[
            { k: "all", label: "All" },
            { k: "active", label: "Active" },
            { k: "admins", label: "Admins" },
          ].map((tab) => (
            <button
              key={tab.k}
              type="button"
              className={`capTab${filter === tab.k ? " on" : ""}`}
              onClick={() => setFilter(tab.k as any)}
            >
              {tab.label} <span>{(counts as any)[tab.k]}</span>
            </button>
          ))}
        </div>
        <div className="capSearch">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coaches…"
          />
        </div>
      </div>

      {/* table */}
      <div className="capTable">
        <div className="capTableHead">
          <span>Coach</span>
          <span>Role</span>
          <span>Status</span>
          <span>Clients</span>
          <span>Contact</span>
          <span />
        </div>
        {filtered.length === 0 ? (
          <div className="capEmpty">No coaches match this filter.</div>
        ) : (
          filtered.map((coach) => {
            const active = (coach.status || "Active") === "Active";
            return (
              <div
                className="capRow"
                key={coach.recordId || coach.coachId || coach.name}
                onClick={() => openEditCoachForm(coach)}
              >
                <div className="capRowCoach">
                  <div className="capAvatar" style={avatarStyle(coach)}>
                    {initialsOf(coach.name)}
                  </div>
                  <div className="capRowName">
                    <strong>{coach.name}</strong>
                    <small>{coach.bio || coach.coachId || "Coach record"}</small>
                  </div>
                </div>
                <div>
                  <span
                    className={`capRolePill${coach.role === "Admin" ? " admin" : ""}`}
                  >
                    {coach.role || "Coach"}
                  </span>
                </div>
                <div className="capStatus">
                  <span
                    className="capDot"
                    style={{ background: active ? "#3fa564" : "#c0562f" }}
                  />
                  {coach.status || "Active"}
                </div>
                <div className="capClients">{assignedCount(coach)}</div>
                <div className="capContact">
                  {coach.email || coach.phoneWechat || "—"}
                </div>
                <div className="capChevron">
                  <ChevronRight size={18} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
