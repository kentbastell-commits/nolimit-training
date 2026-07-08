import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/subscriptions.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

beforeEach(() => {
  // Module-level shared cache — clear so each test scripts its own Feishu data.
  invalidateCache("subscriptions");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/subscriptions", () => {
  it("returns an empty list when the subscriptions table is not configured", async () => {
    stubFeishuEnv({ FEISHU_SUBSCRIPTIONS_TABLE_ID: "" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ subscriptions: [] });
  });

  it("maps Feishu rows and drops empty placeholder rows", async () => {
    stubFeishuEnv({ FEISHU_SUBSCRIPTIONS_TABLE_ID: "tbl-subs" });
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
                record_id: "recSub1",
                fields: {
                  "Subscription ID": "SUB-100001",
                  "Client ID": [{ record_ids: ["recCli1"] }],
                  Plan: "Monthly Coaching",
                  Price: "399",
                  Currency: "CNY",
                  "Billing Cycle": "Monthly",
                  "Start Date": "2026-07-01",
                  Status: "Active",
                  "Auto Renew": true,
                },
              },
              // Placeholder row Feishu seeds on table create — must be dropped.
              { record_id: "recEmpty", fields: {} },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.subscriptions).toHaveLength(1);
    const sub = res.body.subscriptions[0];
    expect(sub.id).toBe("recSub1");
    expect(sub.subscriptionId).toBe("SUB-100001");
    expect(sub.clientRecordIds).toEqual(["recCli1"]);
    expect(sub.plan).toBe("Monthly Coaching");
    expect(sub.price).toBe(399);
    expect(sub.currency).toBe("CNY");
    expect(sub.startDate).toBe("2026-07-01");
    expect(sub.autoRenew).toBe(true);
    expect(sub.status).toBe("Active");
  });

  it("returns a 500 JSON error when the Feishu fetch blows up", async () => {
    stubFeishuEnv({ FEISHU_SUBSCRIPTIONS_TABLE_ID: "tbl-subs" });
    // No routes at all: the token fetch itself rejects.
    stubFetch([]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not fetch subscriptions");
    expect(typeof res.body.message).toBe("string");
  });
});
