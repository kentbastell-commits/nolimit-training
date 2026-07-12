import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/saveWorkloadLog.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  invalidateCache("");
});

const WORKLOAD_ENV = { FEISHU_WORKLOAD_LOGS_TABLE_ID: "tbl-wl" };
const tokenRoute = {
  match: "tenant_access_token",
  json: { code: 0, tenant_access_token: "tok" },
};

describe("api/saveWorkloadLog", () => {
  it("rejects non-POST methods with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("500 when the workload table is not configured", async () => {
    vi.stubEnv("FEISHU_WORKLOAD_LOGS_TABLE_ID", "");
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { clientId: "NL-0001" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Workload table not configured");
  });

  it("400 when clientId is missing", async () => {
    stubFeishuEnv(WORKLOAD_ENV);
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: {} }) as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing clientId");
  });

  it("creates a new daily row (one per client per day) when none exists", async () => {
    stubFeishuEnv(WORKLOAD_ENV);
    const fetchImpl = stubFetch([
      tokenRoute,
      { match: "tbl-wl/records/rec-existing", json: { code: 0 } },
      {
        // Serves both the upsert's GET scan (empty list -> create path) and the
        // POST create (code 0) — the handler only checks `code` on the create.
        match: "tbl-wl/records",
        json: {
          code: 0,
          data: { has_more: false, items: [], record: { record_id: "recNew" } },
        },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientId: "NL-0001",
          date: "2026-07-01",
          techAmRpe: 7,
          techAmMin: 60,
          cardioRpe: "5",
          cardioMin: "30",
          notes: "Felt good",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      logId: "NL-0001-2026-07-01",
      updated: false,
    });

    const createCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "POST" && String(url).endsWith("tbl-wl/records")
    );
    const sent = JSON.parse(createCall![1].body).fields;
    expect(sent["Log ID"]).toBe("NL-0001-2026-07-01");
    expect(sent["Client ID"]).toBe("NL-0001");
    expect(sent.Date).toBe(new Date("2026-07-01T00:00:00").getTime());
    expect(sent["Tech AM RPE"]).toBe(7);
    expect(sent["Tech AM Min"]).toBe(60);
    expect(sent["Cardio RPE"]).toBe(5); // coerced from string
    expect(sent["Cardio Min"]).toBe(30);
    expect(sent["Tech PM RPE"]).toBe(0); // blanks become 0
    expect(sent.Notes).toBe("Felt good");
  });

  it("updates the existing row (upsert by Log ID) instead of duplicating", async () => {
    stubFeishuEnv(WORKLOAD_ENV);
    const fetchImpl = stubFetch([
      tokenRoute,
      { match: "tbl-wl/records/rec-existing", json: { code: 0 } },
      {
        match: "tbl-wl/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "rec-existing",
                fields: { "Log ID": "NL-0001-2026-07-01" },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { clientId: "NL-0001", date: "2026-07-01", techAmRpe: 8 },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      logId: "NL-0001-2026-07-01",
      updated: true,
    });

    const putCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "PUT" &&
        String(url).includes("tbl-wl/records/rec-existing")
    );
    expect(putCall).toBeDefined();
    expect(JSON.parse(putCall![1].body).fields["Tech AM RPE"]).toBe(8);
  });

  it("500 with details when Feishu rejects the save", async () => {
    stubFeishuEnv(WORKLOAD_ENV);
    stubFetch([
      tokenRoute,
      // The dedup scan (page_size=500) succeeds with no existing log; only the
      // save itself is rejected — a failing scan now throws in the pagination
      // helper and would 500 before the save is even attempted.
      {
        match: "page_size=500",
        json: { code: 0, data: { has_more: false, items: [] } },
      },
      {
        match: "tbl-wl/records",
        text: JSON.stringify({
          code: 1254045,
          msg: "FieldNameNotFound",
          data: { has_more: false, items: [] },
        }),
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { clientId: "NL-0001", date: "2026-07-01" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not save workload log");
  });
});
