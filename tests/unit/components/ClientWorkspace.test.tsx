import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ClientWorkspace from "../../../src/ClientWorkspace";

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
  it("renders the coach view header and overview tab", () => {
    render(<ClientWorkspace {...baseProps} />);
    expect(
      screen.getByRole("heading", { name: "Ada Lovelace" })
    ).toBeInTheDocument();
    expect(screen.getByText("Online Coaching")).toBeInTheDocument();
    expect(screen.getByText("Coach Notes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← Back" })).toBeInTheDocument();
  });

  it("clears selection when Back is clicked", () => {
    const setSelectedClient = vi.fn();
    render(
      <ClientWorkspace {...baseProps} setSelectedClient={setSelectedClient} />
    );
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    expect(setSelectedClient).toHaveBeenCalledWith(null);
  });

  it("switches tabs via the client tab bar", () => {
    const setClientTab = vi.fn();
    render(<ClientWorkspace {...baseProps} setClientTab={setClientTab} />);
    fireEvent.click(screen.getByRole("button", { name: "clientOverview" }));
    expect(setClientTab).toHaveBeenCalledWith("Overview");
  });
});
