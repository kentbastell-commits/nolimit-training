import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/athleteMetrics.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  // GET caches the whole table under "athleteMetrics" for 5 minutes.
  invalidateCache("athleteMetrics");
});

const metricsRoute = {
  match: "tbl-met-am/records",
  json: {
    code: 0,
    data: {
      has_more: false,
      items: [
        {
          record_id: "recM1",
          fields: {
            "Metric ID": "M-1",
            "Client ID": "CL-9",
            "Client Name": "Alice",
            "Metric Type": "Strength",
            "Metric Name": "1RM Squat",
            "Metric Value": 140,
            "Metric Unit": "kg",
            Status: "Active",
          },
        },
        {
          record_id: "recM2",
          fields: {
            "Metric ID": "M-2",
            "Client ID": "CL-8",
            "Client Name": "Bob",
            "Metric Type": "Conditioning",
            "Metric Name": "MAS",
            "Metric Value": 16.5,
            "Metric Unit": "km/h",
          },
        },
      ],
    },
  },
};

describe("api/athleteMetrics", () => {
  it("rejects non-GET with 405", async () => {
    stubFeishuEnv({ FEISHU_ATHLETE_METRICS_TABLE_ID: "tbl-met-am" });
    const res = makeRes();
    await handler(makeReq({ method: "POST" }) as any, res as any);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("500s when the metrics table id is not configured", async () => {
    stubFeishuEnv({
      FEISHU_ATHLETE_METRICS_TABLE_ID: "",
      ATHLETE_METRICS: "",
    });
    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe(
      "Missing required env var FEISHU_ATHLETE_METRICS_TABLE_ID"
    );
  });

  it("maps Feishu records and filters them by clientId", async () => {
    stubFeishuEnv({ FEISHU_ATHLETE_METRICS_TABLE_ID: "tbl-met-am" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      metricsRoute,
    ]);

    const res = makeRes();
    await handler(makeReq({ query: { clientId: "CL-9" } }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.metrics).toHaveLength(1);
    const metric = res.body.metrics[0];
    expect(metric.metricId).toBe("M-1");
    expect(metric.clientId).toBe("CL-9");
    expect(metric.metricName).toBe("1RM Squat");
    expect(metric.metricValue).toBe("140");
    expect(metric.metricUnit).toBe("kg");
    expect(metric.status).toBe("Active");
  });

  it("filters by metricType across type, name and source-test name", async () => {
    stubFeishuEnv({ FEISHU_ATHLETE_METRICS_TABLE_ID: "tbl-met-am" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      metricsRoute,
    ]);

    const res = makeRes();
    await handler(makeReq({ query: { metricType: "mas" } }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.metrics).toHaveLength(1);
    expect(res.body.metrics[0].metricId).toBe("M-2");
  });

  it("500s when the records fetch errors", async () => {
    stubFeishuEnv({ FEISHU_ATHLETE_METRICS_TABLE_ID: "tbl-met-am" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "tbl-met-am/records", json: { code: 91402, msg: "NOTEXIST" } },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Server error");
  });
});
