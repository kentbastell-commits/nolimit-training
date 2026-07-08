import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AssignmentDrawer from "../../../src/AssignmentDrawer";

const baseProps = {
  assignLoading: false,
  assignProgramKind: "program",
  assignProgramToClient: vi.fn(),
  assignStartDate: "2026-07-07",
  assignableWorkouts: [],
  assigningProgram: false,
  assignmentDueDate: "2026-07-07",
  assignmentTemplateId: "",
  assignmentTemplateOptions: [],
  assignmentType: "Program",
  calendarAnchorDate: "2026-07-07",
  calendarAssignmentDateInputRef: { current: null },
  closeAssignmentDrawer: vi.fn(),
  createContentAssignment: vi.fn(),
  creatingAssignment: false,
  loadProgramSessionsForAssignment: vi.fn(),
  programs: [],
  savedFormTemplates: [],
  savedTestTemplates: [],
  selectedAssignProgramId: "",
  selectedClient: { id: "CL-1", name: "Ada Lovelace" },
  setAssignStartDate: vi.fn(),
  setAssignableWorkouts: vi.fn(),
  setAssignmentClientId: vi.fn(),
  setAssignmentDueDate: vi.fn(),
  setAssignmentTemplateId: vi.fn(),
  setAssignmentType: vi.fn(),
  setCalendarAnchorDate: vi.fn(),
  setSelectedAssignProgramId: vi.fn(),
  shiftAssignableWorkoutsToStartDate: vi.fn(),
  updateAssignableWorkoutDate: vi.fn(),
};

describe("AssignmentDrawer", () => {
  it("renders the drawer for the selected client", () => {
    render(<AssignmentDrawer {...baseProps} />);
    expect(
      screen.getByRole("heading", { name: "New Task" })
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("No saved programs")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Assign Program" })
    ).toBeInTheDocument();
  });

  it("closes via the drawer close button", () => {
    const closeAssignmentDrawer = vi.fn();
    render(
      <AssignmentDrawer
        {...baseProps}
        closeAssignmentDrawer={closeAssignmentDrawer}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "x" }));
    expect(closeAssignmentDrawer).toHaveBeenCalled();
  });

  it("switches assignment type when a type chip is clicked", () => {
    const setAssignmentType = vi.fn();
    render(
      <AssignmentDrawer {...baseProps} setAssignmentType={setAssignmentType} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Check-in" }));
    expect(setAssignmentType).toHaveBeenCalledWith("Check-in");
  });
});
