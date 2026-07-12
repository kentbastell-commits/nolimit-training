import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/autoLoadProgram.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubTables() {
  stubFeishuEnv({
    FEISHU_CLIENTS_TABLE_ID: "tbl-cli-alp",
    FEISHU_PRODUCT_ORDERS_TABLE_ID: "tbl-ord-alp",
    FEISHU_PROGRAMS_TABLE_ID: "tbl-prog-alp",
    FEISHU_WORKOUT_TEMPLATES_TABLE_ID: "tbl-tmpl-alp",
    FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw-alp",
    FEISHU_BOT_WEBHOOK_URL: "",
  });
}

const tokenRoute = {
  match: "tenant_access_token",
  json: { code: 0, tenant_access_token: "tok" },
};

// Replicates the handler's addDays: local-midnight date shifted by N days and
// read back through toISOString (UTC), so the expected calendar day matches
// the handler in every test-runner timezone.
function handlerAddDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const clientRoute = {
  match: "tbl-cli-alp/records/recClient1",
  json: {
    code: 0,
    data: { record: { fields: { "Client ID": "CL-9", Name: "Bob" } } },
  },
};

describe("api/autoLoadProgram", () => {
  it("rejects non-POST with 405", async () => {
    stubTables();
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("400s without a clientRecordId", async () => {
    stubTables();
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: {} }) as any, res as any);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("clientRecordId required");
  });

  it("404s when the client record has no Client ID", async () => {
    stubTables();
    stubFetch([
      tokenRoute,
      {
        match: "tbl-cli-alp/records/recClient1",
        json: { code: 0, data: { record: { fields: {} } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { clientRecordId: "recClient1" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Client not found");
  });

  it("returns alreadyLoaded when every order is fulfilled", async () => {
    stubTables();
    stubFetch([
      tokenRoute,
      clientRoute,
      {
        match: "tbl-ord-alp/records",
        json: {
          code: 0,
          data: {
            items: [
              {
                record_id: "recOrder1",
                fields: {
                  "Client ID": "CL-9",
                  "Fulfillment Status": "Program Loaded",
                  "Program ID": "PR-1",
                },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { clientRecordId: "recClient1" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.alreadyLoaded).toBe(true);
  });

  it("loads a pending order end-to-end: schedules workouts and marks the order fulfilled", async () => {
    stubTables();
    const impl = stubFetch([
      tokenRoute,
      clientRoute,
      // Specific order-update route before the generic orders list route.
      { match: "tbl-ord-alp/records/recOrder1", json: { code: 0, data: {} } },
      {
        match: "tbl-ord-alp/records",
        json: {
          code: 0,
          data: {
            items: [
              {
                record_id: "recOrder1",
                fields: {
                  "Client ID": "CL-9",
                  "Client Name": "Bob",
                  "Fulfillment Status": "New Order",
                  "Payment Status": "Paid",
                  "Program ID": "PR-1",
                  "Product Name": "Strength 101",
                },
              },
            ],
          },
        },
      },
      {
        match: "tbl-prog-alp/records",
        json: {
          code: 0,
          data: {
            items: [
              {
                record_id: "recProg1",
                fields: {
                  "Program ID": "PR-1",
                  "Program Name": "Strength 101",
                  "Access Length Days": 28,
                },
              },
            ],
          },
        },
      },
      {
        match: "tbl-tmpl-alp/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recT1",
                fields: {
                  "Program ID": "PR-1",
                  Week: 1,
                  Day: 1,
                  "Session Name": "Day 1",
                  "Session Type": "Strength",
                },
              },
            ],
          },
        },
      },
      {
        match: "tbl-aw-alp/records/batch_create",
        json: { code: 0, data: { records: [{ record_id: "recAW1" }] } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { clientRecordId: "recClient1", startDate: "2026-07-07" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.programsLoaded).toEqual(["Strength 101"]);
    expect(res.body.workoutsCreated).toBe(1);
    expect(res.body.orderStatusUpdated).toBe(true);
    expect(res.body.startDate).toBe("2026-07-07");

    // The created workout links the client + program and starts on startDate.
    const batchCall = impl.mock.calls.find(([url]: any[]) =>
      String(url).includes("tbl-aw-alp/records/batch_create")
    );
    expect(batchCall).toBeTruthy();
    const { records } = JSON.parse(batchCall![1].body);
    expect(records).toHaveLength(1);
    expect(records[0].fields["Client ID"]).toEqual(["recClient1"]);
    expect(records[0].fields["Program ID"]).toEqual(["recProg1"]);
    expect(records[0].fields["Completion Status"]).toBe("Scheduled");
    expect(records[0].fields["Scheduled Date"]).toBe(
      new Date(`${handlerAddDays("2026-07-07", 0)}T00:00:00`).getTime()
    );

    // The order was flipped to Program Loaded (dedup guard).
    const orderUpdateCall = impl.mock.calls.find(
      ([url, options]: any[]) =>
        String(url).includes("tbl-ord-alp/records/recOrder1") &&
        options?.method === "PUT"
    );
    expect(orderUpdateCall).toBeTruthy();
    expect(JSON.parse(orderUpdateCall![1].body).fields["Fulfillment Status"]).toBe(
      "Program Loaded"
    );

    // The client got Program + access window (28 days => end = start + 27).
    const clientUpdateCall = impl.mock.calls.find(
      ([url, options]: any[]) =>
        String(url).includes("tbl-cli-alp/records/recClient1") &&
        options?.method === "PUT"
    );
    expect(clientUpdateCall).toBeTruthy();
    const clientFields = JSON.parse(clientUpdateCall![1].body).fields;
    expect(clientFields.Program).toBe("Strength 101");
    expect(clientFields["Access End Date"]).toBe(
      new Date(`${handlerAddDays("2026-07-07", 27)}T00:00:00`).getTime()
    );
  });

  it("blocks program fulfilment while payment is still pending", async () => {
    stubTables();
    stubFetch([
      tokenRoute,
      clientRoute,
      {
        match: "tbl-ord-alp/records",
        json: {
          code: 0,
          data: {
            items: [
              {
                record_id: "recOrder1",
                fields: {
                  "Client ID": "CL-9",
                  "Client Name": "Bob",
                  "Fulfillment Status": "New Order",
                  "Payment Status": "Pending",
                  "Payment Reference": "NL-7KQ9",
                  "Program ID": "PR-1",
                },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { clientRecordId: "recClient1" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(402);
    expect(res.body.paymentPending).toBe(true);
    expect(res.body.paymentReferences).toEqual(["NL-7KQ9"]);
  });
});
