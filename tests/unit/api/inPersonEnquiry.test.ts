import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/inPersonEnquiry.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  invalidateCache("");
});

describe("api/inPersonEnquiry", () => {
  it("rejects non-POST methods with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("500 when the enquiries table is not configured", async () => {
    vi.stubEnv("FEISHU_ENQUIRIES_TABLE_ID", "");
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: {} }) as any, res as any);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Missing FEISHU_ENQUIRIES_TABLE_ID");
  });

  it("400 when contact person or contact is missing", async () => {
    stubFeishuEnv({ FEISHU_ENQUIRIES_TABLE_ID: "tbl-enq" });
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { contactPerson: "Zhang Wei" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(
      "Please add a contact person and a way to reach you."
    );
  });

  it("creates the enquiry row with a fresh ID, today's date, and New status", async () => {
    stubFeishuEnv({ FEISHU_ENQUIRIES_TABLE_ID: "tbl-enq" });
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-enq/records",
        json: { code: 0, data: { record: { record_id: "recE" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          contactPerson: "Zhang Wei",
          contact: "138-0000-0000",
          organization: "Rowing Club",
          athletes: "12",
          duration: "8 weeks",
          notes: "Pre-season",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, recordId: "recE" });

    const createCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "POST" && String(url).includes("tbl-enq/records")
    );
    const sent = JSON.parse(createCall![1].body).fields;
    expect(sent["Enquiry ID"]).toMatch(/^ENQ-\d+$/);
    expect(sent["Contact Person"]).toBe("Zhang Wei");
    expect(sent.Contact).toBe("138-0000-0000");
    expect(sent.Organization).toBe("Rowing Club");
    expect(sent.Status).toBe("New");
    expect(sent["Submitted Date"]).toBe(new Date().toISOString().split("T")[0]);
  });

  it("500 with the Lark response when Feishu rejects the write", async () => {
    stubFeishuEnv({ FEISHU_ENQUIRIES_TABLE_ID: "tbl-enq" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "tbl-enq/records", json: { code: 1254045, msg: "FieldNameNotFound" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { contactPerson: "Zhang Wei", contact: "138-0000-0000" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not save enquiry");
    expect(res.body.larkResponse.code).toBe(1254045);
  });
});
