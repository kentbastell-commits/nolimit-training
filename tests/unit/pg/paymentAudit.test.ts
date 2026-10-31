import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import signup from "../../../api/coachingSignup.ts";
import payLink from "../../../api/payLink.ts";
import { prepareWxpayCharge } from "../../../server/wxpay/orderGroup.ts";
import { queryTransaction } from "../../../server/wxpay/client.ts";
import { attachWxpayTradeNo, markOrdersPaidByWxpay, wxpayOrderGroup } from "../../../server/db/repositories/productOrders.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient } from "./helpers.ts";
vi.mock("../../../api/_notify.ts", () => ({notifyCoach:vi.fn()}));
vi.mock("../../../server/wxpay/client.ts", async original => ({...await original<typeof import("../../../server/wxpay/client.ts")>(),queryTransaction:vi.fn()}));
beforeEach(async()=>{await resetDb();vi.clearAllMocks();});
afterEach(()=>vi.unstubAllEnvs());
afterAll(closeDb);
async function post(handler:any,body:Record<string,unknown>){const res=makeRes();await handler(makeReq({method:"POST",body}) as any,res as any);return res;}
const signupBody={stage:"order",clientName:"New athlete",phone:"13800005555",termLabel:"3 Months",paymentCode:"NL-4K5M",privacyAccepted:true};

describe("stored payment amounts and identity",()=>{
  it("can attach and confirm a legacy order whose payment status is still null",async()=>{
    await rows("insert into product_orders(order_id,product_type,payment_status,amount,currency) values('ORD-LEGACY','Manual Collection',null,100,'CNY')");
    expect(await attachWxpayTradeNo(["ORD-LEGACY"],"NLAUDITLEGACY")).toBe(1);
    expect(await markOrdersPaidByWxpay("NLAUDITLEGACY","WX-LOCAL-TEST","2026-10-31T09:00:00+08:00")).toEqual(["ORD-LEGACY"]);
    expect((await rows("select payment_status from product_orders"))[0].payment_status).toBe("Paid");
  });
  it("does not rewrite an already-paid order just because its status has legacy casing or whitespace",async()=>{
    await rows("insert into product_orders(order_id,product_type,payment_status,wxpay_trade_no,paid_at,wxpay_transaction_id) values('ORD-LEGACY','Manual Collection',' paid ','NLAUDITLEGACY',123456,'original-transaction')");
    expect(await markOrdersPaidByWxpay("NLAUDITLEGACY","replacement","2026-10-31T09:00:00+08:00")).toEqual([]);
    const [saved]=await rows("select paid_at,wxpay_transaction_id from product_orders");
    expect(Number(saved.paid_at)).toBe(123456);expect(saved.wxpay_transaction_id).toBe("original-transaction");
  });
  it("prices public coaching from the selected term even if the caller sends one cent",async()=>{
    const res=await post(signup,{...signupBody,amount:0.01,currency:"USD"});
    expect(res.statusCode).toBe(200);
    const [order]=await rows("select amount,currency from product_orders");
    expect(Number(order.amount)).toBe(6300);expect(order.currency).toBe("CNY");
  });
  it("refuses an unknown coaching term before creating an account or order",async()=>{
    const res=await post(signup,{...signupBody,termLabel:"Lifetime",amount:0.01});
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from clients")).toHaveLength(0);
    expect(await rows("select 1 from product_orders")).toHaveLength(0);
  });
  it("does not reassign a payment link that already belongs to another athlete",async()=>{
    await seedClient(); await seedClient({client_id:"CL-9002",full_name:"Other athlete",phone:"13800002222"});
    await rows("insert into product_orders(order_id,client_id,product_type,payment_status,wxpay_trade_no) values('ORD-LINK','CL-9001','Online Coaching','Paid','NLAUDITLINK123')");
    const res=await post(payLink,{tradeNo:"NLAUDITLINK123",action:"identify",name:"Other athlete",phone:"13800002222"});
    expect(res.statusCode).toBe(409);
    expect((await rows("select client_id from product_orders"))[0].client_id).toBe("CL-9001");
  });
  it("keeps identify retries idempotent for the original athlete",async()=>{
    await seedClient({phone:"13800002222",full_name:"Original athlete"});
    await rows("insert into product_orders(order_id,client_id,product_type,payment_status,wxpay_trade_no) values('ORD-LINK','CL-9001','Online Coaching','Pending','NLAUDITRETRY12')");
    const res=await post(payLink,{tradeNo:"NLAUDITRETRY12",action:"identify",name:"Original athlete",phone:"13800002222"});
    expect(res.statusCode).toBe(200);expect(res.body.clientCode).toBe("CL-9001");
    expect(await rows("select 1 from clients")).toHaveLength(1);
  });
  it("serializes competing identities attaching the same unassigned payment",async()=>{
    await seedClient({phone:"13800001111",full_name:"First athlete"});
    await seedClient({client_id:"CL-9002",phone:"13800002222",full_name:"Other athlete"});
    await rows("insert into product_orders(order_id,product_type,payment_status,wxpay_trade_no) values('ORD-RACE','Online Coaching','Paid','NLAUDITRACE123')");
    const results=await Promise.all([
      post(payLink,{tradeNo:"NLAUDITRACE123",action:"identify",name:"First athlete",phone:"13800001111"}),
      post(payLink,{tradeNo:"NLAUDITRACE123",action:"identify",name:"Other athlete",phone:"13800002222"}),
    ]);
    expect(results.map(r=>r.statusCode).sort()).toEqual([200,409]);
    const winner=results.find(r=>r.statusCode===200)!;
    expect((await rows("select client_id from product_orders"))[0].client_id).toBe(winner.body.clientCode);
  });
  it("does not group an unattached order with someone else's matching short payment reference",async()=>{
    await seedClient();
    await rows("insert into product_orders(order_id,client_id,payment_reference,amount) values('ORD-ANON',null,'NL-4K5M',100),('ORD-OTHER','CL-9001','NL-4K5M',200)");
    expect((await wxpayOrderGroup("ORD-ANON")).map(o=>o.orderId)).toEqual(["ORD-ANON"]);
  });
  it.each([1,undefined,NaN])("does not unlock a mismatched or missing provider amount (%s) during checkout reconciliation",async totalFen=>{
    await seedClient();
    await rows("insert into product_orders(order_id,client_id,product_type,payment_status,wxpay_trade_no,amount,currency) values('ORD-AMOUNT','CL-9001','Manual Collection','Pending','NLAUDITAMOUNT',100,'CNY')");
    vi.mocked(queryTransaction).mockResolvedValue({tradeState:"SUCCESS",transactionId:"audit-txn",paidAt:"2026-10-31T09:00:00+08:00",totalFen});
    expect((await prepareWxpayCharge("ORD-AMOUNT")).state).toBe("amount_mismatch");
    expect((await rows("select payment_status from product_orders"))[0].payment_status).toBe("Pending");
  });
  it("does not silently mint a new transaction when provider reconciliation is unavailable",async()=>{
    await seedClient();
    await rows("insert into product_orders(order_id,client_id,product_type,payment_status,wxpay_trade_no,amount,currency) values('ORD-AMOUNT','CL-9001','Manual Collection','Pending','NLAUDITAMOUNT',100,'CNY')");
    vi.mocked(queryTransaction).mockRejectedValue(new Error("Provider unavailable"));
    await expect(prepareWxpayCharge("ORD-AMOUNT")).rejects.toThrow("Provider unavailable");
    expect((await rows("select wxpay_trade_no,payment_status from product_orders"))[0]).toMatchObject({wxpay_trade_no:"NLAUDITAMOUNT",payment_status:"Pending"});
  });
  it("permits retry if the provider definitively confirms the earlier create never existed",async()=>{
    await seedClient();
    await rows("insert into product_orders(order_id,client_id,product_type,payment_status,wxpay_trade_no,amount,currency) values('ORD-AMOUNT','CL-9001','Manual Collection','Pending','NLAUDITAMOUNT',100,'CNY')");
    vi.mocked(queryTransaction).mockResolvedValue({tradeState:"NOT_FOUND"});
    expect(await prepareWxpayCharge("ORD-AMOUNT")).toMatchObject({state:"chargeable",totalFen:10000});
  });
});
