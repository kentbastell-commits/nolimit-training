import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/workloadLogs.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

beforeEach(() => {
  invalidateCache("workloadLogs");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const LOG_ITEMS = [
  {
    record_id: "recWL1",
    fields: {
      "Log ID": "WL-CL-1001-2026-07-01",
      "Client ID": "CL-1001",
      Date: 1751328000000,
      "Tech AM RPE": "7",
      "Tech AM Min": "60",
      "Cardio RPE": "5",
      "Cardio Min": "30",
      Notes: "Heavy session",
    },
  },
  {
    record_id: "recWL2",
    fields: {
      "Log ID": "WL-CL-2002-2026-07-02",
      "Client ID": "CL-2002",
      "Tech PM RPE": "8",
      "Tech PM Min": "45",
    },
  },
];

describe("api/workloadLogs", () => {
  it("returns an empty list when the workload logs table is not configured", async () => {
    stubFeishuEnv({ FEISHU_WORKLOAD_LOGS_TABLE_ID: "" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ logs: [] });
  });

  it("maps rows (numbers, dateKey from Log ID) and filters by clientId", async () => {
    stubFeishuEnv({ FEISHU_WORKLOAD_LOGS_TABLE_ID: "tbl-wl" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/records",
        json: { code: 0, data: { has_more: false, items: LOG_ITEMS } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ query: { clientId: "CL-1001" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.logs).toHaveLength(1);
    const log = res.body.logs[0];
    expect(log.recordId).toBe("recWL1");
    expect(log.dateKey).toBe("2026-07-01"); // last 10 chars of the Log ID
    expect(log.techAmRpe).toBe(7);
    expect(log.techAmMin).toBe(60);
    expect(log.cardioRpe).toBe(5);
    expect(log.cardioMin).toBe(30);
    expect(log.techPmRpe).toBe(0); // absent -> numeric 0
    expect(log.notes).toBe("Heavy session");
  });

  it("returns every log when no clientId filter is given", async () => {
    stubFeishuEnv({ FEISHU_WORKLOAD_LOGS_TABLE_ID: "tbl-wl" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/records",
        json: { code: 0, data: { has_more: false, items: LOG_ITEMS } },
      },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.logs).toHaveLength(2);
  });

  it("returns a 500 JSON error when the Feishu fetch blows up", async () => {
    stubFeishuEnv({ FEISHU_WORKLOAD_LOGS_TABLE_ID: "tbl-wl" });
    stubFetch([]); // token fetch rejects

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not fetch workload logs");
  });
});
