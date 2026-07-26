// Ported from tests/unit/api/{createProductOrder,updateProductOrder,
// productOrders}.test.ts, which asserted Feishu mechanics (link-field arrays,
// Lark error payloads) that no longer exist. These drive the same handlers
// against real Postgres and assert on rows.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import createHandler from "../../../api/createProductOrder.ts";
import updateHandler from "../../../api/updateProductOrder.ts";
import listHandler from "../../../api/productOrders.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

async function createOrder(body: Record<string, any>) {
  const res = makeRes();
  await createHandler(makeReq({ method: "POST", body }) as any, res as any);
  return res;
}

describe("api/createProductOrder (postgres)", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await createHandler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("400s without a client name", async () => {
    const res = await createOrder({ productName: "Program A" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing client name");
    expect(await rows("select 1 from product_orders")).toHaveLength(0);
  });

  it("400s without a product or program", async () => {
    const res = await createOrder({ clientName: "Bob" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing product or program");
    expect(await rows("select 1 from product_orders")).toHaveLength(0);
  });

  it("persists phone and notes — they were dropped silently before 0007", async () => {
    const res = await createOrder({
      clientName: "Bob Tan",
      productName: "Program A",
      phone: "13800000009",
      notes: "paid in cash at the gym",
    });
    expect(res.statusCode).toBe(200);

    // Named mistake #43: these two inputs were decorative on both backends —
    // collected by the manual-order form, then thrown away.
    const [order] = await rows("select client_phone, order_notes from product_orders");
    expect(order.client_phone).toBe("13800000009");
    expect(order.order_notes).toBe("paid in cash at the gym");
  });

  it("reports inputs that have no column instead of silently dropping them", async () => {
    const res = await createOrder({
      clientName: "Bob Tan",
      productName: "Program A",
      email: "bob@example.com",
      accessEndDate: "2026-12-01",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.omittedFields).toContain("Email");
    expect(res.body.omittedFields).toContain("Access End Date");
  });

  it("defaults a coach-created order to Paid (unlike a buyer's self-serve order)", async () => {
    const res = await createOrder({ clientName: "Bob Tan", productName: "Program A" });
    expect(res.statusCode).toBe(200);

    // This path is a coach recording a payment they have already verified,
    // which is why it may default to Paid where activateDigitalOrder must
    // not. Pinned so the two paths can't quietly converge.
    const [order] = await rows("select payment_status from product_orders");
    expect(order.payment_status).toBe("Paid");
  });

  it("500s rather than writing an order pointing at a program that doesn't exist", async () => {
    const res = await createOrder({
      clientName: "Bob Tan",
      programId: "PR-NOPE",
      productName: "Ghost",
    });

    expect(res.statusCode).toBe(500);
    expect(await rows("select 1 from product_orders")).toHaveLength(0);
  });

  it("links the order to a real program", async () => {
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    const res = await createOrder({
      clientName: "Bob Tan",
      programId: "PR-1001",
      productName: "Test Program",
    });

    expect(res.statusCode).toBe(200);
    const [order] = await rows("select program_id from product_orders");
    expect(order.program_id).toBe("PR-1001");
  });
});

describe("api/updateProductOrder (postgres)", () => {
  async function seedOrder() {
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });
    const res = await createOrder({
      clientName: "Bob Tan",
      programId: "PR-1001",
      productName: "Test Program",
    });
    return res.body.orderId as string;
  }

  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await updateHandler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("400s when recordId is missing", async () => {
    const res = makeRes();
    await updateHandler(
      makeReq({ method: "POST", body: { paymentStatus: "Paid" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing product order recordId");
  });

  it("400s when nothing in the payload maps to a column", async () => {
    const orderId = await seedOrder();
    const res = makeRes();
    await updateHandler(
      makeReq({ method: "POST", body: { recordId: orderId, onboardingStatus: "New" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("No matching product order columns found");
    expect(res.body.omittedFields).toContain("Onboarding Status");
  });

  it("updates payment status and the client link", async () => {
    const orderId = await seedOrder();
    const res = makeRes();
    await updateHandler(
      makeReq({
        method: "POST",
        body: { recordId: orderId, paymentStatus: "Paid", clientCode: "CL-9001" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    const [order] = await rows(
      "select payment_status, client_id from product_orders where order_id = $1",
      [orderId]
    );
    expect(order.payment_status).toBe("Paid");
    expect(order.client_id).toBe("CL-9001");
  });

  it("treats an explicit empty string as a clear, not an omit", async () => {
    const orderId = await seedOrder();
    const res = makeRes();
    await updateHandler(
      makeReq({ method: "POST", body: { recordId: orderId, programId: "" } }) as any,
      res as any
    );

    // Named mistake #43: on Postgres "" means CLEAR (write null). The
    // Feishu-era habit of omitting empties made "remove this" a silent no-op.
    expect(res.statusCode).toBe(200);
    const [order] = await rows("select program_id from product_orders where order_id = $1", [
      orderId,
    ]);
    expect(order.program_id).toBeNull();
  });
});

describe("api/productOrders list (postgres)", () => {
  it("returns [] when there are no orders", async () => {
    const res = makeRes();
    await listHandler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body.orders).toEqual([]);
  });

  it("maps rows to the portal order shape, including phone and notes", async () => {
    await createOrder({
      clientName: "Bob Tan",
      productName: "Program A",
      amount: 499,
      phone: "13800000009",
      notes: "cash",
    });

    const res = makeRes();
    await listHandler(makeReq({ method: "GET" }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.orders).toHaveLength(1);
    const [order] = res.body.orders;
    expect(order.clientName).toBe("Bob Tan");
    expect(order.productName).toBe("Program A");
    expect(order.amount).toBe("499");
    expect(order.phone).toBe("13800000009");
    expect(order.notes).toBe("cash");
    expect(order.orderId).toMatch(/^ORD-/);
    // Business code is the identity on Postgres.
    expect(order.recordId).toBe(order.orderId);
  });
});
