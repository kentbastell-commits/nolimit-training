import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ExerciseHistoryModal from "../../../src/ExerciseHistoryModal";

const baseProps = {
  t: (k: string) => k,
  expandedHistoryDates: new Set<string>(),
  historyExerciseName: "Back Squat",
  paceZh: false,
  setExpandedHistoryDates: vi.fn(),
  setHistoryExerciseName: vi.fn(),
  workoutHistoryLogs: [],
};

const log = {
  recordId: "r1",
  exerciseName: "Back Squat",
  date: "2026-07-01",
  setNumber: 1,
  actualReps: 5,
  actualWeight: 100,
};

describe("ExerciseHistoryModal", () => {
  it("renders the empty history state", () => {
    render(<ExerciseHistoryModal {...baseProps} />);
    expect(screen.getByText("Back Squat")).toBeInTheDocument();
    expect(screen.getByText("noHistoryLogged")).toBeInTheDocument();
  });

  it("groups logged sets by date and expands them", () => {
    render(
      <ExerciseHistoryModal
        {...baseProps}
        workoutHistoryLogs={[log]}
        expandedHistoryDates={new Set(["2026-07-01"])}
      />
    );
    expect(screen.getByText("2026-07-01")).toBeInTheDocument();
    expect(screen.getByText("1 set")).toBeInTheDocument();
    expect(screen.getByText("Set 1")).toBeInTheDocument();
  });

  it("toggles a date group open on click", () => {
    const setExpandedHistoryDates = vi.fn();
    render(
      <ExerciseHistoryModal
        {...baseProps}
        workoutHistoryLogs={[log]}
        setExpandedHistoryDates={setExpandedHistoryDates}
      />
    );
    fireEvent.click(screen.getByText("2026-07-01"));
    expect(setExpandedHistoryDates).toHaveBeenCalledTimes(1);
  });
});
