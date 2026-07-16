import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/workouts.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { resetTokenCacheForTests } from "../../../api/_token.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

beforeEach(() => {
  invalidateCache("workouts");
  // The repository path shares api/_token.ts's ~2h token cache; reset it so
  // the token-failure test actually exercises a token fetch.
  resetTokenCacheForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const WORKOUT_ITEMS = [
  {
    record_id: "recAW1",
    fields: {
      "Assigned Workout ID": "AW-1",
      "Client ID": "CL-1001",
      "Program ID": "P1",
      Week: "1",
      Day: "1",
      "Session Name": "Lower Strength",
      "Completion Status": "Completed",
      "Session RPE": "8",
      "Coach Reviewed": "Reviewed",
    },
  },
  {
    record_id: "recAW2",
    fields: {
      "Assigned Workout ID": "AW-2",
      "Client ID": "CL-2002",
      "Session Name": "Upper Strength",
      "Coach Reviewed": "",
    },
  },
];

describe("api/workouts", () => {
  it("maps assigned workouts, parsing Coach Reviewed into a boolean", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/records",
        json: { code: 0, data: { has_more: false, items: WORKOUT_ITEMS } },
      },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.workouts).toHaveLength(2);
    const first = res.body.workouts[0];
    expect(first.id).toBe("recAW1");
    expect(first.assignedWorkoutId).toBe("AW-1");
    expect(first.clientId).toBe("CL-1001");
    expect(first.sessionName).toBe("Lower Strength");
    expect(first.completionStatus).toBe("Completed");
    expect(first.sessionRpe).toBe("8");
    expect(first.coachReviewed).toBe(true); // "Reviewed" text -> true
    expect(res.body.workouts[1].coachReviewed).toBe(false);
  });

  it("filters by clientCode", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/records",
        json: { code: 0, data: { has_more: false, items: WORKOUT_ITEMS } },
      },
    ]);

    const res = makeRes();
    await handler(makeReq({ query: { clientCode: "CL-2002" } }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.workouts).toHaveLength(1);
    expect(res.body.workouts[0].assignedWorkoutId).toBe("AW-2");
  });

  it("returns 500 when the token response has no tenant token", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw" });
    stubFetch([{ match: "tenant_access_token", json: { code: 99991663 } }]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not get tenant access token");
  });

  it("returns 500 when the records scan fails outright", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/records", json: { code: 1254607, msg: "Data not ready" } },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not fetch assigned workouts");
  });
});
