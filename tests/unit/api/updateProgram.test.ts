import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/updateProgram.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/updateProgram", () => {
  it("rejects non-POST methods with 405", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("returns 400 when programRecordId is missing", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { programName: "Base Block" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing programRecordId");
  });

  it("returns 400 when there is nothing to update", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { programRecordId: "recP1" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("No fields to update");
  });

  it("coerces numbers and omits empty Price/URL values (Feishu typed-field rule)", async () => {
    stubFeishuEnv({ FEISHU_PROGRAMS_TABLE_ID: "tbl-pg" });
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/records/recP1", json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          programRecordId: "recP1",
          programName: "Strength Base",
          durationWeeks: "6",
          price: "", // empty Number column value must be omitted, not sent
          purchaseLink: "", // empty URL column value must be omitted
          status: "Active",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.programRecordId).toBe("recP1");

    const putCall = fetchImpl.mock.calls.find(([url]) =>
      String(url).includes("/records/recP1")
    );
    const sent = JSON.parse((putCall![1] as any).body);
    expect(sent.fields["Program Name"]).toBe("Strength Base");
    expect(sent.fields["Duration Weeks"]).toBe(6);
    expect(sent.fields.Status).toBe("Active");
    expect(sent.fields).not.toHaveProperty("Price");
    expect(sent.fields).not.toHaveProperty("Purchase Link");
  });

  it("returns 500 with the Lark payload when the update fails", async () => {
    stubFeishuEnv({ FEISHU_PROGRAMS_TABLE_ID: "tbl-pg" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/records/recP1", json: { code: 1254043, msg: "RecordIdNotFound" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { programRecordId: "recP1", programName: "X" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Failed to update program");
    expect(res.body.larkResponse.code).toBe(1254043);
  });
});
