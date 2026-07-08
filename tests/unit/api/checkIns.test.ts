import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/checkIns.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  // GET caches the whole table under "checkIns" for 5 minutes.
  invalidateCache("checkIns");
});

// checkIns pulls its token through the shared _token cache, so the token route
// is stubbed in every test (it is only hit on the first fetch of this file).
const tokenRoute = {
  match: "tenant_access_token",
  json: { code: 0, tenant_access_token: "tok", expire: 7200 },
};

describe("api/checkIns", () => {
  it("500s when FEISHU_CHECKINS_TABLE_ID is not configured", async () => {
    stubFeishuEnv({ FEISHU_CHECKINS_TABLE_ID: "" });
    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Missing FEISHU_CHECKINS_TABLE_ID");
  });

  it("rejects unsupported methods with 405", async () => {
    stubFeishuEnv({ FEISHU_CHECKINS_TABLE_ID: "tbl-chk" });
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(makeReq({ method: "DELETE" }) as any, res as any);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("GET maps Feishu records and filters by clientId (code or record link)", async () => {
    stubFeishuEnv({ FEISHU_CHECKINS_TABLE_ID: "tbl-chk" });
    stubFetch([
      tokenRoute,
      {
        match: "tbl-chk/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recCk1",
                fields: {
                  "Check-in ID": "CHK-1",
                  Client: "CL-9",
                  "Client ID": [{ record_ids: ["recC1"] }],
                  "Submitted Date": "2026-07-01",
                  "Body Weight": 80,
                  "Sleep Hours": 7.5,
                  "Coaches Notes": "Looking good",
                },
              },
              {
                record_id: "recCk2",
                fields: {
                  "Check-in ID": "CHK-2",
                  Client: "CL-8",
                  "Submitted Date": "2026-07-02",
                },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq({ query: { clientId: "CL-9" } }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.checkIns).toHaveLength(1);
    const checkIn = res.body.checkIns[0];
    expect(checkIn.checkInId).toBe("CHK-1");
    expect(checkIn.clientId).toBe("CL-9");
    expect(checkIn.clientRecordIds).toEqual(["recC1"]);
    expect(checkIn.submittedDate).toBe("2026-07-01");
    expect(checkIn.bodyWeight).toBe("80");
    expect(checkIn.sleepHours).toBe("7.5");
    // A non-empty Coaches Notes marks the check-in as reviewed.
    expect(checkIn.coachReviewed).toBe(true);
    expect(checkIn.coachResponse).toBe("Looking good");
  });

  it("POST without clientId/clientRecordId returns 400", async () => {
    stubFeishuEnv({ FEISHU_CHECKINS_TABLE_ID: "tbl-chk" });
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: {} }) as any, res as any);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing clientId or clientRecordId");
  });

  it("POST creates a check-in with numbers typed and unknown columns dropped", async () => {
    stubFeishuEnv({ FEISHU_CHECKINS_TABLE_ID: "tbl-chk" });
    const impl = stubFetch([
      tokenRoute,
      {
        match: "tbl-chk/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Check-in ID" },
              { field_name: "Client" },
              { field_name: "Submitted Date" },
              { field_name: "Status" },
              { field_name: "Body Weight" },
              { field_name: "Nutrition Notes" },
              // No "Sleep Hours" column: it must be dropped from the write.
            ],
          },
        },
      },
      {
        match: "tbl-chk/records",
        json: { code: 0, data: { record: { record_id: "recNew1" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientId: "CL-9",
          submittedDate: "2026-07-01",
          bodyWeight: "80",
          sleepHours: "7.5",
          nutritionNotes: "on plan",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recordId).toBe("recNew1");

    const createCall = impl.mock.calls.find(
      ([url, options]: any[]) =>
        String(url).includes("tbl-chk/records") && options?.method === "POST"
    );
    expect(createCall).toBeTruthy();
    const sent = JSON.parse(createCall![1].body).fields;
    expect(sent.Client).toBe("CL-9");
    expect(sent["Body Weight"]).toBe(80); // number, not string
    expect(sent["Nutrition Notes"]).toBe("on plan");
    expect(sent.Status).toBe("Submitted");
    expect(sent).not.toHaveProperty("Sleep Hours"); // column absent from schema
    expect(sent["Check-in ID"]).toMatch(/^CHK-\d+$/);
  });

  it("POST with a recordId updates the coach review fields instead of creating", async () => {
    stubFeishuEnv({ FEISHU_CHECKINS_TABLE_ID: "tbl-chk" });
    const impl = stubFetch([
      tokenRoute,
      {
        match: "tbl-chk/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Coaches Notes" },
              { field_name: "Coach Reviewed" },
              { field_name: "Reviewed Date" },
            ],
          },
        },
      },
      { match: "tbl-chk/records/recCk9", json: { code: 0, data: {} } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          recordId: "recCk9",
          coachResponse: "Great week",
          reviewedDate: "2026-07-05",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recordId).toBe("recCk9");

    const updateCall = impl.mock.calls.find(
      ([url, options]: any[]) =>
        String(url).includes("tbl-chk/records/recCk9") && options?.method === "PUT"
    );
    expect(updateCall).toBeTruthy();
    const sent = JSON.parse(updateCall![1].body).fields;
    expect(sent["Coaches Notes"]).toBe("Great week");
    expect(sent["Coach Reviewed"]).toBe(true);
    expect(sent["Reviewed Date"]).toBe(new Date("2026-07-05T12:00:00Z").getTime());
  });
});
