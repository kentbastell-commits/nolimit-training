// /api/payLink — the shareable payment page's data. Amount must come from
// the stored order (never the caller), unknown links must 404, and a fapiao
// request must land on the order's notes and read back.
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/payLink.ts";
import collect from "../../../api/wxpayCollect.ts";
import {
  attachWxpayTradeNo,
  createProductOrder,
  markOrdersPaidByWxpay,
  updateProductOrder,
} from "../../../server/db/repositories/productOrders.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient } from "./helpers.ts";
import { makePayLinkKey, verifyPayLinkKey } from "../../../server/wxpay/client.ts";
import { ONLINE_RENEWAL_NOTE } from "../../../server/payLinkPolicy.ts";

const provider = vi.hoisted(() => ({ native: vi.fn(), invite: vi.fn() }));
vi.mock("../../../server/wxpay/client.ts", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../../server/wxpay/client.ts")>(),
  wxpayEnabled: () => true,
  createNativeTransaction: provider.native,
}));
vi.mock("../../../server/wechat/invite.ts", () => ({
  makeInviteToken: (code: string) => `invite-${code}`,
  inviteCodeDataUrl: provider.invite,
}));

process.env.PAY_LINK_SECRET = "test-pay-link-secret";

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  provider.native.mockResolvedValue({ codeUrl: "weixin://test-collect" });
  provider.invite.mockResolvedValue("data:image/png;base64,test-invite");
});

afterAll(async () => {
  await closeDb();
});

async function seedCollectOrder(tradeNo = "NLTESTTRADE0001", productType = "In-Person Training") {
  const created = await createProductOrder({
    clientName: "Zhang San",
    productName: "3 in-person sessions",
    productType,
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
  it("resolves a signed order key (stable across WeChat trade re-mints) and rejects a tampered one", async () => {
    const orderId = await seedCollectOrder();
    const key = makePayLinkKey(orderId);
    expect(verifyPayLinkKey(key)).toBe(orderId);
    expect(verifyPayLinkKey(key.slice(0, -2) + "zz")).toBeNull();

    await attachWxpayTradeNo([orderId], "NLREMINTED00002"); // a later JSAPI attempt
    const res = makeRes();
    await handler(makeReq({ method: "GET", query: { key } }) as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ orderId, amount: 900 });

    const bad = makeRes();
    await handler(makeReq({ method: "GET", query: { key: key.slice(0, -2) + "zz" } }) as any, bad as any);
    expect(bad.statusCode).toBe(404);
  });

  it("identify creates the client from name + phone, attaches the order, and reuses the client next time", async () => {
    const orderId = await seedCollectOrder("NLTESTTRADE0001", "Online Coaching");
    const key = makePayLinkKey(orderId);
    const before = makeRes();
    await handler(makeReq({ method: "GET", query: { key } }) as any, before as any);
    expect(before.body.needsIdentity).toBe(true);

    const bad = makeRes();
    await handler(makeReq({ method: "POST", body: { key, action: "identify", name: "Li Meini", phone: "12" } }) as any, bad as any);
    expect(bad.statusCode).toBe(400);

    const ok = makeRes();
    await handler(makeReq({ method: "POST", body: { key, action: "identify", name: "Li Meini", phone: "138 0000 1234" } }) as any, ok as any);
    expect(ok.statusCode).toBe(200);
    const code = String(ok.body.clientCode);
    expect(code).toMatch(/^CL-/);
    const client = await rows<{ full_name: string; phone: string; source: string; client_type: string | null }>("select full_name, phone, source, client_type from clients where client_id = $1", [code]);
    expect(client[0]).toMatchObject({ full_name: "Li Meini", phone: "13800001234", source: "Pay link" });
    // A coaching order makes a COACHED profile; anything else leaves the type alone.
    const [{ product_type }] = await rows<{ product_type: string }>("select product_type from product_orders where order_id = $1", [orderId]);
    if (product_type === "Online Coaching" || product_type === "In-Person Training") {
      expect(client[0].client_type).toBe(product_type);
    } else {
      expect(client[0].client_type || "").toBe("");
    }
    const order = await rows<{ client_id: string; client_name: string }>("select client_id, client_name from product_orders where order_id = $1", [orderId]);
    expect(order[0]).toMatchObject({ client_id: code, client_name: "Li Meini" });

    const after = makeRes();
    await handler(makeReq({ method: "GET", query: { key } }) as any, after as any);
    expect(after.body).toMatchObject({ needsIdentity: false, clientCode: code });

    // Same person, second link: found, not duplicated.
    const orderId2 = await seedCollectOrder("NLTESTTRADE0002", "Online Coaching");
    const again = makeRes();
    await handler(makeReq({ method: "POST", body: { key: makePayLinkKey(orderId2), action: "identify", name: "Li Meini", phone: "13800001234" } }) as any, again as any);
    expect(again.body.clientCode).toBe(code);
    expect((await rows("select client_id from clients")).length).toBe(1);

    await markOrdersPaidByWxpay("NLTESTTRADE0001", "WX-ONLINE-PAID");
    const paid = makeRes();
    await handler(makeReq({ method: "GET", query: { key } }) as any, paid as any);
    expect(paid.body).toMatchObject({ paid: true, paymentOnly: false, clientCode: code, inviteImage: "data:image/png;base64,test-invite" });
    expect(provider.invite).toHaveBeenCalledWith(`invite-${code}`);
  });

  it.each([
    ["In-Person Training", undefined],
    ["Online Coaching", "renewal"],
  ])("collects %s (%s) without signup, before and after payment", async (productType, paymentPurpose) => {
    const created = makeRes();
    await collect(makeReq({ method: "POST", body: {
      amount: 1500, label: "Training payment", clientName: "Existing Athlete", productType, paymentPurpose,
    } }) as any, created as any);
    expect(created.statusCode).toBe(200);
    const { orderId, payLinkKey: key, tradeNo } = created.body;
    const [saved] = await rows("select * from product_orders where order_id=$1", [orderId]);
    expect(saved.product_type).toBe(productType);
    if (paymentPurpose) expect(saved.order_notes).toBe(ONLINE_RENEWAL_NOTE);
    expect(provider.native).toHaveBeenCalledWith(expect.objectContaining({ totalFen: 150000 }));

    const before = makeRes();
    await handler(makeReq({ method: "GET", query: { key } }) as any, before as any);
    expect(before.body).toMatchObject({ paymentOnly: true, needsIdentity: false, clientCode: "", paid: false });

    // Even a stale page or direct API call cannot create an account for this link.
    const identify = makeRes();
    await handler(makeReq({ method: "POST", body: { key, action: "identify", name: "Existing Athlete", phone: "13800001234" } }) as any, identify as any);
    expect(identify.statusCode).toBe(409);
    expect(await rows("select * from clients")).toEqual([]);

    // Saving an invoice must preserve the renewal's payment-only purpose.
    const invoice = makeRes();
    await handler(makeReq({ method: "POST", body: { key, title: "Test Company", email: "billing@example.com" } }) as any, invoice as any);
    expect(invoice.statusCode).toBe(200);
    await markOrdersPaidByWxpay(tradeNo, "WX-PAYMENT-ONLY");
    const after = makeRes();
    await handler(makeReq({ method: "GET", query: { key } }) as any, after as any);
    expect(after.body).toMatchObject({ paid: true, paymentOnly: true, needsIdentity: false, clientCode: "", inviteImage: "", fapiao: { title: "Test Company" } });
    expect(await rows("select * from clients")).toEqual([]);
    expect(await rows("select * from assigned_forms")).toEqual([]);
    expect(provider.invite).not.toHaveBeenCalled();
  });

  it.each(["In-Person Training", "Online Coaching"])("hides app invitations on payment-only %s links even when attached to a client", async (productType) => {
    await seedClient();
    const orderId = await seedCollectOrder("NLTESTTRADE0001", productType);
    await updateProductOrder({ recordId: orderId, clientCode: "CL-9001", notes: productType === "Online Coaching" ? ONLINE_RENEWAL_NOTE : "" });
    await markOrdersPaidByWxpay("NLTESTTRADE0001", "WX-LINKED-PAID");
    const result = makeRes();
    await handler(makeReq({ method: "GET", query: { key: makePayLinkKey(orderId) } }) as any, result as any);
    expect(result.body).toMatchObject({ paid: true, paymentOnly: true, needsIdentity: false, clientCode: "", inviteImage: "" });
    expect(provider.invite).not.toHaveBeenCalled();
  });

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
