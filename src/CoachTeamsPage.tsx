// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronDown, MoreVertical, Settings, Trash2, X } from "lucide-react";
import "./CoachTeamsPage.css";
import { dateToInputValue, labelColor } from "./appCore";

export default function CoachTeamsPage({
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
  selectedTeamId,
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
  setTeamRowMenuId,
  sortedTeams,
  teamAllSelected,
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
  teamRowMenuId,
  teamSelectedIds,
  teamSortArrow,
  teams,
  teamsLoading,
  toggleAssignAthlete,
  toggleTeamMember,
  toggleTeamSelect,
  toggleTeamSelectAll,
  toggleTeamSort,
  visibleTeams,
}: { [key: string]: any }) {
  return (
    <>
              <section className="teamsPage">
                <div className="teamsHeader">
                  <p className="teamsIntro">
                    Group athletes into squads and assign a program to everyone at
                    once.
                  </p>
                  <button className="goldButton" onClick={openNewTeam}>
                    + Create Team
                  </button>
                </div>

                {teamSelectedIds.length > 0 && (
                  <div className="rosterBulkBar">
                    <div className="rosterBulkBarMain">
                      <strong>
                        {teamSelectedIds.length} squad
                        {teamSelectedIds.length === 1 ? "" : "s"} ·{" "}
                        {teamBulkMemberIds.length} athlete
                        {teamBulkMemberIds.length === 1 ? "" : "s"}
                      </strong>
                      <button
                        className="outlineButton"
                        onClick={() =>
                          setTeamBulkPanel((p: any) =>
                            p === "program" ? "" : "program"
                          )
                        }
                      >
                        Assign Program
                      </button>
                      <button
                        className="textButton rosterBulkClear"
                        onClick={clearTeamSelection}
                      >
                        Clear
                      </button>
                    </div>
                    {teamBulkPanel === "program" && (
                      <div className="rosterBulkPanel">
                        <select
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
                          type="date"
                          value={teamBulkStartDate}
                          onChange={(e) => setTeamBulkStartDate(e.target.value)}
                        />
                        <button
                          className="goldButton"
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

                <section className="tableCard teamsTableCard">
                  <div className="tableHeader teamsTableHeader">
                    <span>
                      <input
                        type="checkbox"
                        checked={teamAllSelected}
                        onChange={toggleTeamSelectAll}
                        title="Select all squads"
                      />
                    </span>
                    <span
                      className="rosterSortable"
                      onClick={() => toggleTeamSort("name")}
                    >
                      Title{teamSortArrow("name")}
                    </span>
                    <span
                      className="rosterSortable"
                      onClick={() => toggleTeamSort("planned")}
                    >
                      Planned Sessions{teamSortArrow("planned")}
                    </span>
                    <span
                      className="rosterSortable"
                      onClick={() => toggleTeamSort("athletes")}
                    >
                      Athletes{teamSortArrow("athletes")}
                    </span>
                    <span
                      className="rosterSortable"
                      onClick={() => toggleTeamSort("focus")}
                    >
                      Focus{teamSortArrow("focus")}
                    </span>
                    <span
                      className="rosterSortable"
                      onClick={() => toggleTeamSort("created")}
                    >
                      Created{teamSortArrow("created")}
                    </span>
                    <span>Actions</span>
                  </div>

                  {teamsLoading && visibleTeams.length === 0 && (
                    <p className="emptyTableMessage">Loading teams…</p>
                  )}
                  {!teamsLoading && visibleTeams.length === 0 && (
                    <p className="emptyTableMessage">
                      No teams yet. Create one to group athletes and assign
                      programs in bulk.
                    </p>
                  )}

                  {sortedTeams.map((team: any) => (
                    <div
                      key={team.id}
                      className={`clientRow clickableRow teamsTableRow ${
                        selectedTeamId === team.id && !editingTeam ? "active" : ""
                      }`}
                      onClick={() => {
                        setEditingTeam(false);
                        setSelectedTeamId((id: any) =>
                          id === team.id ? "" : team.id
                        );
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={teamSelectedIds.includes(team.id)}
                        onChange={() => toggleTeamSelect(team.id)}
                        onClick={(event) => event.stopPropagation()}
                      />
                      <div className="clientName">
                        <div className="clientAvatar teamAvatarSquare">
                          {team.name
                            .split(" ")
                            .map((w: any) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "TM"}
                        </div>
                        <div>
                          <strong>{team.name}</strong>
                          <small>{team.coach || currentCoachName || "—"}</small>
                        </div>
                      </div>
                      <span>{teamPlannedCounts[team.id] ?? 0}</span>
                      <span>{team.memberCount}</span>
                      <span>{team.focus || "—"}</span>
                      <span>
                        {team.createdTime
                          ? new Date(team.createdTime).toLocaleDateString()
                          : "—"}
                      </span>
                      <span
                        className="teamRowActions"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          className="iconActionButton"
                          title="Edit team"
                          onClick={() => openTeamEditor(team)}
                        >
                          <Settings size={17} aria-hidden="true" />
                        </button>
                        <div className="teamRowMenuWrap">
                          <button
                            className="iconActionButton"
                            title="More actions"
                            onClick={() =>
                              setTeamRowMenuId((id: any) =>
                                id === team.id ? "" : team.id
                              )
                            }
                          >
                            <MoreVertical size={17} aria-hidden="true" />
                          </button>
                          {teamRowMenuId === team.id && (
                            <div className="teamRowMenu" role="menu">
                              <button
                                onClick={() => {
                                  setTeamQuickAssignId(team.id);
                                  setTeamQuickProgramId("");
                                  // Re-stamp: the mount-time default goes
                                  // stale if the tab lives past midnight.
                                  setTeamQuickStartDate(
                                    dateToInputValue(new Date())
                                  );
                                  setTeamRowMenuId("");
                                }}
                              >
                                Assign Program
                              </button>
                              <button onClick={() => openTeamInvite(team)}>
                                Invite Athletes
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTeamId(team.id);
                                  setEditingTeam(false);
                                  setTeamRowMenuId("");
                                }}
                              >
                                View Athletes
                              </button>
                              <button
                                className="danger"
                                onClick={() => {
                                  setTeamRowMenuId("");
                                  void deleteTeam(team);
                                }}
                              >
                                Delete Team
                              </button>
                            </div>
                          )}
                        </div>
                      </span>
                    </div>
                  ))}
                </section>

                {teamQuickAssignId && (() => {
                  const team = teams.find((t: any) => t.id === teamQuickAssignId);
                  if (!team) return null;
                  return (
                    <div
                      className="createProgramOverlay"
                      onClick={() => setTeamQuickAssignId("")}
                    >
                      <div
                        className="teamQuickAssignModal"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="createProgramHeader">
                          <div>
                            <span className="eyebrow">Assign Program</span>
                            <h3>{team.name}</h3>
                          </div>
                          <button
                            type="button"
                            className="iconActionButton"
                            title="Close"
                            onClick={() => setTeamQuickAssignId("")}
                          >
                            <X size={18} />
                          </button>
                        </div>
                        <p className="teamQuickAssignSub">
                          Schedules the program for all{" "}
                          <strong>{team.memberCount}</strong> athlete
                          {team.memberCount === 1 ? "" : "s"} in this squad.
                        </p>
                        <div className="teamQuickAssignFields">
                          <label>
                            <span>Program</span>
                            <select
                              value={teamQuickProgramId}
                              onChange={(e) =>
                                setTeamQuickProgramId(e.target.value)
                              }
                            >
                              <option value="">Select program…</option>
                              {programs.map((p: any) => (
                                <option key={p.recordId} value={p.programId}>
                                  {p.programName}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Start date</span>
                            <input
                              type="date"
                              value={teamQuickStartDate}
                              onChange={(e) =>
                                setTeamQuickStartDate(e.target.value)
                              }
                            />
                          </label>
                        </div>
                        <div className="teamQuickAssignActions">
                          <button
                            className="outlineButton"
                            onClick={() => setTeamQuickAssignId("")}
                          >
                            Cancel
                          </button>
                          <button
                            className="goldButton"
                            disabled={
                              teamQuickBusy ||
                              !teamQuickProgramId ||
                              team.memberCount === 0
                            }
                            onClick={() => void quickAssignTeamProgram()}
                          >
                            {teamQuickBusy
                              ? "Assigning…"
                              : `Assign to ${team.memberCount} athlete${
                                  team.memberCount === 1 ? "" : "s"
                                }`}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {(editingTeam || selectedTeam) && (
                  <div className="teamDetail">
                    {editingTeam ? (
                      <div className="teamEditor">
                        <h3>{selectedTeamId ? "Edit Team" : "New Team"}</h3>
                        <label className="teamField">
                          <span>Team name</span>
                          <input
                            value={teamDraft.name}
                            onChange={(e) =>
                              setTeamDraft((d: any) => ({ ...d, name: e.target.value }))
                            }
                            placeholder="e.g. Morning HYROX Squad"
                          />
                        </label>
                        <label className="teamField">
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
                        <label className="teamField">
                          <span>Notes</span>
                          <input
                            value={teamDraft.notes}
                            onChange={(e) =>
                              setTeamDraft((d: any) => ({
                                ...d,
                                notes: e.target.value,
                              }))
                            }
                            placeholder="Optional"
                          />
                        </label>
                        <div className="teamGroupsManager">
                          <span className="teamPickerLabel">
                            Groups / Positions
                          </span>
                          <div className="chipRow">
                            {teamDraft.groups.length === 0 && (
                              <span className="mutedText">No groups yet</span>
                            )}
                            {teamDraft.groups.map((g: any) => {
                              const c = labelColor(g);
                              return (
                                <span
                                  className="editChip groupChip"
                                  key={g}
                                  style={{
                                    background: c.bg,
                                    color: c.fg,
                                    borderColor: c.bd,
                                  }}
                                >
                                  {g}
                                  <button
                                    onClick={() => removeTeamGroup(g)}
                                    aria-label={`Remove ${g}`}
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                          <div className="chipAddRow">
                            <input
                              value={teamGroupInput}
                              placeholder="e.g. Forwards, Backs"
                              onChange={(e) => setTeamGroupInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addTeamGroup();
                                }
                              }}
                            />
                            <button
                              className="outlineButton"
                              onClick={addTeamGroup}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                        <div className="teamMemberPicker">
                          <span className="teamPickerLabel">
                            Athletes ({teamDraft.memberIds.length}) · check to
                            add, then choose a group
                          </span>
                          <div className="teamMemberPickList">
                            {coachVisibleClients.map((client: any) => {
                              const selected = teamDraft.memberIds.includes(
                                client.id
                              );
                              return (
                                <div
                                  key={client.id}
                                  className={`teamMemberPickItem ${
                                    selected ? "selected" : ""
                                  }`}
                                >
                                  <label className="teamPickToggle">
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={() =>
                                        toggleTeamMember(client.id)
                                      }
                                    />
                                    <span className="clientAvatar">
                                      {client.initials}
                                    </span>
                                    <span>{client.name}</span>
                                  </label>
                                  {selected && teamDraft.groups.length > 0 && (
                                    <select
                                      className="teamPositionInput"
                                      value={teamDraft.positions[client.id] || ""}
                                      onChange={(e) =>
                                        setMemberPosition(
                                          client.id,
                                          e.target.value
                                        )
                                      }
                                    >
                                      <option value="">No group</option>
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
                        </div>
                        <div className="teamEditorActions">
                          <button
                            className="outlineButton"
                            onClick={() => setEditingTeam(false)}
                          >
                            Cancel
                          </button>
                          <button
                            className="goldButton"
                            onClick={saveTeam}
                            disabled={savingTeam}
                          >
                            {savingTeam ? "Saving…" : "Save Team"}
                          </button>
                        </div>
                      </div>
                    ) : selectedTeam ? (
                      <>
                        <div className="teamDetailHeader">
                          <div>
                            <span className="eyebrow">Team</span>
                            <h3>{selectedTeam.name}</h3>
                            {selectedTeam.notes && (
                              <p className="teamNotes">{selectedTeam.notes}</p>
                            )}
                          </div>
                          <div className="teamDetailActions">
                            <button
                              className="outlineButton"
                              onClick={() => openTeamEditor(selectedTeam)}
                            >
                              Edit / Members
                            </button>
                            <button
                              className="iconActionButton dangerIconButton"
                              onClick={() => deleteTeam(selectedTeam)}
                              title="Delete team"
                              aria-label={`Delete team ${selectedTeam.name}`}
                            >
                              <Trash2 size={17} aria-hidden="true" />
                            </button>
                            <button
                              className="iconActionButton"
                              onClick={() => setSelectedTeamId("")}
                              title="Collapse"
                              aria-label="Collapse team"
                            >
                              <ChevronDown
                                size={17}
                                style={{ transform: "rotate(180deg)" }}
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        </div>

                        <div className="teamSection">
                          <div className="profileMetricsHeader">
                            <h3>Athletes ({selectedTeam.memberCount})</h3>
                          </div>
                          {selectedTeam.memberIds.length > 0 && (
                            <p className="teamMembersCaption">
                              Tap a name to open the athlete account · check the
                              box to include them when assigning a program.
                            </p>
                          )}
                          {selectedTeam.memberIds.length === 0 ? (
                            <p className="mutedText">
                              No athletes yet — use “Edit / Members” to add some.
                            </p>
                          ) : (
                            (() => {
                              const groups = new Map<string, string[]>();
                              selectedTeam.memberIds.forEach((mid: any) => {
                                const pos =
                                  (selectedTeam.positions[mid] || "").trim() ||
                                  "No position";
                                if (!groups.has(pos)) groups.set(pos, []);
                                groups.get(pos)!.push(mid);
                              });
                              const ordered = Array.from(groups.entries()).sort(
                                ([a], [b]) => {
                                  if (a === "No position") return 1;
                                  if (b === "No position") return -1;
                                  return a.localeCompare(b);
                                }
                              );
                              return ordered.map(([pos, ids]) => {
                                const pc =
                                  pos === "No position"
                                    ? null
                                    : labelColor(pos);
                                return (
                                <div className="teamSubgroupBlock" key={pos}>
                                  <div className="teamSubgroupHeading">
                                    <span
                                      className="teamSubgroupName"
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
                                    <span>{ids.length}</span>
                                  </div>
                                  <div className="teamMembersGrid">
                                    {ids.map((mid: any) => {
                                      const c = clients.find(
                                        (cl: any) => cl.id === mid
                                      );
                                      const checked =
                                        teamAssignSelectedIds.includes(mid);
                                      return (
                                        <div
                                          key={mid}
                                          className={`teamMemberRow ${
                                            checked ? "checked" : ""
                                          }`}
                                          role="button"
                                          tabIndex={0}
                                          title="Open athlete account"
                                          onClick={() => {
                                            if (c) openAccountModal(c);
                                          }}
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === "Enter" ||
                                              e.key === " "
                                            ) {
                                              e.preventDefault();
                                              if (c) openAccountModal(c);
                                            }
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            className="teamMemberCheck"
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
                                          <span className="clientAvatar">
                                            {c?.initials || "?"}
                                          </span>
                                          <strong className="teamMemberName">
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
                        </div>

                        <div className="teamSection">
                          <div className="profileMetricsHeader">
                            <h3>Assign program to team</h3>
                          </div>
                          {selectedTeamSubgroups.length > 0 && (
                            <div className="teamSubgroupRow">
                              <span className="teamSubgroupLabel">
                                Assign to
                              </span>
                              <select
                                value={teamAssignSubgroup}
                                onChange={(e) =>
                                  applyAssignSubgroup(e.target.value)
                                }
                              >
                                <option value="All">All athletes</option>
                                {selectedTeamSubgroups.map((sg: any) => (
                                  <option key={sg} value={sg}>
                                    {sg}
                                  </option>
                                ))}
                              </select>
                              <span className="teamSubgroupCount">
                                {teamAssignSelectedIds.length} selected
                              </span>
                            </div>
                          )}
                          <div className="teamAssignRow">
                            <select
                              value={teamAssignProgramId}
                              onChange={(e) =>
                                setTeamAssignProgramId(e.target.value)
                              }
                            >
                              <option value="">Select a program…</option>
                              {programs.map((p: any) => (
                                <option key={p.programId} value={p.programId}>
                                  {p.programName}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={teamAssignStartDate}
                              onChange={(e) =>
                                setTeamAssignStartDate(e.target.value)
                              }
                            />
                            <button
                              className="goldButton"
                              onClick={assignProgramToTeamNow}
                              disabled={
                                teamAssigning ||
                                teamAssignSelectedIds.length === 0
                              }
                            >
                              {teamAssigning
                                ? "Assigning…"
                                : `Assign to ${
                                    teamAssignSelectedIds.length
                                  } athlete${
                                    teamAssignSelectedIds.length === 1 ? "" : "s"
                                  }`}
                            </button>
                          </div>
                          <p className="teamAssignHint">
                            Creates the program’s workouts for the checked
                            athletes, starting on the chosen date. To program one
                            athlete differently, open them and assign
                            individually.
                          </p>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </section>
    </>
  );
}
