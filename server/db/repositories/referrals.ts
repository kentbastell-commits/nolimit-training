// Referral program (Kent's policy 2026-07-20, revised same day):
//  - a buyer arriving via an invite link gets 10% off that purchase
//  - once the referred order is verified Paid, the inviter banks CREDIT
//    worth 10% of what the friend actually paid (a ¥899 bundle referral
//    is worth 9x a ¥99 add-on referral)
//  - credit spends automatically on the inviter's later purchases, capped
//    at 50% of any single purchase (inclusive of a friend discount);
//    unused credit carries forward
// Everything derives server-side from the orders ledger; "Referral Rewards
// Used" on an order stores the ¥ credit that purchase consumed.
import { listProductOrders } from "./productOrders.ts";
import { listClients } from "./clients.ts";

export const REFERRAL_FRIEND_PCT = 10;
export const REFERRAL_EARN_PCT = 10;
export const REFERRAL_CAP_PCT = 50;

export type ReferralQuote = {
  friendPct: number;
  creditAvailable: number; // ¥ banked and unspent
  earnPct: number;
  capPct: number;
};

const norm = (v: unknown) => String(v || "").trim();
const isPaid = (v: unknown) => /^paid$/i.test(norm(v));

export async function referralQuote(input: {
  buyerCode?: string;
  referrerCode?: string;
}): Promise<ReferralQuote> {
  const buyerCode = norm(input.buyerCode);
  const referrerCode = norm(input.referrerCode);

  let friendPct = 0;
  if (referrerCode && referrerCode !== buyerCode) {
    const clients = await listClients();
    const exists = clients.some(
      (c: any) => norm(c.clientCode) === referrerCode || norm(c.id) === referrerCode
    );
    if (exists) friendPct = REFERRAL_FRIEND_PCT;
  }

  let creditAvailable = 0;
  if (buyerCode) {
    const orders = await listProductOrders();
    const earned = orders
      .filter((o: any) => norm(o.referrerCode) === buyerCode && isPaid(o.paymentStatus))
      .reduce(
        (sum: number, o: any) =>
          sum + Math.round((Number(o.amount) || 0) * (REFERRAL_EARN_PCT / 100)),
        0
      );
    const spent = orders
      .filter(
        (o: any) =>
          norm(o.clientCode) === buyerCode || norm(o.clientId).includes(buyerCode)
      )
      .reduce((sum: number, o: any) => sum + (Number(o.referralRewardsUsed) || 0), 0);
    creditAvailable = Math.max(0, earned - spent);
  }

  return {
    friendPct,
    creditAvailable,
    earnPct: REFERRAL_EARN_PCT,
    capPct: REFERRAL_CAP_PCT,
  };
}

/**
 * Apply a quote to a price: friend % first, then banked credit, total
 * discount capped at capPct of the price. Pure — unit-tested.
 */
export function priceWithReferral(
  price: number,
  quote: Pick<ReferralQuote, "friendPct" | "creditAvailable" | "capPct">
): { discounted: number; friendCut: number; creditUsed: number } {
  if (!Number.isFinite(price) || price <= 0) {
    return { discounted: price, friendCut: 0, creditUsed: 0 };
  }
  const cap = Math.floor((price * quote.capPct) / 100);
  const friendCut = Math.min(Math.round((price * quote.friendPct) / 100), cap);
  const creditUsed = Math.max(
    0,
    Math.min(Math.floor(quote.creditAvailable), cap - friendCut)
  );
  return {
    discounted: Math.max(0, Math.round(price - friendCut - creditUsed)),
    friendCut,
    creditUsed,
  };
}
