import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useCoachHistory, { type CoachLocation } from "../../../src/useCoachHistory";
const initial: CoachLocation = { page: "Clients", client: "", tab: "Home", libraryTab: "Saved Programs", calendarStyle: "Month", calendarView: "Week", week: "2026-09-21", month: "2026-09-01", date: "2026-09-23", scroll: 0 };
beforeEach(() => window.history.replaceState({}, ""));
afterEach(() => vi.useRealTimers());
function fixture(allow = true) {
  return renderHook(() => {
    const [location, setLocation] = useState(initial), [overlay, setOverlay] = useState(false);
    const close = vi.fn(() => { if (allow) setOverlay(false); return allow; });
    useCoachHistory(true, location, overlay, close, setLocation);
    return { location, setLocation, overlay, setOverlay, close };
  });
}
describe("coach browser history", () => {
  it("coalesces touch scrolling so Safari history does not get flooded", () => {
    vi.useFakeTimers();
    const hook = fixture(), replace = vi.spyOn(window.history, "replaceState");
    for (let i = 0; i < 100; i++) window.dispatchEvent(new Event("scroll"));
    expect(replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(500));
    expect(replace).toHaveBeenCalledTimes(1);
    hook.unmount();
  });
  it("restores athlete, calendar mode and selected day without reopening an editor", () => {
    const hook = fixture();
    const calendar = { ...initial, client: "CL-1", tab: "Training", calendarView: "Month", date: "2026-09-30" };
    act(() => hook.result.current.setLocation(calendar));
    const saved = window.history.state;
    act(() => hook.result.current.setLocation({ ...initial, page: "Review" }));
    act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: saved })));
    expect(hook.result.current.location).toEqual(calendar);
    expect(hook.result.current.overlay).toBe(false);
  });
  it("closes a preview on Back without leaving its athlete", () => {
    const hook = fixture();
    act(() => hook.result.current.setLocation({ ...initial, client: "CL-1" }));
    const parent = window.history.state;
    act(() => hook.result.current.setOverlay(true));
    act(() => { window.history.replaceState(parent, ""); window.dispatchEvent(new PopStateEvent("popstate", { state: parent })); });
    expect(hook.result.current.overlay).toBe(false);
    expect(hook.result.current.location.client).toBe("CL-1");
  });
  it("retains a dirty editor when its leave prompt is awaiting a choice", () => {
    const hook = fixture(false);
    act(() => hook.result.current.setOverlay(true));
    act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: { nlCoachLocation: { location: initial, overlay: false } } })));
    expect(hook.result.current.overlay).toBe(true);
    expect(window.history.state.nlCoachLocation.overlay).toBe(true);
  });
  it("restores a refreshed calendar but never resurrects a discarded library editor", () => {
    window.history.replaceState({ nlCoachLocation: { location: { ...initial, page: "Workouts", libraryTab: "Program Builder" }, overlay: true } }, "");
    const hook = fixture();
    expect(hook.result.current.location.libraryTab).toBe("Saved Programs");
    expect(window.history.state.nlCoachLocation.overlay).toBe(false);
  });
});
