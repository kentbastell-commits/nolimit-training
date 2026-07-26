// Ported from tests/unit/api/coachingSignup.test.ts, which only covered the
// two guard clauses. The paid 1:1 coaching flow is a money path, so these add
// what actually matters: that a rejected signup writes nothing, and that an
// accepted one produces a client and an unpaid order carrying the reference a
// coach reconciles the WeChat transfer against.
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/coachingSignup.ts";
import { closeDb, makeReq, makeRes, resetDb, rows } from "./helpers.ts";

beforeEach(async () => {
  await resetDb();
  vi.unstubAllEnvs();
  vi.stubEnv("FEISHU_BOT_WEBHOOK_URL", "");
});

afterAll(async () => {
  await closeDb();
});

const orderBody = (overrides: Record<string, any> = {}) => ({
  stage: "order",
  clientName: "Mei Lin",
  phone: "13800000002",
  termLabel: "3 months",
  paymentCode: "NL-4K5M",
  privacyAccepted: true,
  crossBorderAccepted: true,
  ...overrides,
});

async function post(body: Record<string, any>) {
  const res = makeRes();
  await handler(makeReq({ method: "POST", body }) as any, res as any);
  return res;
}

async function expectNothingWritten() {
  expect(await rows("select 1 from clients")).toHaveLength(0);
  expect(await rows("select 1 from product_orders")).toHaveLength(0);
}

describe("api/coachingSignup (postgres)", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("400s and writes nothing without a valid payment reference", async () => {
    const res = await post(orderBody({ paymentCode: "NL-1234" })); // 1/0 excluded
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("A valid NL payment reference is required");
    await expectNothingWritten();
  });

  it("400s and writes nothing without both consents", async () => {
    const res = await post(orderBody({ privacyAccepted: false }));
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Privacy and cross-border consent required");
    await expectNothingWritten();
  });

  it("400s and writes nothing when the term is missing", async () => {
    const res = await post(orderBody({ termLabel: "" }));
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("clientName, phone, and termLabel required");
    await expectNothingWritten();
  });

  it("creates the client and an unpaid order carrying the payment reference", async () => {
    const res = await post(orderBody());
    expect(res.statusCode).toBe(200);

    const clients = await rows("select client_id, full_name, phone from clients");
    expect(clients).toHaveLength(1);
    expect(clients[0].full_name).toBe("Mei Lin");

    const orders = await rows(
      "select client_id, payment_status, payment_reference from product_orders"
    );
    expect(orders).toHaveLength(1);
    // A signup is a claim to have paid; only coach verification flips it.
    expect(String(orders[0].payment_status || "")).not.toMatch(/^paid$/i);
    expect(orders[0].payment_reference).toBe("NL-4K5M");
    // The order must hang off the client that was just created.
    expect(orders[0].client_id).toBe(clients[0].client_id);
  });

  it("reuses the existing client on a second signup from the same phone", async () => {
    const first = await post(orderBody());
    expect(first.statusCode).toBe(200);
    const second = await post(orderBody({ paymentCode: "NL-6N7P" }));
    expect(second.statusCode).toBe(200);

    // #37 again: a repeat buyer must not fragment into two identities, or
    // their referral credit and access dates end up on the wrong record.
    expect(await rows("select 1 from clients")).toHaveLength(1);
    expect(await rows("select 1 from product_orders")).toHaveLength(2);
  });

  it("400s an intake stage without a client reference", async () => {
    const res = await post({ stage: "intake" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("clientRecordId required");
  });

  it("400s an intake reporting injuries without separate health consent", async () => {
    const res = await post({
      stage: "intake",
      clientRecordId: "CL-9001",
      injuries: "left shoulder impingement",
    });

    // Health data needs its own consent under PIPL — it cannot ride along on
    // the general privacy checkbox.
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Separate health information consent required");
  });
});
