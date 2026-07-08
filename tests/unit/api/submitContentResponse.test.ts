import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/submitContentResponse.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function formEnv() {
  stubFeishuEnv({
    FEISHU_FORM_RESPONSES_TABLE_ID: "tbl-fr",
    // Leave the assignment tables unset so the completion update is skipped.
    FEISHU_ASSIGNED_FORMS_TABLE_ID: "",
    ASSIGNED_FORMS: "",
    FEISHU_BOT_WEBHOOK_URL: "",
  });
}

describe("api/submitContentResponse", () => {
  it("rejects non-POST methods with 405", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("returns 400 when required body fields are missing", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { assignmentType: "form", templateId: "F-1" }, // no clientId/responses
      }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("Missing assignmentType");
  });

  it("stores a form submission as one Answers Json record", async () => {
    formEnv();
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Form Response ID", type: 1 },
              { field_name: "Form ID", type: 1 },
              { field_name: "Client ID", type: 1 },
              { field_name: "Answers Json", type: 1 },
              { field_name: "Client Comment", type: 1 },
            ],
          },
        },
      },
      {
        match: "/records",
        json: { code: 0, data: { record: { record_id: "recResp1" } } },
      },
    ]);

    const responses = [
      { questionId: "q1", label: "Goal", value: "Get strong" },
      { questionId: "__client_comment", value: "Excited to start" },
    ];
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          assignmentType: "form",
          templateId: "F-1",
          clientId: "CL-1001",
          clientName: "Kent",
          responses,
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recordsCreated).toBe(1);
    expect(res.body.metricsCreated).toBe(0);

    const createCall = fetchImpl.mock.calls.find(
      ([url, init]) =>
        String(url).includes("/records") && (init as any)?.method === "POST" &&
        !String(url).includes("tenant_access_token")
    );
    const sent = JSON.parse((createCall![1] as any).body);
    expect(sent.fields["Answers Json"]).toBe(JSON.stringify(responses));
    expect(sent.fields["Client ID"]).toBe("CL-1001");
    expect(sent.fields["Form ID"]).toBe("F-1");
    expect(sent.fields["Client Comment"]).toBe("Excited to start");
  });

  it("returns 500 with the Lark payload when the record create fails", async () => {
    formEnv();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: {
          code: 0,
          data: { items: [{ field_name: "Answers Json", type: 1 }] },
        },
      },
      { match: "/records", json: { code: 1254001, msg: "FieldConvFail" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          assignmentType: "form",
          templateId: "F-1",
          clientId: "CL-1001",
          responses: [{ questionId: "q1", label: "Goal", value: "x" }],
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not submit response");
    expect(res.body.larkResponse.code).toBe(1254001);
  });

  it("returns 500 when no response table is configured", async () => {
    stubFeishuEnv({
      FEISHU_FORM_RESPONSES_TABLE_ID: "",
      FORM_RESPONSES: "",
    });
    stubFetch([]);
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          assignmentType: "form",
          templateId: "F-1",
          clientId: "CL-1001",
          responses: [],
        },
      }) as any,
      res as any
    );
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Missing FEISHU_FORM_RESPONSES_TABLE_ID");
  });
});
