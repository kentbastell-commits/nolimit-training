import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/coachingSignup.ts";
import { authorizeAthleteRequest } from "../../../server/athleteAccess.ts";
import { makeCheckoutKey, verifyCheckoutKey } from "../../../server/checkoutAuth.ts";
import { makePayLinkKey, verifyPayLinkKey } from "../../../server/wxpay/client.ts";
import { createClient } from "../../../server/db/pg/clients.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient } from "./helpers.ts";

beforeEach(async () => {
  await resetDb();
  vi.stubEnv("ATHLETE_SESSION_MODE", "required");
  vi.stubEnv("COACH_ACCESS_KEY", "test-coach");
  vi.stubEnv("PAY_LINK_SECRET", "test-pay-link-secret");
  vi.stubEnv("CHECKOUT_TOKEN_SECRET", "test-checkout-secret");
});
afterEach(() => vi.unstubAllEnvs());
afterAll(closeDb);
const body = (overrides = {}) => ({ stage: "order", clientName: "Buyer", phone: "13800009999", termLabel: "3 months",
  privacyAccepted: true, paymentCode: "NL-4K5M", goal: "New checkout goal", ...overrides });
async function post(data: Record<string, unknown>) {
  const req = makeReq({ method: "POST", body: data, headers: { host: "localhost" } }) as any;
  const res = makeRes();
  if (await authorizeAthleteRequest("coachingSignup", req, res as any)) await handler(req, res as any);
  return res;
}
describe("public checkout authorization", () => {
  it("separates checkout from coach-issued payment/invite links and rejects tampering", () => {
    const key = makeCheckoutKey("ORD-TEST"), signedLink = makePayLinkKey("ORD-TEST");
    expect(verifyCheckoutKey(key)).toBe("ORD-TEST");
    expect(verifyCheckoutKey(signedLink)).toBeNull();
    expect(verifyPayLinkKey(key)).toBeNull();
    for (const bad of [key + "x", "x" + key, key.split(".")[0] + "." + "é".repeat(24), "", ".", "x".repeat(200)]) {
      expect(verifyCheckoutKey(bad)).toBeNull();
    }
  });
  it("does not change an existing athlete's profile when someone types their contact details", async () => {
    await seedClient({ phone: "13800009999", client_type: "Digital Program", package_type: "Old package",
      subscription_status: "Paused", notes: "Private coach notes", intake_status: "Received" });
    const [before] = await rows("select * from clients");
    const created = await post(body());
    expect(created.statusCode).toBe(200);
    expect(verifyCheckoutKey(created.body.checkoutKey)).toBe(created.body.orderId);
    expect(created.body.sessionToken).toBeUndefined();
    expect((await rows("select * from clients"))[0]).toEqual(before);
    expect((await rows("select order_notes from product_orders"))[0].order_notes).toContain("New checkout goal");
    expect(await rows("select * from athlete_sessions")).toHaveLength(0);
  });
  it("writes checkout intake only to the authorized order, ignoring a forged profile reference", async () => {
    await seedClient({ phone: "13800009999", notes: "Private A" });
    await seedClient({ client_id: "CL-9002", phone: "13800000002", notes: "Private B" });
    const created = await post(body());
    const submitted = await post({ stage: "intake", orderId: created.body.orderId, checkoutKey: created.body.checkoutKey,
      clientRecordId: "CL-9002", notes: "Checkout questionnaire", injuries: "Old knee injury", healthConsent: true });
    expect(submitted.statusCode).toBe(200); expect(submitted.body.success).toBe(true);
    expect((await rows("select order_notes from product_orders"))[0].order_notes).toContain("Checkout questionnaire");
    expect((await rows("select notes from clients order by client_id")).map(r => r.notes)).toEqual(["Private A", "Private B"]);
    expect((await post({ stage: "claim", orderId: created.body.orderId })).statusCode).toBe(401);
    expect((await post({ stage: "claim", orderId: created.body.orderId, checkoutKey: created.body.checkoutKey })).statusCode).toBe(200);
    expect((await rows("select payment_status from product_orders"))[0].payment_status).toBe("Pending");
  });
  it("shares atomic client-code allocation between concurrent coaching and coach-created profiles", async () => {
    const attempts = await Promise.all(Array.from({ length: 12 }, (_, i) => i % 2
      ? createClient({ name: `Coach client ${i}`, phone: `1390000${String(i).padStart(4, "0")}` })
      : post(body({ phone: `1380000${String(i).padStart(4, "0")}`, clientName: `Checkout ${i}` }))));
    for (const result of attempts) {
      if ("statusCode" in result) expect(result.statusCode).toBe(200);
      else expect(result.success).toBe(true);
    }
    const ids = (await rows("select client_id from clients")).map(r => r.client_id);
    expect(ids).toHaveLength(12); expect(new Set(ids).size).toBe(12);
  });
});
