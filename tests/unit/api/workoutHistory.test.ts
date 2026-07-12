import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/workoutHistory.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

beforeEach(() => {
  invalidateCache("workoutLogs");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// NOTE: workoutHistory uses api/_token.ts, whose module-level token cache
// persists across tests in this file — every test still routes the token URL
// so the first fetch (whichever test runs it) is satisfied.
const TOKEN_ROUTE = {
  match: "tenant_access_token",
  json: { code: 0, tenant_access_token: "tok", expire: 7200 },
};

const LOG_ITEMS = [
  {
    record_id: "recH1",
    fields: {
      "Client ID": "CL-1001",
      "Exercise Name": "Back Squat",
      Date: "2026-07-01",
      "Set Number": "1",
      "Actual Reps": "5",
      "Actual Weight": "100",
    },
  },
  {
    record_id: "recH2",
    fields: {
      "Client ID": "CL-1001",
      "Exercise Name": "Back Squat",
      Date: "2026-07-03",
      "Set Number": "1",
      "Actual Reps": "3",
      "Actual Weight": "110",
    },
  },
  {
    record_id: "recH3",
    fields: {
      "Client ID": "CL-2002",
      "Exercise Name": "Bench Press",
      Date: "2026-07-02",
      "Actual Reps": "8",
      "Actual Weight": "80",
    },
  },
];

describe("api/workoutHistory", () => {
  it("maps logs and aggregates per-exercise history for a client", async () => {
    stubFeishuEnv({ FEISHU_WORKOUT_LOGS_TABLE_ID: "tbl-wlog" });
    stubFetch([
      TOKEN_ROUTE,
      {
        match: "/records",
        json: { code: 0, data: { has_more: false, items: LOG_ITEMS } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ query: { clientId: "CL-1001" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    // Only the requested client's logs, newest first.
    expect(res.body.logs).toHaveLength(2);
    expect(res.body.logs[0].date).toBe("2026-07-03");
    expect(res.body.logs[0].actualWeight).toBe("110");

    expect(res.body.history).toHaveLength(1);
    const squat = res.body.history[0];
    expect(squat.exerciseName).toBe("Back Squat");
    expect(squat.totalSets).toBe(2);
    expect(squat.bestWeight).toBe(110);
    expect(squat.bestReps).toBe(5);
    expect(squat.lastDate).toBe("2026-07-03");
    expect(squat.lastWeight).toBe("110");

    expect(res.body.summary).toEqual({
      totalLogs: 2,
      uniqueExercises: 1,
      bestWeight: 110,
      bestReps: 5,
    });
  });

  it("filters by exerciseName substring", async () => {
    stubFeishuEnv({ FEISHU_WORKOUT_LOGS_TABLE_ID: "tbl-wlog" });
    stubFetch([
      TOKEN_ROUTE,
      {
        match: "/records",
        json: { code: 0, data: { has_more: false, items: LOG_ITEMS } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ query: { exerciseName: "bench" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.logs[0].exerciseName).toBe("Bench Press");
  });

  it("returns 500 when the records scan hits a Feishu error", async () => {
    // fetchAllBitableRecords throws on a Feishu error envelope (code !== 0), so
    // a throttled/failed scan surfaces as a real 500 instead of being cached as
    // an empty history for the whole TTL.
    stubFeishuEnv({ FEISHU_WORKOUT_LOGS_TABLE_ID: "tbl-wlog" });
    stubFetch([
      TOKEN_ROUTE,
      { match: "/records", json: { code: 1254607, msg: "Data not ready" } },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not fetch workout history");
    expect(res.body.message).toMatch(/code 1254607/);
  });
});
