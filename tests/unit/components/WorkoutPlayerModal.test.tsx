import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  canRepeatPreviousWorkoutSet: vi.fn(() => false),
  checkedWorkoutPageItems: {},
  clientReviewMode: false,
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
  isPremiumClient: vi.fn(() => false),
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
  closeWorkoutPlayer: vi.fn(),
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
  repeatPreviousWorkoutSet: vi.fn(),
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
  workoutDraftStatus: "idle",
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

  it("keeps the screen awake for a live client player and releases on close", async () => {
    const release = vi.fn(async () => undefined);
    const request = vi.fn(async () => ({ release, released: false }));
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: { request },
    });

    const { unmount } = render(
      <WorkoutPlayerModal {...baseProps} isClientPortal />
    );
    await waitFor(() => expect(request).toHaveBeenCalledWith("screen"));
    unmount();
    expect(release).toHaveBeenCalledTimes(1);
    Reflect.deleteProperty(navigator, "wakeLock");
  });

  it("shows device-save state, repeats only explicitly, and advances inputs on Enter", () => {
    const repeatPreviousWorkoutSet = vi.fn();
    const exercise = {
      id: "d1",
      exerciseId: "EX-1",
      exerciseName: "Back Squat",
      order: 1,
      sets: "2",
      reps: "8",
      tempo: "",
      rest: "90 sec",
      notes: "Tracking: Weight\nFields: Weight, Reps\nUnilateral: No",
    };
    const logs = [1, 2].map((setNumber) => ({
      exerciseId: "EX-1",
      occurrenceId: "d1",
      exerciseName: "Back Squat",
      exerciseOrder: 1,
      setNumber,
      side: "",
      trackingType: "Weight",
      trackingFields: ["Weight", "Reps"],
      prescribedLoad: "80",
      prescribedPercent: "",
      prescribedReps: "8",
      prescribedTime: "",
      prescribedDistance: "",
      prescribedRpe: "",
      prescribedRir: "",
      actualWeight: setNumber === 1 ? "75" : "",
      actualReps: setNumber === 1 ? "8" : "",
      actualTime: "",
      actualDistance: "",
      actualRpe: "",
      actualRir: "",
    }));
    const { container } = render(
      <WorkoutPlayerModal
        {...baseProps}
        detailsLoading={false}
        isClientPortal
        workoutLoggingStarted
        workoutFocusMode
        workoutDetails={[exercise]}
        setLogs={logs}
        checkedWorkoutPageItems={["d1:set:1:both"]}
        workoutDraftStatus="saved"
        getWorkoutGroupBounds={vi.fn(() => ({
          start: 0,
          end: 0,
          indexes: [0],
        }))}
        getWorkoutGroupIndexes={vi.fn(() => [0])}
        resolvePrescribedLoad={vi.fn(() => ({
          display: "80 kg",
          resolved: true,
        }))}
        workoutSetCheckKey={vi.fn(
          (log: any) => `d1:set:${log.setNumber}:both`
        )}
        canRepeatPreviousWorkoutSet={vi.fn(
          (log: any) => log.setNumber === 2
        )}
        repeatPreviousWorkoutSet={repeatPreviousWorkoutSet}
      />
    );

    expect(screen.getByText("Saved on device")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Same as last set" }));
    expect(repeatPreviousWorkoutSet).toHaveBeenCalledWith(logs[1]);

    const inputs = container.querySelectorAll<HTMLInputElement>(
      ".exerciseSetRows input"
    );
    expect(inputs.length).toBeGreaterThan(1);
    expect(inputs[3].value).toBe("");
    expect(inputs[3].placeholder).toBe("8");
    inputs[0].focus();
    fireEvent.keyDown(inputs[0], { key: "Enter" });
    expect(document.activeElement).toBe(inputs[1]);
  });
});
