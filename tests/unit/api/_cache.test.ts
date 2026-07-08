import { describe, expect, it } from "vitest";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

// Module-level Map shared across tests in this file — every test uses its own
// unique key prefix so nothing leaks between assertions.
describe("api/_cache", () => {
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
