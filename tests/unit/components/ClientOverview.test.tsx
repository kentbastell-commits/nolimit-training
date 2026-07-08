import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ClientOverview from "../../../src/ClientOverview";

const baseProps = {
  t: (k: string) => k,
  coachNotesDraft: "",
  editingMetrics: false,
  formatPace: () => "4:00 /km",
  getCoachDisplayName: (name: string) => name,
  getMasKmh: () => NaN,
  hrMaxMetric: null,
  i18n: { language: "en" },
  isClientPortal: false,
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
  paceZh: false,
  parseBpm: () => NaN,
  parseOverride: () => NaN,
  renderPerformanceMetrics: () => null,
  renderPersonalRecords: () => null,
  restingHrMetric: null,
  saveCoachNotes: vi.fn(),
  saveMetricsOverrides: vi.fn(),
  savingCoachNotes: false,
  savingMetrics: false,
  selectedClient: {
    id: "CL-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    clientType: "Online Coaching",
    languagePreference: "English",
    notes: "",
  },
  selectedClientLatestOrder: null,
  setCoachNotesDraft: vi.fn(),
  setEditingMetrics: vi.fn(),
  setMetricsDraft: vi.fn(),
  setOverviewDetailsOpen: vi.fn(),
  setWeightUnitPref: vi.fn(),
  updateClientLanguagePreference: vi.fn(),
  weightUnit: "kg",
};

describe("ClientOverview", () => {
  it("renders the coach-facing overview cards", () => {
    render(<ClientOverview {...baseProps} />);
    expect(screen.getByText("performanceMetrics")).toBeInTheDocument();
    expect(screen.getByText("Personal Records")).toBeInTheDocument();
    expect(screen.getByText("Coach Notes")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("toggles the details section", () => {
    const setOverviewDetailsOpen = vi.fn();
    render(
      <ClientOverview
        {...baseProps}
        setOverviewDetailsOpen={setOverviewDetailsOpen}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Show details" }));
    expect(setOverviewDetailsOpen).toHaveBeenCalled();
  });

  it("renders the portal settings view for clients", () => {
    render(<ClientOverview {...baseProps} isClientPortal={true} />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("My Coaching")).toBeInTheDocument();
  });
});
