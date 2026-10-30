import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { closeDb, resetDb, rows, seedClient } from "./helpers.ts";
import { prepareWxpayCharge } from "../../../server/wxpay/orderGroup.ts";
import { markOrdersPaidByWxpay } from "../../../server/db/repositories/productOrders.ts";

vi.mock("../../../server/wxpay/client.ts", () => ({
  queryTransaction: vi.fn(async () => ({
    tradeState: "SUCCESS", transactionId: "reconciled-txn", paidAt: "2026-10-12T09:30:00+08:00",
  })),
}));
vi.mock("../../../api/_notify.ts", () => ({ notifyCoach: vi.fn() }));
beforeEach(resetDb);
afterAll(closeDb);

it("records the provider completion time when checkout discovers a paid trade before its callback", async () => {
  await seedClient();
  await rows("insert into product_orders(order_id,client_id,product_type,payment_status,wxpay_trade_no,amount,currency) values('ORD-RECONCILE','CL-9001','Manual Collection','Pending','NLRECONCILE',100,'CNY')");
  expect(await prepareWxpayCharge("ORD-RECONCILE")).toEqual({ state: "already_paid" });
  const [order] = await rows("select payment_status,paid_at from product_orders where order_id='ORD-RECONCILE'");
  expect(order.payment_status).toBe("Paid");
  expect(Number(order.paid_at)).toBe(Date.parse("2026-10-12T09:30:00+08:00"));
  expect(await markOrdersPaidByWxpay("NLRECONCILE", "reconciled-txn", "2026-10-15T09:30:00+08:00")).toEqual([]);
  expect((await rows("select paid_at from product_orders where order_id='ORD-RECONCILE'"))[0].paid_at).toBe(order.paid_at);
});
