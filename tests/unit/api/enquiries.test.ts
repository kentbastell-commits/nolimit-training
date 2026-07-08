import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/enquiries.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  invalidateCache("");
});

describe("api/enquiries", () => {
  it("returns an empty list when the enquiries table is not configured (no fetch)", async () => {
    vi.stubEnv("FEISHU_ENQUIRIES_TABLE_ID", "");
    const fetchImpl = stubFetch([]); // any fetch would throw

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ enquiries: [] });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps Feishu rows to enquiries sorted newest-first", async () => {
    stubFeishuEnv({ FEISHU_ENQUIRIES_TABLE_ID: "tbl-enq" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-enq/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "rec1",
                fields: {
                  "Enquiry ID": "ENQ-1",
                  "Contact Person": "Zhang Wei",
                  Contact: "138-0000-0000",
                  Organization: "Rowing Club",
                  Athletes: "12",
                  Duration: "8 weeks",
                  Notes: "Pre-season block",
                  "Submitted Date": "2026-07-01",
                  Status: "New",
                },
              },
              {
                record_id: "rec2",
                fields: {
                  "Enquiry ID": "ENQ-2",
                  "Contact Person": "Li Na",
                  Contact: "wechat: lina",
                  "Submitted Date": "2026-07-05",
                  Status: "Contacted",
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
    expect(res.body.enquiries).toHaveLength(2);
    // Sorted by submittedDate descending.
    expect(res.body.enquiries[0].enquiryId).toBe("ENQ-2");
    const older = res.body.enquiries[1];
    expect(older).toEqual({
      recordId: "rec1",
      enquiryId: "ENQ-1",
      contactPerson: "Zhang Wei",
      contact: "138-0000-0000",
      organization: "Rowing Club",
      athletes: "12",
      duration: "8 weeks",
      notes: "Pre-season block",
      submittedDate: "2026-07-01",
      status: "New",
    });
  });

  it("500 JSON error when the Feishu read blows up", async () => {
    stubFeishuEnv({ FEISHU_ENQUIRIES_TABLE_ID: "tbl-enq" });
    // Token route returns garbage -> fetchAllBitableRecords gets no items ->
    // returns [], which is fine; so instead break the records call itself.
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "tbl-enq/records", text: "not json at all" },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Server error");
  });
});
