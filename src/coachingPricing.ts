// Shared by the public offer and the server. A checkout selects a term;
// it never sets its own price or currency.
export type CoachingTier = {
  id: string; months: number; label: string; perMo: number; total: number;
  save: number; tag: "" | "popular" | "best";
};
export const COACHING_TIERS: CoachingTier[] = [
  { id: "m1", months: 1, label: "1 Month", perMo: 2500, total: 2500, save: 0, tag: "" },
  { id: "m3", months: 3, label: "3 Months", perMo: 2100, total: 6300, save: 1200, tag: "" },
  { id: "m6", months: 6, label: "6 Months", perMo: 1900, total: 11400, save: 3600, tag: "popular" },
  { id: "m12", months: 12, label: "12 Months", perMo: 1700, total: 20400, save: 9600, tag: "best" },
];
export function coachingTierForLabel(label: unknown) {
  return COACHING_TIERS.find(tier => tier.label.toLowerCase() === String(label || "").trim().toLowerCase());
}
