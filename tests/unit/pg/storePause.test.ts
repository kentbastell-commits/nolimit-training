import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import catalog from "../../../api/programs.ts";
import checkout from "../../../api/activateDigitalOrder.ts";
import nativePay from "../../../api/wxpayCreate.ts";
import miniPay from "../../../api/wxpayCreateMini.ts";
import webPay from "../../../api/wxpayCreateJsapi.ts";
import collect from "../../../api/wxpayCollect.ts";
import coaching from "../../../api/coachingSignup.ts";
import { activateDigitalOrder } from "../../../server/db/repositories/fulfillment.ts";
import { prepareWxpayCharge } from "../../../server/wxpay/orderGroup.ts";
import { STORE_PUBLIC } from "../../../src/storeFlags.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";

// Only the external payment provider is mocked; catalog, orders, clients and
// checkout use real local Postgres, including the persisted product type.
const provider = vi.hoisted(() => ({ query: vi.fn(), native: vi.fn(), jsapi: vi.fn() }));
vi.mock("../../../server/wxpay/client.ts", () => ({
  wxpayEnabled: () => true,
  wxpayConfig: () => ({ appId: "test" }),
  verifyOpenidToken: () => "test-openid",
  queryTransaction: provider.query,
  createNativeTransaction: provider.native,
  createJsapiTransaction: provider.jsapi,
  makeOutTradeNo: () => "NLWNEW",
  makePayLinkKey: () => "test-key",
  signJsapiInvoke: () => ({}),
}));

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  vi.stubEnv("COACH_ACCESS_KEY", "test-coach");
  vi.stubEnv("WECHAT_MINI_APPID", "test-mini");
  vi.stubEnv("WECHAT_MINI_SECRET", "test-secret");
  vi.stubEnv("FEISHU_BOT_WEBHOOK_URL", "");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
afterAll(closeDb);

const body = {
  clientName: "Store Tester", phone: "13800000001", programId: "PR-1001",
  programRecordId: "PR-1001", paymentCode: "NL-2B3C", privacyAccepted: true,
};
async function call(handler: any, data: Record<string, unknown>, method = "POST", headers = {}) {
  const res = makeRes();
  await handler(makeReq({ method, body: data, headers }) as any, res as any);
  return res;
}
async function order(type = "Digital Program", status = "Pending") {
  await seedClient();
  await rows(`insert into product_orders
    (order_id,client_id,client_name,product_name,product_type,amount,currency,payment_status,wxpay_trade_no)
    values ('ORD-1','CL-9001','Test Athlete','Test purchase',$1,299,'CNY',$2,'NLWEXISTING')`, [type,status]);
}

describe("paused digital store", () => {
  it("ships closed and hides published catalog entries from public and stale clients", async () => {
    expect(STORE_PUBLIC).toBe(false);
    await seedProgram({ public_store_visible: true, product_status: "Active", price: 299 });
    for (const headers of [{}, { "x-coach-key": "wrong" }]) {
      const res = await call(catalog, {}, "GET", headers);
      expect(res.statusCode).toBe(200);
      expect(res.body.programs).toEqual([]);
    }
    vi.stubEnv("COACH_ACCESS_KEY", "");
    expect((await call(catalog, {}, "GET")).body.programs).toEqual([]);
  });

  it("keeps the full program library available to authenticated coaches", async () => {
    await seedProgram({ public_store_visible: false });
    const res = await call(catalog, {}, "GET", { "x-coach-key": "test-coach" });
    expect(res.body.programs).toHaveLength(1);
  });

  it("rejects valid stale checkout before creating clients, orders or assignments", async () => {
    await seedProgram({ public_store_visible: true });
    const res = await call(checkout, body);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe("DIGITAL_STORE_PAUSED");
    const direct = await activateDigitalOrder(body);
    expect(direct.status).toBe(403);
    expect(direct.notices).toEqual([]);
    expect(await rows("select * from clients")).toEqual([]);
    expect(await rows("select * from product_orders")).toEqual([]);
    expect(await rows("select * from assigned_forms")).toEqual([]);
    expect(await rows("select * from assigned_workouts")).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([["Native QR", nativePay], ["mini program", miniPay], ["WeChat web", webPay]])(
    "blocks %s payment for existing digital orders before any provider call or write", async (_name, handler) => {
      await order();
      const before = await rows("select * from product_orders");
      const res = await call(handler, { orderId: "ORD-1", code: "test", openidToken: "test", productType: "Online Coaching" });
      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe("DIGITAL_STORE_PAUSED");
      expect(await rows("select * from product_orders")).toEqual(before);
      expect(provider.query).not.toHaveBeenCalled();
      expect(provider.native).not.toHaveBeenCalled();
      expect(provider.jsapi).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it("blocks a mixed checkout when even one unpaid item is digital", async () => {
    await order("Online Coaching");
    await rows("update product_orders set payment_reference='NL-2B3C'");
    await rows(`insert into product_orders (order_id,client_id,product_type,amount,currency,payment_status,payment_reference)
      values ('ORD-2','CL-9001','Digital Program',99,'CNY','Pending','NL-2B3C')`);
    expect(await prepareWxpayCharge("ORD-1")).toEqual({ state: "store_paused" });
  });

  it("keeps previously paid digital purchases recognizable", async () => {
    await order("Digital Program", "Paid");
    expect((await call(nativePay, { orderId: "ORD-1" })).body.alreadyPaid).toBe(true);
    expect(provider.native).not.toHaveBeenCalled();
  });

  it("blocks new coach-generated digital payment links before creating an order", async () => {
    const res = await call(collect, { label: "Unreleased program", amount: 299, productType: "Digital Program" });
    expect(res.statusCode).toBe(403);
    expect(await rows("select * from product_orders")).toEqual([]);
    expect(provider.native).not.toHaveBeenCalled();
  });

  it("keeps online coaching signup and payment available", async () => {
    const res = await call(coaching, { ...body, stage: "order", termLabel: "1 month", amount: 1500, currency: "CNY" });
    expect(res.statusCode).toBe(200);
    const [saved] = await rows("select * from product_orders");
    expect(saved.product_type).toBe("Online Coaching");
    provider.native.mockResolvedValue({ codeUrl: "weixin://test" });
    const payment = await call(nativePay, { orderId: saved.order_id });
    expect(payment.statusCode).toBe(200);
    expect(provider.native).toHaveBeenCalledWith(expect.objectContaining({ totalFen: 150000 }));
  });
});
