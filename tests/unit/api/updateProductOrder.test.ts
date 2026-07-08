import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/updateProductOrder.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

// NOTE: PRODUCT_ORDERS_TABLE_ID is captured at module import time, so tests
// match generic URL fragments (/fields, /records/…) rather than a table id.

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/updateProductOrder", () => {
  it("rejects non-POST methods with 405", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("returns 400 when recordId is missing", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { paymentStatus: "Paid" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing product order recordId");
  });

  it("resolves columns by alias, sends link fields as record-id arrays", async () => {
    stubFeishuEnv();
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Client ID", type: 21, ui_type: "DuplexLink" },
              { field_name: "Client Name", type: 1 },
              { field_name: "Payment Status", type: 3 },
            ],
          },
        },
      },
      { match: "/records/recPO1", json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          recordId: "recPO1",
          clientRecordId: "recCli1",
          clientCode: "CL-1001",
          clientName: "Kent",
          paymentStatus: "Paid",
          notes: "manual fulfil", // no Notes column -> omitted
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.omittedFields).toContain("Notes");

    const putCall = fetchImpl.mock.calls.find(([url]) =>
      String(url).includes("/records/recPO1")
    );
    const sent = JSON.parse((putCall![1] as any).body);
    // DuplexLink column gets the [record_id] array, not the client code string.
    expect(sent.fields["Client ID"]).toEqual(["recCli1"]);
    expect(sent.fields["Client Name"]).toBe("Kent");
    expect(sent.fields["Payment Status"]).toBe("Paid");
  });

  it("returns 400 when nothing maps to an existing column", async () => {
    stubFeishuEnv();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: { code: 0, data: { items: [{ field_name: "Unrelated" }] } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { recordId: "recPO1", notes: "hello" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("No matching product order columns found");
    expect(res.body.omittedFields).toContain("Notes");
  });

  it("returns 500 with the Lark payload when the update fails", async () => {
    stubFeishuEnv();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: { code: 0, data: { items: [{ field_name: "Payment Status" }] } },
      },
      { match: "/records/recPO1", json: { code: 1254043, msg: "RecordIdNotFound" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { recordId: "recPO1", paymentStatus: "Paid" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Failed to update product order");
    expect(res.body.larkResponse.code).toBe(1254043);
  });
});
