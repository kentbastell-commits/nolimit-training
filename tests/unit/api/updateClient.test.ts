import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/updateClient.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/updateClient", () => {
  it("rejects non-POST methods with 405", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("returns 400 when clientRecordId is missing", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { name: "Kent" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing clientRecordId");
  });

  it("maps body keys to Feishu columns and drops columns the base lacks", async () => {
    stubFeishuEnv({ FEISHU_CLIENTS_TABLE_ID: "tbl-cl" });
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Full Name" },
              { field_name: "Email" },
              { field_name: "Notes" },
            ],
          },
        },
      },
      { match: "/records/recC1", json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientRecordId: "recC1",
          name: "Kent Bastell",
          email: "kent@example.com",
          clientType: "Online", // "Client Type" column missing -> omitted
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.clientRecordId).toBe("recC1");
    expect(res.body.omittedFields).toContain("Client Type");

    const putCall = fetchImpl.mock.calls.find(([url]) =>
      String(url).includes("/records/recC1")
    );
    const sent = JSON.parse((putCall![1] as any).body);
    expect(sent.fields).toEqual({
      "Full Name": "Kent Bastell",
      Email: "kent@example.com",
    });
  });

  it("returns 500 with the Lark payload when the update fails", async () => {
    stubFeishuEnv({ FEISHU_CLIENTS_TABLE_ID: "tbl-cl" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: { code: 0, data: { items: [{ field_name: "Full Name" }] } },
      },
      { match: "/records/recC1", json: { code: 1254043, msg: "RecordIdNotFound" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { clientRecordId: "recC1", name: "Kent" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Failed to update client");
    expect(res.body.larkResponse.code).toBe(1254043);
  });
});
