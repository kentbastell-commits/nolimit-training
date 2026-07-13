// Teams (squads) — redesigned to match the Store / Clients / Library pages:
// dark board, squad rows, a team detail slide-over, and create/edit + quick-assign
// modals. View-layer restyle only — every control is wired to the existing
// App.tsx handlers; nothing else is touched.
/* eslint-disable @typescript-eslint/no-explicit-any */
import "./CoachTeamsPage.css";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import {
  Pencil,
  Plus,
  Settings,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { dateToInputValue, labelColor } from "./appCore";

const EASE = [0.16, 1, 0.3, 1] as const;

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
function avatarColor(name: string) {
  let h = 0;
  const s = String(name || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
const initialsOf = (name: string) =>
  String(name || "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "TM";

export default function CoachTeamsPage(props: { [key: string]: any }) {
  const {
    addTeamGroup,
    applyAssignSubgroup,
    assignProgramToTeamNow,
    bulkAssignTeamsProgram,
    clearTeamSelection,
    clients,
    coachVisibleClients,
    currentCoachName,
    deleteTeam,
    editingTeam,
    openAccountModal,
    openNewTeam,
    openTeamEditor,
    openTeamInvite,
    programs,
    quickAssignTeamProgram,
    removeTeamGroup,
    saveTeam,
    savingTeam,
    selectedTeam,
    selectedTeamSubgroups,
    setEditingTeam,
    setMemberPosition,
    setSelectedTeamId,
    setTeamAssignProgramId,
    setTeamAssignStartDate,
    setTeamBulkPanel,
    setTeamBulkProgramId,
    setTeamBulkStartDate,
    setTeamDraft,
    setTeamGroupInput,
    setTeamQuickAssignId,
    setTeamQuickProgramId,
    setTeamQuickStartDate,
    sortedTeams,
    teamAssignProgramId,
    teamAssignSelectedIds,
    teamAssignStartDate,
    teamAssignSubgroup,
    teamAssigning,
    teamBulkBusy,
    teamBulkMemberIds,
    teamBulkPanel,
    teamBulkProgramId,
    teamBulkStartDate,
    teamDraft,
    teamGroupInput,
    teamPlannedCounts,
    teamQuickAssignId,
    teamQuickBusy,
    teamQuickProgramId,
    teamQuickStartDate,
    teams,
    teamsLoading,
    toggleAssignAthlete,
    toggleTeamMember,
    toggleTeamSelect,
    teamSelectedIds,
  } = props;

  const reduce = useReducedMotion();
  const fade = reduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  // ---- board (from the full team list) ----
  const allTeams = (teams as any[]) || [];
  const sumTeams = allTeams.length;
  const sumAthletes = new Set(
    allTeams.flatMap((t) => t.memberIds || [])
  ).size;
  const sumPlanned = allTeams.reduce(
    (a, t) => a + (teamPlannedCounts[t.id] || 0),
    0
  );
  const biggest = allTeams
    .slice()
    .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))[0];

  const rows = (sortedTeams as any[]) || [];
  const detailOpen = Boolean(selectedTeam) && !editingTeam;
  const quickTeam = teamQuickAssignId
    ? allTeams.find((t) => t.id === teamQuickAssignId)
    : null;

  useEffect(() => {
    if (!editingTeam && !quickTeam && !detailOpen) return;

    const closeTopLayer = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editingTeam) setEditingTeam(false);
      else if (quickTeam) setTeamQuickAssignId("");
      else setSelectedTeamId("");
    };

    window.addEventListener("keydown", closeTopLayer);
    return () => window.removeEventListener("keydown", closeTopLayer);
  }, [
    detailOpen,
    editingTeam,
    quickTeam,
    setEditingTeam,
    setSelectedTeamId,
    setTeamQuickAssignId,
  ]);

  const openQuickAssign = (team: any) => {
    setTeamQuickAssignId(team.id);
    setTeamQuickProgramId("");
    setTeamQuickStartDate(dateToInputValue(new Date()));
  };

  return (
    <div className="coachTeamsPage">
      {/* header */}
      <div className="ctpHead">
        <div>
          <span className="ctpEyebrow">
            <Users size={14} /> Squads
          </span>
          <h1>Teams</h1>
          <p>Group athletes into squads and program everyone at once.</p>
        </div>
        <button type="button" className="ctpNewBtn" onClick={openNewTeam}>
          <Plus size={17} /> New team
        </button>
      </div>

      {/* board */}
      <div className="ctpBoard">
        <div className="ctpBoardMain">
          <div className="ctpBoardGlow" />
          <span className="ctpBoardEyebrow">Active squads</span>
          <div className="ctpBoardBig">
            <span>{sumTeams}</span>
            <small>{sumTeams === 1 ? "team you coach" : "teams you coach"}</small>
          </div>
          <div className="ctpBoardBreak">
            <span>
              <strong>{sumAthletes}</strong> athletes
            </span>
            <span>
              <strong>{sumPlanned}</strong> planned sessions
            </span>
          </div>
        </div>
        <div className="ctpBoardSide">
          <span className="ctpBoardEyebrowLight">Largest squad</span>
          <div className="ctpBiggestName">{biggest ? biggest.name : "—"}</div>
          <p className="ctpBiggestSub">
            <strong>{biggest ? biggest.memberCount || 0 : 0}</strong> athletes
            training together.
          </p>
        </div>
      </div>

      {/* bulk bar */}
      {teamSelectedIds.length > 0 && (
        <div className="ctpBulkBar">
          <div className="ctpBulkMain">
            <strong>
              {teamSelectedIds.length} squad
              {teamSelectedIds.length === 1 ? "" : "s"} ·{" "}
              {teamBulkMemberIds.length} athlete
              {teamBulkMemberIds.length === 1 ? "" : "s"}
            </strong>
            <span className="ctpBulkDivider" />
            <button
              type="button"
              className="ctpBulkBtn"
              onClick={() =>
                setTeamBulkPanel((p: any) => (p === "program" ? "" : "program"))
              }
            >
              Assign program
            </button>
            <button
              type="button"
              className="ctpBulkClear"
              onClick={clearTeamSelection}
            >
              Clear
            </button>
          </div>
          {teamBulkPanel === "program" && (
            <div className="ctpBulkPanel">
              <select
                aria-label="Program to assign to selected squads"
                value={teamBulkProgramId}
                onChange={(e) => setTeamBulkProgramId(e.target.value)}
              >
                <option value="">Select program…</option>
                {programs.map((p: any) => (
                  <option key={p.recordId} value={p.programId}>
                    {p.programName}
                  </option>
                ))}
              </select>
              <input
                aria-label="Assignment start date"
                type="date"
                value={teamBulkStartDate}
                onChange={(e) => setTeamBulkStartDate(e.target.value)}
              />
              <button
                type="button"
                className="ctpGoldBtn"
                disabled={
                  teamBulkBusy ||
                  !teamBulkProgramId ||
                  teamBulkMemberIds.length === 0
                }
                onClick={() => void bulkAssignTeamsProgram()}
              >
                {teamBulkBusy
                  ? "Assigning…"
                  : `Assign to ${teamBulkMemberIds.length} athlete${
                      teamBulkMemberIds.length === 1 ? "" : "s"
                    }`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* rows */}
      {teamsLoading && rows.length === 0 && (
        <p className="ctpLoading">Loading teams…</p>
      )}
      {!teamsLoading && rows.length === 0 && (
        <div className="ctpEmpty">
          <p className="ctpEmptyTitle">No teams yet</p>
          <p className="ctpEmptySub">
            Create a squad to group athletes and assign programs in bulk.
          </p>
        </div>
      )}

      {rows.map((team: any) => {
        const selected = teamSelectedIds.includes(team.id);
        const focus = team.focus;
        const groups = team.groups || [];
        return (
          <div
            key={team.id}
            className="ctpRow"
          >
            <button
              type="button"
              className={`ctpCheck${selected ? " on" : ""}`}
              title="Select squad"
              aria-label={`${selected ? "Deselect" : "Select"} ${team.name}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleTeamSelect(team.id);
              }}
            >
              {selected && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </button>
            <button
              type="button"
              className="ctpRowOpen"
              aria-label={`Open ${team.name}`}
              onClick={() => {
                setEditingTeam(false);
                setSelectedTeamId(team.id);
              }}
            >
              <span className="ctpAvatar">{initialsOf(team.name)}</span>
              <span className="ctpRowMain">
                <span className="ctpRowTitle">
                  <strong>{team.name}</strong>
                  {focus && <span className="ctpFocusChip">{focus}</span>}
                </span>
                <span className="ctpRowSub">
                  {(team.coach || currentCoachName || "—") +
                    " · " +
                    (groups.length
                      ? `${groups.length} group${groups.length === 1 ? "" : "s"}`
                      : "no groups")}
                </span>
              </span>
            </button>
            <div className="ctpStats" aria-label="Squad totals">
              <div className="ctpStat">
                <strong>{team.memberCount}</strong>
                <span>Athletes</span>
              </div>
              <div className="ctpStat">
                <strong>{teamPlannedCounts[team.id] ?? 0}</strong>
                <span>Planned</span>
              </div>
            </div>
            <div className="ctpRowActions">
              <button
                type="button"
                className="ctpAssignBtn"
                onClick={() => openQuickAssign(team)}
              >
                Assign
              </button>
              <button
                type="button"
                className="ctpGearBtn"
                title="Edit team"
                aria-label={`Edit ${team.name}`}
                onClick={() => openTeamEditor(team)}
              >
                <Settings size={15} />
              </button>
            </div>
          </div>
        );
      })}

      {/* ===== quick-assign modal ===== */}
      <AnimatePresence>
        {quickTeam && (
          <motion.div
            className="ctpModalScrim"
            onClick={() => setTeamQuickAssignId("")}
            {...fade}
            transition={{ duration: 0.16 }}
          >
            <motion.div
              className="ctpQuickModal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ctp-quick-title"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
              transition={{ duration: 0.22, ease: EASE }}
            >
              <div className="ctpModalHead">
                <div>
                  <span className="ctpEyebrow">Assign program</span>
                  <h2 id="ctp-quick-title">{quickTeam.name}</h2>
                </div>
                <button
                  type="button"
                  className="ctpModalClose"
                  aria-label="Close program assignment"
                  onClick={() => setTeamQuickAssignId("")}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="ctpQuickBody">
                <p className="ctpQuickSub">
                  Schedules the program for all{" "}
                  <strong>{quickTeam.memberCount}</strong> athlete
                  {quickTeam.memberCount === 1 ? "" : "s"} in this squad.
                </p>
                <label className="ctpField">
                  <span>Program</span>
                  <select
                    value={teamQuickProgramId}
                    onChange={(e) => setTeamQuickProgramId(e.target.value)}
                  >
                    <option value="">Select program…</option>
                    {programs.map((p: any) => (
                      <option key={p.recordId} value={p.programId}>
                        {p.programName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ctpField">
                  <span>Start date</span>
                  <input
                    type="date"
                    value={teamQuickStartDate}
                    onChange={(e) => setTeamQuickStartDate(e.target.value)}
                  />
                </label>
                <div className="ctpModalActions">
                  <button
                    type="button"
                    className="ctpGhostBtn"
                    onClick={() => setTeamQuickAssignId("")}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ctpGoldBtn"
                    disabled={
                      teamQuickBusy ||
                      !teamQuickProgramId ||
                      quickTeam.memberCount === 0
                    }
                    onClick={() => void quickAssignTeamProgram()}
                  >
                    {teamQuickBusy
                      ? "Assigning…"
                      : `Assign to ${quickTeam.memberCount} athlete${
                          quickTeam.memberCount === 1 ? "" : "s"
                        }`}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== team detail slide-over ===== */}
      <AnimatePresence>
        {detailOpen && (
          <motion.div
            className="ctpSlideScrim"
            onClick={() => setSelectedTeamId("")}
            {...fade}
            transition={{ duration: 0.16 }}
          >
            <motion.div
              className="ctpSlide"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ctp-detail-title"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? { opacity: 0 } : { x: "100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "100%" }}
              transition={{ duration: 0.26, ease: EASE }}
            >
              <div className="ctpSlideHead">
                <div className="ctpSlideClose">
                  <button
                    type="button"
                    onClick={() => setSelectedTeamId("")}
                    title="Close"
                    aria-label="Close team details"
                  >
                    <X size={17} />
                  </button>
                </div>
                <div className="ctpSlideTitle">
                  <div className="ctpAvatar ctpAvatarLg">
                    {initialsOf(selectedTeam.name)}
                  </div>
                  <div>
                    <span className="ctpEyebrow">Team</span>
                    <h2 id="ctp-detail-title">{selectedTeam.name}</h2>
                    <div className="ctpSlideSub">
                      {(selectedTeam.coach || currentCoachName || "—") +
                        " · " +
                        (selectedTeam.focus || "no focus")}
                    </div>
                  </div>
                </div>
                {selectedTeam.notes && (
                  <p className="ctpSlideNotes">{selectedTeam.notes}</p>
                )}
              </div>

              <div className="ctpSlideBody">
                <div className="ctpSectionLabel">
                  Athletes <span>· {selectedTeam.memberCount}</span>
                </div>

                {selectedTeam.memberIds.length === 0 ? (
                  <p className="ctpMuted">
                    No athletes yet — use “Edit / members” to add some.
                  </p>
                ) : (
                  (() => {
                    const groups = new Map<string, string[]>();
                    selectedTeam.memberIds.forEach((mid: any) => {
                      const pos =
                        (selectedTeam.positions[mid] || "").trim() ||
                        "No group";
                      if (!groups.has(pos)) groups.set(pos, []);
                      groups.get(pos)!.push(mid);
                    });
                    const ordered = Array.from(groups.entries()).sort(
                      ([a], [b]) => {
                        if (a === "No group") return 1;
                        if (b === "No group") return -1;
                        return a.localeCompare(b);
                      }
                    );
                    return ordered.map(([pos, ids]) => {
                      const pc = pos === "No group" ? null : labelColor(pos);
                      return (
                        <div className="ctpGroupBlock" key={pos}>
                          <div className="ctpGroupHead">
                            <span
                              className="ctpGroupChip"
                              style={
                                pc
                                  ? {
                                      background: pc.bg,
                                      color: pc.fg,
                                      borderColor: pc.bd,
                                    }
                                  : undefined
                              }
                            >
                              {pos}
                            </span>
                            <span className="ctpGroupCount">{ids.length}</span>
                          </div>
                          <div className="ctpMemberList">
                            {ids.map((mid: any) => {
                              const c = clients.find((cl: any) => cl.id === mid);
                              const checked =
                                teamAssignSelectedIds.includes(mid);
                              const ac = avatarColor(c?.name || mid);
                              return (
                                <div
                                  key={mid}
                                  className={`ctpMemberRow${
                                    checked ? " checked" : ""
                                  }`}
                                  role="button"
                                  tabIndex={0}
                                  title="Open athlete account"
                                  onClick={() => c && openAccountModal(c)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      if (c) openAccountModal(c);
                                    }
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    className="ctpMemberCheck"
                                    checked={checked}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleAssignAthlete(mid);
                                    }}
                                    aria-label={`Include ${
                                      c?.name || "athlete"
                                    } when assigning`}
                                  />
                                  <span
                                    className="ctpMemberAvatar"
                                    style={{ background: ac.bg, color: ac.fg }}
                                  >
                                    {c?.initials || "?"}
                                  </span>
                                  <strong className="ctpMemberName">
                                    {c?.name || "Unknown athlete"}
                                  </strong>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()
                )}

                {/* assign to squad */}
                <div className="ctpAssignCard">
                  <div className="ctpAssignLabel">Assign program to squad</div>
                  {selectedTeamSubgroups.length > 0 && (
                    <select
                      className="ctpAssignSelect"
                      aria-label="Athletes to include"
                      value={teamAssignSubgroup}
                      onChange={(e) => applyAssignSubgroup(e.target.value)}
                    >
                      <option value="All">All athletes</option>
                      {selectedTeamSubgroups.map((sg: any) => (
                        <option key={sg} value={sg}>
                          {sg}
                        </option>
                      ))}
                    </select>
                  )}
                  <select
                    className="ctpAssignSelect"
                    aria-label="Program to assign"
                    value={teamAssignProgramId}
                    onChange={(e) => setTeamAssignProgramId(e.target.value)}
                  >
                    <option value="">Select a program…</option>
                    {programs.map((p: any) => (
                      <option key={p.programId} value={p.programId}>
                        {p.programName}
                      </option>
                    ))}
                  </select>
                  <input
                    className="ctpAssignSelect"
                    aria-label="Assignment start date"
                    type="date"
                    value={teamAssignStartDate}
                    onChange={(e) => setTeamAssignStartDate(e.target.value)}
                  />
                  <button
                    type="button"
                    className="ctpGoldBtn ctpAssignBtnWide"
                    onClick={assignProgramToTeamNow}
                    disabled={teamAssigning || teamAssignSelectedIds.length === 0}
                  >
                    {teamAssigning
                      ? "Assigning…"
                      : `Assign to ${teamAssignSelectedIds.length} athlete${
                          teamAssignSelectedIds.length === 1 ? "" : "s"
                        }`}
                  </button>
                  <p className="ctpAssignHint">
                    Creates the program’s workouts for the checked athletes,
                    starting on the chosen date.
                  </p>
                </div>

                <div className="ctpSlideFoot">
                  <button
                    type="button"
                    className="ctpFootBtn"
                    onClick={() => openTeamEditor(selectedTeam)}
                  >
                    <Pencil size={14} /> Edit / members
                  </button>
                  <button
                    type="button"
                    className="ctpFootBtn"
                    onClick={() => openTeamInvite(selectedTeam)}
                  >
                    <UserPlus size={14} /> Invite
                  </button>
                  <button
                    type="button"
                    className="ctpFootBtn ctpFootDanger"
                    onClick={() => deleteTeam(selectedTeam)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== create / edit modal ===== */}
      <AnimatePresence>
        {editingTeam && (
          <motion.div
            className="ctpModalScrim"
            onClick={() => setEditingTeam(false)}
            {...fade}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="ctpEditorModal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ctp-editor-title"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
              transition={{ duration: 0.24, ease: EASE }}
            >
              <div className="ctpModalHead ctpEditorHead">
                <div>
                  <span className="ctpEyebrow">Squad</span>
                  <h2 id="ctp-editor-title">
                    {selectedTeam ? "Edit team" : "New team"}
                  </h2>
                </div>
                <button
                  type="button"
                  className="ctpModalClose"
                  aria-label="Close team editor"
                  onClick={() => setEditingTeam(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="ctpEditorBody">
                <div className="ctpEditorRow">
                  <label className="ctpField">
                    <span>Team name</span>
                    <input
                      value={teamDraft.name}
                      onChange={(e) =>
                        setTeamDraft((d: any) => ({ ...d, name: e.target.value }))
                      }
                      placeholder="e.g. Morning HYROX Squad"
                    />
                  </label>
                  <label className="ctpField">
                    <span>Focus</span>
                    <input
                      value={teamDraft.focus}
                      onChange={(e) =>
                        setTeamDraft((d: any) => ({
                          ...d,
                          focus: e.target.value,
                        }))
                      }
                      placeholder="e.g. Bouldering / Power"
                    />
                  </label>
                </div>
                <label className="ctpField ctpFieldFull">
                  <span>
                    Notes <em>(optional)</em>
                  </span>
                  <input
                    value={teamDraft.notes}
                    onChange={(e) =>
                      setTeamDraft((d: any) => ({ ...d, notes: e.target.value }))
                    }
                    placeholder="Optional"
                  />
                </label>

                {/* positions / categories */}
                <div className="ctpGroupsManager">
                  <span className="ctpFieldLabel">
                    Positions / categories{" "}
                    <em>— tag athletes (e.g. Forwards · Defence · Injured)</em>
                  </span>
                  <div className="ctpChipRow">
                    {teamDraft.groups.length === 0 && (
                      <span className="ctpMuted">
                        No categories yet — add one to tag athletes.
                      </span>
                    )}
                    {teamDraft.groups.map((g: any) => {
                      const c = labelColor(g);
                      return (
                        <span
                          className="ctpGroupPill"
                          key={g}
                          style={{
                            background: c.bg,
                            color: c.fg,
                            borderColor: c.bd,
                          }}
                        >
                          {g}
                          <button
                            type="button"
                            onClick={() => removeTeamGroup(g)}
                            aria-label={`Remove ${g}`}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                  <div className="ctpChipAdd">
                    <input
                      value={teamGroupInput}
                      placeholder="Add a category (Forwards, Injured, Elite…)"
                      onChange={(e) => setTeamGroupInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTeamGroup();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="ctpGhostBtn"
                      onClick={addTeamGroup}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="ctpFieldLabel">
                  Athletes <em>· {teamDraft.memberIds.length} selected</em>
                </div>
                <div className="ctpPickList">
                  {coachVisibleClients.map((client: any) => {
                    const selected = teamDraft.memberIds.includes(client.id);
                    const ac = avatarColor(client.name);
                    return (
                      <div className="ctpPickWrap" key={client.id}>
                        <button
                          type="button"
                          className={`ctpPickItem${selected ? " on" : ""}`}
                          onClick={() => toggleTeamMember(client.id)}
                        >
                          <span className={`ctpPickCheck${selected ? " on" : ""}`}>
                            {selected && (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#fff"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            )}
                          </span>
                          <span
                            className="ctpPickAvatar"
                            style={{ background: ac.bg, color: ac.fg }}
                          >
                            {client.initials}
                          </span>
                          <span className="ctpPickName">{client.name}</span>
                        </button>
                        {selected && teamDraft.groups.length > 0 && (
                          <select
                            className="ctpPickCat"
                            aria-label={`${client.name} category`}
                            value={teamDraft.positions[client.id] || ""}
                            onChange={(e) =>
                              setMemberPosition(client.id, e.target.value)
                            }
                          >
                            <option value="">No category</option>
                            {teamDraft.groups.map((g: any) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="ctpModalActions ctpEditorActions">
                  <button
                    type="button"
                    className="ctpGhostBtn"
                    onClick={() => setEditingTeam(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ctpDarkBtn"
                    onClick={saveTeam}
                    disabled={savingTeam}
                  >
                    {savingTeam ? "Saving…" : "Save team"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
