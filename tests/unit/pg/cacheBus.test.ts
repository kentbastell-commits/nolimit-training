// The cross-process cache invalidation bus (named mistake #5's 2-fork gap):
// a write's invalidateCache on fork A must drop the same prefix on fork B.
// Runs against the real local Postgres — LISTEN/NOTIFY is exactly the
// production transport, this process just plays both forks.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  getCached,
  setCached,
  invalidateCache,
  invalidateCacheLocal,
  setCacheBroadcaster,
} from "../../../api/_cache.ts";
import { startCacheBus, stopCacheBus } from "../../../server/db/cacheBus.ts";
import { closeDb } from "./helpers.ts";

const waitFor = async (check: () => boolean, timeoutMs = 4000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((r) => setTimeout(r, 50));
  }
  return true;
};

beforeEach(() => {
  invalidateCacheLocal("");
});

afterAll(async () => {
  await stopCacheBus();
  setCacheBroadcaster(() => {});
  await closeDb();
});

describe("cache bus (postgres LISTEN/NOTIFY)", () => {
  it("a remote NOTIFY drops the prefix locally", async () => {
    await startCacheBus();
    setCached("clients-list", [{ id: 1 }], 60_000);
    expect(getCached("clients-list")).not.toBeNull();

    // Simulate the SIBLING fork's broadcast: same channel, different sender.
    const { pool } = await import("../../../server/db/client.ts");
    await pool.query("select pg_notify($1, $2)", [
      "cache_invalidation",
      JSON.stringify({ sender: "other-fork", prefix: "clients" }),
    ]);

    expect(await waitFor(() => getCached("clients-list") === null)).toBe(true);
  });

  it("invalidateCache publishes so a second listener hears it", async () => {
    await startCacheBus();
    // Second subscription = the sibling fork's listener.
    const { Client } = await import("pg");
    const sibling = new Client({ connectionString: process.env.DATABASE_URL });
    const heard: string[] = [];
    sibling.on("notification", (msg) => {
      if (msg.payload) heard.push(msg.payload);
    });
    await sibling.connect();
    await sibling.query("LISTEN cache_invalidation");

    setCached("workouts-all", [{ id: 1 }], 60_000);
    invalidateCache("workouts");

    const ok = await waitFor(() =>
      heard.some((p) => JSON.parse(p).prefix === "workouts")
    );
    await sibling.end();
    expect(ok).toBe(true);
    // And the local copy went synchronously, as before.
    expect(getCached("workouts-all")).toBeNull();
  });

  it("keeps working locally when the bus is not started", () => {
    setCacheBroadcaster(() => {
      throw new Error("bus down");
    });
    setCached("teams-list", [{ id: 1 }], 60_000);
    // A broken broadcaster must never fail the write path.
    expect(() => invalidateCache("teams")).not.toThrow();
    expect(getCached("teams-list")).toBeNull();
    setCacheBroadcaster(() => {});
  });
});
