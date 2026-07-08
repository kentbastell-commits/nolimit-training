import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/analytics.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  // The handler caches its payload under "analytics" for 3 minutes — clear it
  // so one test's dashboard never leaks into the next.
  invalidateCache("analytics");
});

describe("api/analytics", () => {
  it("aggregates clients and workouts into the dashboard summary", async () => {
    stubFeishuEnv({
      FEISHU_CLIENTS_TABLE_ID: "tbl-cli-an",
      FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw-an",
    });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-cli-an/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recC1",
                fields: {
                  "Full Name": "Alice",
                  "Client ID": "CL-9",
                  "Package Type": "Active",
                  Email: "a@example.com",
                  "Phone/WeChat": "138000",
                  "Program ID": "PR-1",
                },
              },
            ],
          },
        },
      },
      {
        match: "tbl-aw-an/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recW1",
                fields: {
                  // Duplex link plus the resolved code text, like real Feishu
                  // lookups: matching works by record id AND by client code.
                  "Client ID": [{ record_ids: ["recC1"] }, "CL-9"],
                  "Session Name": "Day 1",
                  "Scheduled Date": Date.now(),
                  "Completion Status": "Completed",
                },
              },
              {
                record_id: "recW2",
                fields: {
                  "Client ID": [{ record_ids: ["recC1"] }, "CL-9"],
                  "Session Name": "Day 2",
                  // Far in the past + still Scheduled => displayStatus Missed.
                  "Scheduled Date": new Date("2020-01-01").getTime(),
                  "Completion Status": "Scheduled",
                },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.summary.totalClients).toBe(1);
    expect(res.body.summary.activeClients).toBe(1);
    expect(res.body.summary.totalWorkouts).toBe(2);
    expect(res.body.summary.completedWorkouts).toBe(1);
    expect(res.body.summary.missedWorkouts).toBe(1);
    expect(res.body.summary.overdueWorkouts).toBe(1);
    expect(res.body.summary.completionRate).toBe(50);
    // The client has an overdue workout, so they show up as needing attention.
    expect(res.body.attentionClients[0].clientId).toBe("CL-9");
    expect(res.body.attentionClients[0].overdueWorkouts).toBe(1);
    // Activity matches by client record-id link.
    expect(res.body.clientActivity[0].recordId).toBe("recC1");
    expect(res.body.clientActivity[0].completed7d).toBe(1);
  });

  it("returns a 500 JSON error when the token fetch fails", async () => {
    stubFeishuEnv({
      FEISHU_CLIENTS_TABLE_ID: "tbl-cli-an",
      FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw-an",
    });
    stubFetch([
      { match: "tenant_access_token", json: { code: 99, msg: "bad app" } },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not build analytics");
  });
});
