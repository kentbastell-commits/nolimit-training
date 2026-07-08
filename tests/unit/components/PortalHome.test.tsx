import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PortalHome from "../../../src/PortalHome";

const baseProps = {
  t: (k: string) => k,
  getTaskTone: () => "",
  clientComments: [],
  clientPortalUpcomingTasks: [],
  coachDashTab: "science",
  coachInboxItems: () => [],
  completedTaskCount: 0,
  completionRate: 0,
  contentResponsesLoading: false,
  getTaskActionLabel: () => "",
  handleHomeTouchEnd: vi.fn(),
  handleHomeTouchStart: vi.fn(),
  inboxSeenAt: 0,
  isClientPortal: true,
  isWorkloadMonitored: false,
  loadContentResponses: vi.fn(),
  localizeAssignmentKind: (k: string) => k,
  localizeTaskStatus: (s: string) => s,
  localizedCalendarLabel: (d: string) => d,
  localizedWorkoutName: (w: any) => w?.sessionName || "",
  markInboxSeen: vi.fn(),
  needsAttentionItems: [],
  openWorkout: vi.fn(),
  paceZh: false,
  portalHomeTab: "tasks",
  recentWorkoutSubmissions: [],
  renderDailyCheckIn: () => null,
  renderExerciseHistoryBody: () => null,
  renderLoadDashboard: () => null,
  renderPerformanceMetrics: () => null,
  renderPrLeaderboard: () => null,
  renderTrophyCase: () => null,
  renderWellnessTrends: () => null,
  renderWorkloadTab: () => null,
  selectedClient: { id: "c1", name: "Test Client" },
  setClientTab: vi.fn(),
  setCoachDashTab: vi.fn(),
  setPortalHomeTab: vi.fn(),
  toReviewWorkouts: [],
  todayValue: "2026-07-07",
  totalTaskCount: 0,
};

describe("PortalHome", () => {
  it("renders the client home tabs and empty upcoming tasks", () => {
    render(<PortalHome {...baseProps} />);
    expect(screen.getByRole("tab", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Records" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Metrics" })).toBeInTheDocument();
    expect(screen.getByText("upcomingTasks")).toBeInTheDocument();
    expect(screen.getByText("noUpcomingWorkouts")).toBeInTheDocument();
  });

  it("switches home tab on click", () => {
    const setPortalHomeTab = vi.fn();
    render(<PortalHome {...baseProps} setPortalHomeTab={setPortalHomeTab} />);
    fireEvent.click(screen.getByRole("tab", { name: "Records" }));
    expect(setPortalHomeTab).toHaveBeenCalledWith("records");
  });

  it("renders the coach science dashboard when not in the client portal", () => {
    render(<PortalHome {...baseProps} isClientPortal={false} />);
    expect(screen.getByText("Training Load")).toBeInTheDocument();
    expect(screen.getByText("Wellness Trends")).toBeInTheDocument();
  });
});
