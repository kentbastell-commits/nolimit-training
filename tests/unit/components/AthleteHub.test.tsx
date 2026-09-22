import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AthleteHub, { athleteContactKey } from "../../../src/AthleteHub";

const t = (key: string) => key;
const client = { clientCode: "CL-6785", name: "Yanjun", clientType: "Online Coaching", coach: "Kent" };
const callbacks = { openAssignment: vi.fn(), openWorkout: vi.fn(), setClientTab: vi.fn(), renderWellness: () => <p>Wellness form</p>, renderWorkload: () => <p>Load form</p>, renderMetrics: () => <p>Metrics</p>, renderHistory: () => <p>Exercise records</p>, renderRecords: () => null, renderTrophies: () => null, markInboxSeen: vi.fn() };
const base = { ...callbacks, t, client, today: "2026-09-22", loading: false, workoutName: (w: any) => w.sessionName, dateLabel: (v: string) => v, account: <p>Account settings</p>, inboxSeenAt: 0, workloadEnabled: true };
afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState({}, "", "/"); vi.clearAllMocks(); });

describe("shared mini-program athlete surfaces", () => {
  it("does not mislabel a failed workout load as a rest day or empty plan", () => {
    const retry = vi.fn();
    render(<AthleteHub {...base} view="Home" loadFailed retry={retry} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("athleteNoPlan")).not.toBeInTheDocument();
    expect(screen.queryByText("athleteRest")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "athleteRetry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it("separates a rest day's next session from a start-today action", () => {
    render(<AthleteHub {...base} view="Home" workouts={[{ id: "w1", sessionName: "Tomorrow", scheduledDate: "2026-09-23", completionStatus: "Scheduled" }]} />);
    expect(screen.getByText("athleteRest")).toBeInTheDocument();
    expect(screen.queryByText("start")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Tomorrow/ }));
    expect(callbacks.openWorkout).toHaveBeenCalledWith(expect.objectContaining({ id: "w1" }));
  });
  it("keeps records, assessments, owned programs and settings accessible under Me", () => {
    render(<AthleteHub {...base} view="Overview" />);
    fireEvent.click(screen.getByRole("button", { name: "athleteHistory" }));
    expect(screen.getByText("Exercise records")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "athleteBackMe" }));
    fireEvent.click(screen.getByRole("button", { name: "athletePrograms" }));
    expect(callbacks.setClientTab).toHaveBeenCalledWith("Programs");
    expect(screen.getByRole("button", { name: "athleteAssessments" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "athleteAccount" }));
    expect(screen.getByText("Account settings")).toBeInTheDocument();
  });
  it("uses account state for the contact destination", () => {
    expect(athleteContactKey("Online Coaching")).toBe("athleteCoach");
    expect(athleteContactKey("Digital Program")).toBe("athleteSupport");
    expect(athleteContactKey("")).toBe("athleteGetStarted");
  });
  it("loads only this athlete's messages and prevents sending in preview", async () => {
    window.history.replaceState({}, "", "/?portal=client&preview=coach");
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messages: [] }) });
    vi.stubGlobal("fetch", fetch);
    render(<AthleteHub {...base} view="Coach" />);
    fireEvent.click(screen.getByRole("button", { name: "athleteMessages" }));
    await screen.findByText("athleteNoMessages");
    fireEvent.change(screen.getByLabelText("athleteMessageBody"), { target: { value: "Preview only" } });
    expect(screen.getByRole("button", { name: "athleteSend" })).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/clientMessages?clientId=CL-6785");
  });
  it("keeps a message draft after a failed send and reports failed history honestly", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetch);
    render(<AthleteHub {...base} view="Coach" />);
    fireEvent.click(screen.getByRole("button", { name: "athleteMessages" }));
    await screen.findByRole("alert");
    expect(screen.queryByText("athleteNoMessages")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("athleteMessageBody"), { target: { value: "Training question" } });
    fireEvent.click(screen.getByRole("button", { name: "athleteSend" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("athleteSendFailed"));
    expect(screen.getByLabelText("athleteMessageBody")).toHaveValue("Training question");
  });
});
