import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "../../../src/i18n";
import SessionPublishReview from "../../../src/SessionPublishReview";
import SessionChangeSummary from "../../../src/SessionChangeSummary";
const before = { workout: { sessionName: "Accessory" }, templates: [{ exerciseId: "A", exerciseName: "Hold", sets: "3" }] };
const after = { ...before, templates: [{ ...before.templates[0], sets: "2" }] };
afterEach(() => vi.unstubAllGlobals());
describe("publication review", () => {
  it("requires the published baseline, retries a failed read, and never sends a write", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ ok: true, json: async () => ({ publishedSnapshot: before }) });
    vi.stubGlobal("fetch", fetcher); const finish = vi.fn();
    render(<SessionPublishReview id="AW-1" makeSnapshot={() => after} finish={finish} />);
    const confirm = screen.getByRole("button", { name: "Confirm & publish changes" }); expect(confirm).toBeDisabled();
    await screen.findByRole("alert"); expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("What will change"); expect(confirm).toBeEnabled();
    expect(screen.getByText("Sets / rounds")).toBeInTheDocument();
    fireEvent.click(confirm); expect(finish).toHaveBeenCalledWith(true);
    expect(fetcher.mock.calls.every(([, options]) => !options.method)).toBe(true);
  });
  it("can cancel while loading and keeps publication disabled without a baseline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ templates: [] }) }));
    const finish = vi.fn(); render(<SessionPublishReview id="AW-1" makeSnapshot={() => after} finish={finish} />);
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Confirm & publish changes" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Back to editing" }));
    await waitFor(() => expect(finish).toHaveBeenCalledWith(false));
  });
  it("keeps long notes collapsed and clearly distinguishes a new session", () => {
    const view = render(<SessionChangeSummary before={{ ...before, workout: { coachNotes: "Old notes" } }} after={{ ...after, workout: { coachNotes: "New notes" } }} />);
    expect(screen.getByText("Session notes").closest("details")).not.toHaveAttribute("open");
    view.rerender(<SessionChangeSummary before={null} after={after} />);
    expect(screen.getByText("New session")).toBeInTheDocument();
  });
});
