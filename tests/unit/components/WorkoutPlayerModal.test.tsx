import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkoutPlayerModal from "../../../src/WorkoutPlayerModal";
import i18n from "../../../src/i18n";

const selectedWorkout = {
  id: "w1",
  assignedWorkoutId: "AW-1",
  clientId: "CL-1",
  week: "1",
  day: "2",
  sessionName: "Lower Body Strength",
  scheduledDate: "2999-01-01",
  completionStatus: "Scheduled",
};

const baseProps: any = {
  getLabelColorClass: vi.fn(() => ""),
  t: i18n.t.bind(i18n),
  i18n,
  checkAndSaveWorkoutSet: vi.fn(),
  checkedWorkoutPageItems: {},
  coachReviewMode: false,
  deleteWorkout: vi.fn(),
  detailsLoading: true,
  editingWorkoutDate: "",
  formVideoBusy: false,
  formVideoInputRef: { current: null },
  formVideoSentIds: [],
  getWorkoutGroupBounds: vi.fn(() => ({ start: 0, end: 0 })),
  getWorkoutGroupIndexes: vi.fn(() => []),
  getWorkoutGroupRoundCount: vi.fn(() => 1),
  goToFocusExercise: vi.fn(),
  handleFocusTouchEnd: vi.fn(),
  handleFocusTouchStart: vi.fn(),
  isClientPortal: false,
  isExerciseFullyLogged: vi.fn(() => false),
  isPremiumClient: false,
  isSetComplete: vi.fn(() => false),
  isWarmupSection: vi.fn(() => false),
  lastLoggedWeight: vi.fn(() => ""),
  latestReadiness: vi.fn(() => null),
  localizeDefaultSection: vi.fn((value: string) => value),
  localizeRestValue: vi.fn((value: string) => value),
  localizeText: vi.fn((value: string) => value),
  localizedExerciseName: vi.fn((exercise: any) => exercise?.exerciseName || ""),
  localizedWorkoutName: vi.fn(
    (workout: any) => workout?.sessionName || "Workout"
  ),
  openWorkoutActionMenuId: null,
  openWorkoutExerciseFromGlance: vi.fn(),
  openWorkoutFinish: vi.fn(),
  originalExercisesRef: { current: [] },
  paceZh: false,
  resetWodState: vi.fn(),
  resolvePrescribedHr: vi.fn(() => ""),
  resolvePrescribedLoad: vi.fn(() => ""),
  resolvePrescribedPace: vi.fn(() => ""),
  restTimer: null,
  saveWorkout: vi.fn(),
  savingWorkout: false,
  sectionAccentColor: vi.fn(() => ""),
  selectedWorkout,
  setAlternatePickerExercise: vi.fn(),
  setEditingWorkoutDate: vi.fn(),
  setFormVideoExercise: vi.fn(),
  setHistoryExerciseName: vi.fn(),
  setLogs: [],
  setOpenWorkoutActionMenuId: vi.fn(),
  setRestTimer: vi.fn(),
  setSavedExerciseDraftIds: vi.fn(),
  setSelectedWorkout: vi.fn(),
  setSetLogs: vi.fn(),
  setTechnicalCueExercise: vi.fn(),
  setWodRounds: vi.fn(),
  setWodTimer: vi.fn(),
  setWorkoutDetails: vi.fn(),
  setWorkoutFocusMode: vi.fn(),
  setWorkoutFocusSetRound: vi.fn(),
  setWorkoutHistoryLogs: vi.fn(),
  setWorkoutLoggingStarted: vi.fn(),
  setWorkoutSubmissionNote: vi.fn(),
  setWorkoutVideoOverlay: vi.fn(),
  startRestTimer: vi.fn(),
  toggleWorkoutReviewed: vi.fn(),
  updateSetLog: vi.fn(),
  updateWorkoutDate: vi.fn(),
  updatingWorkoutDate: false,
  useMobileWorkoutRows: false,
  vibrate: vi.fn(),
  weightUnit: "kg",
  wodElapsedMs: vi.fn(() => 0),
  wodRounds: {},
  wodTimer: { running: false, groupId: null },
  workoutDetails: [],
  workoutFocusIndex: 0,
  workoutFocusMode: false,
  workoutFocusSetRound: 1,
  workoutGroupTitle: vi.fn(() => ""),
  workoutLoggingStarted: false,
  workoutSetCheckKey: vi.fn(() => ""),
  workoutSubmissionNote: "",
};

describe("WorkoutPlayerModal", () => {
  it("renders the workout header and loading state while details load", () => {
    render(<WorkoutPlayerModal {...baseProps} />);
    expect(screen.getByText("Lower Body Strength")).toBeInTheDocument();
    // Header meta: "Week 1 • Day 2" plus the display status.
    expect(screen.getByText(/Week\s+1\s+•\s+Day\s+2/)).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Loading workouts...")).toBeInTheDocument();
  });

  it("shows the at-a-glance panel once exercise details are loaded", () => {
    render(
      <WorkoutPlayerModal
        {...baseProps}
        detailsLoading={false}
        workoutDetails={[
          {
            id: "d1",
            exerciseId: "EX-1",
            exerciseName: "Back Squat",
            order: 1,
            sets: "3",
            reps: "8",
            tempo: "",
            rest: "90 sec",
            notes: "Tracking: Weight\nUnilateral: No",
          },
        ]}
      />
    );
    expect(screen.getByText("At a Glance")).toBeInTheDocument();
    expect(screen.getAllByText("Back Squat").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("Loading workouts...")
    ).not.toBeInTheDocument();
  });
});
