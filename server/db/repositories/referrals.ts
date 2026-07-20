// Referral program (Kent's policy 2026-07-20): 10% per unit, stackable to
// 50% (5 units). A buyer arriving via an invite link gets one "friend" unit;
// an existing athlete earns one reward unit per referred order that reached
// Paid, consumable on their own later purchases. Everything is computed
// server-side from the orders list — the client can only ask, never assert.
import { listProductOrders } from "./productOrders.ts";
import { listClients } from "./clients.ts";

export const REFERRAL_PCT_PER_UNIT = 10;
export const REFERRAL_MAX_UNITS = 5;

export type ReferralQuote = {
  friendUnit: 0 | 1;
  rewardUnits: number;
  discountPct: number;
  pctPerUnit: number;
  maxUnits: number;
};

const norm = (v: unknown) => String(v || "").trim();
const isPaid = (v: unknown) => /^paid$/i.test(norm(v));

export async function referralQuote(input: {
  buyerCode?: string;
  referrerCode?: string;
}): Promise<ReferralQuote> {
  const buyerCode = norm(input.buyerCode);
  const referrerCode = norm(input.referrerCode);

  let friendUnit: 0 | 1 = 0;
  if (referrerCode && referrerCode !== buyerCode) {
    const clients = await listClients();
    const exists = clients.some(
      (c: any) => norm(c.clientCode) === referrerCode || norm(c.id) === referrerCode
    );
    if (exists) friendUnit = 1;
  }

  let rewardUnits = 0;
  if (buyerCode) {
    const orders = await listProductOrders();
    const earned = orders.filter(
      (o: any) => norm(o.referrerCode) === buyerCode && isPaid(o.paymentStatus)
    ).length;
    const used = orders
      .filter(
        (o: any) =>
          norm(o.clientCode) === buyerCode || norm(o.clientId).includes(buyerCode)
      )
      .reduce((sum: number, o: any) => sum + (Number(o.referralRewardsUsed) || 0), 0);
    rewardUnits = Math.max(
      0,
      Math.min(earned - used, REFERRAL_MAX_UNITS - friendUnit)
    );
  }

  return {
    friendUnit,
    rewardUnits,
    discountPct: (friendUnit + rewardUnits) * REFERRAL_PCT_PER_UNIT,
    pctPerUnit: REFERRAL_PCT_PER_UNIT,
    maxUnits: REFERRAL_MAX_UNITS,
  };
}
