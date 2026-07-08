import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/testTemplates.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function testTablesEnv() {
  stubFeishuEnv({
    FEISHU_TEST_TEMPLATES_TABLE_ID: "tbl-tt",
    FEISHU_TEST_ITEMS_TABLE_ID: "tbl-ti",
  });
}

describe("api/testTemplates", () => {
  it("returns 500 when the templates table env is missing", async () => {
    stubFeishuEnv({
      FEISHU_TEST_TEMPLATES_TABLE_ID: "",
      TEST_TEMPLATES: "",
      FEISHU_TEST_ITEMS_TABLE_ID: "tbl-ti",
    });
    stubFetch([]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Missing FEISHU_TEST_TEMPLATES_TABLE_ID");
  });

  it("rejects unsupported methods with 405", async () => {
    testTablesEnv();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
    ]);

    const res = makeRes();
    await handler(makeReq({ method: "PATCH" }) as any, res as any);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("GET joins test items onto their template sorted by order", async () => {
    testTablesEnv();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-tt/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recTpl1",
                fields: {
                  "Test Template ID": "TEST-1",
                  "Test Template Name": "Strength Battery",
                  Status: "Active",
                },
              },
              // Blank placeholder template — filtered out.
              { record_id: "recTplEmpty", fields: {} },
            ],
          },
        },
      },
      {
        match: "tbl-ti/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recItem2",
                fields: {
                  "Test Item ID": "TI-2",
                  "Test Template ID": "TEST-1",
                  Order: 2,
                  "Test Name": "Back Squat 3RM",
                  Unit: "kg",
                },
              },
              {
                record_id: "recItem1",
                fields: {
                  "Test Item ID": "TI-1",
                  "Test Template ID": "TEST-1",
                  Order: 1,
                  "Test Name": "CMJ",
                  Unit: "cm",
                },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.tests).toHaveLength(1);
    const test = res.body.tests[0];
    expect(test.testTemplateId).toBe("TEST-1");
    expect(test.name).toBe("Strength Battery");
    expect(test.items.map((i: any) => i.testName)).toEqual([
      "CMJ",
      "Back Squat 3RM",
    ]);
    expect(test.items[0].unit).toBe("cm");
  });

  it("DELETE returns 400 without a record ID", async () => {
    testTablesEnv();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
    ]);

    const res = makeRes();
    await handler(makeReq({ method: "DELETE", body: {} }) as any, res as any);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing test template record ID");
  });

  it("POST creates the template and its items", async () => {
    testTablesEnv();
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-tt/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Test Template ID" },
              { field_name: "Test Template Name" },
              { field_name: "Status" },
            ],
          },
        },
      },
      {
        match: "tbl-ti/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Test Item ID" },
              { field_name: "Test Template ID" },
              { field_name: "Order" },
              { field_name: "Test Name" },
              { field_name: "Unit" },
            ],
          },
        },
      },
      {
        match: "tbl-tt/records",
        json: { code: 0, data: { record: { record_id: "recTplNew" } } },
      },
      {
        match: "tbl-ti/records",
        json: { code: 0, data: { record: { record_id: "recItemNew" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          name: "Speed Battery",
          items: [{ testName: "40m Sprint", unit: "s" }],
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.testTemplateId).toMatch(/^TEST-\d+$/);
    expect(res.body.testRecordId).toBe("recTplNew");
    expect(res.body.itemRecordsCreated).toBe(1);

    const templateCreate = fetchImpl.mock.calls.find(
      ([url, init]) =>
        String(url).includes("tbl-tt/records") && (init as any)?.method === "POST"
    );
    const sent = JSON.parse((templateCreate![1] as any).body);
    expect(sent.fields["Test Template Name"]).toBe("Speed Battery");
    expect(sent.fields["Status"]).toBe("Active");
  });

  it("POST returns 400 when the template name is missing", async () => {
    testTablesEnv();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
    ]);

    const res = makeRes();
    await handler(makeReq({ method: "POST", body: {} }) as any, res as any);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing test template name");
  });
});
