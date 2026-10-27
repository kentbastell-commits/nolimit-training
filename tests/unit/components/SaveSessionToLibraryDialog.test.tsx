import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SaveSessionToLibraryDialog from "../../../src/SaveSessionToLibraryDialog";
import type { Workout } from "../../../src/appCore";
import "../../../src/i18n";

const workout = { assignedWorkoutId: "AW-1", id: "AW-1" } as Workout;
const snapshot = { workout: { sessionName: "Climbing Warmup 1", isDraft: false }, templates: [{ exerciseName: "Scapular Pull-Up" }], version: "a".repeat(64), hasRevision: false, conflicted: false, publishedSnapshot: null };
describe("save session dialog", () => {
  it("defaults to the original name and preserves a renamed value and request identity on a failed-save retry", async () => {
    const writes: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      if (!init?.method) return { ok: true, json: async () => snapshot };
      writes.push(JSON.parse(init.body));
      return writes.length === 1 ? { ok: false, status: 503, json: async () => ({}) } : { ok: true, json: async () => ({ success: true, name: "Warmup for climbing", programId: "PR-SAVED" }) };
    }));
    const saved = vi.fn(); render(<SaveSessionToLibraryDialog workout={workout} close={vi.fn()} saved={saved} />);
    const name = await screen.findByLabelText("Session name"); expect(name).toHaveValue("Climbing Warmup 1");
    fireEvent.change(name, { target: { value: "Warmup for climbing" } });
    fireEvent.click(screen.getByRole("button", { name: "Save to Sessions" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("try again"); expect(name).toHaveValue("Warmup for climbing");
    fireEvent.click(screen.getByRole("button", { name: "Save to Sessions" }));
    await waitFor(() => expect(saved).toHaveBeenCalledWith("Warmup for climbing", "PR-SAVED"));
    expect(writes).toHaveLength(2); expect(writes[1]).toEqual(writes[0]);
  });
  it("makes published versus private revision an explicit choice", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...snapshot, hasRevision: true, publishedSnapshot: snapshot }) }); vi.stubGlobal("fetch", fetch);
    render(<SaveSessionToLibraryDialog workout={workout} close={vi.fn()} saved={vi.fn()} />);
    expect(await screen.findByRole("radio", { name: "Published session" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Private draft" }));
    fireEvent.click(screen.getByRole("button", { name: "Save to Sessions" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetch.mock.calls[1][1].body).source).toBe("draft");
  });
  it("requires a fresh reload after a version conflict", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, json: async () => snapshot }).mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: "sessionChanged" }) }));
    render(<SaveSessionToLibraryDialog workout={workout} close={vi.fn()} saved={vi.fn()} />);
    await screen.findByLabelText("Session name"); fireEvent.click(screen.getByRole("button", { name: "Save to Sessions" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Reload");
    expect(screen.getByRole("button", { name: "Save to Sessions" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reload session" })).toBeInTheDocument();
  });
});
