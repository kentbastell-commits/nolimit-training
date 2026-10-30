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
it("offers one reply for every pending clip in a session, and only when more than one is pending", async () => {
  const many = vi.fn().mockResolvedValue(undefined);
  const twoPending = [
    ...videos,
    { recordId: "V4", clientId: "CL-1", workoutName: "Home Workout 1", assignedWorkoutId: "AW-1", workoutDate: "2026-10-20", exerciseName: "Hang", status: "New" },
  ];
  const { container } = render(<WorkoutVideoGroups videos={twoPending} coach onReview={vi.fn()} onReviewMany={many} />);
  const [newer, older] = Array.from(container.querySelectorAll("details")) as HTMLElement[];
  expect(within(newer).queryByRole("textbox", { name: "Session feedback" })).not.toBeInTheDocument();
  const box = within(older).getByRole("textbox", { name: "Session feedback" });
  const button = within(older).getByRole("button", { name: /Send to 2 clips/ });
  expect(button).toBeDisabled();
  fireEvent.change(box, { target: { value: "Nice work, keep the elbows in" } });
  fireEvent.click(button);
  await waitFor(() => expect(many).toHaveBeenCalledWith(["V2", "V4"], "Nice work, keep the elbows in"));
});
it("loads all athlete uploads with a scoped request and no coach editing controls", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ videos }) }); vi.stubGlobal("fetch", fetcher);
  render(<AthleteWorkoutVideos clientId="CL-1" />);
  await waitFor(() => expect(screen.getByText("Control the lowering")).toBeInTheDocument());
  expect(fetcher).toHaveBeenCalledWith("/api/formVideos?clientId=CL-1");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});
