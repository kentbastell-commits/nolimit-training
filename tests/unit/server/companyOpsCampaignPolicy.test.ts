import { describe, expect, it } from "vitest";
import {
  campaignCommissionAmount,
  campaignCommissionRule,
  digitalCommissionRate,
} from "../../../server/companyOps/campaignPolicy.ts";

describe("Company Operations campaign commission policy", () => {
  it.each([
    [0, 4],
    [24_999.99, 4],
    [25_000, 5],
    [49_999.99, 5],
    [50_000, 6],
  ])("uses the documented digital tier at CNY %s", (revenue, rate) => {
    expect(digitalCommissionRate(revenue)).toBe(rate);
  });

  it("uses the approved attribution share when calculating commission", () => {
    expect(campaignCommissionAmount({
      eligibleRevenue: 100_000,
      ratePercent: 2,
      attributionSharePercent: 80,
    })).toBe(1_600);
  });

  it("requires a written rate before approving a team contract above CNY 300k", () => {
    expect(campaignCommissionRule({
      product: "团队/机构 Team",
      projectedRevenue: 300_000,
    }).requiresCustomRate).toBe(false);
    expect(campaignCommissionRule({
      product: "团队/机构 Team",
      projectedRevenue: 300_000.01,
    }).requiresCustomRate).toBe(true);
  });

  it("clamps negative revenue so it can never create negative commission", () => {
    expect(campaignCommissionAmount({
      eligibleRevenue: -10,
      ratePercent: 8,
      attributionSharePercent: 100,
    })).toBe(0);
  });
});
