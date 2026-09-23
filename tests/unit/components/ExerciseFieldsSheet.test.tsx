import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ExerciseFieldsSheet from "../../../src/ExerciseFieldsSheet";
import type { ProgramExercise } from "../../../src/appCore";
import i18n from "../../../src/i18n";

afterEach(() => { cleanup(); void i18n.changeLanguage("en"); });

describe("exercise field selection", () => {
  it("keeps one field selected and requires space before adding a fourth", () => {
    const toggle = vi.fn();
    const exercise = { exerciseName: "Split squat hold", trackingType: "Weight", trackingFields: ["Time"] } as ProgramExercise;
    const { rerender } = render(<ExerciseFieldsSheet exercise={exercise} toggle={toggle} close={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Edit fields" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Time \/ hold/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Weight (kg)" }));
    expect(toggle).toHaveBeenCalledWith("Weight");
    rerender(<ExerciseFieldsSheet exercise={{ ...exercise, trackingFields: ["Time", "Weight", "RPE"] }} toggle={toggle} close={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Reps" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Time \/ hold/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Time \/ hold/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("offers natural Chinese labels and closes without publishing the session", async () => {
    await i18n.changeLanguage("zh");
    const close = vi.fn(), toggle = vi.fn();
    render(<ExerciseFieldsSheet exercise={{ exerciseName: "等长分腿蹲", trackingType: "Weight" } as ProgramExercise} toggle={toggle} close={close} />);
    expect(screen.getByRole("dialog", { name: "编辑记录项" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "时长 / 保持时间" }));
    expect(toggle).toHaveBeenCalledWith("Time");
    fireEvent.click(screen.getByRole("button", { name: "完成" }));
    expect(close).toHaveBeenCalledOnce();
  });
});
