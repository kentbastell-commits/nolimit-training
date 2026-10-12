import { describe, expect, it } from "vitest";
import { groupUnpaidCheckouts, isOrderCancelled, isOrderPaid, isTestOrder, orderIntakeState } from "../../../src/orderPresentation";

describe("order presentation", () => {
  it("keeps CC's aliases together using the account ID without merging other athletes", () => {
    const groups=groupUnpaidCheckouts([{clientId:"CL-CC",clientName:"CC"},{clientId:"CL-CC",clientName:"陈聪"},{clientId:"CL-OTHER",clientName:"CC"}]);
    expect(groups.map(g=>g.orders.length)).toEqual([2,1]);
  });
  it("separates renewals from intake work even if their intake status is stale", () => {
    expect(orderIntakeState({intakeStatus:"Sent",notes:"Pay link purpose: online-renewal"})).toBe("not-required");
    expect(orderIntakeState({intakeStatus:"Not Needed"},{intakeStatus:"Sent"})).toBe("not-required");
    expect(orderIntakeState({intakeStatus:"Sent"},{intakeStatus:"Submitted"})).toBe("complete");
    expect(orderIntakeState({intakeStatus:"Not Sent"})).toBe("pending");
  });
  it("recognizes payment state exactly rather than treating Unpaid as Paid", () => {
    expect(isOrderPaid({paymentStatus:"Unpaid"})).toBe(false);
    expect(isOrderPaid({paymentStatus:" Paid "})).toBe(true);
    expect(isOrderCancelled({paymentStatus:"Cancelled"})).toBe(true);
  });
  it("uses explicit test markers and leaves ordinary customer names alone", () => {
    expect(isTestOrder({clientName:"Battery Test 1784644538425"})).toBe(true);
    expect(isTestOrder({paymentProvider:"Internal Demo"})).toBe(true);
    expect(isTestOrder({productName:"Payment Test 0.01"})).toBe(true);
    expect(isTestOrder({clientName:"Test Athlete",productName:"Monthly coaching"})).toBe(false);
  });
});
