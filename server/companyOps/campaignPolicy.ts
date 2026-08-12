export type CampaignProductKind =
  | "digital"
  | "online_coaching"
  | "in_person"
  | "team"
  | "presentation"
  | "workshop"
  | "small_camp"
  | "training_camp";

export type CampaignCommissionType = "rate" | "flat_fee";

export interface CampaignCommissionRule {
  product: CampaignProductKind;
  commissionType: CampaignCommissionType;
  ratePercent?: number;
  ratePercentAboveThreshold?: number;
  thresholdAmount?: number;
  flatFeeAmount?: number;
  attributionSharePercent: number;
  label: string;
  requiresWrittenFee: boolean;
}

const normalize = (value: string) =>
  value.trim().toLocaleLowerCase().replace(/[\s_&/·-]+/g, " ");

export function campaignProductKind(value: string): CampaignProductKind {
  const product = normalize(value);
  if (/digital|数字计划/.test(product)) return "digital";
  if (/online|线上/.test(product)) return "online_coaching";
  if (/in person|线下/.test(product)) return "in_person";
  if (/team|institution|团队|机构/.test(product)) return "team";
  if (/presentation|演讲|分享/.test(product)) return "presentation";
  if (/workshop|工作坊/.test(product)) return "workshop";
  // Match "small camp" and "small training camp" before the generic "training camp" rule.
  if (/(^|\b)small(\s+training)?\s+camp|短期营|小型营/.test(product)) return "small_camp";
  if (/(^|\b)training\s+camp|训练营/.test(product)) return "training_camp";
  throw new Error("Unsupported campaign product");
}

export function isFlatFeeProduct(product: string): boolean {
  try {
    const kind = campaignProductKind(product);
    return ["team", "presentation", "workshop", "small_camp", "training_camp"].includes(kind);
  } catch {
    return false;
  }
}

export function campaignCommissionRule(input: {
  product: string;
  flatFeeAmount?: number;
  attributionSharePercent?: number;
}): CampaignCommissionRule {
  const product = campaignProductKind(input.product);
  const requestedShare = Number(input.attributionSharePercent);
  const attributionSharePercent =
    Number.isFinite(requestedShare) && requestedShare >= 0 && requestedShare <= 100
      ? requestedShare
      : 100;

  if (product === "digital") {
    return {
      product,
      commissionType: "rate",
      ratePercent: 10,
      ratePercentAboveThreshold: 13,
      thresholdAmount: 80_000,
      attributionSharePercent,
      label: "Digital programs: 10% on net collected revenue; 13% on amount above CNY 80,000/month",
      requiresWrittenFee: false,
    };
  }

  if (product === "online_coaching") {
    return {
      product,
      commissionType: "rate",
      ratePercent: 8,
      attributionSharePercent,
      label: "Online 1:1 coaching: 8% of first three paid months",
      requiresWrittenFee: false,
    };
  }

  if (product === "in_person") {
    return {
      product,
      commissionType: "rate",
      ratePercent: 5,
      attributionSharePercent,
      label: "In-person coaching: 5% of first paid package",
      requiresWrittenFee: false,
    };
  }

  // Flat-fee products: team/institution, presentations, workshops, camps.
  const flatFeeAmount = Math.max(0, Number(input.flatFeeAmount) || 0);
  const label = flatFeeAmount > 0
    ? `${productLabel(product)}: pre-approved written fee of CNY ${flatFeeAmount.toLocaleString("en-US")}`
    : `${productLabel(product)}: pre-approved written fee required`;

  return {
    product,
    commissionType: "flat_fee",
    flatFeeAmount,
    attributionSharePercent,
    label,
    requiresWrittenFee: true,
  };
}

function productLabel(product: CampaignProductKind): string {
  switch (product) {
    case "team":
      return "Team/institution contract";
    case "presentation":
      return "Presentation";
    case "workshop":
      return "Workshop";
    case "small_camp":
      return "Small training camp";
    case "training_camp":
      return "Training camp";
    default:
      return product;
  }
}

/* --------------------------- order-aware engine --------------------------- */

export type PaidOrderRow = {
  orderId: string;
  clientId: string;
  productType: string;
  productName?: string;
  amount: number;
  purchasedAt: Date;
};

export type CampaignRevenueInputs = {
  product: string;
  rule: CampaignCommissionRule;
  orders: readonly PaidOrderRow[];
  manualRevenue?: number;
  discounts?: number;
  refunds?: number;
  chargebacks?: number;
  vat?: number;
  adjustments?: number;
  campaignStartAt?: Date;
  campaignEndAt?: Date;
  existingClientIds?: ReadonlySet<string>;
};

export type CampaignRevenueMonth = {
  monthKey: string;
  revenue: number;
  commission: number;
};

export type CampaignRevenueResult = {
  /** Gross paid order amount inside the attribution window. */
  grossCollected: number;
  /** Number of paid orders inside the attribution window. */
  orderCount: number;
  /** Cash collected plus manual offline revenue, less discounts, refunds,
   *  chargebacks and VAT. Never negative. */
  netCollectedRevenue: number;
  /** Net collected revenue less post-hoc adjustments (refunds handled outside
   *  the campaign window, disputed credits, etc.). Never negative. */
  maximumEligibleRevenue: number;
  /** Revenue that actually counts for commission under the product-specific
   *  caps (first three paid months for coaching, first paid package for
   *  in-person, all window revenue for digital, flat-fee reporting base). */
  eligibleRevenue: number;
  /** Commission owed in CNY. */
  commission: number;
  byMonth: CampaignRevenueMonth[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ATTRIBUTION_WINDOW_DAYS = 60;

function isWithinAttributionWindow(
  purchasedAt: Date,
  startAt?: Date,
  endAt?: Date,
): boolean {
  const time = purchasedAt.getTime();
  if (startAt && time < startAt.getTime()) return false;
  if (endAt && time > endAt.getTime() + ATTRIBUTION_WINDOW_DAYS * MS_PER_DAY) return false;
  return true;
}

function shanghaiMonthKey(date: Date): string {
  const shanghai = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  const year = shanghai.getFullYear();
  const month = String(shanghai.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function campaignCommissionFromOrders(
  input: CampaignRevenueInputs,
): CampaignRevenueResult {
  const rule = input.rule;
  const share = Math.min(100, Math.max(0, Number(rule.attributionSharePercent) || 0)) / 100;
  const existing = input.existingClientIds ?? new Set<string>();

  const windowOrders = input.orders.filter((order) =>
    isWithinAttributionWindow(order.purchasedAt, input.campaignStartAt, input.campaignEndAt)
  );

  const grossCollected = roundMoney(
    windowOrders.reduce((sum, order) => sum + Math.max(0, Number(order.amount) || 0), 0),
  );
  const orderCount = windowOrders.length;

  const netCollectedRevenue = Math.max(
    0,
    roundMoney(
      grossCollected +
        (Number(input.manualRevenue) || 0) -
        (Number(input.discounts) || 0) -
        (Number(input.refunds) || 0) -
        (Number(input.chargebacks) || 0) -
        (Number(input.vat) || 0),
    ),
  );
  const maximumEligibleRevenue = Math.max(
    0,
    roundMoney(netCollectedRevenue - (Number(input.adjustments) || 0)),
  );

  const kind = campaignProductKind(input.product);

  if (rule.commissionType === "flat_fee") {
    const eligibleRevenue = maximumEligibleRevenue;
    const fee = Math.max(0, Number(rule.flatFeeAmount) || 0);
    const commission = roundMoney(fee * share);
    return {
      grossCollected,
      orderCount,
      netCollectedRevenue,
      maximumEligibleRevenue,
      eligibleRevenue,
      commission,
      byMonth: [],
    };
  }

  if (kind === "online_coaching") {
    // First three paid months per client, excluding pre-existing clients.
    const monthsByClient = new Map<string, Set<string>>();
    const eligibleOrders: PaidOrderRow[] = [];
    for (const order of windowOrders) {
      if (existing.has(order.clientId)) continue;
      const months = monthsByClient.get(order.clientId) ?? new Set<string>();
      const monthKey = shanghaiMonthKey(order.purchasedAt);
      if (months.size >= 3 && !months.has(monthKey)) continue;
      months.add(monthKey);
      monthsByClient.set(order.clientId, months);
      eligibleOrders.push(order);
    }
    const eligibleRevenue = roundMoney(
      eligibleOrders.reduce((sum, order) => sum + Math.max(0, Number(order.amount) || 0), 0),
    );
    const cappedEligible = Math.min(maximumEligibleRevenue, eligibleRevenue);
    const baseRate = Math.min(100, Math.max(0, Number(rule.ratePercent) || 0)) / 100;
    const commission = roundMoney(cappedEligible * baseRate * share);
    return {
      grossCollected,
      orderCount,
      netCollectedRevenue,
      maximumEligibleRevenue,
      eligibleRevenue: cappedEligible,
      commission,
      byMonth: [],
    };
  }

  if (kind === "in_person") {
    // First paid package (first paid order) per client, excluding pre-existing clients.
    const seen = new Set<string>();
    const eligibleOrders: PaidOrderRow[] = [];
    for (const order of windowOrders) {
      if (existing.has(order.clientId) || seen.has(order.clientId)) continue;
      seen.add(order.clientId);
      eligibleOrders.push(order);
    }
    const eligibleRevenue = roundMoney(
      eligibleOrders.reduce((sum, order) => sum + Math.max(0, Number(order.amount) || 0), 0),
    );
    const cappedEligible = Math.min(maximumEligibleRevenue, eligibleRevenue);
    const baseRate = Math.min(100, Math.max(0, Number(rule.ratePercent) || 0)) / 100;
    const commission = roundMoney(cappedEligible * baseRate * share);
    return {
      grossCollected,
      orderCount,
      netCollectedRevenue,
      maximumEligibleRevenue,
      eligibleRevenue: cappedEligible,
      commission,
      byMonth: [],
    };
  }

  // Digital programs: monthly tiering. All net collected revenue is eligible,
  // including tracked orders and reported manual/offline cash. Because manual
  // revenue has no purchase date, the accelerator is applied only to tracked
  // orders by Shanghai calendar month; manual revenue earns the base rate.
  // Deductions reduce the overall eligible revenue, so each revenue stream is
  // scaled proportionally when a cap applies.
  const baseRate = Math.min(100, Math.max(0, Number(rule.ratePercent) || 0)) / 100;
  const threshold = Math.max(0, Number(rule.thresholdAmount) || 0);
  const aboveRate = rule.ratePercentAboveThreshold === undefined
    ? baseRate
    : Math.min(100, Math.max(0, Number(rule.ratePercentAboveThreshold) || 0)) / 100;

  const revenueByMonth = new Map<string, number>();
  for (const order of windowOrders) {
    const monthKey = shanghaiMonthKey(order.purchasedAt);
    revenueByMonth.set(monthKey, (revenueByMonth.get(monthKey) || 0) + Math.max(0, Number(order.amount) || 0));
  }

  const grossOrderRevenue = roundMoney(
    Array.from(revenueByMonth.values()).reduce((sum, revenue) => sum + revenue, 0),
  );
  const manualRevenue = Math.max(0, Number(input.manualRevenue) || 0);
  const grossEligible = roundMoney(grossOrderRevenue + manualRevenue);
  const eligibleRevenue = Math.min(maximumEligibleRevenue, grossEligible);
  const scale = grossEligible > 0 ? eligibleRevenue / grossEligible : 0;

  let commission = 0;
  const byMonth: CampaignRevenueMonth[] = [];
  for (const [monthKey, revenue] of revenueByMonth) {
    const effectiveRevenue = roundMoney(revenue * scale);
    const monthCommission =
      threshold > 0 && aboveRate > baseRate && effectiveRevenue > threshold
        ? threshold * baseRate + (effectiveRevenue - threshold) * aboveRate
        : effectiveRevenue * baseRate;
    commission += monthCommission;
    byMonth.push({ monthKey, revenue: effectiveRevenue, commission: roundMoney(monthCommission) });
  }

  const effectiveManual = roundMoney(manualRevenue * scale);
  commission += effectiveManual * baseRate;
  commission = roundMoney(commission * share);
  byMonth.sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  return {
    grossCollected,
    orderCount,
    netCollectedRevenue,
    maximumEligibleRevenue,
    eligibleRevenue,
    commission,
    byMonth,
  };
}

/** Backward-compatible overload for callers that still pass the old shape.
 *  Prefer the rule-based overload for new code. */
export function campaignCommissionAmount(input: {
  eligibleRevenue: number;
  ratePercent: number;
  attributionSharePercent: number;
}): number;
export function campaignCommissionAmount(input: {
  eligibleRevenue: number;
  rule: CampaignCommissionRule;
}): number;
export function campaignCommissionAmount(
  input:
    | { eligibleRevenue: number; ratePercent: number; attributionSharePercent: number }
    | { eligibleRevenue: number; rule: CampaignCommissionRule },
): number {
  const eligibleRevenue = Math.max(0, Number(input.eligibleRevenue) || 0);

  let rule: CampaignCommissionRule;
  if ("rule" in input) {
    rule = input.rule;
  } else {
    rule = {
      product: "digital",
      commissionType: "rate",
      ratePercent: input.ratePercent,
      attributionSharePercent: input.attributionSharePercent,
      label: "Legacy rate-based commission",
      requiresWrittenFee: false,
    };
  }

  const share = Math.min(100, Math.max(0, Number(rule.attributionSharePercent) || 0));

  if (rule.commissionType === "flat_fee") {
    const fee = Math.max(0, Number(rule.flatFeeAmount) || 0);
    return Math.round(fee * (share / 100) * 100) / 100;
  }

  const baseRate = Math.min(100, Math.max(0, Number(rule.ratePercent) || 0));
  const threshold = Math.max(0, Number(rule.thresholdAmount) || 0);
  const aboveRate = rule.ratePercentAboveThreshold === undefined
    ? baseRate
    : Math.min(100, Math.max(0, Number(rule.ratePercentAboveThreshold) || 0));

  const commission =
    threshold > 0 && aboveRate > baseRate && eligibleRevenue > threshold
      ? threshold * (baseRate / 100) + (eligibleRevenue - threshold) * (aboveRate / 100)
      : eligibleRevenue * (baseRate / 100);

  return Math.round(commission * (share / 100) * 100) / 100;
}
