import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/deleteRecord.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  invalidateCache(""); // clear the shared module-level cache between tests
});

describe("api/deleteRecord", () => {
  it("rejects non-POST/DELETE methods with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("400 when resource or recordId is missing", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: {} }) as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing resource or recordId");
  });

  it("400 for an unsupported resource", async () => {
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { resource: "banana", recordId: "rec1" },
      }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Unsupported delete resource");
  });

  it("deletes an exercise record via the Feishu DELETE endpoint", async () => {
    stubFeishuEnv({ FEISHU_EXERCISE_LIBRARY_TABLE_ID: "tbl-ex" });
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "tbl-ex/records/rec1", json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "DELETE",
        body: { resource: "exercise", recordId: "rec1" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.resource).toBe("exercise");
    expect(res.body.recordId).toBe("rec1");

    const deleteCall = fetchImpl.mock.calls.find(([url]: any[]) =>
      String(url).includes("tbl-ex/records/rec1")
    );
    expect(deleteCall?.[1]?.method).toBe("DELETE");
  });

  it("deleting a client runs the cascade (empty when no cascade tables configured)", async () => {
    stubFeishuEnv({ FEISHU_CLIENTS_TABLE_ID: "tbl-cli" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "tbl-cli/records/recC", json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { resource: "client", recordId: "recC", clientCode: "NL-0001" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cascade).toEqual({});
  });

  it("500 with the Lark response when Feishu rejects the delete", async () => {
    stubFeishuEnv({ FEISHU_EXERCISE_LIBRARY_TABLE_ID: "tbl-ex" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "tbl-ex/records/rec1", json: { code: 1254005, msg: "RecordIdNotFound" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { resource: "exercise", recordId: "rec1" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Failed to delete record");
    expect(res.body.larkResponse.code).toBe(1254005);
  });
});
