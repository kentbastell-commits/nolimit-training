import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/createProductOrder.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// NOTE: createProductOrder.ts resolves its table id at import time (module
// const with fallback "tbllinXYFDiUboKX"), so routes match on path suffixes.
describe("api/createProductOrder", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("400s without a client name", async () => {
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { productName: "Strength 101" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing client name");
  });

  it("400s without a product or program", async () => {
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { clientName: "Alice" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing product or program");
  });

  it("writes only columns that exist and reports the omitted ones", async () => {
    stubFeishuEnv();
    const impl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Order ID" },
              { field_name: "Client Name" },
              { field_name: "Product Name" },
              { field_name: "Amount" },
              { field_name: "Currency" },
              { field_name: "Payment Status" },
              // No "Payment Provider" column => that value must be omitted.
            ],
          },
        },
      },
      {
        match: "/records",
        json: { code: 0, data: { record: { record_id: "recOrd1" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          orderId: "ORD-TEST-1",
          clientName: "Alice",
          productName: "Strength 101",
          amount: 299,
          paymentStatus: "Paid",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orderId).toBe("ORD-TEST-1");
    expect(res.body.recordId).toBe("recOrd1");
    // "Payment Provider" (default WeChat QR) had no matching column.
    expect(res.body.omittedFields).toContain("Payment Provider");

    const createCall = impl.mock.calls.find(
      ([url, options]: any[]) =>
        String(url).includes("/records") && options?.method === "POST"
    );
    expect(createCall).toBeTruthy();
    const sent = JSON.parse(createCall![1].body).fields;
    expect(sent["Order ID"]).toBe("ORD-TEST-1");
    expect(sent["Client Name"]).toBe("Alice");
    expect(sent["Product Name"]).toBe("Strength 101");
    expect(sent.Amount).toBe(299);
    expect(sent.Currency).toBe("CNY"); // default
    expect(sent["Payment Status"]).toBe("Paid");
    expect(sent).not.toHaveProperty("Payment Provider");
  });

  it("500s with the Lark response when the create is rejected", async () => {
    stubFeishuEnv();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: { code: 0, data: { items: [{ field_name: "Client Name" }] } },
      },
      { match: "/records", json: { code: 1254040, msg: "conv fail" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { clientName: "Alice", programId: "PR-1" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Failed to create product order");
    expect(res.body.larkResponse.code).toBe(1254040);
  });
});
