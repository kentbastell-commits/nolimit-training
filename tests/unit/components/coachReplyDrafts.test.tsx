import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useCoachReplyDrafts, { persistReplyDrafts, readReplyDrafts } from "../../../src/useCoachReplyDrafts";

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", { get length() { return data.size; }, key: (i: number) => [...data.keys()][i],
    getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key), clear: () => data.clear() });
});
describe("coach reply recovery", () => {
  it("hydrates without erasing a saved reply, survives remount and clears after a successful send", () => {
    persistReplyDrafts("coach", "message", {}, { M1: "Breathe throughout the hold." });
    const first = renderHook(() => useCoachReplyDrafts("coach", "message"));
    expect(first.result.current[0].M1).toBe("Breathe throughout the hold.");
    expect(readReplyDrafts("coach", "message").M1).toBe("Breathe throughout the hold.");
    act(() => first.result.current[1]({ M1: "Keep even pressure through your foot." }));
    first.unmount();
    const next = renderHook(() => useCoachReplyDrafts("coach", "message"));
    expect(next.result.current[0].M1).toBe("Keep even pressure through your foot.");
    act(() => next.result.current[1]({}));
    expect(readReplyDrafts("coach", "message")).toEqual({});
  });
  it("isolates coach accounts and response types", () => {
    persistReplyDrafts("A", "message", {}, { X: "A reply" });
    persistReplyDrafts("B", "message", {}, { X: "B reply" });
    persistReplyDrafts("A", "review", {}, { X: "A note" });
    const hook = renderHook(({ owner }) => useCoachReplyDrafts(owner, "message"), { initialProps: { owner: "A" } });
    hook.rerender({ owner: "B" });
    expect(hook.result.current[0]).toEqual({ X: "B reply" });
    expect(readReplyDrafts("A", "message")).toEqual({ X: "A reply" });
    expect(readReplyDrafts("A", "review")).toEqual({ X: "A note" });
  });
  it("merges different items from two tabs but protects concurrent edits to one reply", () => {
    persistReplyDrafts("A", "message", {}, { X: "first" });
    persistReplyDrafts("A", "message", {}, { Y: "independent" });
    expect(readReplyDrafts("A", "message")).toEqual({ X: "first", Y: "independent" });
    expect(persistReplyDrafts("A", "message", {}, { X: "stale tab" }).status).toBe("conflict");
    expect(readReplyDrafts("A", "message").X).toBe("first");
  });
  it("keeps the typed reply when device storage is unavailable", () => {
    const hook = renderHook(() => useCoachReplyDrafts("A", "message"));
    vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("quota"); });
    act(() => hook.result.current[1]({ X: "Still here" }));
    expect(hook.result.current[0].X).toBe("Still here");
    expect(hook.result.current[2]).toBe("unavailable");
  });
});
