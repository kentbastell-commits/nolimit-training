import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/updateContentAssignmentDate.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/updateContentAssignmentDate", () => {
  it("rejects non-POST/PUT methods with 405", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("returns 400 when assignmentType, recordId, or scheduledDate is missing", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { assignmentType: "test" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("Missing assignmentType");
  });

  it("writes the date into resolved due-date columns for a test assignment", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_TESTS_TABLE_ID: "tbl-at" });
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Due Date", type: 5, ui_type: "DateTime" },
              { field_name: "Client ID", type: 1 },
              // Audit column must NOT be treated as a schedulable date.
              { field_name: "Created Time", type: 5, ui_type: "DateTime" },
            ],
          },
        },
      },
      { match: "/records/recA1", json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          assignmentType: "test",
          recordId: "recA1",
          scheduledDate: "2026-07-15",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.updatedFields).toEqual(["Due Date"]);
    expect(res.body.failedFields).toEqual([]);

    const putCall = fetchImpl.mock.calls.find(([url]) =>
      String(url).includes("/records/recA1")
    );
    const sent = JSON.parse((putCall![1] as any).body);
    expect(sent.fields["Due Date"]).toBe(
      new Date(2026, 6, 15).getTime() // toLarkDate parses Y-M-D as local midnight
    );
  });

  it("returns 400 when the table has no scheduled-date column", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_FORMS_TABLE_ID: "tbl-af" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: {
          code: 0,
          data: { items: [{ field_name: "Client ID", type: 1 }] },
        },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          assignmentType: "form",
          recordId: "recF1",
          scheduledDate: "2026-07-15",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing scheduled date column");
    expect(res.body.availableFields).toEqual(["Client ID"]);
  });

  it("returns 500 when the assignment table env is missing", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_TESTS_TABLE_ID: "", ASSIGNED_TESTS: "" });
    stubFetch([]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          assignmentType: "test",
          recordId: "recA1",
          scheduledDate: "2026-07-15",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Missing FEISHU_ASSIGNED_TESTS_TABLE_ID");
  });
});
