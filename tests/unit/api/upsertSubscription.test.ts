import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/upsertSubscription.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/upsertSubscription", () => {
  it("rejects non-POST methods with 405", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("returns 500 when the subscriptions table is not configured", async () => {
    stubFeishuEnv({ FEISHU_SUBSCRIPTIONS_TABLE_ID: "" });
    stubFetch([]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { clientRecordId: "recCli1" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Subscriptions table not configured");
  });

  it("returns 400 when neither recordId nor clientRecordId is given", async () => {
    stubFeishuEnv({ FEISHU_SUBSCRIPTIONS_TABLE_ID: "tbl-subs" });
    stubFetch([]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { plan: "Monthly" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing client");
  });

  it("creates a subscription: Client ID as link array, Price as number, dates as ms", async () => {
    stubFeishuEnv({ FEISHU_SUBSCRIPTIONS_TABLE_ID: "tbl-subs" });
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Subscription ID" },
              { field_name: "Client ID" },
              { field_name: "Plan" },
              { field_name: "Price" },
              { field_name: "Start Date" },
              { field_name: "Status" },
            ],
          },
        },
      },
      {
        match: "/records",
        json: { code: 0, data: { record: { record_id: "recSubNew" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientRecordId: "recCli1",
          plan: "Monthly Coaching",
          price: "399",
          startDate: "2026-07-01",
          status: "Active",
          notes: "vip", // no Notes column -> omitted
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recordId).toBe("recSubNew");
    expect(res.body.omittedFields).toContain("Notes");

    const createCall = fetchImpl.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith("/records") && (init as any)?.method === "POST" &&
        !String(url).includes("tenant_access_token")
    );
    const sent = JSON.parse((createCall![1] as any).body);
    // DuplexLink column needs a [record_id] array, not a code string.
    expect(sent.fields["Client ID"]).toEqual(["recCli1"]);
    expect(sent.fields.Plan).toBe("Monthly Coaching");
    expect(sent.fields.Price).toBe(399);
    expect(sent.fields["Start Date"]).toBe(new Date("2026-07-01").getTime());
    expect(sent.fields["Subscription ID"]).toMatch(/^SUB-\d{6}$/);
  });

  it("returns 500 with the Lark payload when the write fails", async () => {
    stubFeishuEnv({ FEISHU_SUBSCRIPTIONS_TABLE_ID: "tbl-subs" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: { code: 0, data: { items: [{ field_name: "Plan" }] } },
      },
      { match: "/records", json: { code: 1254001, msg: "FieldConvFail" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { clientRecordId: "recCli1", plan: "Monthly" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Failed to create subscription");
    expect(res.body.larkResponse.code).toBe(1254001);
  });
});
