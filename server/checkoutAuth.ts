import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.CHECKOUT_TOKEN_SECRET || process.env.PAY_LINK_SECRET || process.env.WXPAY_APIV3_KEY || "";
export function checkoutAuthorizationConfigured() { return Boolean(secret()); }
const signature = (payload: string) => createHmac("sha256", `checkout-v1:${secret()}`).update(payload).digest("base64url").slice(0, 24);

// Separate purpose from coach-issued pay links / personal invites. Public
// checkout proves ownership of an order, never ownership of a client profile.
export function makeCheckoutKey(orderId: string) {
  if (!secret()) throw new Error("Checkout authorization is not configured");
  const payload = Buffer.from(orderId).toString("base64url");
  return `${payload}.${signature(payload)}`;
}
export function verifyCheckoutKey(value: string): string | null {
  if (!secret() || value.length > 160) return null;
  const parts = value.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0])) return null;
  const [payload, supplied] = parts, expected = signature(payload);
  if (!/^[A-Za-z0-9_-]{24}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null;
  const id = Buffer.from(payload, "base64url").toString("utf8");
  return /^[A-Za-z0-9-]{4,64}$/.test(id) ? id : null;
}
