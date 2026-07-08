import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/productOrders.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  invalidateCache(""); // this handler caches "productOrders" for 10 minutes
});

// The table id is resolved at module load time, so without the env var the
// handler uses its hardcoded fallback id — match URLs on that.
const TABLE = "tbllinXYFDiUboKX";

describe("api/productOrders", () => {
  // Read-only endpoint: no method guard and no required params exist in the
  // handler, so the minimum pair here is happy path + error path.
  it("maps Feishu order rows to the portal order shape", async () => {
    stubFeishuEnv();
    const purchasedMs = Date.UTC(2026, 5, 20);
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: `${TABLE}/records`,
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "o1",
                fields: {
                  "Order ID": "ORD-1001",
                  "Client ID": "NL-0001",
                  "Client Name": "Kent",
                  Email: "kent@example.com",
                  "Phone/WeChat": "138-0000-0000",
                  "Product Type": "digital",
                  "Program ID": "PR-1001",
                  "Product Name": "Strength Base",
                  Amount: 299,
                  Currency: "CNY",
                  "Payment Status": "Paid",
                  "Purchased At": purchasedMs,
                  Status: "New",
                },
              },
              { record_id: "o2", fields: {} },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.orders).toHaveLength(2);
    const order = res.body.orders[0];
    expect(order.orderId).toBe("ORD-1001");
    expect(order.clientId).toBe("NL-0001");
    expect(order.phone).toBe("138-0000-0000");
    expect(order.amount).toBe("299");
    expect(order.paymentStatus).toBe("Paid");
    expect(order.purchasedAt).toBe(
      new Date(purchasedMs).toISOString().split("T")[0]
    );
    // Status falls through the onboarding alias chain.
    expect(order.onboardingStatus).toBe("New");
    // A row with no Order ID falls back to its record id.
    expect(res.body.orders[1].orderId).toBe("o2");
  });

  it("500 JSON error when the tenant token cannot be fetched", async () => {
    stubFeishuEnv();
    stubFetch([
      { match: "tenant_access_token", json: { code: 99991663, msg: "app secret invalid" } },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not fetch product orders");
  });
});
