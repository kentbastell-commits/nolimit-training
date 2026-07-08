import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/findMyPortal.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const searchRoute = (items: any[]) => ({
  match: "tbl-cli/records",
  json: { code: 0, data: { items } },
});

describe("api/findMyPortal", () => {
  it("rejects non-POST methods with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("400 when phone or name is missing", async () => {
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { phone: "13800000000" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("phone and name required");
  });

  it("500 when the server is not configured", async () => {
    vi.stubEnv("FEISHU_BASE_APP_TOKEN", "");
    vi.stubEnv("FEISHU_CLIENTS_TABLE_ID", "");
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { phone: "13800000000", name: "Kent" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Server not configured");
  });

  it("returns the client code when phone matches and the name fuzzy-matches", async () => {
    stubFeishuEnv({ FEISHU_CLIENTS_TABLE_ID: "tbl-cli" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      searchRoute([
        {
          record_id: "recC",
          fields: {
            "Full Name": "Kent Bastell",
            "Full Name CN": "肯特",
            "Client ID": "NL-0001",
          },
        },
      ]),
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { phone: "13800000000", name: "kent bastell" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, clientCode: "NL-0001" });
  });

  it("404 (generic message) when the name does not match the phone's record", async () => {
    stubFeishuEnv({ FEISHU_CLIENTS_TABLE_ID: "tbl-cli" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      searchRoute([
        {
          record_id: "recC",
          fields: { "Full Name": "Somebody Else", "Client ID": "NL-0002" },
        },
      ]),
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { phone: "13800000000", name: "Kent Bastell" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("No portal found for that phone and name");
    expect(res.body.clientCode).toBeUndefined(); // never leaks the code
  });
});
