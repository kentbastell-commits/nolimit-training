import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/workoutComments.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

beforeEach(() => {
  invalidateCache("workoutComments");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/workoutComments", () => {
  it("rejects non-GET methods with 405", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "POST" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("returns 500 when the workout logs table is not configured", async () => {
    stubFeishuEnv({ FEISHU_WORKOUT_LOGS_TABLE_ID: "" });
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Missing workout logs table ID");
  });

  it("aggregates per-set rows into one comment and strips the [Reviewed] tag", async () => {
    stubFeishuEnv({ FEISHU_WORKOUT_LOGS_TABLE_ID: "tbl-wlog" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recL1",
                fields: {
                  "Client Comment": "Knee felt fine today\n[Reviewed]",
                  "Client ID": "CL-1001",
                  "Client Name": "Kent",
                  "Assigned Workout ID": "AW-1",
                  Date: "2026-07-01",
                  "Exercise Name": "Back Squat",
                },
              },
              {
                // Same workout+date+note (another set) -> merged, not duplicated.
                record_id: "recL2",
                fields: {
                  "Client Comment": "Knee felt fine today\n[Reviewed]",
                  "Client ID": "CL-1001",
                  "Client Name": "Kent",
                  "Assigned Workout ID": "AW-1",
                  Date: "2026-07-01",
                  "Exercise Name": "Lunge",
                },
              },
              {
                // No comment -> skipped entirely.
                record_id: "recL3",
                fields: { "Client ID": "CL-1001", Date: "2026-07-01" },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.comments).toHaveLength(1);
    const comment = res.body.comments[0];
    expect(comment.note).toBe("Knee felt fine today");
    expect(comment.reviewed).toBe(true); // inferred from the [Reviewed] tag
    expect(comment.recordIds).toEqual(["recL1", "recL2"]);
    expect(comment.exerciseNames).toEqual(["Back Squat", "Lunge"]);
    expect(comment.date).toBe("2026-07-01");
    expect(comment.clientId).toBe("CL-1001");
  });

  it("filters comments to the requested client", async () => {
    stubFeishuEnv({ FEISHU_WORKOUT_LOGS_TABLE_ID: "tbl-wlog" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recL1",
                fields: {
                  "Client Comment": "Too easy",
                  "Client ID": "CL-1001",
                  Date: "2026-07-01",
                },
              },
              {
                record_id: "recL2",
                fields: {
                  "Client Comment": "Too hard",
                  "Client ID": "CL-2002",
                  Date: "2026-07-02",
                },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ method: "GET", query: { clientId: "CL-2002" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.comments).toHaveLength(1);
    expect(res.body.comments[0].note).toBe("Too hard");
    expect(res.body.comments[0].reviewed).toBe(false);
  });
});
