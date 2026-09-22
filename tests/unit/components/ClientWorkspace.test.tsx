import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ClientWorkspace from "../../../src/ClientWorkspace";

vi.mock("../../../src/PortalTraining", () => ({
  default: ({ localizeAssignmentKind, localizeTaskStatus }: any) => (
    <div>{localizeAssignmentKind("Questionnaire")} {localizeTaskStatus("Completed")}</div>
  ),
}));

// ClientWorkspace routes between PortalHome / PortalTraining / PortalPrograms /
// ClientOverview by clientTab. The Overview tab has the smallest prop surface,
// so the smoke test renders the coach view on that tab.
const baseProps = {
  t: (k: string) => k,
  clientTab: "Overview",
  isClientPortal: false,
  selectedClient: {
    id: "CL-1",
    name: "Ada Lovelace",
    initials: "AL",
    clientCode: "NL-001",
    coach: "Kent",
    status: "Active",
    program: "Strength Base",
    clientType: "Online Coaching",
    languagePreference: "English",
    intakeStatus: "Submitted",
    paymentStatus: "Paid",
    accessEndDate: "",
    email: "ada@example.com",
    notes: "",
  },
  // Header / navigation
  buildClientPortalLink: () => "https://example.com/portal",
  coachInboxItems: () => [],
  copyToClipboard: vi.fn(),
  deleteClient: vi.fn(),
  getCoachDisplayName: (name: string) => name,
  inboxSeenAt: 0,
  openEditClientForm: vi.fn(),
  setClientTab: vi.fn(),
  setSelectedClient: vi.fn(),
  setSelectedWorkout: vi.fn(),
  setSetLogs: vi.fn(),
  setSavedExerciseDraftIds: vi.fn(),
  setWorkoutDetails: vi.fn(),
  updateClientLanguagePreference: vi.fn(),
  updateClientPackage: vi.fn(),
  updatingClientStatus: false,
  paceZh: false,
  // ClientOverview (rendered for clientTab === "Overview")
  coachNotesDraft: "",
  editingMetrics: false,
  formatPace: () => "4:00 /km",
  getMasKmh: () => NaN,
  hrMaxMetric: null,
  i18n: { language: "en" },
  latestMasMetric: null,
  metricsDraft: {
    mas: "",
    hrMax: "",
    restingHr: "",
    z5k: "",
    z10k: "",
    zThreshold: "",
    zEasy: "",
  },
  openMetricsEditor: vi.fn(),
  overviewDetailsOpen: false,
  parseBpm: () => NaN,
  parseOverride: () => NaN,
  renderPerformanceMetrics: () => null,
  renderPersonalRecords: () => null,
  restingHrMetric: null,
  saveCoachNotes: vi.fn(),
  saveMetricsOverrides: vi.fn(),
  savingCoachNotes: false,
  savingMetrics: false,
  selectedClientLatestOrder: null,
  setCoachNotesDraft: vi.fn(),
  setEditingMetrics: vi.fn(),
  setMetricsDraft: vi.fn(),
  setOverviewDetailsOpen: vi.fn(),
  setWeightUnitPref: vi.fn(),
  weightUnit: "kg",
};

describe("ClientWorkspace", () => {
  it("keeps athlete navigation out of the coach workspace and returns from preview without changing tabs", () => {
    const setClientTab = vi.fn();
    const { container } = render(<ClientWorkspace {...baseProps} setClientTab={setClientTab} />);
    expect(container.querySelector(".mobileClientBottomNav")).toBeNull();
    screen.getByRole("button", { name: "viewAsAthlete" }).focus();
    fireEvent.click(screen.getByRole("button", { name: "viewAsAthlete" }));
    expect(screen.getByRole("dialog", { name: "athletePreviewTitle" })).toBeInTheDocument();
    expect(screen.getByTitle("athletePreviewTitle")).toHaveAttribute("src", "/portal?preview=coach");
    fireEvent.click(screen.getByRole("button", { name: "backToCoaching" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(setClientTab).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "viewAsAthlete" })).toHaveFocus();
  });
  it("keeps calendar assignment and status translation connected through the workspace", () => {
    render(<ClientWorkspace {...baseProps} clientTab="Training"
      localizeAssignmentKind={() => "问卷"} localizeTaskStatus={() => "已完成"} />);
    expect(screen.getByText("问卷 已完成")).toBeInTheDocument();
  });
  it("renders the coach view header and overview tab", () => {
    render(<ClientWorkspace {...baseProps} />);
    expect(
      screen.getByRole("heading", { name: "Ada Lovelace" })
    ).toBeInTheDocument();
    expect(screen.getByText("Online Coaching")).toBeInTheDocument();
    expect(screen.getByText("Coach Notes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "clients" })).toBeInTheDocument();
  });

  it("clears selection when Back is clicked", () => {
    const setSelectedClient = vi.fn();
    render(
      <ClientWorkspace {...baseProps} setSelectedClient={setSelectedClient} />
    );
    fireEvent.click(screen.getByRole("button", { name: "clients" }));
    expect(setSelectedClient).toHaveBeenCalledWith(null);
  });

  it("switches tabs via the client tab bar", () => {
    const setClientTab = vi.fn();
    render(<ClientWorkspace {...baseProps} setClientTab={setClientTab} />);
    fireEvent.click(
      screen.getByRole("button", { name: "coachWorkspaceProfileTitle" })
    );
    expect(setClientTab).toHaveBeenCalledWith("Overview");
  });
});
