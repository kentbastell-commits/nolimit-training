import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CoachBuilderPage from "../../../src/CoachBuilderPage";
import CoachLibraryNavigation from "../../../src/CoachLibraryNavigation";
import "../../../src/i18n";
import { useState } from "react";

// CoachBuilderPage (~5k lines) renders one panel per workoutPageTab. The
// Forms list tab has the smallest prop surface, so the smoke test renders
// that branch; every other panel is guarded off by workoutPageTab.
const baseProps = {
  workoutPageTab: "Forms",
  useMobileWorkoutRows: false,
  workoutTabList: [
    { value: "Saved Programs", label: "Programs" },
    { value: "Forms", label: "Forms" },
  ],
  activeWorkoutTabValue: "Forms",
  selectWorkoutTab: vi.fn(),
  setWorkoutTabsMenuOpen: vi.fn(),
  workoutTabsMenuOpen: false,
  // Forms list panel
  savedFormTemplates: [],
  visibleSavedForms: [],
  savedFormSearch: "",
  setSavedFormSearch: vi.fn(),
  formTemplatesLoading: false,
  coachVisibleClients: [],
  // Guards for the other panels (all rendered only for other tabs)
  isSingleWorkoutBuilder: false,
  sessionEditorOpen: false,
  showProgramDetail: false,
  selectedSavedProgram: null,
  formView: "list",
  mobileBuilderStep: "overview",
  programs: [],
  teams: [],
};

describe("CoachBuilderPage", () => {
  it.each([true, false])("adds one library row on rapid taps and handles deletion (phone: %s)", (phone) => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: phone })));
    const bike = { exerciseId: "bike", recordId: "bike", exerciseName: "Bike", sectionName: "Cardio", trackingType: "Time", sets: "1", coachingNotes: "" };
    function Builder() {
      const [exercises, setExercises] = useState<any[]>([]);
      const [open, setOpen] = useState(true);
      const [swap, setSwap] = useState<number | null>(null);
      return <CoachBuilderPage {...baseProps}
        workoutPageTab="Program Builder" isSingleWorkoutBuilder sessionEditorOpen
        programSessions={[]} sessionLibSessions={[]} selectedProgramExercises={exercises} builderExercises={[bike]}
        builderSectionOptions={["Cardio"]} pendingSectionName="Cardio" builderMode="Single Workout"
        programName="Accessory" sessionName="Accessory" programBuiltForMode="Client"
        isBuilderLibraryOpen={open} setIsBuilderLibraryOpen={setOpen}
        builderLibraryMode="Exercises" setBuilderLibraryModeAndLoad={vi.fn()}
        swapExerciseIndex={swap} setSwapExerciseIndex={setSwap} accessoryTargetIndex={null}
        replaceProgramExerciseWith={() => setSwap(null)}
        usePercentExerciseIndexes={new Set()} bulkSelectedIdx={new Set()}
        normalizeBuilderSection={(s: string) => s} getBuilderSectionSelectOptions={() => ["Cardio"]}
        renderSetPrescriptionTable={() => <div>Cardio targets</div>} renderAlternateExerciseEditor={() => null}
        renderExerciseLabelBadge={() => null} isCircuitGroupStart={() => false} isExerciseLinkedWithPrevious={() => false}
        getBuilderOrderItems={() => []} buildGlanceChain={() => []}
        addExerciseToProgram={() => setExercises(current => [...current, bike])}
        renderBuilderExerciseOptionsMenu={(_: unknown, index: number) => <><button onClick={() => setExercises(current => current.filter((__, i) => i !== index))}>Delete exercise</button><button onClick={() => setSwap(index)}>Replace exercise</button></>}
        renderBuilderExerciseSummary={() => null} estimateSessionMinutes={() => 0}
        setLatestBuilderExerciseIndex={vi.fn()} scrollLatestBuilderExerciseIntoView={vi.fn()}
        openBuilderLibrary={() => setOpen(true)}
      />;
    }
    render(<Builder />);
    const choice = screen.getByText("Bike", { exact: true }).closest("button")!;
    fireEvent.click(choice);
    fireEvent.click(choice);
    expect(screen.getByRole("dialog", { name: phone ? "Edit workout exercise" : "Add exercises" })).toBeInTheDocument();
    expect(screen.getAllByText("Cardio targets")).toHaveLength(1);
    if (!phone) expect(screen.getByText("In session: 1")).toBeInTheDocument();
    if (!phone) {
      fireEvent.click(screen.getByRole("button", { name: "Replace exercise" }));
      const replacement = document.querySelector(".builderExercisePickCard:not(.builderCreateExerciseCard)")!;
      fireEvent.click(replacement);
      fireEvent.click(replacement);
      expect(screen.getByText("In session: 1")).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "Delete exercise" }));
    expect(screen.queryByRole("dialog", { name: "Edit workout exercise" })).not.toBeInTheDocument();
    expect(screen.queryByText("Cardio targets")).not.toBeInTheDocument();
    if (phone) {
      // Deliberate re-entry must still allow repeated movements. Removing a
      // middle slot must not leave its neighbour open under the old index.
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByRole("button", { name: "+ Add Exercise", exact: true }));
        fireEvent.click(document.querySelector(".builderExercisePickCard:not(.builderCreateExerciseCard)")!);
        fireEvent.click(screen.getByRole("button", { name: "Done editing", exact: true }));
      }
      expect(document.querySelectorAll(".builderExerciseSummaryButton")).toHaveLength(3);
      for (const [index, remaining] of [[1, 2], [1, 1], [0, 0]]) {
        fireEvent.click(document.querySelectorAll(".builderExerciseSummaryButton")[index]);
        fireEvent.click(screen.getByRole("button", { name: "Delete exercise" }));
        expect(screen.queryByRole("dialog", { name: "Edit workout exercise" })).not.toBeInTheDocument();
        expect(document.querySelectorAll(".builderExerciseSummaryButton")).toHaveLength(remaining);
      }
    }
    vi.unstubAllGlobals();
  });
  it("renders the Forms tab with its empty state", () => {
    render(<CoachBuilderPage {...baseProps} />);
    expect(
      screen.getByPlaceholderText("Search forms...")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No saved forms yet. Create one to assign to clients.")
    ).toBeInTheDocument();
  });

  it("switches destinations from the shared library navigation", () => {
    const select = vi.fn();
    render(<CoachLibraryNavigation selected="Forms" select={select} />);
    fireEvent.click(screen.getByRole("button", { name: "Programs", exact: true }));
    expect(select).toHaveBeenCalledWith("Programs");
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
        isCircuitGroupStart={() => false}
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
