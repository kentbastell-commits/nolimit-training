import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CoachLibraryPage from "../../../src/CoachLibraryPage";

const baseProps = {
  deleteExercise: vi.fn(),
  filteredLibraryExercises: [],
  groupedLibraryExercises: [],
  libraryCategoryFilter: "All",
  libraryCategoryOptions: ["Squat", "Hinge"],
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
    expect(screen.getByText("+ Add Exercise")).toBeInTheDocument();
    expect(screen.getByText("No exercises found.")).toBeInTheDocument();
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
      />
    );
    expect(screen.getByText("Back Squat")).toBeInTheDocument();
    expect(screen.queryByText("No exercises found.")).not.toBeInTheDocument();
  });

  it("opens the new-exercise form when Add Exercise is clicked", () => {
    const openNewExerciseForm = vi.fn();
    render(
      <CoachLibraryPage {...baseProps} openNewExerciseForm={openNewExerciseForm} />
    );
    fireEvent.click(screen.getByText("+ Add Exercise"));
    expect(openNewExerciseForm).toHaveBeenCalledTimes(1);
  });
});
