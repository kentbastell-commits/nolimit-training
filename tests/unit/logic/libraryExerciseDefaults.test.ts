// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { composeExerciseNotes, exercisePrescription, parseExerciseNotes, type LibraryExercise } from "../../../src/appCore";
import { libraryExerciseDefaults, repeatedHoldDurationSeconds } from "../../../src/libraryExerciseDefaults";

const reps = [6, 6, 2, 2, 2, 2];
const rows = reps.map((value, index) => ({ setNumber: index + 1, reps: String(value), time: "10", rest: "20 sec" }));
const exercise: LibraryExercise = {
  recordId: "EX-ABRA-TEST", exerciseId: "EX-ABRA-TEST", exerciseName: "Abrahangs", videoUrl: "",
  notes: `Tracking: Weight\nFields: Reps, Time\nUnilateral: No\nSet Prescriptions: ${JSON.stringify(rows)}\n\nSetup\nKeep the feet supported.\n\nExecution\nPull for ten seconds and rest for twenty.`,
  coachingCuesCn: "准备姿势\n双脚保持支撑。\n\n动作执行\n发力10秒，休息20秒。",
};

describe("reusable exercise protocol defaults", () => {
  it("carries the six grip blocks, exact work/rest dose and both languages into a workout", () => {
    const defaults = libraryExerciseDefaults(exercise)!;
    expect(defaults.sets).toBe("6");
    expect(defaults.setPrescriptions?.map(set => set.reps)).toEqual(reps.map(String));
    expect(defaults.setPrescriptions?.every(set => set.time === "10" && set.rest === "20 sec")).toBe(true);
    expect(defaults.setPrescriptions?.reduce((n, set) => n + Number(set.reps) * (Number(set.time) + 20), 0)).toBe(600);
    expect(repeatedHoldDurationSeconds(defaults)).toBe(600);
    expect(defaults.trackingFields).toEqual(["Reps", "Time"]);
    expect(defaults.isUnilateral).toBe(false);
    expect(defaults.coachingNotes).toBe("Setup\nKeep the feet supported.\n\nExecution\nPull for ten seconds and rest for twenty.");
    expect(defaults.coachingNotesCn).toBe(exercise.coachingCuesCn);
    expect(exercisePrescription(defaults).target).toBe("6 × 10 sec / 6 × 10 sec / 2 × 10 sec / 2 × 10 sec / 2 × 10 sec / 2 × 10 sec");
  });

  it("estimates repeated holds from each row and leaves ordinary or incomplete prescriptions to the existing estimator", () => {
    const defaults = libraryExerciseDefaults(exercise)!;
    defaults.setPrescriptions![0].time = "0:10";
    defaults.setPrescriptions![0].rest = "0:20";
    expect(repeatedHoldDurationSeconds(defaults)).toBe(600);
    expect(repeatedHoldDurationSeconds({ ...defaults, trackingFields: ["Reps"] })).toBeNull();
    defaults.setPrescriptions![0].reps = "MAX";
    expect(repeatedHoldDurationSeconds(defaults)).toBeNull();
  });

  it("keeps protocol fields through library text edits and a second save", () => {
    const saved = composeExerciseNotes("Setup\nUpdated cue.\n\nExecution\nKeep the same timing.", "Weight", false, exercise.notes);
    const meta = parseExerciseNotes(saved);
    expect(meta.setPrescriptions.map(set => set.reps)).toEqual(reps.map(String));
    expect(meta.trackingFields).toEqual(["Reps", "Time"]);
    expect(meta.coachingNotes).toContain("Updated cue.");
    expect(composeExerciseNotes(saved, "Weight", false)).toBe(saved);
  });

  it("does not change normal exercises or share mutable prescription rows", () => {
    expect(libraryExerciseDefaults({ ...exercise, notes: "Tracking: Weight\nSetup\nOrdinary exercise." })).toBeNull();
    const first = libraryExerciseDefaults(exercise)!;
    const second = libraryExerciseDefaults(exercise)!;
    first.setPrescriptions![0].time = "99";
    first.trackingFields!.push("Weight");
    expect(second.setPrescriptions![0].time).toBe("10");
    expect(second.trackingFields).toEqual(["Reps", "Time"]);
  });
});
