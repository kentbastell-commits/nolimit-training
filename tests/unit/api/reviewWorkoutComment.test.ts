import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/reviewWorkoutComment.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  invalidateCache("");
});

const LOGS_ENV = { FEISHU_WORKOUT_LOGS_TABLE_ID: "tbl-logs" };
const tokenRoute = {
  match: "tenant_access_token",
  json: { code: 0, tenant_access_token: "tok" },
};

describe("api/reviewWorkoutComment", () => {
  it("rejects non-POST methods with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("500 when the workout logs table is not configured", async () => {
    vi.stubEnv("FEISHU_WORKOUT_LOGS_TABLE_ID", "");
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { recordIds: ["rec1"] } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Missing workout logs table ID");
  });

  it("400 when recordIds is missing or empty", async () => {
    stubFeishuEnv(LOGS_ENV);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { recordIds: [] } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing recordIds");
  });

  it("sets the Coach Reviewed checkbox on each record", async () => {
    stubFeishuEnv(LOGS_ENV);
    const fetchImpl = stubFetch([
      tokenRoute,
      {
        match: "tbl-logs/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Coach Reviewed" },
              { field_name: "Client Comment" },
            ],
          },
        },
      },
      { match: "tbl-logs/records/rec1", json: { code: 0 } },
      { match: "tbl-logs/records/rec2", json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { recordIds: ["rec1", "rec2"] } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, recordsUpdated: 2 });

    const putCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "PUT" && String(url).includes("tbl-logs/records/rec1")
    );
    expect(JSON.parse(putCall![1].body).fields).toEqual({
      "Coach Reviewed": true,
    });
  });

  it("falls back to appending [Reviewed] to the notes field when no review column exists", async () => {
    stubFeishuEnv(LOGS_ENV);
    const fetchImpl = stubFetch([
      tokenRoute,
      {
        match: "tbl-logs/fields",
        json: { code: 0, data: { items: [{ field_name: "Client Comment" }] } },
      },
      {
        match: "tbl-logs/records/rec1",
        json: {
          code: 0,
          data: { record: { fields: { "Client Comment": "Felt heavy today" } } },
        },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { recordIds: ["rec1"] } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const putCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "PUT" && String(url).includes("tbl-logs/records/rec1")
    );
    expect(JSON.parse(putCall![1].body).fields["Client Comment"]).toBe(
      "Felt heavy today\n[Reviewed]"
    );
  });

  it("500 when a Feishu update fails", async () => {
    stubFeishuEnv(LOGS_ENV);
    stubFetch([
      tokenRoute,
      {
        match: "tbl-logs/fields",
        json: { code: 0, data: { items: [{ field_name: "Coach Reviewed" }] } },
      },
      { match: "tbl-logs/records/rec1", json: { code: 1254005, msg: "not found" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { recordIds: ["rec1"] } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not mark workout comment reviewed");
  });
});
