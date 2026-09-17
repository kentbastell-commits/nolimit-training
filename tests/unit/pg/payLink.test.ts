// /api/payLink — the shareable payment page's data. Amount must come from
// the stored order (never the caller), unknown links must 404, and a fapiao
// request must land on the order's notes and read back.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import handler from "../../../api/payLink.ts";
import {
  attachWxpayTradeNo,
  createProductOrder,
} from "../../../server/db/repositories/productOrders.ts";
import { closeDb, makeReq, makeRes, resetDb, rows } from "./helpers.ts";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

async function seedCollectOrder(tradeNo = "NLTESTTRADE0001") {
  const created = await createProductOrder({
    clientName: "Zhang San",
    productName: "3 in-person sessions",
    productType: "In-Person Training",
    amount: 900,
    currency: "CNY",
    paymentStatus: "Pending",
    paymentProvider: "WeChat Pay",
    intakeStatus: "Not Needed",
  });
  expect(created.success).toBe(true);
  const orderId = String((created.body as { recordId?: string; orderId?: string }).recordId || (created.body as { orderId?: string }).orderId);
  await attachWxpayTradeNo([orderId], tradeNo);
  return orderId;
}

describe("payLink", () => {
  it("returns the stored amount and label for a known trade, 404 for unknown, 400 for junk", async () => {
    const orderId = await seedCollectOrder();
    const res = makeRes();
    await handler(makeReq({ method: "GET", query: { tradeNo: "NLTESTTRADE0001" } }) as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ orderId, amount: 900, currency: "CNY", label: "3 in-person sessions", paid: false, fapiao: null });

    const missing = makeRes();
    await handler(makeReq({ method: "GET", query: { tradeNo: "NLNOSUCHTRADE01" } }) as any, missing as any);
    expect(missing.statusCode).toBe(404);

    const junk = makeRes();
    await handler(makeReq({ method: "GET", query: { tradeNo: "../etc" } }) as any, junk as any);
    expect(junk.statusCode).toBe(400);
  });

  it("files a fapiao request on the order notes, validates it, and reads it back", async () => {
    await seedCollectOrder();
    const bad = makeRes();
    await handler(makeReq({ method: "POST", body: { tradeNo: "NLTESTTRADE0001", title: "广州某某科技有限公司", taxId: "12" } }) as any, bad as any);
    expect(bad.statusCode).toBe(400);

    const ok = makeRes();
    await handler(
      makeReq({ method: "POST", body: { tradeNo: "NLTESTTRADE0001", title: "广州某某科技有限公司", taxId: "91440101ma5abc1234", email: "acct@example.com" } }) as any,
      ok as any,
    );
    expect(ok.statusCode).toBe(200);
    expect(ok.body.fapiao).toMatchObject({ title: "广州某某科技有限公司", taxId: "91440101MA5ABC1234", email: "acct@example.com" });

    const notes = await rows<{ order_notes: string }>("select order_notes from product_orders");
    expect(notes[0].order_notes).toContain("发票 Fapiao: 抬头=广州某某科技有限公司");

    const again = makeRes();
    await handler(makeReq({ method: "GET", query: { tradeNo: "NLTESTTRADE0001" } }) as any, again as any);
    expect(again.body.fapiao.title).toBe("广州某某科技有限公司");
  });
});
