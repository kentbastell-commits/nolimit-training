import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/contentResponses.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  // GET caches the merged list under "contentResponses" for 5 minutes.
  invalidateCache("contentResponses");
});

function stubTables() {
  stubFeishuEnv({
    FEISHU_FORM_RESPONSES_TABLE_ID: "tbl-fr-list",
    // Test results table disabled for these tests.
    FEISHU_TEST_RESULTS_TABLE_ID: "",
    TEST_RESULTS: "",
  });
}

describe("api/contentResponses", () => {
  it("rejects non-GET with 405", async () => {
    stubTables();
    const res = makeRes();
    await handler(makeReq({ method: "POST" }) as any, res as any);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("500s when no response table is configured", async () => {
    stubFeishuEnv({
      FEISHU_FORM_RESPONSES_TABLE_ID: "",
      FORM_RESPONSES: "",
      FEISHU_TEST_RESULTS_TABLE_ID: "",
      TEST_RESULTS: "",
    });
    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Missing response table IDs");
  });

  it("expands an Answers Json blob into one row per answer and filters by client", async () => {
    stubTables();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-fr-list/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recR1",
                fields: {
                  "Form Response ID": "FR-1",
                  "Client ID": "CL-9",
                  "Client Name": "Alice",
                  "Form ID": "F-1",
                  "Submitted Date": "2026-07-01",
                  "Answers Json": JSON.stringify([
                    { questionId: "q1", label: "Sleep", value: "8" },
                    { questionId: "q2", label: "Mood", value: "Good" },
                  ]),
                },
              },
              {
                record_id: "recR2",
                fields: {
                  "Form Response ID": "FR-2",
                  "Client ID": "CL-8",
                  "Client Name": "Bob",
                  Answer: "single answer",
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
    // One record with a 2-answer JSON blob => two rows for this client.
    expect(res.body.responses).toHaveLength(2);
    const [first, second] = res.body.responses;
    expect(first.responseType).toBe("Questionnaire");
    expect(first.responseId).toBe("FR-1");
    expect(first.recordId).toBe("recR1-q1");
    expect(first.itemId).toBe("q1");
    expect(first.label).toBe("Sleep");
    expect(first.answer).toBe("8");
    expect(first.submittedAt).toBe("2026-07-01");
    expect(second.recordId).toBe("recR1-q2");
    expect(second.answer).toBe("Good");
  });

  it("returns every response (newest first) when no filter is given", async () => {
    stubTables();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-fr-list/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recR1",
                fields: {
                  "Form Response ID": "FR-1",
                  "Client ID": "CL-9",
                  Answer: "older",
                  "Submitted Date": "2026-06-01",
                },
              },
              {
                record_id: "recR2",
                fields: {
                  "Form Response ID": "FR-2",
                  "Client ID": "CL-8",
                  Answer: "newer",
                  "Submitted Date": "2026-07-02",
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
    expect(res.body.responses).toHaveLength(2);
    expect(res.body.responses[0].responseId).toBe("FR-2"); // sorted desc
    expect(res.body.responses[1].responseId).toBe("FR-1");
  });
});
