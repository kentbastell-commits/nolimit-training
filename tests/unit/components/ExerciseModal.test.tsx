import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ExerciseModal from "../../../src/ExerciseModal";
import "../../../src/i18n";

const baseProps = {
  applyExerciseCueDraft: vi.fn(),
  categoryOptions: ["Squat"],
  closeExerciseForm: vi.fn(),
  copyExerciseAiPrompt: vi.fn(),
  editingExercise: null,
  equipmentOptions: ["Barbell"],
  exerciseForm: {
    exerciseId: "",
    exerciseName: "",
    videoUrl: "",
    longVideoUrl: "",
    category: "",
    muscleGroup: "",
    movementPattern: "",
    equipment: "",
    notes: "",
    trackingType: "Weight",
    isUnilateral: false,
  },
  movementPatternOptions: ["Lower Body Squat"],
  muscleGroupOptions: ["Quads"],
  renderVideoPreview: () => null,
  saveExerciseForm: vi.fn(),
  savingExercise: false,
  setExerciseForm: vi.fn(),
};

describe("ExerciseModal", () => {
  it("renders the add-exercise form", () => {
    render(<ExerciseModal {...baseProps} />);
    expect(screen.getByText(/Add Exercise/i)).toBeInTheDocument();
  });

  it("renders edit mode when editing an exercise", () => {
    render(
      <ExerciseModal
        {...baseProps}
        editingExercise={{ exerciseId: "EX-1", exerciseName: "Back Squat" }}
      />
    );
    expect(screen.getByText(/Edit Exercise/i)).toBeInTheDocument();
  });
});
