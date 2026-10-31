import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { attachWxpayTradeNo, markOrdersPaidByWxpay, ordersByWxpayTradeNo } from "../../../server/db/repositories/productOrders.ts";
import { prepareWxpayCharge } from "../../../server/wxpay/orderGroup.ts";
import { closeTransaction, queryTransaction } from "../../../server/wxpay/client.ts";
import { notifyCoach } from "../../../api/_notify.ts";
import { closeDb, resetDb, rows, seedClient } from "./helpers.ts";

vi.mock("../../../api/_notify.ts", () => ({ notifyCoach: vi.fn() }));
vi.mock("../../../server/wxpay/client.ts", () => ({ queryTransaction: vi.fn(), closeTransaction: vi.fn() }));
beforeEach(async () => { await resetDb(); vi.resetAllMocks(); await seedClient(); });
afterAll(closeDb);
async function order(id = "ORD-ATTEMPT", amount = 100, trade = "") {
  await rows(`insert into product_orders(order_id,client_id,product_type,payment_status,amount,currency,wxpay_trade_no,payment_reference)
    values($1,'CL-9001','Online Coaching','Pending',$2,'CNY',$3,'NL-4K5M')`, [id, amount, trade]);
}

describe("durable WeChat payment attempts", () => {
  it("settles the original order when the old QR is paid after a new QR was recorded", async () => {
    await order();
    await attachWxpayTradeNo(["ORD-ATTEMPT"], "NLATTEMPTOLD");
    await attachWxpayTradeNo(["ORD-ATTEMPT"], "NLATTEMPTNEW");
    expect((await ordersByWxpayTradeNo("NLATTEMPTOLD")).map(o => o.orderId)).toEqual(["ORD-ATTEMPT"]);
    expect(await markOrdersPaidByWxpay("NLATTEMPTOLD", "wx-old", "2026-10-31T12:00:00+08:00")).toEqual(["ORD-ATTEMPT"]);
    const [saved] = await rows("select payment_status,wxpay_trade_no,wxpay_transaction_id from product_orders");
    expect(saved).toMatchObject({ payment_status: "Paid", wxpay_trade_no: "NLATTEMPTNEW", wxpay_transaction_id: "wx-old" });
    expect(await rows("select assigned_form_id from assigned_forms")).toHaveLength(1);
  });

  it("keeps the original price and membership even if later orders and prices change", async () => {
    await order(); await order("ORD-SECOND", 50);
    await attachWxpayTradeNo(["ORD-ATTEMPT", "ORD-SECOND"], "NLATTEMPTOLD");
    await rows("update product_orders set amount=999 where order_id='ORD-ATTEMPT'");
    await order("ORD-LATER", 25);
    const original = await ordersByWxpayTradeNo("NLATTEMPTOLD");
    expect(original.map(o => [o.orderId, o.amount])).toEqual([["ORD-ATTEMPT", 100], ["ORD-SECOND", 50]]);
  });

  it("retains an older worker's full trade, including an already-verified group member", async () => {
    await order("ORD-ATTEMPT", 100, "NLLEGACYTRADE"); await order("ORD-SECOND", 50, "NLLEGACYTRADE");
    await rows("update product_orders set payment_status='Paid' where order_id='ORD-SECOND'");
    await attachWxpayTradeNo(["ORD-ATTEMPT"], "NLATTEMPTNEW");
    expect((await ordersByWxpayTradeNo("NLLEGACYTRADE")).reduce((sum, o) => sum + o.amount, 0)).toBe(150);
    expect(await markOrdersPaidByWxpay("NLLEGACYTRADE", "wx-legacy")).toEqual(["ORD-ATTEMPT"]);
  });

  it("serializes competing preparations so only one can replace the expected attempt", async () => {
    await order();
    const expected = [{ orderId: "ORD-ATTEMPT", wxpayTradeNo: "" }];
    const results = await Promise.allSettled([
      attachWxpayTradeNo(["ORD-ATTEMPT"], "NLCONCURRENT1", 10000, expected),
      attachWxpayTradeNo(["ORD-ATTEMPT"], "NLCONCURRENT2", 10000, expected),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await rows("select trade_no from wxpay_order_attempts")).toHaveLength(1);
  });

  it("refuses a changed price or paid order without recording another attempt", async () => {
    await order();
    await expect(attachWxpayTradeNo(["ORD-ATTEMPT"], "NLATTEMPTNEW", 1)).rejects.toThrow("price changed");
    await rows("update product_orders set payment_status='Paid'");
    await expect(attachWxpayTradeNo(["ORD-ATTEMPT"], "NLATTEMPTNEW", 10000)).rejects.toThrow("Order changed");
    expect(await rows("select * from wxpay_order_attempts")).toHaveLength(0);
  });

  it("cannot attach an existing provider trade to another checkout", async () => {
    await order(); await order("ORD-SECOND");
    await attachWxpayTradeNo(["ORD-ATTEMPT"], "NLATTEMPTOLD");
    await expect(attachWxpayTradeNo(["ORD-SECOND"], "NLATTEMPTOLD")).rejects.toThrow("another checkout");
    expect((await ordersByWxpayTradeNo("NLATTEMPTOLD")).map(o => o.orderId)).toEqual(["ORD-ATTEMPT"]);
  });

  it("records both receipts but activates once if two historical attempts are paid concurrently", async () => {
    await order(); await attachWxpayTradeNo(["ORD-ATTEMPT"], "NLATTEMPTOLD"); await attachWxpayTradeNo(["ORD-ATTEMPT"], "NLATTEMPTNEW");
    const result = await Promise.all([
      markOrdersPaidByWxpay("NLATTEMPTOLD", "wx-old"), markOrdersPaidByWxpay("NLATTEMPTNEW", "wx-new"),
    ]);
    expect(result.flat()).toEqual(["ORD-ATTEMPT"]);
    expect(await rows("select * from assigned_forms")).toHaveLength(1);
    expect((await rows("select transaction_id from wxpay_order_attempts order by trade_no")).map(r => r.transaction_id)).toEqual(["wx-new", "wx-old"]);
    expect(notifyCoach).toHaveBeenCalledTimes(1);
    await markOrdersPaidByWxpay("NLATTEMPTOLD", "wx-old"); await markOrdersPaidByWxpay("NLATTEMPTNEW", "wx-new");
    expect(notifyCoach).toHaveBeenCalledTimes(1);
  });

  it("closes a still-payable QR before offering a new attempt", async () => {
    await order("ORD-ATTEMPT", 100, "NLATTEMPTOLD");
    vi.mocked(queryTransaction).mockResolvedValue({ tradeState: "NOTPAY" });
    expect(await prepareWxpayCharge("ORD-ATTEMPT")).toMatchObject({ state: "chargeable", totalFen: 10000 });
    expect(closeTransaction).toHaveBeenCalledWith("NLATTEMPTOLD");
  });

  it("does not replace a QR when closure fails or a payment is processing", async () => {
    await order("ORD-ATTEMPT", 100, "NLATTEMPTOLD");
    vi.mocked(queryTransaction).mockResolvedValue({ tradeState: "NOTPAY" });
    vi.mocked(closeTransaction).mockRejectedValue(new Error("close unavailable"));
    await expect(prepareWxpayCharge("ORD-ATTEMPT")).rejects.toThrow("close unavailable");
    vi.mocked(queryTransaction).mockResolvedValue({ tradeState: "USERPAYING" });
    await expect(prepareWxpayCharge("ORD-ATTEMPT")).rejects.toThrow("still processing");
    expect((await rows("select wxpay_trade_no from product_orders"))[0].wxpay_trade_no).toBe("NLATTEMPTOLD");
  });

  it("rejects a competing replacement that appears while the old QR is being closed", async () => {
    await order("ORD-ATTEMPT", 100, "NLATTEMPTOLD");
    vi.mocked(queryTransaction).mockResolvedValue({ tradeState: "NOTPAY" });
    vi.mocked(closeTransaction).mockImplementation(async () => { await attachWxpayTradeNo(["ORD-ATTEMPT"], "NLCONCURRENT1"); });
    await expect(prepareWxpayCharge("ORD-ATTEMPT")).rejects.toThrow("Checkout changed");
  });
});
