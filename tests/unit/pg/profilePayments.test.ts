import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import updateOrderHandler from "../../../api/updateProductOrder.ts";
import { upsertSubscription } from "../../../server/db/repositories/subscriptions.ts";
import { createProductOrder, listProductOrders, updateProductOrder } from "../../../server/db/repositories/productOrders.ts";
import { closeDb, resetDb, rows, seedClient, makeReq, makeRes } from "./helpers.ts";
beforeEach(resetDb);
afterAll(closeDb);
describe("profile payment dates", () => {
  it("requires coach access to edit a financial record", async () => {
    vi.stubEnv("COACH_ACCESS_KEY", "private-coach-key");
    try {
      const res = makeRes();
      await updateOrderHandler(makeReq({ method: "POST", body: { recordId: "ORD-P1", paidAt: "2026-10-12" } }) as never, res as never);
      expect(res.statusCode).toBe(401);
    } finally { vi.unstubAllEnvs(); }
  });
  it("clears subscription dates when the profile editor removes them", async () => {
    await seedClient();
    const made = await upsertSubscription({ clientRecordId: "CL-9001", startDate: "2026-10-01", nextBillingDate: "2026-11-01", plan: "Custom" });
    await upsertSubscription({ recordId: String(made.recordId), startDate: "", nextBillingDate: "" });
    expect((await rows("select start_date, next_billing_date from subscriptions"))[0]).toMatchObject({ start_date: null, next_billing_date: null });
  });
  it("keeps historical payment dates unknown instead of copying order creation", async () => {
    await createProductOrder({ clientName: "Mei Lin", productName: "Coaching", paymentStatus: "Paid", purchasedAt: "2026-10-01" });
    expect((await listProductOrders())[0]).toMatchObject({ purchasedAt: "2026-10-01", paidAt: "" });
  });
  it("saves, reads, clears and validates a coach-entered payment date", async () => {
    const result = await createProductOrder({ clientName: "Mei Lin", productName: "Coaching", paymentStatus: "Paid" });
    const id = String(result.body.recordId);
    expect((await updateProductOrder({ recordId: id, paidAt: "2026-10-12T12:00:00+08:00" })).success).toBe(true);
    expect((await listProductOrders())[0].paidAt).toBe("2026-10-12T04:00:00.000Z");
    const invalid = await updateProductOrder({ recordId: id, paidAt: "wrong" });
    expect(invalid.status).toBe(400);
    expect((await listProductOrders())[0].paidAt).toBe("2026-10-12T04:00:00.000Z");
    await updateProductOrder({ recordId: id, paidAt: "" });
    expect((await listProductOrders())[0].paidAt).toBe("");
  });
});
