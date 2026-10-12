// Keep renewals in the Online Coaching revenue category. The coach-selected
// purpose is stored on the order, so reopening a link retains its behavior.
export const ONLINE_RENEWAL_NOTE = "Pay link purpose: online-renewal";

export function isPaymentOnlyOrder(order: { productType: string; notes: string }): boolean {
  return order.productType === "In-Person Training" ||
    (order.productType === "Online Coaching" &&
      order.notes.split(/\r?\n/).some((line) => line.trim() === ONLINE_RENEWAL_NOTE));
}
