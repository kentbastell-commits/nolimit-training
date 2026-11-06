import { describe, expect, it } from "vitest";
import { videoExerciseLabels } from "../../../src/videoExerciseLabels.ts";

describe("feedback exercise labels", () => {
  it("uses curated names with normalized legacy text and preserves explicit translations", () => {
    const label = videoExerciseLabels([{ name: "Goblet Squat", nameCn: "高脚杯深蹲" }]);
    expect(label("  GOBLET   Squat ")).toBe("高脚杯深蹲");
    expect(label("高脚杯深蹲")).toBe("高脚杯深蹲");
    expect(label("Goblet Squat", "教练审定名称")).toBe("教练审定名称");
  });
  it("does not guess between conflicting duplicate library names or unknown exercises", () => {
    const label = videoExerciseLabels([{ name: "Row", nameCn: "划船" }, { name: "Row", nameCn: "划船机" }]);
    expect(label("Row")).toBe("");
    expect(label("Unknown exercise")).toBe("");
  });
});
