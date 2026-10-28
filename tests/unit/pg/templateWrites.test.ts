// The template handlers are dual-use: athletes (portal + mini program) GET the
// intake forms and test batteries they are assigned, so the handlers cannot
// live in COACH_ONLY_HANDLERS. Their writes were therefore left open — an
// unauthenticated DELETE could remove the intake questionnaire. Found in the
// 2026-10-29 production audit; this pins GET-open / write-gated per method.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import formTemplates from "../../../api/formTemplates.ts";
import testTemplates from "../../../api/testTemplates.ts";
import testLibrary from "../../../api/testLibrary.ts";
import { closeDb, makeReq, makeRes, resetDb } from "./helpers.ts";

beforeEach(async () => {
  vi.stubEnv("COACH_ACCESS_KEY", "test-secret");
  await resetDb();
});
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await closeDb();
});

async function call(handler: any, method: string, body: Record<string, any>, withKey: boolean) {
  const res = makeRes();
  await handler(
    makeReq({ method, body, headers: withKey ? { "x-coach-key": "test-secret" } : {} }) as any,
    res as any
  );
  return res;
}

describe("template handlers: reads open, writes coach-only", () => {
  it("formTemplates GET works without a key (athletes load intake forms)", async () => {
    const res = await call(formTemplates, "GET", {}, false);
    expect(res.statusCode).toBe(200);
  });

  it("formTemplates DELETE / PUT / POST are 401 without the coach key", async () => {
    expect((await call(formTemplates, "DELETE", { recordId: "FORM-X" }, false)).statusCode).toBe(401);
    expect((await call(formTemplates, "PUT", { recordId: "FORM-X", formId: "FORM-X", name: "x" }, false)).statusCode).toBe(401);
    expect((await call(formTemplates, "POST", { name: "Sneaky" }, false)).statusCode).toBe(401);
  });

  it("formTemplates POST with the key still creates", async () => {
    const res = await call(formTemplates, "POST", { name: "Coach form", formType: "Intake" }, true);
    expect(res.statusCode).toBeLessThan(300);
  });

  it("testTemplates writes are 401 without the key; GET stays open", async () => {
    expect((await call(testTemplates, "GET", {}, false)).statusCode).toBe(200);
    expect((await call(testTemplates, "DELETE", { recordId: "TT-X" }, false)).statusCode).toBe(401);
    expect((await call(testTemplates, "PUT", { recordId: "TT-X", testTemplateId: "TT-X", name: "x" }, false)).statusCode).toBe(401);
    expect((await call(testTemplates, "POST", { name: "Sneaky battery" }, false)).statusCode).toBe(401);
  });

  it("testLibrary POST is 401 without the key; GET stays open", async () => {
    expect((await call(testLibrary, "GET", {}, false)).statusCode).toBe(200);
    expect((await call(testLibrary, "POST", { testName: "Sneaky", category: "Strength" }, false)).statusCode).toBe(401);
  });
});
