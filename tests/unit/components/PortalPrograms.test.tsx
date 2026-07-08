import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PortalPrograms from "../../../src/PortalPrograms";

const baseProps = {
  selectedClientProgramCalendarWorkouts: [],
  t: (k: string) => k,
  clientProgramScheduleMode: "Month",
  clientProgramScheduledWorkouts: [],
  clientProgramSessions: [],
  clientProgramStartDate: "2026-07-07",
  clientProgramWeekNumbers: [],
  clientProgramWeekStarts: {},
  loadClientProgramSessions: vi.fn(),
  loadingClientProgramSessions: false,
  localizedAssignableWorkoutName: (w: any) => w?.sessionName || "",
  localizedCalendarLabel: (d: string) => d,
  localizedProductType: (t: string) => t,
  localizedProgramName: (p: any) => p?.programName || "",
  paceZh: false,
  populateClientProgramCalendar: vi.fn(),
  populatingClientProgram: false,
  programsTab: "progress",
  renderProgramHome: () => null,
  renderProgramStore: () => null,
  selectedClientProgram: null,
  selectedClientProgramAlreadyLoaded: false,
  selectedClientProgramFirstDate: "",
  selectedClientProgramId: "",
  selectedClientProgramLastDate: "",
  setClientProgramDayDates: vi.fn(),
  setClientProgramScheduleMode: vi.fn(),
  setClientProgramSessions: vi.fn(),
  setClientProgramStartDate: vi.fn(),
  setClientProgramWeekStarts: vi.fn(),
  setClientTab: vi.fn(),
  setProgramsTab: vi.fn(),
  setSelectedClientProgramId: vi.fn(),
  uniqueClientPurchasedPrograms: [],
};

const program = {
  recordId: "p1",
  programId: "PRG-1",
  programName: "Strength Base",
  productType: "Digital Program",
  durationWeeks: 8,
  sessionsPerWeek: 4,
};

describe("PortalPrograms", () => {
  it("renders the empty state with no purchased programs", () => {
    render(<PortalPrograms {...baseProps} />);
    expect(screen.getByText("myPrograms")).toBeInTheDocument();
    expect(screen.getByText("noPurchasedPrograms")).toBeInTheDocument();
  });

  it("renders the selected program card and sub tabs", () => {
    render(
      <PortalPrograms
        {...baseProps}
        uniqueClientPurchasedPrograms={[program]}
        selectedClientProgram={program}
        selectedClientProgramId="p1"
      />
    );
    // Name appears in the picker option and the program card.
    expect(screen.getAllByText("Strength Base").length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: "Progress" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Store" })).toBeInTheDocument();
    // Progress tab, program not loaded yet -> calendar hint empty state.
    expect(
      screen.getByText(/Add this program to your calendar/)
    ).toBeInTheDocument();
  });
});
