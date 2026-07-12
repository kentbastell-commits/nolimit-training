import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CoachTeamsPage from "../../../src/CoachTeamsPage";

const baseProps = {
  addTeamGroup: vi.fn(),
  applyAssignSubgroup: vi.fn(),
  assignProgramToTeamNow: vi.fn(),
  bulkAssignTeamsProgram: vi.fn(),
  clearTeamSelection: vi.fn(),
  clients: [],
  coachVisibleClients: [],
  currentCoachName: "Kent",
  deleteTeam: vi.fn(),
  editingTeam: null,
  openAccountModal: vi.fn(),
  openNewTeam: vi.fn(),
  openTeamEditor: vi.fn(),
  openTeamInvite: vi.fn(),
  programs: [],
  quickAssignTeamProgram: vi.fn(),
  removeTeamGroup: vi.fn(),
  saveTeam: vi.fn(),
  savingTeam: false,
  selectedTeam: null,
  selectedTeamId: "",
  selectedTeamSubgroups: [],
  setEditingTeam: vi.fn(),
  setMemberPosition: vi.fn(),
  setSelectedTeamId: vi.fn(),
  setTeamAssignProgramId: vi.fn(),
  setTeamAssignStartDate: vi.fn(),
  setTeamBulkPanel: vi.fn(),
  setTeamBulkProgramId: vi.fn(),
  setTeamBulkStartDate: vi.fn(),
  setTeamDraft: vi.fn(),
  setTeamGroupInput: vi.fn(),
  setTeamQuickAssignId: vi.fn(),
  setTeamQuickProgramId: vi.fn(),
  setTeamQuickStartDate: vi.fn(),
  setTeamRowMenuId: vi.fn(),
  sortedTeams: [],
  teamAllSelected: false,
  teamAssignProgramId: "",
  teamAssignSelectedIds: [],
  teamAssignStartDate: "",
  teamAssignSubgroup: "",
  teamAssigning: false,
  teamBulkBusy: false,
  teamBulkMemberIds: [],
  teamBulkPanel: "",
  teamBulkProgramId: "",
  teamBulkStartDate: "",
  teamDraft: { name: "", focus: "", groups: [] },
  teamGroupInput: "",
  teamPlannedCounts: {},
  teamQuickAssignId: "",
  teamQuickBusy: false,
  teamQuickProgramId: "",
  teamQuickStartDate: "",
  teamRowMenuId: "",
  teamSelectedIds: [],
  teamSortArrow: () => "",
  teams: [],
  teamsLoading: false,
  toggleAssignAthlete: vi.fn(),
  toggleTeamMember: vi.fn(),
  toggleTeamSelect: vi.fn(),
  toggleTeamSelectAll: vi.fn(),
  toggleTeamSort: vi.fn(),
  visibleTeams: [],
};

const team = {
  id: "team-1",
  name: "QA Squad",
  coach: "Kent",
  focus: "Strength",
  groups: ["Forwards"],
  memberCount: 0,
  memberIds: [],
  notes: "",
  positions: {},
};

describe("CoachTeamsPage", () => {
  it("renders the teams page with an empty state", () => {
    render(<CoachTeamsPage {...baseProps} />);
    expect(
      screen.getByRole("button", { name: /New team/i })
    ).toBeInTheDocument();
    expect(screen.getByText("No teams yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Create a squad to group athletes/)
    ).toBeInTheDocument();
  });

  it("opens the new team editor when New team is clicked", () => {
    const openNewTeam = vi.fn();
    render(<CoachTeamsPage {...baseProps} openNewTeam={openNewTeam} />);
    fireEvent.click(screen.getByRole("button", { name: /New team/i }));
    expect(openNewTeam).toHaveBeenCalledTimes(1);
  });

  it("opens a squad from a clearly labelled keyboard-accessible control", () => {
    const setSelectedTeamId = vi.fn();
    render(
      <CoachTeamsPage
        {...baseProps}
        sortedTeams={[team]}
        teams={[team]}
        setSelectedTeamId={setSelectedTeamId}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Open QA Squad" }));
    expect(setSelectedTeamId).toHaveBeenCalledWith("team-1");
  });

  it("labels the team detail as a dialog and closes it with Escape", () => {
    const setSelectedTeamId = vi.fn();
    render(
      <CoachTeamsPage
        {...baseProps}
        selectedTeam={team}
        teams={[team]}
        setSelectedTeamId={setSelectedTeamId}
      />
    );

    expect(
      screen.getByRole("dialog", { name: "QA Squad" })
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(setSelectedTeamId).toHaveBeenCalledWith("");
  });
});
