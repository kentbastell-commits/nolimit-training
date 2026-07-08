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
    const selectWorkoutTab = vi.fn();
    render(
      <CoachBuilderPage {...baseProps} selectWorkoutTab={selectWorkoutTab} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Programs" }));
    expect(selectWorkoutTab).toHaveBeenCalledWith("Saved Programs");
  });
});
