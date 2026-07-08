import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/assignContent.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/assignContent", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("400s when assignmentType, templateId, or clientId is missing", async () => {
    stubFeishuEnv();
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { assignmentType: "Questionnaire", templateId: "F-1" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing assignmentType, templateId, or clientId");
  });

  it("500s when the assigned-forms table id is not configured", async () => {
    stubFeishuEnv({
      FEISHU_ASSIGNED_FORMS_TABLE_ID: "",
      ASSIGNED_FORMS: "",
    });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          assignmentType: "Questionnaire",
          templateId: "F-1",
          clientId: "recClient1",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Missing FEISHU_ASSIGNED_FORMS_TABLE_ID");
  });

  it("creates a form assignment against the real columns (link array for Client ID)", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_FORMS_TABLE_ID: "tbl-af-ac" });
    const impl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-af-ac/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Assigned Form ID" },
              { field_name: "Form ID" },
              { field_name: "Assignment Type" },
              { field_name: "Saved Form" },
              { field_name: "Client ID", type: 21, ui_type: "DuplexLink" },
              { field_name: "Client Code" },
              { field_name: "Client Name" },
              { field_name: "Created At", type: 5, ui_type: "DateTime" },
              { field_name: "Due Date", type: 5, ui_type: "DateTime" },
              { field_name: "Status" },
            ],
          },
        },
      },
      {
        match: "tbl-af-ac/records",
        json: { code: 0, data: { record: { record_id: "recAssign1" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          assignmentType: "Questionnaire",
          templateId: "F-1",
          templateName: "Intake Form",
          clientId: "recClient1",
          clientCode: "CL-9",
          clientName: "Alice",
          assignedDate: "2026-07-01",
          dueDate: "2026-07-10",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recordId).toBe("recAssign1");

    const createCall = impl.mock.calls.find(
      ([url, options]: any[]) =>
        String(url).includes("tbl-af-ac/records") && options?.method === "POST"
    );
    expect(createCall).toBeTruthy();
    const sent = JSON.parse(createCall![1].body).fields;
    expect(sent["Assigned Form ID"]).toMatch(/^AF-\d+$/);
    expect(sent["Form ID"]).toBe("F-1");
    expect(sent["Assignment Type"]).toBe("Questionnaire");
    expect(sent["Saved Form"]).toBe("Intake Form");
    // Duplex link column gets the linkValue array, not the plain string.
    expect(sent["Client ID"]).toEqual(["recClient1"]);
    expect(sent["Client Code"]).toBe("CL-9");
    expect(sent["Client Name"]).toBe("Alice");
    expect(sent.Status).toBe("Assigned");
    // Due Date (and every non-audit date column) carries the due timestamp.
    expect(sent["Due Date"]).toBe(new Date(2026, 6, 10).getTime());
    expect(sent["Created At"]).toBe(new Date(2026, 6, 1).getTime());
  });

  it("500s with the Lark response when the create is rejected", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_FORMS_TABLE_ID: "tbl-af-ac" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-af-ac/fields",
        json: { code: 0, data: { items: [{ field_name: "Form ID" }] } },
      },
      {
        match: "tbl-af-ac/records",
        json: { code: 1254040, msg: "FieldConvFail" },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          assignmentType: "Questionnaire",
          templateId: "F-1",
          clientId: "recClient1",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not create assignment");
    expect(res.body.larkResponse.code).toBe(1254040);
  });
});
