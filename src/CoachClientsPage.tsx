// Coach Clients roster — redesigned to match the Store / Digital Program pages
// (dark board, segmented filters, grouped rows, peek slide-over). Restyle only:
// row click still routes into the existing client Home; every control is wired
// to the handlers already threaded in from App.tsx.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import "./CoachClientsPage.css";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Link2,
  Plus,
  RefreshCw,
  Search,
  UserCircle,
  Users,
  X,
} from "lucide-react";

const AVATAR_PALETTE = [
  { bg: "#e8f0ff", fg: "#1f5fd6" },
  { bg: "#fdeaee", fg: "#a32f3e" },
  { bg: "#e9f6ee", fg: "#237a30" },
  { bg: "#f3ecfb", fg: "#6a2f9e" },
  { bg: "#fdf0e1", fg: "#9a6a12" },
  { bg: "#e6f6f7", fg: "#0c7382" },
  { bg: "#ecedf6", fg: "#3a4a8a" },
  { bg: "#fbe9f6", fg: "#97287f" },
];
const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
};
const ringColorOf = (pct: number | null) =>
  pct == null ? "#a8a091" : pct >= 80 ? "#1f7a43" : pct >= 50 ? "#9a7b1f" : "#8b1e2d";
const CIRC = 94.2;
const EASE = [0.16, 1, 0.3, 1] as const;

export default function CoachClientsPage(props: { [key: string]: any }) {
  const {
    loading,
    todayValue,
    activeCoaches,
    buildClientPortalLink,
    bulkAddTag,
    bulkAddToTeam,
    bulkAssignProgram,
    bulkBusy,
    bulkCopyLinks,
    bulkPanel,
    bulkProgramId,
    bulkStartDate,
    bulkTag,
    bulkTeamId,
    clearRosterSelection,
    clientBucket,
    clientBuckets,
    clientEngagement,
    clientNeedsContact,
    clientNeedsProgramming,
    clients,
    clientSearch,
    clientStatusFilter,
    clientStatusOptions,
    clientTeams,
    clientWeekLoadZone,
    coachInviteLink,
    coachScope,
    copyToClipboard,
    daysSinceLogin,
    loadClients,
    openAccountModal,
    openNewClientForm,
    paceZh,
    programs,
    renderCoachReviews,
    rosterClients,
    rosterGroupBy,
    rosterGroups,
    rosterSelectedIds,
    rosterTriage,
    setBulkPanel,
    setBulkProgramId,
    setBulkStartDate,
    setBulkTag,
    setBulkTeamId,
    setClientBucket,
    setClientSearch,
    setClientStatusFilter,
    setClientTab,
    setCoachScope,
    setRosterGroupBy,
    setRosterTriage,
    setSelectedClient,
    teams,
    toggleRosterSelect,
    triageCounts,
    triageDefs,
  } = props;

  const reduce = useReducedMotion();
  const [groupView, setGroupView] = useState<
    "none" | "online" | "inperson" | "team"
  >(rosterGroupBy === "team" ? "team" : "none");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [peekId, setPeekId] = useState<string | null>(null);

  // ---- board (from the full clients list, stable across filters) ----
  const all = (clients as any[]) || [];
  const isActive = (c: any) => (c.status || "Active") === "Active";
  const isOnline = (c: any) => /online/i.test(c.clientType || "");
  const isInPerson = (c: any) => /in.?person/i.test(c.clientType || "");
  const hasAttention = (c: any) => {
    const lz = clientWeekLoadZone(c);
    return (
      clientNeedsProgramming(c) ||
      clientNeedsContact(c) ||
      (lz && (lz.cls === "loadZoneWarn" || lz.cls === "loadZoneRisk"))
    );
  };
  const activeAll = all.filter(isActive);
  const sumActive = activeAll.length;
  const sumOnline = activeAll.filter(isOnline).length;
  const sumInPerson = activeAll.filter(isInPerson).length;
  const sumTeams = (teams as any[])?.length || 0;
  const sumAttention = all.filter(hasAttention).length;
  const withPct = all
    .map((c) => clientEngagement(c).compliance)
    .filter((p: any) => p != null) as number[];
  const sumAvg = withPct.length
    ? Math.round(withPct.reduce((a, b) => a + b, 0) / withPct.length)
    : null;

  // ---- bucket segmented (All / Active / Paused only) ----
  const bucketCount = (name: string) =>
    (clientBuckets as any[]).find((b) => b.name === name)?.count ?? 0;
  const BUCKETS: Array<[string, string]> = [
    ["All Clients", "All"],
    ["Active", "Active"],
    ["Paused", "Paused"],
  ];

  const onGroupChange = (v: any) => {
    setGroupView(v);
    setRosterGroupBy(v === "team" ? "team" : "none");
  };

  // ---- rows to render ----
  const flatFor = () => {
    let list = (rosterClients as any[]) || [];
    if (groupView === "online") list = list.filter(isOnline);
    else if (groupView === "inperson") list = list.filter(isInPerson);
    return list;
  };
  const renderGroups: Array<{ showTitle: boolean; label: string; clients: any[] }> =
    groupView === "team"
      ? (rosterGroups as any[]).map((g) => ({
          showTitle: rosterGroupBy !== "none",
          label: g.label,
          clients: g.clients,
        }))
      : [{ showTitle: false, label: "", clients: flatFor() }];
  const totalShown = renderGroups.reduce((a, g) => a + g.clients.length, 0);

  const fade = reduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  const copyInvite = () => {
    void copyToClipboard(coachInviteLink, "Invite link");
    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 1800);
  };

  const flagsFor = (c: any) => {
    const out: Array<{ label: string; cls: string }> = [];
    if (clientNeedsProgramming(c)) out.push({ label: "Needs program", cls: "crpFlagProgram" });
    if (clientNeedsContact(c)) out.push({ label: "Needs contact", cls: "crpFlagContact" });
    const lz = clientWeekLoadZone(c);
    if (lz && (lz.cls === "loadZoneWarn" || lz.cls === "loadZoneRisk")) {
      out.push({
        label: `${paceZh ? "负荷" : "Load"} · ${lz.label}`,
        cls: "crpFlagLoad",
      });
    }
    return out;
  };

  const seenLabel = (c: any) => {
    const d = daysSinceLogin(c.lastLogin);
    if (d === null) return "No login yet";
    if (d === 0) return "Active today";
    return `Last seen ${d}d ago`;
  };

  const Row = (c: any) => {
    const col = avatarColor(c.name || "");
    const eng = clientEngagement(c);
    const pct = eng.compliance as number | null;
    const ringColor = ringColorOf(pct);
    const lcDays = eng.lastCompleted
      ? Math.round(
          (Date.parse(`${todayValue}T00:00:00`) -
            Date.parse(`${eng.lastCompleted}T00:00:00`)) /
            86400000
        )
      : null;
    const trained =
      lcDays === null
        ? "no sessions"
        : lcDays <= 0
          ? "trained today"
          : lcDays === 1
            ? "trained 1d ago"
            : `trained ${lcDays}d ago`;
    const noEng = pct == null && !eng.lastCompleted;
    const teamsOf = clientTeams(c.id) || [];
    const selected = rosterSelectedIds.includes(c.id);
    const flags = flagsFor(c);
    return (
      <div className="crpRow" key={c.id} onClick={() => setPeekId(c.id)}>
        <button
          type="button"
          className={`crpCheck${selected ? " on" : ""}`}
          title="Select"
          onClick={(e) => {
            e.stopPropagation();
            toggleRosterSelect(c.id);
          }}
        >
          {selected && <Check size={12} />}
        </button>
        <div className="crpAvatar" style={{ background: col.bg, color: col.fg }}>
          {c.initials}
        </div>
        <div
          className="crpRowMain"
          role="button"
          tabIndex={0}
          aria-label={`Preview ${c.name}`}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setPeekId(c.id);
            }
          }}
        >
          <div className="crpRowName">
            <strong>{c.name}</strong>
            {teamsOf.map((t: any) => (
              <span className="crpTeamChip" key={t.id}>
                {t.name}
              </span>
            ))}
            {(c.tags || []).map((t: string) => (
              <span className="crpTagChip" key={t}>
                {t}
              </span>
            ))}
          </div>
          <div className="crpRowSub">
            {c.clientType || "Client"} · {seenLabel(c)}
          </div>
        </div>
        <div className="crpEng">
          {noEng ? (
            <span className="crpNoEng">No sessions yet</span>
          ) : (
            <>
              {/* No compliance % yet but trained recently: an empty ring with a
                  dash reads as broken — show a full soft-green ring + check. */}
              <svg width="34" height="34" viewBox="0 0 36 36" className="crpRing">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#eee7d8" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke={pct != null ? ringColor : "#8fc9a0"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={pct != null ? (CIRC * (1 - pct / 100)).toFixed(1) : 0}
                  transform="rotate(-90 18 18)"
                />
              </svg>
              <div className="crpEngText">
                <strong style={{ color: pct != null ? ringColor : "#2f8a43" }}>
                  {pct != null ? `${pct}%` : <Check size={15} strokeWidth={3} />}
                </strong>
                <span>{trained}</span>
              </div>
            </>
          )}
        </div>
        <div className="crpFlags">
          {flags.map((f, i) => (
            <span className={`crpFlag ${f.cls}`} key={i}>
              {f.label}
            </span>
          ))}
        </div>
        <div className="crpRowActions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="crpIconBtn"
            title="Athlete's calendar"
            onClick={() => {
              setSelectedClient(c);
              setClientTab("Training");
            }}
          >
            <CalendarDays size={16} />
          </button>
          <button
            type="button"
            className="crpIconBtn"
            title="Copy portal link"
            onClick={() =>
              void copyToClipboard(buildClientPortalLink(c), "Portal link")
            }
          >
            <Link2 size={16} />
          </button>
        </div>
      </div>
    );
  };

  const peek = peekId ? all.find((c: any) => c.id === peekId) : null;

  return (
    <div className="coachClientsPage">
      {renderCoachReviews()}

      {/* header */}
      <div className="crpHead">
        <div>
          <span className="crpEyebrow">
            <Users size={14} /> Roster
          </span>
          <h1>Clients</h1>
          <p>Your athletes at a glance — engagement, attention flags, and quick actions.</p>
        </div>
        <div className="crpHeadActions">
          <button type="button" className="crpInviteBtn" onClick={copyInvite}>
            <Link2 size={16} /> {inviteCopied ? "Copied ✓" : "Copy invite"}
          </button>
          {openNewClientForm && (
            <button type="button" className="crpAddBtn" onClick={openNewClientForm}>
              <Plus size={17} /> Add client
            </button>
          )}
        </div>
      </div>

      {/* board */}
      <div className="crpBoard">
        <div className="crpBoardActive">
          <div className="crpBoardGlow" />
          <span className="crpBoardEyebrow">Active athletes</span>
          <div className="crpBoardBig">
            <span>{sumActive}</span>
            <small>training with you now</small>
          </div>
          <div className="crpBoardBreak">
            <span>
              <strong>{sumOnline}</strong> online
            </span>
            <span>
              <strong>{sumInPerson}</strong> in-person
            </span>
            <span>
              <strong>{sumTeams}</strong> teams
            </span>
          </div>
        </div>
        <div className="crpBoardAttn">
          <span className="crpBoardEyebrowRed">Need attention</span>
          <div className="crpBoardBig">
            <span className="crpBoardBigDark">{sumAttention}</span>
            <small>athletes flagged</small>
          </div>
          <p>
            {sumAvg == null ? (
              "No compliance data this week."
            ) : (
              <>
                <strong>{sumAvg}%</strong> average compliance this week.
              </>
            )}
          </p>
        </div>
      </div>

      {/* filter bar */}
      <div className="crpFilters">
        <div
          className="crpBucketTabs"
          role="group"
          aria-label="Client status filters"
        >
          {BUCKETS.map(([name, label]) => (
            <button
              key={name}
              type="button"
              className={clientBucket === name ? "active" : ""}
              aria-pressed={clientBucket === name}
              onClick={() => {
                setClientBucket(name);
                setClientStatusFilter("All");
              }}
            >
              {label} · {bucketCount(name)}
            </button>
          ))}
        </div>
        <div className="crpFilterRight">
          <div className="crpSearch">
            <Search size={15} />
            <input
              aria-label="Search clients"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search client…"
            />
          </div>
          <select
            className="crpSelect"
            aria-label="Group clients"
            value={groupView}
            onChange={(e) => onGroupChange(e.target.value)}
          >
            <option value="none">No grouping</option>
            <option value="online">Online</option>
            <option value="inperson">In-person</option>
            <option value="team">Team</option>
          </select>
          <select
            className="crpSelect"
            aria-label="Filter client status"
            value={clientStatusFilter}
            onChange={(e) => setClientStatusFilter(e.target.value)}
          >
            <option value="All">All statuses</option>
            {clientStatusOptions.map((s: any) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {activeCoaches?.length > 0 && (
            <select
              className="crpSelect crpCoachSelect"
              aria-label="Filter by coach"
              value={coachScope}
              onChange={(e) => setCoachScope(e.target.value)}
            >
              <option>All Coaches</option>
              {activeCoaches.map((coach: any) => (
                <option key={coach.recordId || coach.coachId} value={coach.name}>
                  {coach.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="crpRefresh"
            title="Refresh"
            onClick={() => void loadClients(true)}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* triage chips */}
      {triageDefs.some((d: any) => triageCounts[d.key] > 0) && (
        <div className="crpTriage" role="group" aria-label="Attention filters">
          <span className="crpTriageLabel">Needs attention</span>
          {triageDefs
            .filter((d: any) => triageCounts[d.key] > 0)
            .map((d: any) => (
              <button
                key={d.key}
                type="button"
                className={`crpTriageChip${rosterTriage === d.key ? " active" : ""}`}
                aria-pressed={rosterTriage === d.key}
                onClick={() =>
                  setRosterTriage((cur: any) => (cur === d.key ? "" : d.key))
                }
              >
                {d.label} <em>{triageCounts[d.key]}</em>
              </button>
            ))}
          {rosterTriage && (
            <button
              type="button"
              className="crpTriageClear"
              onClick={() => setRosterTriage("")}
            >
              Show all
            </button>
          )}
        </div>
      )}

      {/* bulk bar */}
      {rosterSelectedIds.length > 0 && (
        <div className="crpBulk">
          <div className="crpBulkMain">
            <strong>{rosterSelectedIds.length} selected</strong>
            <span className="crpBulkDivider" />
            <button type="button" onClick={() => setBulkPanel((p: any) => (p === "program" ? "" : "program"))}>
              Assign program
            </button>
            <button type="button" onClick={() => setBulkPanel((p: any) => (p === "team" ? "" : "team"))}>
              Add to team
            </button>
            <button type="button" onClick={() => setBulkPanel((p: any) => (p === "tag" ? "" : "tag"))}>
              Add tag
            </button>
            <button type="button" onClick={bulkCopyLinks}>
              Copy links
            </button>
            <button type="button" className="crpBulkClear" onClick={clearRosterSelection}>
              Clear
            </button>
          </div>
          {bulkPanel === "program" && (
            <div className="crpBulkPanel">
              <select value={bulkProgramId} onChange={(e) => setBulkProgramId(e.target.value)}>
                <option value="">Select program…</option>
                {programs.map((p: any) => (
                  <option key={p.recordId} value={p.programId}>
                    {p.programName}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={bulkStartDate || new Date().toISOString().split("T")[0]}
                onChange={(e) => setBulkStartDate(e.target.value)}
              />
              <button
                type="button"
                className="crpBulkGold"
                disabled={bulkBusy || !bulkProgramId}
                onClick={() => void bulkAssignProgram()}
              >
                {bulkBusy ? "Assigning…" : "Assign to selected"}
              </button>
            </div>
          )}
          {bulkPanel === "team" && (
            <div className="crpBulkPanel">
              <select value={bulkTeamId} onChange={(e) => setBulkTeamId(e.target.value)}>
                <option value="">Select team…</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="crpBulkGold"
                disabled={bulkBusy || !bulkTeamId}
                onClick={() => void bulkAddToTeam()}
              >
                {bulkBusy ? "Adding…" : "Add to team"}
              </button>
            </div>
          )}
          {bulkPanel === "tag" && (
            <div className="crpBulkPanel">
              <input
                placeholder="Tag name"
                value={bulkTag}
                onChange={(e) => setBulkTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void bulkAddTag();
                }}
              />
              <button
                type="button"
                className="crpBulkGold"
                disabled={bulkBusy || !bulkTag.trim()}
                onClick={() => void bulkAddTag()}
              >
                {bulkBusy ? "Tagging…" : "Add tag"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* roster */}
      {loading && totalShown === 0 ? (
        <p className="crpLoading" role="status">
          Loading clients…
        </p>
      ) : totalShown === 0 ? (
        <div className="crpEmpty">
          <UserCircle className="crpEmptyIcon" size={28} aria-hidden="true" />
          <p className="crpEmptyTitle">No clients match</p>
          <p className="crpEmptySub">Try a different bucket, filter, or search.</p>
        </div>
      ) : (
        <>
          {groupView !== "team" && (
            <div className="crpRosterHead" aria-hidden="true">
              <span />
              <span />
              <span>Athlete</span>
              <span>Engagement</span>
              <span>Attention</span>
              <span>Actions</span>
            </div>
          )}
          {renderGroups.map((g, gi) => (
            <div key={g.label || gi}>
              {g.showTitle && (
                <div className="crpGroupHead">
                  <h2>{g.label}</h2>
                  <span>{g.clients.length}</span>
                </div>
              )}
              {g.clients.map(Row)}
            </div>
          ))}
        </>
      )}

      {/* ===== peek slide-over ===== */}
      <AnimatePresence>
        {peek && (
          <motion.div
            className="crpSlideScrim"
            onClick={() => setPeekId(null)}
            {...fade}
            transition={{ duration: 0.16 }}
          >
            {(() => {
              const c = peek;
              const col = avatarColor(c.name || "");
              const eng = clientEngagement(c);
              const pct = eng.compliance as number | null;
              const lcDays = eng.lastCompleted
                ? Math.round(
                    (Date.parse(`${todayValue}T00:00:00`) -
                      Date.parse(`${eng.lastCompleted}T00:00:00`)) /
                      86400000
                  )
                : null;
              const seenD = daysSinceLogin(c.lastLogin);
              const flags = flagsFor(c);
              return (
                <motion.div
                  className="crpSlide"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="crp-peek-title"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setPeekId(null);
                  }}
                  initial={reduce ? { opacity: 0 } : { x: "100%" }}
                  animate={reduce ? { opacity: 1 } : { x: 0 }}
                  exit={reduce ? { opacity: 0 } : { x: "100%" }}
                  transition={{ duration: 0.26, ease: EASE }}
                >
                  <div className="crpSlideHead">
                    <button
                      type="button"
                      className="crpSlideClose"
                      aria-label="Close"
                      autoFocus
                      onClick={() => setPeekId(null)}
                    >
                      <X size={17} />
                    </button>
                    <div className="crpSlideId">
                      <div
                        className="crpSlideAvatar"
                        style={{ background: col.bg, color: col.fg }}
                      >
                        {c.initials}
                      </div>
                      <div>
                        <h2 id="crp-peek-title">{c.name}</h2>
                        <div className="crpSlideSub">
                          {c.clientType || "Client"} · {seenLabel(c)}
                        </div>
                      </div>
                    </div>
                    {flags.length > 0 && (
                      <div className="crpSlideFlags">
                        {flags.map((f, i) => (
                          <span className={`crpFlag ${f.cls}`} key={i}>
                            {f.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="crpSlideBody">
                    <button
                      type="button"
                      className="crpOpenHome"
                      onClick={() => {
                        setSelectedClient(c);
                        setClientTab("Home");
                      }}
                    >
                      Open client home <ChevronRight size={16} />
                    </button>

                    <div className="crpSectionLabel">This week</div>
                    <div className="crpStatGrid">
                      <div className="crpStat">
                        <strong style={{ color: ringColorOf(pct) }}>
                          {pct != null ? `${pct}%` : "—"}
                        </strong>
                        <span>Compliance</span>
                      </div>
                      <div className="crpStat">
                        <strong>
                          {lcDays == null
                            ? "—"
                            : lcDays <= 0
                              ? "Today"
                              : `${lcDays}d`}
                        </strong>
                        <span>Last trained</span>
                      </div>
                      <div className="crpStat">
                        <strong>
                          {seenD == null ? "—" : seenD === 0 ? "Today" : `${seenD}d`}
                        </strong>
                        <span>Last seen</span>
                      </div>
                    </div>

                    <div className="crpSectionLabel">Quick actions</div>
                    <div className="crpQuick">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClient(c);
                          setClientTab("Training");
                        }}
                      >
                        <CalendarDays size={17} /> View training calendar
                      </button>
                      <button type="button" onClick={() => openAccountModal(c)}>
                        <UserCircle size={17} /> Account &amp; profile
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void copyToClipboard(buildClientPortalLink(c), "Portal link")
                        }
                      >
                        <Link2 size={17} /> Copy portal link
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
