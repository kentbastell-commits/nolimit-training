import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/reviews.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const REVIEWS_ENV = { FEISHU_REVIEWS_TABLE_ID: "tbl-rev" };
const tokenRoute = {
  match: "tenant_access_token",
  json: { code: 0, tenant_access_token: "tok" },
};

const reviewFieldsRoute = {
  match: "tbl-rev/fields",
  json: {
    code: 0,
    data: {
      items: [
        "Review ID",
        "Client ID",
        "Client Name",
        "Program ID",
        "Program Name",
        "Rating",
        "Quote",
        "Show On Store",
        "Approved",
        "Submitted Date",
      ].map((field_name) => ({ field_name })),
    },
  },
};

describe("api/reviews", () => {
  it("500 when the reviews table is not configured", async () => {
    vi.stubEnv("FEISHU_REVIEWS_TABLE_ID", "");
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Missing FEISHU_REVIEWS_TABLE_ID");
  });

  it("rejects unsupported methods with 405", async () => {
    stubFeishuEnv(REVIEWS_ENV);
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(makeReq({ method: "DELETE" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("GET storeOnly=1 keeps only approved, store-visible reviews", async () => {
    stubFeishuEnv(REVIEWS_ENV);
    const submittedMs = Date.UTC(2026, 6, 1, 12);
    stubFetch([
      tokenRoute,
      {
        match: "tbl-rev/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "rv1",
                fields: {
                  "Review ID": "REV-1",
                  "Client ID": "NL-0001",
                  "Client Name": "Kent",
                  "Program ID": "PR-1001",
                  Rating: 5,
                  Quote: "Hit a 10kg squat PR",
                  "Show On Store": true,
                  Approved: true,
                  "Submitted Date": submittedMs,
                },
              },
              {
                record_id: "rv2",
                fields: {
                  "Review ID": "REV-2",
                  Rating: 4,
                  "Show On Store": true,
                  Approved: false, // not approved -> excluded by storeOnly
                },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq({ query: { storeOnly: "1" } }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.reviews).toHaveLength(1);
    const review = res.body.reviews[0];
    expect(review.reviewId).toBe("REV-1");
    expect(review.rating).toBe(5);
    expect(review.quote).toBe("Hit a 10kg squat PR");
    expect(review.approved).toBe(true);
    expect(review.submittedDate).toBe(
      new Date(submittedMs).toISOString().split("T")[0]
    );
  });

  it("POST 400 when a new review is missing its rating", async () => {
    stubFeishuEnv(REVIEWS_ENV);
    stubFetch([tokenRoute, reviewFieldsRoute]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { quote: "Great!" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing rating");
  });

  it("POST creates a new review that starts unapproved", async () => {
    stubFeishuEnv(REVIEWS_ENV);
    const fetchImpl = stubFetch([
      tokenRoute,
      reviewFieldsRoute,
      {
        match: "tbl-rev/records",
        json: { code: 0, data: { record: { record_id: "recR" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientId: "NL-0001",
          clientName: "Kent",
          programId: "PR-1001",
          rating: 5,
          quote: "Hit a 10kg squat PR",
          showOnStore: true,
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, recordId: "recR" });

    const createCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "POST" && String(url).endsWith("tbl-rev/records")
    );
    const sent = JSON.parse(createCall![1].body).fields;
    expect(sent["Review ID"]).toMatch(/^REV-\d+$/);
    expect(sent.Rating).toBe(5);
    expect(sent.Quote).toBe("Hit a 10kg squat PR");
    expect(sent["Show On Store"]).toBe(true);
    expect(sent.Approved).toBe(false); // client reviews always need coach approval
  });

  it("POST with recordId updates approval / store visibility on an existing review", async () => {
    stubFeishuEnv(REVIEWS_ENV);
    const fetchImpl = stubFetch([
      tokenRoute,
      reviewFieldsRoute,
      { match: "tbl-rev/records/recR", json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { recordId: "recR", approved: true },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, recordId: "recR" });

    const putCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "PUT" && String(url).includes("tbl-rev/records/recR")
    );
    expect(JSON.parse(putCall![1].body).fields).toEqual({ Approved: true });
  });
});
