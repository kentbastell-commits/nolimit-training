import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/createClient.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/createClient", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("400s without a client name", async () => {
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { email: "x@example.com" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing client name");
  });

  it("500s when the tenant token cannot be fetched", async () => {
    stubFeishuEnv({ FEISHU_CLIENTS_TABLE_ID: "tbl-cli-cc" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 99, msg: "bad app" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { name: "Alice" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not get Lark tenant access token");
  });

  it("creates the client with defaults and echoes the ids", async () => {
    stubFeishuEnv({ FEISHU_CLIENTS_TABLE_ID: "tbl-cli-cc" });
    const impl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-cli-cc/records",
        json: { code: 0, data: { record: { record_id: "recNewC1" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientId: "CL-7777",
          name: "Alice Wong",
          email: "alice@example.com",
          clientType: "Online Coaching",
          startDate: "2026-07-07",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.clientId).toBe("CL-7777");
    expect(res.body.recordId).toBe("recNewC1");

    const createCall = impl.mock.calls.find(
      ([url, options]: any[]) =>
        String(url).includes("tbl-cli-cc/records") && options?.method === "POST"
    );
    expect(createCall).toBeTruthy();
    const sent = JSON.parse(createCall![1].body).fields;
    expect(sent["Client ID"]).toBe("CL-7777");
    expect(sent["Full Name"]).toBe("Alice Wong");
    expect(sent.Email).toBe("alice@example.com");
    expect(sent["Coach Assigned"]).toBe("Kent Bastell"); // default
    expect(sent["Package Type"]).toBe("Active"); // default
    expect(sent["Language Preference"]).toBe("English"); // default
    expect(sent["Client Type"]).toBe("Online Coaching");
    expect(sent["Start Date"]).toBe(new Date("2026-07-07T00:00:00").getTime());
  });

  it("generates a CL-xxxx id when none is provided and reports create failures", async () => {
    stubFeishuEnv({ FEISHU_CLIENTS_TABLE_ID: "tbl-cli-cc" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "tbl-cli-cc/records", json: { code: 1254040, msg: "conv fail" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { name: "Bob" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Failed to create client");
    expect(res.body.larkResponse.code).toBe(1254040);
    expect(res.body.fieldsSent["Client ID"]).toMatch(/^CL-\d{4}$/);
  });
});
