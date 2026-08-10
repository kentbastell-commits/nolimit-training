// Ported from tests/unit/api/activateDigitalOrder.test.ts, which stubbed
// Feishu HTTP and so asserted nothing about the backend production runs.
// These cases drive the handler against a real Postgres and assert on the
// rows that result — the layer where this endpoint's real bugs have lived
// (named mistakes #22 buyer-claim unlock, #32 phantom column, #37 the
// split-identity spender).
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/activateDigitalOrder.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";

beforeEach(async () => {
  await resetDb();
  vi.unstubAllEnvs();
  // The coach webhook is fire-and-forget; keep it off the network in tests.
  vi.stubEnv("FEISHU_BOT_WEBHOOK_URL", "");
});

afterAll(async () => {
  await closeDb();
});

// Post-cutover the order's program FK comes from `programRecordId`, and pg
// maps a program's recordId to its programId — so both the web store
// (App.tsx) and the mini program send the business id here. Sending only
// `programId` leaves the order with no program link.
const validBody = (overrides: Record<string, any> = {}) => ({
  clientName: "Bob Tan",
  phone: "13800000001",
  programId: "PR-1001",
  programRecordId: "PR-1001",
  paymentCode: "NL-2B3C",
  privacyAccepted: true,
  crossBorderAccepted: true,
  ...overrides,
});

describe("api/activateDigitalOrder (postgres)", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("400s when clientName, phone, or programId is missing", async () => {
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { clientName: "Bob", phone: "138000" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("clientName, phone, and programId required");
  });

  it("400s before writing anything when the payment reference is invalid", async () => {
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: validBody({ paymentCode: "NOPE" }) }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("A valid NL payment reference is required");
    // The point of validating first: nothing reached the database.
    expect(await rows("select 1 from product_orders")).toHaveLength(0);
    expect(await rows("select 1 from clients")).toHaveLength(0);
  });

  it("400s when privacy consent is missing; retired cross-border consent is not required", async () => {
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: validBody({ privacyAccepted: false }) }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Privacy consent required");
    expect(await rows("select 1 from product_orders")).toHaveLength(0);

    // crossBorderAccepted absent entirely -> still succeeds (2026-07-28).
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    const ok = makeRes();
    await handler(
      makeReq({ method: "POST", body: validBody({ crossBorderAccepted: undefined }) }) as any,
      ok as any
    );
    expect(ok.statusCode).toBe(200);
  });

  it("attaches the order to the existing client instead of minting a duplicate", async () => {
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan", phone: "13800000001" });

    const res = makeRes();
    await handler(makeReq({ method: "POST", body: validBody() }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.clientCode).toBe("CL-9001");

    // The split-identity bug (#37) was exactly this: a second client row
    // appearing for someone who already existed.
    const clients = await rows("select client_id from clients");
    expect(clients).toHaveLength(1);

    const orders = await rows(
      "select order_id, client_id, program_id, payment_status from product_orders"
    );
    expect(orders).toHaveLength(1);
    expect(orders[0].client_id).toBe("CL-9001");
    expect(orders[0].program_id).toBe("PR-1001");
  });

  it("creates the order as unpaid — a buyer's claim never unlocks access", async () => {
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan", phone: "13800000001" });

    const res = makeRes();
    await handler(makeReq({ method: "POST", body: validBody() }) as any, res as any);
    expect(res.statusCode).toBe(200);

    // #22: "I've paid" is a claim, not authorization. Nothing here may come
    // back as Paid until a coach verifies the reference.
    const [order] = await rows("select payment_status from product_orders");
    expect(String(order.payment_status || "")).not.toMatch(/^paid$/i);
  });

  it("fails the checkout outright when the program is unknown", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan", phone: "13800000001" });
    // No program seeded — this is the stale-store-tab case.

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: validBody({ programRecordId: "PR-GONE" }) }) as any,
      res as any
    );

    // This used to return 200: the buyer got a success screen and a payment
    // reference for an order that was never created, so they could pay
    // against a code that reconciled to nothing. The storefront shows the
    // error toast on a non-200 and never advances to the success screen.
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Unknown program id/);
    expect(res.body.orderPersisted).toBe(false);
    expect(await rows("select 1 from product_orders")).toHaveLength(0);
  });

  it("leaves no partial order behind when one item of a cart fails", async () => {
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan", phone: "13800000001" });

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: validBody({
          // Main program is real; the add-on points at a program that isn't.
          addons: [{ programId: "PR-GONE", programRecordId: "PR-GONE", programName: "Ghost" }],
        }),
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    // Atomic: the main item's order is rolled back too, so a retry can't
    // leave the buyer with two orders for the same purchase.
    expect(await rows("select 1 from product_orders")).toHaveLength(0);
    // The client record survives on purpose — the retry reuses that identity
    // rather than minting a second one (#37).
    expect(await rows("select 1 from clients")).toHaveLength(1);
  });

  it("records the payment reference so a coach can match the transfer", async () => {
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan", phone: "13800000001" });

    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: validBody({ paymentCode: "NL-7H8J" }) }) as any,
      res as any
    );
    expect(res.statusCode).toBe(200);

    const [order] = await rows("select * from product_orders");
    const stored = JSON.stringify(order);
    // Without the reference on the row there is no way to tie a WeChat
    // transfer to this order — the whole manual-payment flow depends on it.
    expect(stored).toContain("NL-7H8J");
  });

  it("stores opaque campaign attribution without customer marketing data leaving Postgres", async () => {
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan", phone: "13800000001" });

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: validBody({
          marketingSource: "douyin",
          marketingMedium: "organic-video",
          campaignCode: "AUG-LAUNCH",
          partnerCode: "KOL-021",
          staffAttributionCode: "BG-01",
          marketingAttributionCode: "VIDEO-007",
        }),
      }) as any,
      res as any,
    );
    expect(res.statusCode).toBe(200);

    const [order] = await rows(
      "select marketing_source, marketing_medium, campaign_code, partner_code, staff_attribution_code, marketing_attribution_code from product_orders",
    );
    expect(order).toMatchObject({
      marketing_source: "douyin",
      marketing_medium: "organic-video",
      campaign_code: "AUG-LAUNCH",
      partner_code: "KOL-021",
      staff_attribution_code: "BG-01",
      marketing_attribution_code: "VIDEO-007",
    });
  });
});
