import { describe, expect, it } from "vitest";
import { applyBulkTargets } from "../../../src/bulkPrescription";
import type { ProgramExercise } from "../../../src/appCore";
const exercise = { sets: "2", reps: "10", rest: "45", setPrescriptions: [
  { setNumber: 1, reps: "10", rest: "45", load: "20", time: "30", intensityMode: "HR range", intensityValue: "120-140" },
  { setNumber: 2, reps: "8", rest: "90", load: "25", time: "45", intensityMode: "HR range", intensityValue: "130-150" },
] } as ProgramExercise;
describe("bulk prescription targets", () => {
  it("changes every selected set while preserving unrelated varied targets", () => {
    const result = applyBulkTargets(exercise, { sets: "3", reps: "12", rest: "60" });
    expect(result.setPrescriptions?.map(s => [s.reps, s.rest, s.load, s.time, s.intensityValue])).toEqual([
      ["12", "60", "20", "30", "120-140"], ["12", "60", "25", "45", "130-150"], ["12", "60", "25", "45", "130-150"],
    ]);
    expect(exercise.setPrescriptions?.[0].reps).toBe("10");
  });
  it("keeps blank fields unchanged, shrinks sets and rejects fractional counts", () => {
    expect(applyBulkTargets(exercise, { sets: "1", reps: "", rest: "" }).setPrescriptions).toHaveLength(1);
    expect(applyBulkTargets(exercise, { sets: "", reps: "", rest: "" }).setPrescriptions?.[1].rest).toBe("90");
    expect(() => applyBulkTargets(exercise, { sets: "1.5", reps: "", rest: "" })).toThrow();
    expect(() => applyBulkTargets(exercise, { sets: "0", reps: "", rest: "" })).toThrow();
  });
});
