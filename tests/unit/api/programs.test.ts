import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/programs.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { resetTokenCacheForTests } from "../../../api/_token.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

beforeEach(() => {
  // The repository path shares api/_token.ts's ~2h token cache; reset it so
  // the token-refused test actually exercises a token fetch.
  resetTokenCacheForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  invalidateCache(""); // handler caches "programs" for 10 minutes
});

describe("api/programs", () => {
  // Read-only list endpoint: no method guard or required params exist, so the
  // minimum pair is happy path + error path.
  it("maps Feishu program rows to the store/coach shape", async () => {
    stubFeishuEnv({ FEISHU_PROGRAMS_TABLE_ID: "tbl-prog" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-prog/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "p1",
                fields: {
                  "Program ID": "PR-1001",
                  "Program Name": "Strength Base",
                  "Program Name CN": "力量基础",
                  Goal: "Get strong",
                  Sport: "Powerlifting",
                  Level: "Beginner",
                  "Duration Weeks": 8,
                  "Sessions / Week": 3,
                  Status: "Active",
                  Price: 299,
                  Currency: "CNY",
                  "Public Store Visible": true,
                  "Store Category": "Strength",
                },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.programs).toHaveLength(1);
    const program = res.body.programs[0];
    expect(program.recordId).toBe("p1");
    expect(program.programId).toBe("PR-1001");
    expect(program.programName).toBe("Strength Base");
    expect(program.programNameCn).toBe("力量基础");
    expect(program.durationWeeks).toBe("8");
    expect(program.sessionsPerWeek).toBe("3");
    expect(program.price).toBe("299");
    expect(program.currency).toBe("CNY");
    expect(program.publicStoreVisible).toBe(true);
    expect(program.storeCategory).toBe("Strength");
  });

  it("500 with the Lark response when the tenant token is refused", async () => {
    stubFeishuEnv({ FEISHU_PROGRAMS_TABLE_ID: "tbl-prog" });
    stubFetch([
      {
        match: "tenant_access_token",
        json: { code: 99991663, msg: "app secret invalid" },
      },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not get Lark tenant access token");
    expect(res.body.larkResponse.code).toBe(99991663);
  });
});
