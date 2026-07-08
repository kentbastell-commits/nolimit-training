import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PortalPrograms from "../../../src/PortalPrograms";

const baseProps: any = {
  t: (k: string) => k,
  paceZh: false,
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
  localizedProductType: (type: string) => type,
  localizedProgramName: (p: any) => p?.programName || "",
  populateClientProgramCalendar: vi.fn(),
  populatingClientProgram: false,
  renderProgramHome: () => null,
  renderProgramStore: () => null,
  selectedClientProgram: null,
  selectedClientProgramAlreadyLoaded: false,
  setClientProgramDayDates: vi.fn(),
  setClientProgramScheduleMode: vi.fn(),
  setClientProgramSessions: vi.fn(),
  setClientProgramStartDate: vi.fn(),
  setClientProgramWeekStarts: vi.fn(),
  setClientTab: vi.fn(),
  setSelectedClientProgramId: vi.fn(),
  uniqueClientPurchasedPrograms: [],
  clientProgramStatuses: {},
};

const program = {
  recordId: "p1",
  programId: "PRG-1",
  programName: "Strength Base",
  sport: "Rock Climbing",
  productType: "Digital Program",
  durationWeeks: 8,
  sessionsPerWeek: 4,
};

describe("PortalPrograms", () => {
  it("renders the empty state with no purchased programs", () => {
    render(<PortalPrograms {...baseProps} />);
    expect(screen.getByText("noPurchasedPrograms")).toBeInTheDocument();
  });

  it("renders a sport-grouped card with its derived status and routes on tap", () => {
    const setSelected = vi.fn();
    const loadSessions = vi.fn();
    render(
      <PortalPrograms
        {...baseProps}
        uniqueClientPurchasedPrograms={[program]}
        clientProgramStatuses={{
          p1: {
            status: "not-started",
            done: 0,
            total: 0,
            currentWeek: 0,
            totalWeeks: 8,
          },
        }}
        selectedClientProgram={program}
        setSelectedClientProgramId={setSelected}
        loadClientProgramSessions={loadSessions}
      />
    );
    // My Programs list: group header + card + derived status tag.
    expect(screen.getByText("myPrograms")).toBeInTheDocument();
    expect(screen.getByText("Rock Climbing")).toBeInTheDocument();
    expect(screen.getByText("Strength Base")).toBeInTheDocument();
    expect(screen.getByText(/Not started/)).toBeInTheDocument();

    // Tapping a not-started program selects it and previews its sessions.
    fireEvent.click(screen.getByText("Strength Base"));
    expect(setSelected).toHaveBeenCalledWith("p1");
    expect(loadSessions).toHaveBeenCalled();
  });

  it("shows the in-progress dashboard (renderProgramHome) via the status route", () => {
    const dash = vi.fn(() => <div>DASH</div>);
    render(
      <PortalPrograms
        {...baseProps}
        uniqueClientPurchasedPrograms={[program]}
        clientProgramStatuses={{
          p1: {
            status: "in-progress",
            done: 2,
            total: 12,
            currentWeek: 1,
            totalWeeks: 8,
          },
        }}
        selectedClientProgram={program}
        selectedClientProgramAlreadyLoaded={true}
        renderProgramHome={dash}
      />
    );
    expect(screen.getByText(/In progress/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Strength Base"));
    expect(dash).toHaveBeenCalled();
    expect(screen.getByText("DASH")).toBeInTheDocument();
  });
});
