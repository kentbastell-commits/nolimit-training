import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/recordLogin.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  invalidateCache("");
});

const CLIENTS_ENV = { FEISHU_CLIENTS_TABLE_ID: "tbl-cli" };
const tokenRoute = {
  match: "tenant_access_token",
  json: { code: 0, tenant_access_token: "tok" },
};

describe("api/recordLogin", () => {
  it("rejects non-POST methods with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("400 when neither clientRecordId nor clientCode is given", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: {} }) as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing clientRecordId or clientCode");
  });

  it("stamps Last Login directly when a record id is given", async () => {
    stubFeishuEnv(CLIENTS_ENV);
    const fetchImpl = stubFetch([
      tokenRoute,
      { match: "tbl-cli/records/recC", json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { clientRecordId: "recC" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, recordId: "recC" });

    const putCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "PUT" && String(url).includes("tbl-cli/records/recC")
    );
    const sent = JSON.parse(putCall![1].body).fields;
    expect(typeof sent["Last Login"]).toBe("number");
  });

  it("resolves the record by Client ID code when no record id is given", async () => {
    stubFeishuEnv(CLIENTS_ENV);
    stubFetch([
      tokenRoute,
      { match: "tbl-cli/records/recC", json: { code: 0 } },
      {
        match: "tbl-cli/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              { record_id: "recX", fields: { "Client ID": "NL-0002" } },
              { record_id: "recC", fields: { "Client ID": "NL-0007" } },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { clientCode: "NL-0007" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, recordId: "recC" });
  });

  it("404 when the client code matches no record", async () => {
    stubFeishuEnv(CLIENTS_ENV);
    stubFetch([
      tokenRoute,
      {
        match: "tbl-cli/records",
        json: { code: 0, data: { has_more: false, items: [] } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { clientCode: "NL-9999" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Client not found");
  });

  it("soft-fails with 200 success:false when the Feishu update is rejected", async () => {
    stubFeishuEnv(CLIENTS_ENV);
    stubFetch([
      tokenRoute,
      {
        match: "tbl-cli/records/recC",
        json: { code: 1254045, msg: "FieldNameNotFound" },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { clientRecordId: "recC" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.larkResponse.code).toBe(1254045);
  });
});
