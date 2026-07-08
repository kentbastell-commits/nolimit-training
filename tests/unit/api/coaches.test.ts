import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/coaches.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  // The handler caches the mapped list under "coaches" for 10 minutes.
  invalidateCache("coaches");
});

// NOTE: coaches.ts resolves its table id at import time (module-level const),
// so tests match on the generic "/records" path rather than a stubbed id.
describe("api/coaches", () => {
  it("maps coach records and filters out empty placeholder rows", async () => {
    stubFeishuEnv();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/records",
        json: {
          code: 0,
          data: {
            items: [
              {
                record_id: "recCo1",
                fields: {
                  Name: "Kent",
                  "Coach ID": "CO-1",
                  Email: "kent@example.com",
                  Role: "Head Coach",
                  Bio: "Strength specialist",
                },
              },
              // Placeholder row with no real data must be dropped.
              { record_id: "recCo2", fields: {} },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.coaches).toHaveLength(1);
    const coach = res.body.coaches[0];
    expect(coach.recordId).toBe("recCo1");
    expect(coach.coachId).toBe("CO-1");
    expect(coach.name).toBe("Kent");
    expect(coach.email).toBe("kent@example.com");
    expect(coach.role).toBe("Head Coach");
    expect(coach.status).toBe("Active"); // default
    expect(coach.bio).toBe("Strength specialist");
    // The internal filter flag never leaks into the payload.
    expect(coach).not.toHaveProperty("hasRealData");
  });

  it("500s with the Lark response when items are missing", async () => {
    stubFeishuEnv();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/records", json: { code: 91402, msg: "NOTEXIST" } },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not fetch coaches");
    expect(res.body.larkResponse.code).toBe(91402);
  });
});
