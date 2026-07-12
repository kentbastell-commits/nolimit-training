import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CoachLibraryPage from "../../../src/CoachLibraryPage";

const baseProps = {
  deleteExercise: vi.fn(),
  filteredLibraryExercises: [],
  groupedLibraryExercises: [],
  libraryCategoryFilter: "All",
  libraryCategoryOptions: ["Squat", "Hinge"],
  libraryExercises: [],
  libraryLoading: false,
  librarySearch: "",
  loadExerciseLibrary: vi.fn(),
  openEditExerciseForm: vi.fn(),
  openNewExerciseForm: vi.fn(),
  setLibraryCategoryFilter: vi.fn(),
  setLibrarySearch: vi.fn(),
  setTechnicalCueExercise: vi.fn(),
};

describe("CoachLibraryPage", () => {
  it("renders the search row and empty state", () => {
    render(<CoachLibraryPage {...baseProps} />);
    // button is now icon + "Add exercise" (text split by the Plus icon)
    expect(
      screen.getByRole("button", { name: "Add exercise" })
    ).toBeInTheDocument();
    expect(screen.getByText("No exercises found")).toBeInTheDocument();
  });

  it("renders grouped exercises", () => {
    const exercise = {
      recordId: "r1",
      exerciseId: "EX-1",
      exerciseName: "Back Squat",
      category: "Squat",
      videoUrl: "",
    };
    render(
      <CoachLibraryPage
        {...baseProps}
        filteredLibraryExercises={[exercise]}
        groupedLibraryExercises={[["Squat", [exercise]]]}
        libraryExercises={[exercise]}
      />
    );
    expect(screen.getByText("Back Squat")).toBeInTheDocument();
    expect(screen.queryByText("No exercises found")).not.toBeInTheDocument();
  });

  it("opens the new-exercise form when Add exercise is clicked", () => {
    const openNewExerciseForm = vi.fn();
    render(
      <CoachLibraryPage {...baseProps} openNewExerciseForm={openNewExerciseForm} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Add exercise" }));
    expect(openNewExerciseForm).toHaveBeenCalledTimes(1);
  });
});
