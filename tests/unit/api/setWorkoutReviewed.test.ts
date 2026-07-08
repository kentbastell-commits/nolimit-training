import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/setWorkoutReviewed.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/setWorkoutReviewed", () => {
  it("rejects non-POST methods with 405", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("returns 400 when assignedWorkoutRecordId is missing", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { reviewed: true } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing assignedWorkoutRecordId");
  });

  it("writes Coach Reviewed as a checkbox boolean and returns success", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw" });
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/records/recAW9", json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { assignedWorkoutRecordId: "recAW9", reviewed: true },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });

    const putCalls = fetchImpl.mock.calls.filter(([url]) =>
      String(url).includes("/records/recAW9")
    );
    // First (boolean) attempt succeeds, so no text fallback PUT is sent.
    expect(putCalls).toHaveLength(1);
    const sent = JSON.parse((putCalls[0][1] as any).body);
    expect(sent.fields["Coach Reviewed"]).toBe(true);
  });

  it("returns 500 when both checkbox and text writes fail", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw" });
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/records/recAW9", json: { code: 1254001, msg: "FieldConvFail" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { assignedWorkoutRecordId: "recAW9", reviewed: true },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not update review flag");
    // Falls back to the text write before giving up.
    const putCalls = fetchImpl.mock.calls.filter(([url]) =>
      String(url).includes("/records/recAW9")
    );
    expect(putCalls).toHaveLength(2);
    expect(JSON.parse((putCalls[1][1] as any).body).fields["Coach Reviewed"]).toBe(
      "Reviewed"
    );
  });
});
