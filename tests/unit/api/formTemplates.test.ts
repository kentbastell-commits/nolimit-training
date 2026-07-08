import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/formTemplates.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const FORM_ENV = {
  FEISHU_FORM_TEMPLATES_TABLE_ID: "tbl-ft",
  FEISHU_FORM_QUESTIONS_TABLE_ID: "tbl-fq",
};

const tokenRoute = {
  match: "tenant_access_token",
  json: { code: 0, tenant_access_token: "tok" },
};

const templateFieldsRoute = {
  match: "tbl-ft/fields",
  json: {
    code: 0,
    data: {
      items: [
        "Form ID",
        "Form Name",
        "Type",
        "Description",
        "Status",
        "Created By",
        "Created At",
      ].map((field_name) => ({ field_name })),
    },
  },
};

const questionFieldsRoute = {
  match: "tbl-fq/fields",
  json: {
    code: 0,
    data: {
      items: [
        "Question ID",
        "Form ID",
        "Order",
        "Label",
        "Question Type",
        "Options",
        "Required",
        "Help Text",
      ].map((field_name) => ({ field_name })),
    },
  },
};

describe("api/formTemplates", () => {
  it("500 when the form templates table is not configured", async () => {
    vi.stubEnv("FEISHU_FORM_TEMPLATES_TABLE_ID", "");
    vi.stubEnv("FORM_TEMPLATES", "");
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Missing FEISHU_FORM_TEMPLATES_TABLE_ID");
  });

  it("rejects unsupported methods with 405", async () => {
    stubFeishuEnv(FORM_ENV);
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(makeReq({ method: "PATCH" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("GET nests each form's questions sorted by order", async () => {
    stubFeishuEnv(FORM_ENV);
    stubFetch([
      tokenRoute,
      {
        match: "tbl-ft/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recF",
                fields: {
                  "Form ID": "FORM-1",
                  "Form Name": "Intake",
                  Type: "Questionnaire",
                  Status: "Active",
                },
              },
            ],
          },
        },
      },
      {
        match: "tbl-fq/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recQ2",
                fields: {
                  "Question ID": "Q-2",
                  "Form ID": "FORM-1",
                  Order: 2,
                  Label: "Training age?",
                  "Question Type": "Number",
                },
              },
              {
                record_id: "recQ1",
                fields: {
                  "Question ID": "Q-1",
                  "Form ID": "FORM-1",
                  Order: 1,
                  Label: "Full name?",
                  "Question Type": "Text",
                  Required: true,
                },
              },
              {
                record_id: "recQ3",
                fields: { "Question ID": "Q-3", "Form ID": "FORM-OTHER", Order: 1 },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.forms).toHaveLength(1);
    const form = res.body.forms[0];
    expect(form.formId).toBe("FORM-1");
    expect(form.name).toBe("Intake");
    expect(form.questions).toHaveLength(2); // FORM-OTHER's question excluded
    expect(form.questions.map((q: any) => q.questionId)).toEqual(["Q-1", "Q-2"]);
    expect(form.questions[0].required).toBe(true);
  });

  it("POST 400 when the form name is missing", async () => {
    stubFeishuEnv(FORM_ENV);
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: {} }) as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing form name");
  });

  it("POST creates the template row plus one row per question", async () => {
    stubFeishuEnv(FORM_ENV);
    const fetchImpl = stubFetch([
      tokenRoute,
      templateFieldsRoute,
      questionFieldsRoute,
      {
        match: "tbl-ft/records",
        json: { code: 0, data: { record: { record_id: "recF" } } },
      },
      {
        match: "tbl-fq/records",
        json: { code: 0, data: { record: { record_id: "recQ" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          name: "Intake",
          type: "Questionnaire",
          questions: [{ label: "Full name?", questionType: "Text", required: true }],
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.formId).toMatch(/^FORM-/);
    expect(res.body.formRecordId).toBe("recF");
    expect(res.body.questionRecordsCreated).toBe(1);

    const templateCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "POST" && String(url).endsWith("tbl-ft/records")
    );
    const templateFields = JSON.parse(templateCall![1].body).fields;
    expect(templateFields["Form Name"]).toBe("Intake");
    expect(templateFields.Status).toBe("Active");

    const questionCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "POST" && String(url).endsWith("tbl-fq/records")
    );
    const questionFields = JSON.parse(questionCall![1].body).fields;
    expect(questionFields.Label).toBe("Full name?");
    expect(questionFields["Form ID"]).toBe(res.body.formId);
    expect(questionFields.Order).toBe(1);
    expect(questionFields.Required).toBe(true);
  });

  it("DELETE 400 when the record ID is missing", async () => {
    stubFeishuEnv(FORM_ENV);
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(makeReq({ method: "DELETE", body: {} }) as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing form template record ID");
  });

  it("PUT 400 when the form template IDs are missing", async () => {
    stubFeishuEnv(FORM_ENV);
    stubFetch([tokenRoute, templateFieldsRoute, questionFieldsRoute]);
    const res = makeRes();
    await handler(
      makeReq({ method: "PUT", body: { name: "Intake" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing form template IDs");
  });
});
