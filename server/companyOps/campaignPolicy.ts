export type CampaignProductKind =
  | "digital"
  | "online_coaching"
  | "in_person"
  | "team";

export interface CampaignCommissionRule {
  product: CampaignProductKind;
  ratePercent: number;
  attributionSharePercent: number;
  label: string;
  requiresCustomRate: boolean;
}

const normalize = (value: string) =>
  value.trim().toLocaleLowerCase().replace(/[\s_&/·-]+/g, " ");

export function campaignProductKind(value: string): CampaignProductKind {
  const product = normalize(value);
  if (/digital|数字计划/.test(product)) return "digital";
  if (/online|线上/.test(product)) return "online_coaching";
  if (/in person|线下/.test(product)) return "in_person";
  if (/team|institution|团队|机构/.test(product)) return "team";
  throw new Error("Unsupported campaign product");
}

export function digitalCommissionRate(collectedRevenue: number): number {
  if (collectedRevenue >= 50_000) return 6;
  if (collectedRevenue >= 25_000) return 5;
  return 4;
}

export function campaignCommissionRule(input: {
  product: string;
  collectedRevenue?: number;
  projectedRevenue?: number;
  customRatePercent?: number;
  attributionSharePercent?: number;
}): CampaignCommissionRule {
  const product = campaignProductKind(input.product);
  const collectedRevenue = Math.max(0, Number(input.collectedRevenue) || 0);
  const projectedRevenue = Math.max(0, Number(input.projectedRevenue) || 0);
  const customRate = Number(input.customRatePercent);
  const requiresCustomRate = product === "team" && projectedRevenue > 300_000;
  let ratePercent: number;
  let label: string;

  if (Number.isFinite(customRate) && customRate >= 0 && customRate <= 100) {
    ratePercent = customRate;
    label = `Written pre-approval rate: ${customRate}%`;
  } else if (product === "digital") {
    ratePercent = digitalCommissionRate(collectedRevenue);
    label = "Digital programs: 4% / 5% / 6% at CNY 25k / 50k attributable monthly revenue";
  } else if (product === "online_coaching") {
    ratePercent = 8;
    label = "Online 1:1: 8% of the new client's first three paid months";
  } else if (product === "in_person") {
    ratePercent = 3;
    label = "In-person coaching: 3% of the first package";
  } else {
    ratePercent = 2;
    label = requiresCustomRate
      ? "Team/institution contract above CNY 300k: written pre-signing rate required"
      : "Team/institution: 2% of the first contract";
  }

  const defaultShare = product === "digital" ? 100 : 80;
  const requestedShare = Number(input.attributionSharePercent);
  const attributionSharePercent =
    Number.isFinite(requestedShare) && requestedShare >= 0 && requestedShare <= 100
      ? requestedShare
      : defaultShare;

  return {
    product,
    ratePercent,
    attributionSharePercent,
    label,
    requiresCustomRate,
  };
}

export function campaignCommissionAmount(input: {
  eligibleRevenue: number;
  ratePercent: number;
  attributionSharePercent: number;
}): number {
  const revenue = Math.max(0, Number(input.eligibleRevenue) || 0);
  const rate = Math.min(100, Math.max(0, Number(input.ratePercent) || 0));
  const share = Math.min(
    100,
    Math.max(0, Number(input.attributionSharePercent) || 0),
  );
  return Math.round(revenue * (rate / 100) * (share / 100) * 100) / 100;
}
