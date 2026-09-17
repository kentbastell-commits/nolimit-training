import { describe, expect, it } from "vitest";
import { getCached, getCachedOrLoad, setCached, invalidateCache } from "../../../api/_cache.ts";

// Module-level Map shared across tests in this file — every test uses its own
// unique key prefix so nothing leaks between assertions.
describe("api/_cache", () => {
  it("coalesces simultaneous cold reads", async () => {
    let loads = 0;
    const values = await Promise.all(Array.from({ length: 100 }, () =>
      getCachedOrLoad("unittest-coalesced", 60_000, async () => { loads++; return 42; })));
    expect(loads).toBe(1);
    expect(values.every((v) => v === 42)).toBe(true);
  });

  it("does not cache an old read that completes after a write invalidates it", async () => {
    let release!: (value: number) => void;
    const old = getCachedOrLoad("unittest-race", 60_000, () => new Promise<number>((resolve) => { release = resolve; }));
    await Promise.resolve();
    invalidateCache("unittest-race");
    expect(await getCachedOrLoad("unittest-race", 60_000, async () => 2)).toBe(2);
    release(1);
    expect(await old).toBe(1);
    expect(getCached("unittest-race")).toBe(2);
  });

  it("stores and returns a value within its TTL", () => {
    setCached("unittest-cache-basic", { a: 1 }, 60_000);
    expect(getCached("unittest-cache-basic")).toEqual({ a: 1 });
  });

  it("returns null (and drops the entry) once the TTL has passed", () => {
    setCached("unittest-cache-expired", "stale", -1);
    expect(getCached("unittest-cache-expired")).toBeNull();
    // A second read is still null (entry was deleted, not resurrected).
    expect(getCached("unittest-cache-expired")).toBeNull();
  });

  it("returns null for a key that was never set", () => {
    expect(getCached("unittest-cache-missing")).toBeNull();
  });

  it("never caches an empty array (transient-failure guard)", () => {
    setCached("unittest-cache-emptylist", [], 60_000);
    expect(getCached("unittest-cache-emptylist")).toBeNull();
  });

  it("does cache a non-empty array", () => {
    setCached("unittest-cache-list", [1, 2], 60_000);
    expect(getCached("unittest-cache-list")).toEqual([1, 2]);
  });

  it("invalidateCache removes only keys with the given prefix", () => {
    setCached("unittest-inv-a", 1, 60_000);
    setCached("unittest-inv-b", 2, 60_000);
    setCached("unittest-other-c", 3, 60_000);

    invalidateCache("unittest-inv");

    expect(getCached("unittest-inv-a")).toBeNull();
    expect(getCached("unittest-inv-b")).toBeNull();
    expect(getCached("unittest-other-c")).toBe(3);
  });
});
