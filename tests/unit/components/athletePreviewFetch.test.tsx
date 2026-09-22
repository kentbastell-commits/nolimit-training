import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalFetch = window.fetch;
const originalStorage = Object.getOwnPropertyDescriptor(window, "localStorage");
let network: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetModules();
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    clear: () => values.clear(),
  } });
  network = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
  window.fetch = network as typeof fetch;
  window.localStorage.setItem("nl_coach_key", "test-coach-key");
});
afterEach(() => {
  window.fetch = originalFetch;
  window.history.replaceState(null, "", "/");
  window.localStorage.clear();
  if (originalStorage) Object.defineProperty(window, "localStorage", originalStorage);
});

describe("athlete preview requests", () => {
  it("keeps preview profiles separate from the coach roster and other athletes", async () => {
    const { CACHE_KEYS, readPersistentCache, writePersistentCache } = await import("../../../src/appCore");
    writePersistentCache(CACHE_KEYS.clients, [{ clientCode: "CL-1" }, { clientCode: "CL-2" }]);
    writePersistentCache(CACHE_KEYS.portalClient("CL-1"), [{ clientCode: "CL-1", clientType: "Coaching" }]);
    expect(readPersistentCache<any[]>(CACHE_KEYS.clients)?.data).toHaveLength(2);
    expect(readPersistentCache<any[]>(CACHE_KEYS.portalClient("CL-1"))?.data[0].clientType).toBe("Coaching");
    expect(readPersistentCache(CACHE_KEYS.portalClient("CL-2"))).toBeNull();
  });
  it("stops relative and absolute API writes before they reach the network", async () => {
    window.history.replaceState(null, "", "/?portal=client&preview=coach");
    await import("../../../src/appCore");
    expect((await window.fetch("/api/updateClient", { method: "POST" })).status).toBe(403);
    expect((await window.fetch(new Request(`${location.origin}/api/submitWorkout`, { method: "POST" }))).status).toBe(403);
    expect((await window.fetch(new URL("/api/updateProgram", location.origin), { method: "PATCH" })).status).toBe(403);
    expect(network).not.toHaveBeenCalled();
  });
  it("loads the athlete view without attaching the stored coach key", async () => {
    window.history.replaceState(null, "", "/?portal=client&preview=coach");
    await import("../../../src/appCore");
    await window.fetch("/api/workoutDetails?clientCode=CL-1");
    expect(network).toHaveBeenCalledWith("/api/workoutDetails?clientCode=CL-1", undefined);
  });
  it("keeps normal coach writes and authentication working", async () => {
    window.history.replaceState(null, "", "/?view=coach");
    await import("../../../src/appCore");
    await window.fetch("/api/updateProgram", { method: "POST", body: "{}" });
    expect(network).toHaveBeenCalledOnce();
    expect(network.mock.calls[0][1].headers.get("x-coach-key")).toBe("test-coach-key");
    expect(network.mock.calls[0][1].method).toBe("POST");
  });
});
