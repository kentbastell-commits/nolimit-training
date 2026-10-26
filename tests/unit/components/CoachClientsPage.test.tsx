import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CoachClientsPage from "../../../src/CoachClientsPage";
import "../../../src/i18n";

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
  setCoachDashTab: vi.fn(),
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
  it("keeps the athlete accessible while activity loads without claiming an empty history", () => {
    const open = vi.fn();
    const props = { ...baseProps, clients: [client], rosterClients: [client], openAccountModal: open };
    const { rerender } = render(<CoachClientsPage {...props} activityState="loading" />);
    expect(screen.queryByText("No sessions yet")).not.toBeInTheDocument();
    expect(screen.queryByText("No compliance data this week.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(client.name));
    expect(open).toHaveBeenCalledWith(client);
    rerender(<CoachClientsPage {...props} activityState="error" />);
    expect(screen.queryByText("No sessions yet")).not.toBeInTheDocument();
    rerender(<CoachClientsPage {...props} activityState="ready" />);
    expect(screen.getByText("No sessions yet")).toBeInTheDocument();
  });

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
    expect(screen.getByLabelText("Search clients")).toBeInTheDocument();
    expect(screen.getByText("No compliance data this week.")).toBeInTheDocument();
  });

  it("opens the profile from the roster row and the calendar from its shortcut", () => {
    const setSelectedClient = vi.fn();
    const setClientTab = vi.fn();
    const openAccountModal = vi.fn();
    render(
      <CoachClientsPage
        {...baseProps}
        clients={[client]}
        rosterClients={[client]}
        rosterGroups={[{ key: "all", label: "", clients: [client] }]}
        setSelectedClient={setSelectedClient}
        setClientTab={setClientTab}
        openAccountModal={openAccountModal}
      />
    );
    fireEvent.click(screen.getByText("Ada Lovelace"));
    expect(openAccountModal).toHaveBeenCalledWith(client);
    expect(setSelectedClient).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Calendar: Ada Lovelace" }));
    expect(setSelectedClient).toHaveBeenCalledWith(client);
    expect(setClientTab).toHaveBeenCalledWith("Training");
  });

  it("refreshes the roster", () => {
    const loadClients = vi.fn();
    render(<CoachClientsPage {...baseProps} loadClients={loadClients} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(loadClients).toHaveBeenCalledWith(true);
  });

  it("opens and dismisses the client actions menu with Escape", async () => {
    render(
      <CoachClientsPage
        {...baseProps}
        clients={[client]}
        rosterClients={[client]}
      />
    );

    const trigger = screen.getByRole("button", { name: "Client actions: Ada Lovelace" });
    trigger.focus();
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu", { name: "Actions for Ada Lovelace" });
    expect(screen.getByRole("menuitem", { name: "View profile" })).toBeInTheDocument();
    fireEvent.keyDown(menu, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    );
    expect(trigger).toHaveFocus();
  });
});
