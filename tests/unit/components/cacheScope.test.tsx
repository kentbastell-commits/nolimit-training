import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAthleteCachedReads, persistentCacheStorageKey } from "../../../src/cacheScope";

beforeEach(() => {
  const storage: Record<string, any> = {};
  Object.defineProperties(storage, {
    setItem: { value: (key: string, value: string) => { storage[key] = value; } },
    getItem: { value: (key: string) => Object.hasOwn(storage, key) ? storage[key] : null },
    removeItem: { value: (key: string) => { delete storage[key]; } },
    clear: { value: () => { for (const key of Object.keys(storage)) delete storage[key]; } },
    length: { get: () => Object.keys(storage).length },
  });
  vi.stubGlobal("localStorage", storage);
});
afterEach(() => { localStorage.clear(); window.history.replaceState(null, "", "/"); vi.unstubAllGlobals(); });
describe("private browser cache scopes", () => {
  it("cannot reuse coach or another athlete's cached response on a different route", () => {
    const routes = ["?view=coach", "", "?portal=client&client=CL-1", "?portal=client&client=CL-2", "?portal=client&client=CL-1&preview=coach"];
    for (const [i, route] of routes.entries()) {
      window.history.replaceState(null, "", "/" + route);
      localStorage.setItem(persistentCacheStorageKey("orders"), String(i));
    }
    expect(localStorage.length).toBe(5);
    for (const [i, route] of routes.entries()) {
      window.history.replaceState(null, "", "/" + route);
      expect(localStorage.getItem(persistentCacheStorageKey("orders"))).toBe(String(i));
    }
  });
  it("clears only the signed-out athlete's cached reads and preserves drafts and other accounts", () => {
    const own = persistentCacheStorageKey("profile", "?portal=client&client=CL-1");
    const other = persistentCacheStorageKey("profile", "?portal=client&client=CL-2");
    localStorage.setItem(own, "private"); localStorage.setItem(other, "other");
    localStorage.setItem("workout-draft:CL-1", "unsynced work");
    clearAthleteCachedReads("CL-1");
    expect(localStorage.getItem(own)).toBeNull(); expect(localStorage.getItem(other)).toBe("other");
    expect(localStorage.getItem("workout-draft:CL-1")).toBe("unsynced work");
  });
});
