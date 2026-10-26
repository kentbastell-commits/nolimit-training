import { describe, expect, it } from "vitest";
import { athleteOrders, latestPayment, paymentDateInput, profileDraft, profilePayload } from "../../../src/clientProfile";
import type { Client, ProductOrder } from "../../../src/appCore";
const client = { id: "CL-0002", clientCode: "CL-0002", name: "Mei Lin", coach: "Kent Bastell", status: "Active", accessStartDate: "--" } as Client;
const coaches = [{ coachId: "COACH-KENT", name: "Kent Bastell" }, { coachId: "COACH-MARIO", name: "Mario Artukovic" }];
describe("client profile data", () => {
  it("uses athlete identity rather than matching names for financial records", () => {
    const orders = [{ clientId: "CL-0003", clientName: "Mei Lin" }, { clientId: "", clientName: "Mei Lin" }, { clientId: "CL-0002", clientName: "Old name" }] as ProductOrder[];
    expect(athleteOrders(client, orders)).toEqual([orders[2]]);
  });
  it("uses completed payment dates, never order creation dates or unpaid orders", () => {
    const orders = [
      { paymentStatus: "Paid", purchasedAt: "2026-10-15" },
      { paymentStatus: "Pending", paidAt: "2026-10-15" },
      { paymentStatus: "Paid", paidAt: "2026-10-08T12:00:00+08:00", purchasedAt: "2026-09-01" },
      { paymentStatus: "Paid", paidAt: "2026-10-12T12:00:00+08:00", purchasedAt: "2026-08-01" },
    ] as ProductOrder[];
    expect(latestPayment(orders)).toBe(orders[3]);
    expect(latestPayment([orders[0]])).toBeUndefined();
  });
  it("resolves coaches, clears placeholder dates, and writes the complete edited profile", () => {
    const draft = profileDraft(client, coaches);
    expect(draft.primaryCoachId).toBe("COACH-KENT");
    expect(draft.accessStartDate).toBe("");
    const payload = profilePayload(client, { ...draft, primaryCoachId: "COACH-MARIO", secondaryCoachId: "COACH-KENT", notes: "Climbing", categories: ["Climbing"] }, coaches);
    expect(payload).toMatchObject({ clientRecordId: client.id, coach: "Mario Artukovic", secondaryCoachId: "COACH-KENT", tags: ["Climbing"], categories: [] });
  });
  it("rejects invalid access windows and duplicate coaches", () => {
    const draft = profileDraft(client, coaches);
    expect(() => profilePayload(client, { ...draft, secondaryCoachId: draft.primaryCoachId }, coaches)).toThrow("different");
    expect(() => profilePayload(client, { ...draft, accessStartDate: "2026-10-15", accessEndDate: "2026-10-01" }, coaches)).toThrow("Access end");
  });
  it("edits payment dates in the athlete's China calendar day", () => {
    expect(paymentDateInput("2026-10-14T17:00:00Z")).toBe("2026-10-15");
    expect(paymentDateInput("not-a-date")).toBe("");
  });
  it("retains existing categories as tags and trims private aliases without changing the real name", () => {
    const source = { ...client, tags: ["Climbing"], categories: ["Youth", "Climbing"], coachAlias: " Jason ", tagColors: { Youth: "#223344", Climbing: "invalid", Removed: "#112233" } };
    const draft = profileDraft(source, coaches);
    expect(draft.tags).toEqual(["Climbing", "Youth"]);
    const payload = profilePayload(source, draft, coaches);
    expect(payload).toMatchObject({ name: "Mei Lin", coachAlias: "Jason", tags: ["Climbing", "Youth"], categories: [], tagColors: { Youth: "#223344" } });
  });
});
