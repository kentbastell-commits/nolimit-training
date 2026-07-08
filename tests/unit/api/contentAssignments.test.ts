import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/contentAssignments.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  // GET caches the merged list under "contentAssignments" for 5 minutes.
  invalidateCache("contentAssignments");
});

function stubTables() {
  stubFeishuEnv({
    FEISHU_ASSIGNED_FORMS_TABLE_ID: "tbl-af-list",
    // Only the forms table in play: tests/templates disabled.
    FEISHU_ASSIGNED_TESTS_TABLE_ID: "",
    ASSIGNED_TESTS: "",
    FEISHU_FORM_TEMPLATES_TABLE_ID: "",
    FORM_TEMPLATES: "",
    FEISHU_TEST_TEMPLATES_TABLE_ID: "",
    TEST_TEMPLATES: "",
  });
}

const formsRoutes = [
  { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
  {
    match: "tbl-af-list/fields",
    json: {
      code: 0,
      data: { items: [{ field_name: "Due Date", type: 5, ui_type: "DateTime" }] },
    },
  },
  {
    match: "tbl-af-list/records",
    json: {
      code: 0,
      data: {
        has_more: false,
        items: [
          {
            record_id: "recA1",
            fields: {
              "Assigned Form ID": "AF-1",
              "Form ID": "F-1",
              "Saved Form": "Intake Form",
              Client: "CL-9",
              "Client Code": "CL-9",
              "Client Name": "Alice",
              Status: "Assigned",
              // Noon UTC so the local-time normalization lands on the same
              // calendar day in any test-runner timezone.
              "Due Date": String(new Date("2025-12-30T12:00:00Z").getTime()),
            },
          },
          {
            record_id: "recA2",
            fields: {
              "Assigned Form ID": "AF-2",
              "Form ID": "F-2",
              "Client Code": "CL-8",
              "Client Name": "Bob",
            },
          },
          // Completely empty rows are dropped.
          { record_id: "recA3", fields: {} },
        ],
      },
    },
  },
];

describe("api/contentAssignments", () => {
  it("rejects non-GET with 405", async () => {
    stubTables();
    const res = makeRes();
    await handler(makeReq({ method: "POST" }) as any, res as any);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("500s when no assignment table is configured", async () => {
    stubFeishuEnv({
      FEISHU_ASSIGNED_FORMS_TABLE_ID: "",
      ASSIGNED_FORMS: "",
      FEISHU_ASSIGNED_TESTS_TABLE_ID: "",
      ASSIGNED_TESTS: "",
    });
    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Missing assignment table IDs");
  });

  it("maps assigned forms and drops empty rows", async () => {
    stubTables();
    stubFetch(formsRoutes);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.assignments).toHaveLength(2); // empty row filtered

    const first = res.body.assignments[0];
    expect(first.assignmentId).toBe("AF-1");
    expect(first.assignmentType).toBe("Questionnaire"); // fallback type
    expect(first.templateId).toBe("F-1");
    expect(first.templateName).toBe("Intake Form");
    expect(first.clientId).toBe("CL-9");
    expect(first.clientName).toBe("Alice");
    expect(first.status).toBe("Assigned");
    expect(first.dueDate).toBe("2025-12-30"); // Lark ms timestamp normalized
  });

  it("filters by clientCode", async () => {
    stubTables();
    stubFetch(formsRoutes);

    const res = makeRes();
    await handler(makeReq({ query: { clientCode: "CL-8" } }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.assignments).toHaveLength(1);
    expect(res.body.assignments[0].assignmentId).toBe("AF-2");
    expect(res.body.assignments[0].clientName).toBe("Bob");
  });
});
