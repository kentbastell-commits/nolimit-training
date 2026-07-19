import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/shiftAssignedWorkouts.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const DAY = 86400000;
const JULY_20 = new Date("2026-07-20").getTime();
const JULY_22 = new Date("2026-07-22").getTime();
const JULY_10 = new Date("2026-07-10").getTime();

function stubAssignedWorkouts() {
  // Four rows: one before fromDate, one completed, two eligible.
  return {
    match: "/records",
    json: {
      code: 0,
      data: {
        has_more: false,
        items: [
          {
            record_id: "recPast",
            fields: {
              "Client ID": "CL-0001",
              "Scheduled Date": JULY_10,
              "Completion Status": "Completed",
            },
          },
          {
            record_id: "recDone",
            fields: {
              "Client ID": "CL-0001",
              "Scheduled Date": JULY_20,
              "Completion Status": "Completed",
            },
          },
          {
            record_id: "recA",
            fields: {
              "Client ID": "CL-0001",
              "Scheduled Date": JULY_20,
              "Completion Status": "Scheduled",
            },
          },
          {
            record_id: "recOther",
            fields: {
              "Client ID": "CL-9999",
              "Scheduled Date": JULY_22,
              "Completion Status": "Scheduled",
            },
          },
        ],
      },
    },
  };
}

describe("api/shiftAssignedWorkouts", () => {
  it("rejects non-POST methods with 405", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("returns 400 when clientCode or fromDate is missing", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { days: 1 } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("Missing clientCode");
  });

  it("returns 400 for a zero, fractional, or oversized day count", async () => {
    stubFetch([]);
    for (const days of [0, 1.5, 31, -31, "abc"]) {
      const res = makeRes();
      await handler(
        makeReq({
          method: "POST",
          body: { clientCode: "CL-0001", fromDate: "2026-07-20", days },
        }) as any,
        res as any
      );
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("days must be");
    }
  });

  it("returns 400 for a malformed fromDate", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { clientCode: "CL-0001", fromDate: "20-07-2026", days: 1 },
      }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("fromDate");
  });

  it("shifts only the client's future, not-completed workouts", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw" });
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/records/recA", json: { code: 0 } },
      stubAssignedWorkouts(),
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { clientCode: "CL-0001", fromDate: "2026-07-20", days: 2 },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.updated).toBe(1);

    const putCalls = fetchImpl.mock.calls.filter(
      ([, init]) => (init as any)?.method === "PUT"
    );
    expect(putCalls.length).toBe(1);
    expect(String(putCalls[0][0])).toContain("/records/recA");
    const sent = JSON.parse((putCalls[0][1] as any).body);
    expect(sent.fields["Scheduled Date"]).toBe(JULY_20 + 2 * DAY);
  });

  it("includes completed workouts when includeCompleted is set", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw" });
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/records/recDone", json: { code: 0 } },
      { match: "/records/recA", json: { code: 0 } },
      stubAssignedWorkouts(),
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientCode: "CL-0001",
          fromDate: "2026-07-20",
          days: -1,
          includeCompleted: true,
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.updated).toBe(2);
    const putCalls = fetchImpl.mock.calls.filter(
      ([, init]) => (init as any)?.method === "PUT"
    );
    expect(putCalls.length).toBe(2);
  });

  it("reports a partial failure with a 500 and counts", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/records/recA", json: { code: 1254607, msg: "Data not ready" } },
      stubAssignedWorkouts(),
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { clientCode: "CL-0001", fromDate: "2026-07-20", days: 3 },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.failed).toBe(1);
  });
});
