import { describe, expect, it } from "vitest";
import { priceWithReferral } from "../../../server/db/repositories/referrals.ts";

describe("priceWithReferral", () => {
  it("applies only the friend discount when no credit is banked", () => {
    expect(priceWithReferral(299, { friendPct: 10, creditAvailable: 0, capPct: 50 })).toEqual({
      discounted: 269,
      friendCut: 30,
      creditUsed: 0,
    });
  });

  it("spends banked credit alone (a bundle referral is worth its value)", () => {
    // Friend bought the ¥899 bundle → referrer banked ¥90.
    expect(priceWithReferral(299, { friendPct: 0, creditAvailable: 90, capPct: 50 })).toEqual({
      discounted: 209,
      friendCut: 0,
      creditUsed: 90,
    });
  });

  it("caps friend + credit at 50% of the purchase", () => {
    const r = priceWithReferral(299, { friendPct: 10, creditAvailable: 500, capPct: 50 });
    expect(r.friendCut).toBe(30);
    expect(r.creditUsed).toBe(119); // cap 149 - friend 30
    expect(r.discounted).toBe(150);
  });

  it("carries excess credit forward instead of over-discounting", () => {
    const r = priceWithReferral(99, { friendPct: 0, creditAvailable: 90, capPct: 50 });
    expect(r.creditUsed).toBe(49); // 50% of ¥99, floor
    expect(r.discounted).toBe(50);
  });

  it("is a no-op with nothing to apply or a nonsense price", () => {
    expect(priceWithReferral(299, { friendPct: 0, creditAvailable: 0, capPct: 50 }).discounted).toBe(299);
    expect(priceWithReferral(0, { friendPct: 10, creditAvailable: 90, capPct: 50 }).discounted).toBe(0);
  });
});
