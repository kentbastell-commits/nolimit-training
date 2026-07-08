import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/upsertCoach.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const COACH_FIELDS = [
  { field_name: "Coach ID" },
  { field_name: "Name" },
  { field_name: "Email" },
  { field_name: "Role" },
  { field_name: "Status" },
];

describe("api/upsertCoach", () => {
  it("rejects non-POST methods with 405", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("returns 400 when the coach name is missing or blank", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { name: "   " } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing coach name");
  });

  it("creates a coach (POST) with a generated Coach ID, omitting absent columns", async () => {
    stubFeishuEnv();
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/fields", json: { code: 0, data: { items: COACH_FIELDS } } },
      {
        match: "/records",
        json: { code: 0, data: { record: { record_id: "recCoach1" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { name: "Kent Bastell", email: "kent@example.com", bio: "…" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.coachId).toMatch(/^COACH-KENT-\d{4}$/);
    expect(res.body.recordId).toBe("recCoach1");
    // Table lacks Phone/WeChat and Bio columns.
    expect(res.body.omittedFields).toEqual(
      expect.arrayContaining(["Phone/WeChat", "Bio"])
    );

    const createCall = fetchImpl.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith("/records") && (init as any)?.method === "POST"
    );
    const sent = JSON.parse((createCall![1] as any).body);
    expect(sent.fields.Name).toBe("Kent Bastell");
    expect(sent.fields.Role).toBe("Coach");
    expect(sent.fields.Status).toBe("Active");
    expect(sent.fields).not.toHaveProperty("Bio");
  });

  it("updates via PUT when a recordId is supplied", async () => {
    stubFeishuEnv();
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/fields", json: { code: 0, data: { items: COACH_FIELDS } } },
      { match: "/records/recCoach1", json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { recordId: "recCoach1", coachId: "COACH-KENT-1234", name: "Kent" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.recordId).toBe("recCoach1");
    expect(res.body.coachId).toBe("COACH-KENT-1234");

    const putCall = fetchImpl.mock.calls.find(([url]) =>
      String(url).includes("/records/recCoach1")
    );
    expect((putCall![1] as any).method).toBe("PUT");
  });

  it("returns 400 when the Coaches table is missing the Name column", async () => {
    stubFeishuEnv();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: { code: 0, data: { items: [{ field_name: "Something Else" }] } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { name: "Kent" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Coaches table is missing required columns");
    expect(res.body.missingRequiredFields).toEqual(["Name"]);
  });
});
