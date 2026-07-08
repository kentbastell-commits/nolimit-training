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

describe("CoachTeamsPage", () => {
  it("renders the teams page with an empty state", () => {
    render(<CoachTeamsPage {...baseProps} />);
    expect(screen.getByText("+ Create Team")).toBeInTheDocument();
    expect(
      screen.getByText(/No teams yet\. Create one to group athletes/)
    ).toBeInTheDocument();
  });

  it("opens the new team editor when Create Team is clicked", () => {
    const openNewTeam = vi.fn();
    render(<CoachTeamsPage {...baseProps} openNewTeam={openNewTeam} />);
    fireEvent.click(screen.getByText("+ Create Team"));
    expect(openNewTeam).toHaveBeenCalledTimes(1);
  });
});
