import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/activateDigitalOrder.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubTables() {
  stubFeishuEnv({
    FEISHU_CLIENTS_TABLE_ID: "tbl-cli-ado",
    FEISHU_PRODUCT_ORDERS_TABLE_ID: "tbl-ord-ado",
    // Empty => the intake-assignment branch is skipped entirely.
    FEISHU_FORM_TEMPLATES_TABLE_ID: "",
    FEISHU_ASSIGNED_FORMS_TABLE_ID: "",
    FEISHU_BOT_WEBHOOK_URL: "",
  });
}

describe("api/activateDigitalOrder", () => {
  it("rejects non-POST with 405", async () => {
    stubTables();
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("400s when clientName, phone, or programId is missing", async () => {
    stubTables();
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { clientName: "Bob", phone: "138000" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("clientName, phone, and programId required");
  });

  it("400s before writing when the payment reference is missing", async () => {
    stubTables();
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientName: "Bob",
          phone: "138000",
          programId: "PR-1",
          privacyAccepted: true,
          crossBorderAccepted: true,
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("A valid NL payment reference is required");
  });

  it("finds the existing client by phone and writes a schema-aware order with link arrays", async () => {
    stubTables();
    const impl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        // Client search by phone finds an existing client (no create needed).
        match: "tbl-cli-ado/records",
        json: {
          code: 0,
          data: {
            items: [{ record_id: "recClient1", fields: { "Client ID": "CL-9" } }],
          },
        },
      },
      {
        match: "tbl-ord-ado/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Order ID" },
              { field_name: "Client ID" },
              { field_name: "Program ID" },
              { field_name: "Client Name" },
              { field_name: "Product Name" },
              { field_name: "Product Type" },
              { field_name: "Amount" },
              { field_name: "Currency" },
              { field_name: "Payment Status" },
              { field_name: "Payment Reference" },
              { field_name: "Fulfillment Status" },
              { field_name: "Purchased At" },
              { field_name: "Access Start Date" },
              { field_name: "Notes" },
            ],
          },
        },
      },
      {
        match: "tbl-ord-ado/records",
        json: { code: 0, data: { record: { record_id: "recOrder1" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientName: "Bob",
          phone: "138000",
          programId: "PR-1",
          programRecordId: "recProg1",
          programName: "Strength 101",
          amount: "299",
          currency: "CNY",
          paymentCode: "NL-7KQ9",
          privacyAccepted: true,
          crossBorderAccepted: true,
          consentVersion: "2026-07-12",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.clientCode).toBe("CL-9");
    expect(res.body.clientRecordId).toBe("recClient1");
    expect(res.body.orderPersisted).toBe(true);
    expect(res.body.orderIds).toHaveLength(1);
    expect(res.body.orderId).toMatch(/^ORD-\d{4}$/);
    expect(res.body.intakeAssigned).toBe(false);

    // Inspect the actual Feishu order write.
    const orderCall = impl.mock.calls.find(
      ([url, options]: any[]) =>
        String(url).includes("tbl-ord-ado/records") && options?.method === "POST"
    );
    expect(orderCall).toBeTruthy();
    const sent = JSON.parse(orderCall![1].body).fields;
    // Duplex link columns get [record_id] arrays, not code strings.
    expect(sent["Client ID"]).toEqual(["recClient1"]);
    expect(sent["Program ID"]).toEqual(["recProg1"]);
    expect(sent["Client Name"]).toBe("Bob");
    expect(sent["Product Name"]).toBe("Strength 101");
    expect(sent.Amount).toBe(299); // numeric, never ""
    expect(sent["Payment Status"]).toBe("Pending");
    expect(sent["Payment Reference"]).toBe("NL-7KQ9");
    expect(sent["Fulfillment Status"]).toBe("New Order");
    expect(sent.Notes).toContain("Privacy / Terms: accepted (2026-07-12)");

    const clientConsentCall = impl.mock.calls.find(
      ([url, options]: any[]) =>
        String(url).includes("tbl-cli-ado/records/recClient1") &&
        options?.method === "PUT"
    );
    expect(clientConsentCall).toBeTruthy();
    const clientConsent = JSON.parse(clientConsentCall![1].body).fields.Notes;
    expect(clientConsent).toContain("Mainland China / Hong Kong processing");
  });

  it("reports orderPersisted false (still 200) when the order write fails", async () => {
    stubTables();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-cli-ado/records",
        json: {
          code: 0,
          data: {
            items: [{ record_id: "recClient1", fields: { "Client ID": "CL-9" } }],
          },
        },
      },
      {
        match: "tbl-ord-ado/fields",
        json: { code: 0, data: { items: [{ field_name: "Order ID" }] } },
      },
      {
        match: "tbl-ord-ado/records",
        json: { code: 1254040, msg: "field conv fail" },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientName: "Bob",
          phone: "138000",
          programId: "PR-1",
          paymentCode: "NL-7KQ9",
          privacyAccepted: true,
          crossBorderAccepted: true,
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.orderPersisted).toBe(false);
    expect(res.body.orderIds).toHaveLength(0);
    expect(res.body.orderError).toBeTruthy();
  });

  it("400s when privacy or cross-border consent is missing", async () => {
    stubTables();
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientName: "Bob",
          phone: "138000",
          programId: "PR-1",
          paymentCode: "NL-7KQ9",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Privacy and cross-border consent required");
  });
});
