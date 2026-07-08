import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/notifications.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const NOTIF_ENV = { FEISHU_NOTIFICATIONS_TABLE_ID: "tbl-not" };
const tokenRoute = {
  match: "tenant_access_token",
  json: { code: 0, tenant_access_token: "tok" },
};

describe("api/notifications", () => {
  it("500 when the notifications table is not configured", async () => {
    vi.stubEnv("FEISHU_NOTIFICATIONS_TABLE_ID", "");
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("FEISHU_NOTIFICATIONS_TABLE_ID not set");
  });

  it("rejects unsupported methods with 405", async () => {
    stubFeishuEnv(NOTIF_ENV);
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(makeReq({ method: "DELETE" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("GET maps rows and drops fully-empty records", async () => {
    stubFeishuEnv(NOTIF_ENV);
    const createdMs = Date.UTC(2026, 6, 1, 8, 30);
    stubFetch([
      tokenRoute,
      {
        match: "tbl-not/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "n1",
                fields: {
                  "Notifications ID": "NOTIF-1",
                  "Client ID": "NL-0001",
                  Title: "New workout assigned",
                  Body: "Week 2 Day 1 is ready",
                  Type: "workout",
                  Read: true,
                  "Created At": createdMs,
                },
              },
              { record_id: "n2", fields: {} }, // ghost row -> filtered out
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq({ query: { clientId: "NL-0001" } }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.notifications[0]).toEqual({
      id: "n1",
      notificationId: "NOTIF-1",
      clientId: "NL-0001",
      title: "New workout assigned",
      body: "Week 2 Day 1 is ready",
      type: "workout",
      read: true,
      createdAt: new Date(createdMs).toISOString(),
    });
  });

  it("POST 400 when clientId or title is missing", async () => {
    stubFeishuEnv(NOTIF_ENV);
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { clientId: "NL-0001" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("clientId and title are required");
  });

  it("POST creates the notification with defaults (unread, general type)", async () => {
    stubFeishuEnv(NOTIF_ENV);
    const fetchImpl = stubFetch([
      tokenRoute,
      {
        match: "tbl-not/records",
        json: { code: 0, data: { record: { record_id: "recN" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { clientId: "NL-0001", title: "Coach reviewed your workout" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, recordId: "recN" });

    const createCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "POST" && String(url).includes("tbl-not/records")
    );
    const sent = JSON.parse(createCall![1].body).fields;
    expect(sent["Notifications ID"]).toMatch(/^NOTIF-\d+$/);
    expect(sent["Client ID"]).toBe("NL-0001");
    expect(sent.Title).toBe("Coach reviewed your workout");
    expect(sent.Body).toBe("");
    expect(sent.Type).toBe("general");
    expect(sent.Read).toBe(false);
    expect(typeof sent["Created At"]).toBe("number");
  });

  it("POST 500 with the Lark response when Feishu rejects the write", async () => {
    stubFeishuEnv(NOTIF_ENV);
    stubFetch([
      tokenRoute,
      { match: "tbl-not/records", json: { code: 1254045, msg: "FieldNameNotFound" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { clientId: "NL-0001", title: "Hi" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Failed to create notification");
  });
});
