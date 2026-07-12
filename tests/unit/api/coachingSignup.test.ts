import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/coachingSignup.ts";
import { makeReq, makeRes } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/coachingSignup", () => {
  it("rejects non-POST requests", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("rejects a paid coaching order without a valid payment reference", async () => {
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          stage: "order",
          clientName: "Wei Chen",
          phone: "wx-chen",
          termLabel: "3 Months",
          privacyAccepted: true,
          crossBorderAccepted: true,
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("A valid NL payment reference is required");
  });
});
