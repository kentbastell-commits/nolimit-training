import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/createProgram.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/createProgram", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("400s without a program name", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: { goal: "Strength" } }) as any, res as any);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing Program Name");
  });

  it("500s when the tenant token cannot be fetched", async () => {
    stubFeishuEnv({ FEISHU_PROGRAMS_TABLE_ID: "tbl-prog-cp" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 99, msg: "bad app" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { programName: "Test Program" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not get Lark tenant access token");
  });

  it("creates the program in one combined write, dropping columns the table lacks", async () => {
    stubFeishuEnv({ FEISHU_PROGRAMS_TABLE_ID: "tbl-prog-cp" });
    const impl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-prog-cp/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Program ID" },
              { field_name: "Program Name" },
              { field_name: "Goal" },
              { field_name: "Duration Weeks" },
              { field_name: "Coach" },
              { field_name: "Status" },
              { field_name: "Price" },
              // Most optional product columns absent => reported as omitted.
            ],
          },
        },
      },
      {
        match: "tbl-prog-cp/records",
        json: { code: 0, data: { record: { record_id: "recProg1" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          programName: "Test Program",
          goal: "Strength",
          durationWeeks: 4,
          price: 299,
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.programId).toMatch(/^PR-\d{4}$/);
    expect(res.body.programRecordId).toBe("recProg1");
    expect(res.body.optionalUpdateErrors).toEqual([]);
    expect(res.body.omittedFields).toContain("Product Type");
    expect(res.body.omittedFields).toContain("Public Store Visible");

    // Fast path: exactly one create call carrying stable + present optionals.
    const createCalls = impl.mock.calls.filter(
      ([url, options]: any[]) =>
        String(url).includes("tbl-prog-cp/records") && options?.method === "POST"
    );
    expect(createCalls).toHaveLength(1);
    const sent = JSON.parse(createCalls[0][1].body).fields;
    expect(sent["Program Name"]).toBe("Test Program");
    expect(sent["Program ID"]).toBe(res.body.programId);
    expect(sent.Goal).toBe("Strength");
    expect(sent["Duration Weeks"]).toBe(4);
    expect(sent.Coach).toBe("Kent Bastell"); // default
    expect(sent.Status).toBe("Active"); // default
    expect(sent.Price).toBe(299);
    expect(sent).not.toHaveProperty("Sport"); // column not in schema
  });

  it("falls back to a stable-fields create plus per-field updates when the combined write fails", async () => {
    stubFeishuEnv({ FEISHU_PROGRAMS_TABLE_ID: "tbl-prog-cp" });
    let createAttempts = 0;
    // Hand-rolled fetch: first create fails, second succeeds, updates succeed.
    const impl = vi.fn(async (url: any, options: any = {}) => {
      const target = String(url);
      const ok = (json: any) => ({
        ok: true,
        status: 200,
        json: async () => json,
        text: async () => JSON.stringify(json),
      });
      if (target.includes("tenant_access_token")) {
        return ok({ code: 0, tenant_access_token: "tok" });
      }
      if (target.includes("tbl-prog-cp/fields")) {
        return ok({
          code: 0,
          data: {
            items: [
              { field_name: "Program ID" },
              { field_name: "Program Name" },
              { field_name: "Price" },
            ],
          },
        });
      }
      if (target.includes("tbl-prog-cp/records") && options.method === "POST") {
        createAttempts += 1;
        return createAttempts === 1
          ? ok({ code: 1254040, msg: "conv fail" })
          : ok({ code: 0, data: { record: { record_id: "recProg2" } } });
      }
      if (target.includes("tbl-prog-cp/records/recProg2")) {
        return ok({ code: 0, data: {} });
      }
      throw new Error(`unit-test fetch: unmatched URL ${target.slice(0, 120)}`);
    });
    vi.stubGlobal("fetch", impl);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { programName: "Fallback Program", price: 99 },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.programRecordId).toBe("recProg2");
    expect(createAttempts).toBe(2);
    // The optional Price was patched individually after the fallback create.
    const priceUpdate = impl.mock.calls.find(
      ([url, options]: any[]) =>
        String(url).includes("tbl-prog-cp/records/recProg2") &&
        options?.method === "PUT"
    );
    expect(priceUpdate).toBeTruthy();
    expect(JSON.parse(priceUpdate![1].body).fields.Price).toBe(99);
    expect(res.body.optionalUpdateErrors).toEqual([]);
  });
});
