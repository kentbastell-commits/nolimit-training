import { describe, expect, it } from "vitest";
import {
  campaignCommissionAmount,
  campaignCommissionFromOrders,
  campaignCommissionRule,
  campaignProductKind,
  isFlatFeeProduct,
  type PaidOrderRow,
} from "../../../server/companyOps/campaignPolicy.ts";

describe("Company Operations campaign commission policy", () => {
  it("recognises flat-fee and rate-based campaign products", () => {
    expect(campaignProductKind("Digital program")).toBe("digital");
    expect(campaignProductKind("Online 1:1 coaching")).toBe("online_coaching");
    expect(campaignProductKind("In-person coaching")).toBe("in_person");
    expect(campaignProductKind("Team/institution")).toBe("team");
    expect(campaignProductKind("Workshop")).toBe("workshop");
    expect(campaignProductKind("Small training camp")).toBe("small_camp");
  });

  it("flags institutional, presentation and camp products as flat-fee", () => {
    expect(isFlatFeeProduct("Team/institution")).toBe(true);
    expect(isFlatFeeProduct("Presentation")).toBe(true);
    expect(isFlatFeeProduct("Workshop")).toBe(true);
    expect(isFlatFeeProduct("Digital program")).toBe(false);
    expect(isFlatFeeProduct("Online 1:1 coaching")).toBe(false);
  });

  it("applies 10% digital base rate and 13% only above the CNY 80,000 threshold", () => {
    const rule = campaignCommissionRule({ product: "Digital program" });
    expect(rule.commissionType).toBe("rate");
    expect(rule.ratePercent).toBe(10);
    expect(rule.ratePercentAboveThreshold).toBe(13);
    expect(rule.thresholdAmount).toBe(80_000);

    // Below threshold: 10% of entire amount.
    expect(campaignCommissionAmount({ eligibleRevenue: 50_000, rule })).toBe(5_000);
    // At threshold: still 10%.
    expect(campaignCommissionAmount({ eligibleRevenue: 80_000, rule })).toBe(8_000);
    // Above threshold: 10% of first 80k + 13% of remainder (not retroactive).
    expect(campaignCommissionAmount({ eligibleRevenue: 100_000, rule })).toBe(10_600);
  });

  it("applies 8% to online coaching and 5% to in-person packages", () => {
    const online = campaignCommissionRule({ product: "Online 1:1 coaching" });
    expect(online.ratePercent).toBe(8);
    expect(campaignCommissionAmount({ eligibleRevenue: 30_000, rule: online })).toBe(2_400);

    const inPerson = campaignCommissionRule({ product: "In-person coaching" });
    expect(inPerson.ratePercent).toBe(5);
    expect(campaignCommissionAmount({ eligibleRevenue: 20_000, rule: inPerson })).toBe(1_000);
  });

  it("uses a pre-approved written fee for flat-fee products", () => {
    const team = campaignCommissionRule({ product: "Team/institution", flatFeeAmount: 15_000 });
    expect(team.commissionType).toBe("flat_fee");
    expect(team.flatFeeAmount).toBe(15_000);
    expect(team.requiresWrittenFee).toBe(true);
    expect(campaignCommissionAmount({ eligibleRevenue: 1_000_000, rule: team })).toBe(15_000);

    const workshop = campaignCommissionRule({ product: "Workshop", flatFeeAmount: 3_000 });
    expect(campaignCommissionAmount({ eligibleRevenue: 0, rule: workshop })).toBe(3_000);
  });

  it("defaults attribution share to 100%", () => {
    expect(campaignCommissionRule({ product: "Digital program" }).attributionSharePercent).toBe(100);
    expect(campaignCommissionRule({ product: "Team/institution", flatFeeAmount: 5_000 }).attributionSharePercent).toBe(100);
  });

  it("applies the approved attribution share when calculating commission", () => {
    const rule = campaignCommissionRule({
      product: "Digital program",
      attributionSharePercent: 80,
    });
    expect(campaignCommissionAmount({ eligibleRevenue: 100_000, rule })).toBe(8_480);
  });

  it("clamps negative revenue so it can never create negative commission", () => {
    expect(campaignCommissionAmount({
      eligibleRevenue: -10,
      ratePercent: 8,
      attributionSharePercent: 100,
    })).toBe(0);
  });
});

describe("campaignCommissionFromOrders", () => {
  const baseDate = new Date("2026-03-15T00:00:00+08:00");

  function order(row: Partial<PaidOrderRow> & { amount: number; purchasedAt: Date; clientId: string }): PaidOrderRow {
    return {
      orderId: row.orderId ?? `order-${row.clientId}-${row.purchasedAt.toISOString()}`,
      clientId: row.clientId,
      productType: row.productType ?? "program",
      productName: row.productName ?? "Test program",
      amount: row.amount,
      purchasedAt: row.purchasedAt,
    };
  }

  it("applies 10% digital base rate and 13% only above the CNY 80,000 threshold per calendar month", () => {
    const rule = campaignCommissionRule({ product: "Digital program" });
    const result = campaignCommissionFromOrders({
      product: "Digital program",
      rule,
      orders: [
        order({ amount: 50_000, purchasedAt: baseDate, clientId: "a" }),
        order({ amount: 60_000, purchasedAt: baseDate, clientId: "b" }),
      ],
    });
    // March revenue: 110,000. 80k * 10% + 30k * 13% = 8,000 + 3,900 = 11,900
    expect(result.grossCollected).toBe(110_000);
    expect(result.eligibleRevenue).toBe(110_000);
    expect(result.commission).toBe(11_900);
    expect(result.byMonth).toHaveLength(1);
    expect(result.byMonth[0].commission).toBe(11_900);
  });

  it("keeps monthly tiering independent across Shanghai calendar months", () => {
    const rule = campaignCommissionRule({ product: "Digital program" });
    const result = campaignCommissionFromOrders({
      product: "Digital program",
      rule,
      orders: [
        order({ amount: 100_000, purchasedAt: new Date("2026-03-10T00:00:00+08:00"), clientId: "a" }),
        order({ amount: 100_000, purchasedAt: new Date("2026-04-05T00:00:00+08:00"), clientId: "b" }),
      ],
    });
    // Each month: 80k * 10% + 20k * 13% = 10,600. Total = 21,200.
    expect(result.commission).toBe(21_200);
    expect(result.byMonth.map((m) => m.monthKey).sort()).toEqual(["2026-03", "2026-04"]);
  });

  it("caps online coaching commission to the first three paid months per client", () => {
    const rule = campaignCommissionRule({ product: "Online 1:1 coaching" });
    const client = "client-1";
    const result = campaignCommissionFromOrders({
      product: "Online 1:1 coaching",
      rule,
      orders: [
        order({ amount: 5_000, purchasedAt: new Date("2026-03-01T00:00:00+08:00"), clientId: client }),
        order({ amount: 5_000, purchasedAt: new Date("2026-04-01T00:00:00+08:00"), clientId: client }),
        order({ amount: 5_000, purchasedAt: new Date("2026-05-01T00:00:00+08:00"), clientId: client }),
        order({ amount: 5_000, purchasedAt: new Date("2026-06-01T00:00:00+08:00"), clientId: client }),
      ],
    });
    // Eligible revenue: first three months = 15,000. Rate 8% = 1,200.
    expect(result.eligibleRevenue).toBe(15_000);
    expect(result.commission).toBe(1_200);
  });

  it("caps in-person commission to the first paid package per client", () => {
    const rule = campaignCommissionRule({ product: "In-person coaching" });
    const result = campaignCommissionFromOrders({
      product: "In-person coaching",
      rule,
      orders: [
        order({ amount: 8_000, purchasedAt: baseDate, clientId: "a" }),
        order({ amount: 8_000, purchasedAt: new Date("2026-04-15T00:00:00+08:00"), clientId: "a" }),
        order({ amount: 6_000, purchasedAt: baseDate, clientId: "b" }),
      ],
    });
    // Client a first package 8,000; client b first package 6,000. Eligible = 14,000. 5% = 700.
    expect(result.eligibleRevenue).toBe(14_000);
    expect(result.commission).toBe(700);
  });

  it("excludes pre-existing clients from coaching and in-person eligible revenue", () => {
    const rule = campaignCommissionRule({ product: "Online 1:1 coaching" });
    const result = campaignCommissionFromOrders({
      product: "Online 1:1 coaching",
      rule,
      orders: [
        order({ amount: 5_000, purchasedAt: baseDate, clientId: "existing" }),
        order({ amount: 5_000, purchasedAt: baseDate, clientId: "new" }),
      ],
      existingClientIds: new Set(["existing"]),
    });
    expect(result.eligibleRevenue).toBe(5_000);
    expect(result.commission).toBe(400);
  });

  it("ignores orders outside the 60-day attribution window after the campaign end date", () => {
    const rule = campaignCommissionRule({ product: "Digital program" });
    const campaignEnd = new Date("2026-03-31T00:00:00+08:00");
    const result = campaignCommissionFromOrders({
      product: "Digital program",
      rule,
      orders: [
        order({ amount: 10_000, purchasedAt: new Date("2026-03-15T00:00:00+08:00"), clientId: "a" }),
        order({ amount: 10_000, purchasedAt: new Date("2026-05-31T00:00:00+08:00"), clientId: "b" }),
        order({ amount: 10_000, purchasedAt: new Date("2026-05-30T00:00:00+08:00"), clientId: "c" }),
      ],
      campaignEndAt: campaignEnd,
    });
    // May 31 is 61 days after March 31, so excluded. May 30 is 60 days, included.
    expect(result.grossCollected).toBe(20_000);
    expect(result.eligibleRevenue).toBe(20_000);
  });

  it("deducts discounts, refunds, chargebacks and VAT from net collected revenue", () => {
    const rule = campaignCommissionRule({ product: "Digital program" });
    const result = campaignCommissionFromOrders({
      product: "Digital program",
      rule,
      orders: [order({ amount: 100_000, purchasedAt: baseDate, clientId: "a" })],
      discounts: 5_000,
      refunds: 3_000,
      chargebacks: 2_000,
      vat: 10_000,
    });
    expect(result.netCollectedRevenue).toBe(80_000);
    expect(result.maximumEligibleRevenue).toBe(80_000);
    expect(result.eligibleRevenue).toBe(80_000);
    expect(result.commission).toBe(8_000);
  });

  it("applies post-hoc adjustments to reduce maximum eligible revenue", () => {
    const rule = campaignCommissionRule({ product: "Digital program" });
    const result = campaignCommissionFromOrders({
      product: "Digital program",
      rule,
      orders: [order({ amount: 50_000, purchasedAt: baseDate, clientId: "a" })],
      adjustments: 10_000,
    });
    expect(result.netCollectedRevenue).toBe(50_000);
    expect(result.maximumEligibleRevenue).toBe(40_000);
    expect(result.eligibleRevenue).toBe(40_000);
    expect(result.commission).toBe(4_000);
  });

  it("clamps negative net revenue to zero", () => {
    const rule = campaignCommissionRule({ product: "Digital program" });
    const result = campaignCommissionFromOrders({
      product: "Digital program",
      rule,
      orders: [order({ amount: 1_000, purchasedAt: baseDate, clientId: "a" })],
      refunds: 5_000,
    });
    expect(result.netCollectedRevenue).toBe(0);
    expect(result.maximumEligibleRevenue).toBe(0);
    expect(result.eligibleRevenue).toBe(0);
    expect(result.commission).toBe(0);
  });

  it("uses flat fee instead of percentage for team contracts", () => {
    const rule = campaignCommissionRule({ product: "Team/institution", flatFeeAmount: 15_000 });
    const result = campaignCommissionFromOrders({
      product: "Team/institution",
      rule,
      orders: [order({ amount: 500_000, purchasedAt: baseDate, clientId: "a" })],
    });
    expect(result.grossCollected).toBe(500_000);
    expect(result.eligibleRevenue).toBe(500_000);
    expect(result.commission).toBe(15_000);
  });

  it("applies the approved attribution share to the calculated commission", () => {
    const rule = campaignCommissionRule({ product: "Digital program", attributionSharePercent: 80 });
    const result = campaignCommissionFromOrders({
      product: "Digital program",
      rule,
      orders: [order({ amount: 100_000, purchasedAt: baseDate, clientId: "a" })],
    });
    expect(result.commission).toBe(8_480); // 10,600 * 80%
  });
});
