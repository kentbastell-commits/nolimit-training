import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CalendarDraftReview } from "../../../src/CalendarDraftControls";
import "../../../src/i18n";

afterEach(() => vi.unstubAllGlobals());
const data = { version: "v1", items: [
  { id: "AW-1", type: "workout", name: "Ready session", date: Date.parse("2026-09-30") },
  { id: "AW-2", type: "workout", name: "Unfinished session", date: Date.parse("2026-10-01") },
] };

it("preselects only the opened session, retains selection on failed publish, and retries without submitting results", async () => {
  const published = vi.fn(), close = vi.fn();
  const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => data })
    .mockResolvedValueOnce({ ok: false, status: 500 })
    .mockResolvedValueOnce({ ok: true, json: async () => data })
    .mockResolvedValueOnce({ ok: true });
  vi.stubGlobal("fetch", fetch);
  render(<CalendarDraftReview clientId="CL-1" name="Athlete" initialSelectedId="AW-1" close={close} published={published} />);
  fireEvent.click(await screen.findByRole("button", { name: "Publish selected (1)" }));
  await screen.findByRole("alert");
  expect(close).not.toHaveBeenCalled(); expect(published).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Reload drafts" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Publish selected (1)" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Publish selected (1)" }));
  await waitFor(() => expect(published).toHaveBeenCalledOnce());
  expect(close).toHaveBeenCalledOnce();
  const writes = fetch.mock.calls.filter(([, init]) => init?.method === "POST");
  expect(writes).toHaveLength(2);
  for (const [url, init] of writes) {
    expect(url).toBe("/api/calendarDrafts");
    expect(JSON.parse(init.body)).toEqual({ action: "publish", clientId: "CL-1", version: "v1", ids: ["AW-1"] });
  }
});

it("does not select other drafts if the opened session was already published", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
  render(<CalendarDraftReview clientId="CL-1" name="Athlete" initialSelectedId="AW-GONE" close={vi.fn()} published={vi.fn()} />);
  expect(await screen.findByRole("button", { name: "Publish selected (0)" })).toBeDisabled();
});

it("keeps the calendar-wide review selecting all drafts", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
  render(<CalendarDraftReview clientId="CL-1" name="Athlete" close={vi.fn()} published={vi.fn()} />);
  expect(await screen.findByRole("button", { name: "Publish selected (2)" })).toBeEnabled();
});
