import { expect, it } from "vitest";
import { exerciseVideoDate, exerciseVideoHistory } from "../../../src/exerciseVideoHistory";

it("keeps client and exercise variants separate while grouping case and spacing", () => {
  const rows = [
    { recordId: "1", clientId: "CL-A", exerciseName: "Pull-Up", videoUrl: "a.mp4", workoutDate: "2026-10-01" },
    { recordId: "2", clientId: "CL-A", exerciseName: " pull-up ", videoUrl: "b.mp4", workoutDate: "2026-10-08" },
    { recordId: "3", clientId: "CL-A", exerciseName: "Assisted Pull-Up", videoUrl: "c.mp4" },
    { recordId: "4", clientId: "CL-B", exerciseName: "Pull-Up", videoUrl: "private.mp4" },
    { recordId: "5", clientId: "CL-A", exerciseName: "Pull-Up", videoUrl: "", clientNote: "Note only" },
  ];
  const result = exerciseVideoHistory(rows, "CL-A");
  expect(result.map(g => g.videos.map(v => v.recordId))).toEqual([["3"], ["1", "2"]]);
});
it("uses the session date before upload/review time and keeps unknown dates last", () => {
  const rows = [
    { recordId: "unknown", clientId: "A", exerciseName: "Row", videoUrl: "u.mp4" },
    { recordId: "early", clientId: "A", exerciseName: "Row", videoUrl: "a.mp4", workoutDate: "2026-10-01", submittedAt: Date.parse("2026-10-20T00:00:00Z"), reviewedAt: Date.parse("2026-10-30T00:00:00Z") },
    { recordId: "late", clientId: "A", exerciseName: "Row", videoUrl: "b.mp4", submittedAt: Date.parse("2026-10-10T18:00:00Z") },
  ];
  expect(exerciseVideoHistory(rows, "A")[0].videos.map(v => v.recordId)).toEqual(["early", "late", "unknown"]);
  expect(exerciseVideoDate(rows[2])).toBe("2026-10-11");
});
