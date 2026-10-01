import { describe, expect, it } from "vitest";
(globalThis as any).window = { fetch: async () => ({}), localStorage: { getItem: () => null }, location: { search: "" } };
const { exercisePrescription, effectiveTrackingFields, toggleExerciseTrackingField } = await import("../../../src/appCore");
import type { ProgramExercise } from "../../../src/appCore";

describe("shared exercise prescription", () => {
  it("keeps rep counts paired with each hold duration, including varying sets and Chinese", () => {
    const exercise = { trackingFields: ["Time", "Reps"], isUnilateral: true,
      setPrescriptions: [{ reps: "3", time: "10" }, { reps: "2", time: "15 s" }] };
    expect(exercisePrescription(exercise).target).toBe("3 × 10 sec / 2 × 15 s/side");
    expect(exercisePrescription({ ...exercise, setPrescriptions: [{ reps: "3", time: "10" }] }, true).target).toBe("3 次 × 10 秒／侧");
    expect(exercisePrescription({ ...exercise, setPrescriptions: [{ reps: "3", time: "10" }, { reps: "3", time: "10" }] }).summary).toBe("2 sets · 3 × 10 sec/side");
    expect(exercisePrescription({ ...exercise, setPrescriptions: [{ reps: "3" }] }).target).toBe("3 × —/side");
  });
  it("makes timed hold fields editable without clearing the hold or other set values", () => {
    const exercise = { trackingType: "Time", trackingFields: ["Time"], reps: "", sets: "1",
      setPrescriptions: [{ setNumber: 1, reps: "", time: "10 s", rest: "20 sec", load: "5" }] } as ProgramExercise;
    expect(effectiveTrackingFields("Time", ["Time"])).toEqual(["Time"]);
    const edited = toggleExerciseTrackingField(exercise, "Reps");
    expect(edited.trackingType).toBe("Weight");
    expect(edited.trackingFields).toEqual(["Time", "Reps"]);
    expect(edited.setPrescriptions).toEqual(exercise.setPrescriptions);
    const hidden = toggleExerciseTrackingField(edited, "Time");
    expect(toggleExerciseTrackingField(hidden, "Time").setPrescriptions).toEqual(exercise.setPrescriptions);
  });
  it("leaves cardio in interval mode until fields are customized, then migrates its duration", () => {
    expect(effectiveTrackingFields("Time")).toEqual([]);
    const exercise = { trackingType: "Time", reps: "30:00", sets: "1",
      setPrescriptions: [{ setNumber: 1, reps: "30:00", time: "", intensityMode: "hr", intensityValue: "130-150" }] } as ProgramExercise;
    const edited = toggleExerciseTrackingField(exercise, "Reps");
    expect(edited.setPrescriptions?.[0]).toMatchObject({ reps: "", time: "30:00", intensityMode: "hr", intensityValue: "130-150" });
    expect(exercise.setPrescriptions?.[0].reps).toBe("30:00");
  });
  it("shows structured holds, units and sides instead of stale reps", () => {
    const ex = { reps: "8", sets: "2", notes: "Fields: Time\nUnilateral: Yes", isUnilateral: true,
      trackingFields: ["Time"], setPrescriptions: [{ time: "30" }, { time: "30" }], groupType: "Circuit", groupName: "B" };
    expect(exercisePrescription(ex)).toMatchObject({ mode: "time", target: "30 sec/side", summary: "2 rounds · 30 sec/side" });
    expect(exercisePrescription(ex, true).summary).toBe("2 轮 · 30 秒／侧");
  });
  it("shows every variable set without inventing repetitions from prose", () => {
    expect(exercisePrescription({ reps: "20", sets: 3, setPrescriptions: [{ reps: "20" }, { reps: "15" }, { reps: "12" }] }).summary)
      .toBe("3 sets · 20 / 15 / 12 reps");
    expect(exercisePrescription({ reps: "8-10", sets: 3 }).target).toBe("8-10 reps");
  });
  it("falls back to note metadata, but prefers structured sets", () => {
    const notes = 'Fields: Time\nSet Prescriptions: [{"setNumber":1,"time":"45"}]';
    expect(exercisePrescription({ notes, reps: "8" }).target).toBe("45 sec");
    expect(exercisePrescription({ notes, setPrescriptions: [{ time: "20 sec" }] }).target).toBe("20 sec");
    expect(exercisePrescription({ trackingFields: ["Distance"], setPrescriptions: [{ distance: "10" }, { distance: "20" }] }).target).toBe("10 / 20 m");
  });
  it("retains unknown sets rather than silently filling timed targets with reps", () => {
    expect(exercisePrescription({ trackingFields: ["Time"], reps: "8", setPrescriptions: [{ time: "30" }, {}] }).target).toBe("30 / — sec");
  });
  it("does not duplicate units or sides already entered by the coach", () => {
    expect(exercisePrescription({ isUnilateral: true, trackingFields: ["Time"], setPrescriptions: [{ time: "20 s / side" }] }).target).toBe("20 s / side");
    expect(exercisePrescription({ isUnilateral: true, reps: "8 x 5 s / side" }).target).toBe("8 x 5 s / side");
  });
});
