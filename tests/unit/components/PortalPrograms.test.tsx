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
  clientProgramDashboard: null,
  openWorkout: vi.fn(),
  rescheduleClientWorkout: vi.fn(),
  restartClientProgram: vi.fn(),
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

  it("routes an in-progress program to the compact dashboard with real data", () => {
    render(
      <PortalPrograms
        {...baseProps}
        uniqueClientPurchasedPrograms={[program]}
        clientProgramStatuses={{
          p1: {
            status: "in-progress",
            done: 9,
            total: 32,
            currentWeek: 3,
            totalWeeks: 8,
          },
        }}
        selectedClientProgram={program}
        selectedClientProgramAlreadyLoaded={true}
        clientProgramDashboard={{
          pct: 28,
          done: 9,
          total: 32,
          currentWeek: 3,
          maxWeek: 8,
          next: {
            id: "w1",
            week: 3,
            day: 2,
            sessionName: "Upper · Pull",
            scheduledDate: "2026-07-16",
          },
          remaining: [],
          weekChips: [{ label: "MON", state: "done", id: "w0" }],
          adherence: 92,
          dayStreak: 5,
          prCount: 3,
        }}
      />
    );
    expect(screen.getByText(/In progress/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Strength Base"));
    // Compact dashboard: ring %, sessions count, stats.
    expect(screen.getByText("28%")).toBeInTheDocument();
    expect(screen.getByText(/9\s+of\s+32/)).toBeInTheDocument();
    expect(screen.getByText("Adherence")).toBeInTheDocument();
    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByText("Start session")).toBeInTheDocument();
  });

  it("uses the full completion experience so sharing and ratings stay available", () => {
    render(
      <PortalPrograms
        {...baseProps}
        uniqueClientPurchasedPrograms={[program]}
        clientProgramStatuses={{
          p1: {
            status: "completed",
            done: 32,
            total: 32,
            currentWeek: 8,
            totalWeeks: 8,
          },
        }}
        selectedClientProgram={program}
        renderProgramHome={() => (
          <div>
            <button>Share my finish</button>
            <button>Rate this program</button>
          </div>
        )}
      />
    );
    fireEvent.click(screen.getByText("Strength Base"));
    expect(screen.getByText("Share my finish")).toBeInTheDocument();
    expect(screen.getByText("Rate this program")).toBeInTheDocument();
    expect(screen.queryByText("Total volume lifted")).not.toBeInTheDocument();
  });
});
