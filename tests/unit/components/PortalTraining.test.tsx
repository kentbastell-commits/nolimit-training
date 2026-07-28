// PortalTraining is the heaviest portal view (drag-drop calendar, three view
// styles, coach/client branches). Smoke bar: render the client Week view with
// an empty calendar and exercise the "today" quick control.
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PortalTraining from "../../../src/PortalTraining";

const baseProps = {
  calendarDropWorkoutId: "",
  t: (k: string) => k,
  todayValue: "2026-07-07",
  assignLoading: false,
  assignProgramToClient: vi.fn(),
  assignStartDate: "2026-07-07",
  assignableWorkouts: [],
  assigningProgram: false,
  assignmentTemplateId: "",
  assignmentTemplateOptions: [],
  assignmentType: "Program",
  calendarAnchorDate: "2026-07-07",
  calendarAssignmentDateInputRef: { current: null },
  calendarDates: [],
  calendarRangeLabel: "",
  calendarView: "Week",
  clearCalendarLongPress: vi.fn(),
  clientCalendarStyle: "Week",
  clientCalendarTouchDrag: null,
  clientMonthAnchorDate: "2026-07-07",
  clientMonthCalendarDates: [],
  clientPortalUpcomingWorkouts: [],
  clientWeekRangeLabel: "Jul 6 - Jul 12",
  clientWeekStripDates: [],
  coachMonthCalendarDates: [],
  consumeCalendarLongPressClick: vi.fn(() => false),
  contentAssignments: [],
  copiedCalendarItem: null,
  createContentAssignment: vi.fn(),
  creatingAssignment: false,
  deleteContentAssignment: vi.fn(),
  draggingAssignmentId: "",
  draggingWorkoutId: "",
  endClientCalendarWorkoutTouch: vi.fn(),
  getAssignmentDisplayName: (a: any) => a?.templateName || "",
  getAssignmentsForDate: vi.fn(() => []),
  getCalendarItemCountForDate: vi.fn(() => 0),
  getWorkoutsForDate: vi.fn(() => []),
  handleClientCalendarWorkoutDrop: vi.fn(),
  handleOpenContentAssignment: vi.fn(),
  isClientPortal: true,
  jumpClientCalendarToToday: vi.fn(),
  loadProgramSessionsForAssignment: vi.fn(),
  localizeTaskStatus: (s: string) => s,
  localizedCalendarLabel: (d: string) => d,
  localizedMonthTitle: (d: string) => d,
  localizedWeekStripLabel: (d: string) => ({ weekday: d, day: d }),
  localizedWorkoutName: (w: any) => w?.sessionName || "",
  moveCalendarRange: vi.fn(),
  moveClientCalendarWorkoutTouch: vi.fn(),
  moveClientMonth: vi.fn(),
  moveContentAssignmentToDate: vi.fn(),
  moveWorkoutToDate: vi.fn(),
  movingAssignmentId: "",
  movingWorkoutId: "",
  openAssignmentHubFromCalendar: vi.fn(),
  openCalendarActionMenu: vi.fn(),
  openWorkout: vi.fn(),
  pasteCalendarItemToDate: vi.fn(),
  programs: [],
  selectClientCalendarDate: vi.fn(),
  selectedAssignProgramId: "",
  selectedCalendarDateAssignments: [],
  selectedCalendarDateItemCount: 0,
  selectedCalendarDateWorkouts: [],
  selectedClient: { id: "c1", name: "Test Client" },
  setAssignStartDate: vi.fn(),
  setAssignableWorkouts: vi.fn(),
  setAssignmentClientId: vi.fn(),
  setAssignmentDueDate: vi.fn(),
  setAssignmentTemplateId: vi.fn(),
  setAssignmentType: vi.fn(),
  setCalAddMenu: vi.fn(),
  setCalendarAnchorDate: vi.fn(),
  setCalendarDropWorkoutId: vi.fn(),
  setCalendarView: vi.fn(),
  setClientCalendarStyle: vi.fn(),
  setDraggingAssignmentId: vi.fn(),
  setDraggingWorkoutId: vi.fn(),
  setSelectedAssignProgramId: vi.fn(),
  setShowCalendarActionMenu: vi.fn(),
  shiftAssignableWorkoutsToStartDate: vi.fn(),
  showCalendarActionMenu: false,
  startCalendarLongPress: vi.fn(),
  startClientCalendarWorkoutTouch: vi.fn(),
  suppressClientCalendarTouchClick: vi.fn(() => false),
  updateAssignableWorkoutDate: vi.fn(),
  useChineseClientText: false,
  workouts: [],
  workoutsLoading: false,
};

describe("PortalTraining", () => {
  it("renders the client week calendar with nothing scheduled", () => {
    render(<PortalTraining {...baseProps} />);
    expect(screen.getByText("trainingCalendar")).toBeInTheDocument();
    expect(screen.getByText("Jul 6 - Jul 12")).toBeInTheDocument();
    expect(screen.getByText("nothingScheduledShort")).toBeInTheDocument();
  });

  it("jumps to today from the quick controls", () => {
    const jumpClientCalendarToToday = vi.fn();
    render(
      <PortalTraining
        {...baseProps}
        jumpClientCalendarToToday={jumpClientCalendarToToday}
      />
    );
    fireEvent.click(screen.getByText("today"));
    expect(jumpClientCalendarToToday).toHaveBeenCalledTimes(1);
  });

  it("orders the desktop upcoming-session rail chronologically", () => {
    const { container } = render(
      <PortalTraining
        {...baseProps}
        clientPortalUpcomingWorkouts={[
          {
            id: "later",
            sessionName: "Later Session",
            scheduledDate: "2026-07-12",
            week: 1,
            day: 2,
          },
          {
            id: "next",
            sessionName: "Next Session",
            scheduledDate: "2026-07-08",
            week: 1,
            day: 1,
          },
        ]}
      />
    );

    const cards = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".clientDesktopUpcomingCard")
    );
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Next Session");
    expect(cards[1]).toHaveTextContent("Later Session");
  });

  it("groups completed training history newest month first", () => {
    const { container } = render(
      <PortalTraining
        {...baseProps}
        workouts={[
          {
            id: "june",
            sessionName: "June Session",
            scheduledDate: "2026-06-28",
            completionStatus: "Completed",
            week: 1,
            day: 1,
          },
          {
            id: "july",
            sessionName: "July Session",
            scheduledDate: "2026-07-04",
            completionStatus: "Completed",
            week: 2,
            day: 1,
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /completed/i }));
    const groups = Array.from(container.querySelectorAll(".clientCompletedGroup"));
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveTextContent("July 2026");
    expect(groups[0]).toHaveTextContent("July Session");
    expect(groups[1]).toHaveTextContent("June 2026");
    expect(groups[1]).toHaveTextContent("June Session");
  });
});
