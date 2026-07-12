import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CoachClientsPage from "../../../src/CoachClientsPage";

const baseProps = {
  loading: false,
  todayValue: "2026-07-07",
  activeCoaches: [],
  buildClientPortalLink: () => "https://example.com/portal",
  bulkAddTag: vi.fn(),
  bulkAddToTeam: vi.fn(),
  bulkAssignProgram: vi.fn(),
  bulkBusy: false,
  bulkCopyLinks: vi.fn(),
  bulkPanel: "",
  bulkProgramId: "",
  bulkStartDate: "",
  bulkTag: "",
  bulkTeamId: "",
  clearRosterSelection: vi.fn(),
  clientBucket: "Active",
  clientBuckets: [{ name: "Active", count: 1 }],
  clientEngagement: () => ({ compliance: null, lastCompleted: null }),
  clientNeedsContact: () => false,
  clientNeedsProgramming: () => false,
  clientSearch: "",
  clientStatusFilter: "All",
  clientStatusOptions: [],
  clientTeams: () => [],
  clientWeekLoadZone: () => null,
  coachInviteLink: "https://example.com/invite",
  coachScope: "All Coaches",
  copyToClipboard: vi.fn(),
  daysSinceLogin: () => null,
  loadClients: vi.fn(),
  openAccountModal: vi.fn(),
  paceZh: false,
  programs: [],
  renderCoachReviews: () => null,
  rosterAllSelected: false,
  rosterClients: [],
  rosterGroupBy: "none",
  rosterGroups: [],
  rosterSelectedIds: [],
  rosterSortArrow: () => "",
  rosterTriage: "",
  setBulkPanel: vi.fn(),
  setBulkProgramId: vi.fn(),
  setBulkStartDate: vi.fn(),
  setBulkTag: vi.fn(),
  setBulkTeamId: vi.fn(),
  setClientBucket: vi.fn(),
  setClientSearch: vi.fn(),
  setClientStatusFilter: vi.fn(),
  setClientTab: vi.fn(),
  setCoachScope: vi.fn(),
  setRosterGroupBy: vi.fn(),
  setRosterTriage: vi.fn(),
  setSelectedClient: vi.fn(),
  teams: [],
  toggleRosterSelect: vi.fn(),
  toggleRosterSelectAll: vi.fn(),
  toggleRosterSort: vi.fn(),
  triageCounts: {},
  triageDefs: [],
};

const client = {
  id: "CL-1",
  initials: "AL",
  name: "Ada Lovelace",
  email: "ada@example.com",
  clientType: "Online Coaching",
  tags: [],
  lastLogin: "",
};

describe("CoachClientsPage", () => {
  it("renders the toolbar and empty roster state", () => {
    // Redesign: placeholder gained an ellipsis, the empty state is a two-line
    // "No clients match" card, and the invite button is "Copy invite".
    render(<CoachClientsPage {...baseProps} />);
    expect(screen.getByPlaceholderText("Search client…")).toBeInTheDocument();
    expect(screen.getByText("No clients match")).toBeInTheDocument();
    expect(
      screen.getByText("Try a different bucket, filter, or search.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy invite" })
    ).toBeInTheDocument();
  });

  it("renders a roster row and opens the client on click", () => {
    // Redesign: clicking a row now opens a peek slide-over (looked up in the
    // full `clients` list by id); "Open client home" inside it routes into the
    // client's Home tab — the same destination the old row click had.
    const setSelectedClient = vi.fn();
    const setClientTab = vi.fn();
    render(
      <CoachClientsPage
        {...baseProps}
        clients={[client]}
        rosterClients={[client]}
        rosterGroups={[{ key: "all", label: "", clients: [client] }]}
        setSelectedClient={setSelectedClient}
        setClientTab={setClientTab}
      />
    );
    fireEvent.click(screen.getByText("Ada Lovelace"));
    fireEvent.click(
      screen.getByRole("button", { name: /Open client home/ })
    );
    expect(setSelectedClient).toHaveBeenCalledWith(client);
    expect(setClientTab).toHaveBeenCalledWith("Home");
  });

  it("refreshes the roster", () => {
    const loadClients = vi.fn();
    render(<CoachClientsPage {...baseProps} loadClients={loadClients} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(loadClients).toHaveBeenCalledWith(true);
  });
});
