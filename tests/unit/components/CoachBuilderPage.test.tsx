import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CoachBuilderPage from "../../../src/CoachBuilderPage";

// CoachBuilderPage (~5k lines) renders one panel per workoutPageTab. The
// Assignment Hub tab has the smallest prop surface, so the smoke test renders
// that branch; every other panel is guarded off by workoutPageTab.
const baseProps = {
  workoutPageTab: "Assignments",
  useMobileWorkoutRows: false,
  workoutTabList: [
    { value: "Saved Programs", label: "Programs" },
    { value: "Assignments", label: "Assignments" },
  ],
  activeWorkoutTabValue: "Assignments",
  selectWorkoutTab: vi.fn(),
  setWorkoutTabsMenuOpen: vi.fn(),
  workoutTabsMenuOpen: false,
  // Assignment Hub panel
  assignmentType: "Program",
  assignmentClientId: "",
  assignmentTemplateId: "",
  assignmentTemplateOptions: [],
  assignmentDueDate: "2026-07-07",
  assignmentHubDateInputRef: { current: null },
  coachVisibleClients: [],
  createContentAssignment: vi.fn(),
  creatingAssignment: false,
  setAssignmentClientId: vi.fn(),
  setAssignmentDueDate: vi.fn(),
  setAssignmentTemplateId: vi.fn(),
  setAssignmentType: vi.fn(),
  setCalendarAnchorDate: vi.fn(),
  // Guards for the other panels (all rendered only for other tabs)
  isSingleWorkoutBuilder: false,
  sessionEditorOpen: false,
  showProgramDetail: false,
  selectedSavedProgram: null,
  formView: "list",
  testView: "list",
  mobileBuilderStep: "overview",
  programs: [],
  teams: [],
};

describe("CoachBuilderPage", () => {
  it("renders the Assignment Hub tab", () => {
    render(<CoachBuilderPage {...baseProps} />);
    expect(
      screen.getByRole("heading", { name: "Assignment Hub" })
    ).toBeInTheDocument();
    expect(screen.getByText("No saved programs")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Assignment" })
    ).toBeInTheDocument();
  });

  it("switches tabs from the tab bar", () => {
    // Redesign: the segmented wkTabs bar appends a per-tab count badge, so
    // the button's accessible name becomes "Programs0" (label + count, no
    // whitespace). Match on the label prefix to stay resilient to the count.
    const selectWorkoutTab = vi.fn();
    render(
      <CoachBuilderPage {...baseProps} selectWorkoutTab={selectWorkoutTab} />
    );
    fireEvent.click(screen.getByRole("button", { name: /^Programs/ }));
    expect(selectWorkoutTab).toHaveBeenCalledWith("Saved Programs");
  });

  it("offers button-based arranging and closes the mobile sheet with Escape", () => {
    const setMobileBuilderStep = vi.fn();
    const reorderProgramExercise = vi.fn();
    const exercises = [
      {
        exerciseId: "squat",
        exerciseName: "Back Squat",
        sectionName: "Strength",
        coachingNotes: "",
        isUnilateral: false,
      },
      {
        exerciseId: "row",
        exerciseName: "Cable Row",
        sectionName: "Strength",
        coachingNotes: "",
        isUnilateral: false,
      },
    ];
    const orderItems = exercises.map((exercise, index) => ({
      key: exercise.exerciseId,
      start: index,
      end: index,
      exercises: [exercise],
      isLinkedGroup: false,
    }));

    render(
      <CoachBuilderPage
        {...baseProps}
        workoutPageTab="Program Builder"
        activeWorkoutTabValue="Program Builder"
        workoutTabList={[{ value: "Program Builder", label: "Builder" }]}
        useMobileWorkoutRows
        mobileBuilderStep="arrange"
        setMobileBuilderStep={setMobileBuilderStep}
        setMobilePickerSelected={vi.fn()}
        mobileMenuIndex={null}
        mobileDetailsIndex={null}
        mobileAlternateIndex={null}
        setMobileMenuIndex={vi.fn()}
        setMobileDetailsIndex={vi.fn()}
        setMobileAlternateIndex={vi.fn()}
        selectedProgramExercises={exercises}
        programName="Strength Block"
        programSessions={[]}
        isExerciseLinkedWithPrevious={() => false}
        renderMobileSetTable={() => <div>Set table</div>}
        updateProgramExercise={vi.fn()}
        adjustProgramExerciseSets={vi.fn()}
        openMobilePicker={vi.fn()}
        saveMobileProgramDay={vi.fn()}
        savingTemplate={false}
        getBuilderOrderItems={() => orderItems}
        mobileArrangeItemsRef={{ current: [] }}
        mobileArrangeRefs={{ current: [] }}
        mobileDragIndex={null}
        mobileDragOverIndex={null}
        startMobileDrag={vi.fn()}
        reorderProgramExercise={reorderProgramExercise}
      />
    );

    expect(
      screen.getByRole("dialog", { name: "Arrange exercises" })
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Move Back Squat down" })
    );
    expect(reorderProgramExercise).toHaveBeenCalledWith(0, 1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(setMobileBuilderStep).toHaveBeenCalledWith("editor");
  });
});
