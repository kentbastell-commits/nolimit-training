import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import WorkoutVideoGroups, { AthleteWorkoutVideos } from "../../../src/WorkoutVideoGroups";
import "../../../src/i18n";
afterEach(() => vi.unstubAllGlobals());
const videos = [
  { recordId: "V1", clientId: "CL-1", workoutName: "Home Workout 1", assignedWorkoutId: "AW-1", workoutDate: "2026-10-20", exerciseName: "Row", coachReply: "Control the lowering", status: "Reviewed" },
  { recordId: "V2", clientId: "CL-1", workoutName: "Home Workout 1", assignedWorkoutId: "AW-1", workoutDate: "2026-10-20", exerciseName: "Push-up", status: "New" },
  { recordId: "V3", clientId: "CL-1", workoutName: "Home Workout 1", assignedWorkoutId: "AW-2", workoutDate: "2026-10-27", exerciseName: "Squat", coachReply: "Good depth", status: "Reviewed" },
];
it("shows feedback beside the exercise under distinct session dates, and keeps replies attached to their video", () => {
  const reply = vi.fn(), setReplies = vi.fn();
  const { container } = render(<WorkoutVideoGroups videos={videos} coach onReview={reply} setReplies={setReplies} />);
  const groups = container.querySelectorAll("details"); expect(groups).toHaveLength(2);
  const older = within(groups[1] as HTMLElement);
  expect(older.getByText("2026-10-20")).toBeInTheDocument(); expect(older.getByText("Control the lowering", { selector: "p" })).toBeInTheDocument();
  fireEvent.click(older.getByRole("button", { name: /Send reply/ })); expect(reply).toHaveBeenCalledWith("V2");
  fireEvent.change(older.getByRole("textbox", { name: "Feedback: Row" }), { target: { value: "Updated" } });
  expect(setReplies.mock.calls[0][0]({})).toEqual({ V1: "Updated" });
});
it("loads all athlete uploads with a scoped request and no coach editing controls", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ videos }) }); vi.stubGlobal("fetch", fetcher);
  render(<AthleteWorkoutVideos clientId="CL-1" />);
  await waitFor(() => expect(screen.getByText("Control the lowering")).toBeInTheDocument());
  expect(fetcher).toHaveBeenCalledWith("/api/formVideos?clientId=CL-1");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});
