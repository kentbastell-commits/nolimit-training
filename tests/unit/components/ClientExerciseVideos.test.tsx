import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ClientExerciseVideos from "../../../src/ClientExerciseVideos";
import i18n from "../../../src/i18n";

const rows = [
  { recordId: "V3", clientId: "CL-A", exerciseName: "Row", workoutName: "Latest session", workoutDate: "2026-10-20", videoUrl: "/uploads/fv-latest.mp4", coachReply: "Much steadier", status: "Reviewed" },
  { recordId: "V1", clientId: "CL-A", exerciseName: "Row", workoutName: "First session", workoutDate: "2026-10-01", videoUrl: "/uploads/fv-first.mp4", coachReply: "Control the lowering", clientNote: "My first attempt", status: "Reviewed" },
  { recordId: "V2", clientId: "CL-A", exerciseName: "Row", workoutName: "Middle session", workoutDate: "2026-10-10", videoUrl: "/uploads/fv-middle.mp4" },
  { recordId: "VS", clientId: "CL-A", exerciseName: "Squat", workoutDate: "2026-10-12", videoUrl: "/uploads/fv-squat.mp4" },
  { recordId: "VB", clientId: "CL-B", exerciseName: "Row", videoUrl: "/uploads/fv-private.mp4", coachReply: "Private B feedback" },
];
beforeEach(async () => { await i18n.changeLanguage("en"); vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(); });
const open = () => fireEvent.click(screen.getByRole("button", { name: "Browse videos" }));
const response = (videos = rows) => ({ ok: true, json: async () => ({ videos }) });

it("loads on demand, scopes by client, orders clips and keeps feedback with its video", async () => {
  const fetcher = vi.fn().mockResolvedValue(response()); vi.stubGlobal("fetch", fetcher);
  const feedback = vi.fn(); render(<ClientExerciseVideos clientId="CL-A" onOpenFeedback={feedback} />);
  expect(fetcher).not.toHaveBeenCalled(); open();
  await screen.findByText("Control the lowering");
  expect(fetcher).toHaveBeenCalledWith("/api/formVideos?clientId=CL-A", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  const cards = screen.getAllByRole("listitem");
  expect(cards.map(e => e.querySelector("time")?.textContent)).toEqual(["2026-10-01", "2026-10-10", "2026-10-20"]);
  expect(within(cards[0]).getByText("My first attempt")).toBeInTheDocument();
  expect(screen.queryByText("Private B feedback")).not.toBeInTheDocument();
  fireEvent.click(within(cards[0]).getByRole("button", { name: "Open feedback" })); expect(feedback).toHaveBeenCalledWith("V1");
  fireEvent.change(screen.getByLabelText("Video order"), { target: { value: "newest" } });
  expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Much steadier");
  fireEvent.change(screen.getByLabelText("Exercise"), { target: { value: "squat" } });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(screen.queryByText("Control the lowering")).not.toBeInTheDocument();
});
it("compares only the first and latest clip and uses one live player", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response())); const { container } = render(<ClientExerciseVideos clientId="CL-A" />); open();
  await screen.findByText("Control the lowering"); fireEvent.click(screen.getByRole("button", { name: "Compare first & latest" }));
  expect(screen.getAllByRole("listitem")).toHaveLength(2); expect(screen.queryByText("Middle session")).not.toBeInTheDocument();
  expect(container.querySelectorAll("video")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Play Row · 2026-10-01" })); expect(container.querySelectorAll("video")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Play Row · 2026-10-20" })); expect(container.querySelectorAll("video")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Play Row · 2026-10-01" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close history" })); expect(container.querySelectorAll("video")).toHaveLength(0);
});
it("never shows an old client's late response after switching athletes", async () => {
  let resolve!: (value: ReturnType<typeof response>) => void;
  const fetcher = vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValue(response([])); vi.stubGlobal("fetch", fetcher);
  const { rerender } = render(<ClientExerciseVideos clientId="CL-A" />); open(); rerender(<ClientExerciseVideos clientId="CL-B" />);
  await screen.findByText(/No exercise videos yet/); await act(async () => resolve(response()));
  expect(screen.queryByText("Control the lowering")).not.toBeInTheDocument(); expect(screen.queryByRole("list")).not.toBeInTheDocument();
});
it("offers retry after failure and paginates without omitting clips", async () => {
  const videos = Array.from({ length: 8 }, (_, i) => ({ ...rows[0], recordId: `V${i}`, workoutDate: `2026-10-${String(i + 1).padStart(2, "0")}` }));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce(response(videos))); render(<ClientExerciseVideos clientId="CL-A" />); open();
  await screen.findByRole("alert"); fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(6));
  fireEvent.click(screen.getByRole("button", { name: "Show more clips" })); expect(screen.getAllByRole("listitem")).toHaveLength(8);
});
it("provides the exercise history controls in Chinese", async () => {
  await i18n.changeLanguage("zh"); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response())); render(<ClientExerciseVideos clientId="CL-A" />);
  fireEvent.click(screen.getByRole("button", { name: "浏览视频" })); await screen.findByLabelText("动作");
  expect(screen.getByRole("button", { name: "对比最早与最新" })).toBeInTheDocument(); expect(screen.getAllByText("教练反馈")).toHaveLength(2);
});
