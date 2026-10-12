type Order = {
  clientId?: string; clientName?: string; productName?: string; productType?: string;
  paymentStatus?: string; paymentProvider?: string; fulfillmentStatus?: string;
  intakeStatus?: string; notes?: string;
};

export const isOrderPaid = (order: Order) => /^paid$/i.test((order.paymentStatus || "").trim());
export const isOrderCancelled = (order: Order) => /^(cancelled|canceled)$/i.test((order.paymentStatus || "").trim());

// Explicit historical test fixtures only. Keep their records accessible.
export const isTestOrder = (order: Order) =>
  order.paymentProvider === "Internal Demo" ||
  /^Battery (Test|Coaching) \d+$/.test(order.clientName || "") ||
  /^Payment Test\b/i.test(order.productName || "");

export function orderIntakeState(order: Order, client?: { intakeStatus?: string } | null) {
  const notRequired = /^not needed$/i.test((order.intakeStatus || "").trim()) ||
    (order.notes || "").split(/\r?\n/).some(line => line.trim() === "Pay link purpose: online-renewal");
  if (notRequired) return "not-required";
  const status = (client?.intakeStatus || order.intakeStatus || "").trim();
  return /^(submitted|reviewed|received|completed?|done|not needed)$/i.test(status) ? "complete" : "pending";
}

export function groupUnpaidCheckouts<T extends Order>(orders: T[]) {
  const groups = new Map<string, { name: string; orders: T[] }>();
  for (const order of orders) {
    const key = order.clientId || (order.clientName || "").trim().toLowerCase();
    const group = groups.get(key) || { name: order.clientName || "Unnamed buyer", orders: [] };
    group.orders.push(order);
    groups.set(key, group);
  }
  return [...groups.values()];
}
