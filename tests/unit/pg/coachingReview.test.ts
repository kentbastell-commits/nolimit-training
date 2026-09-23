import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import handler, { history } from "../../../api/coachingReview.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient } from "./helpers.ts";
import { createCheckIn, listCheckIns, reviewCheckIn } from "../../../server/db/pg/checkIns.ts";
beforeEach(resetDb); afterAll(closeDb);
const item = { key: "checkin:CI-1", revision: "v1", kind: "checkin", clientId: "CL-1", clientName: "Athlete", title: "Daily check-in", date: "2026-09-23", priority: 1 };
async function call(method = "GET", body: any = {}, query: any = {}, fn = handler) { const res = makeRes(); await fn(makeReq({ method, body, query }) as any, res as any); return res; }
const decision = (version = 0, status = "resolved") => ({ key: item.key, revision: item.revision, status, version, item, note: "Discussed in WeChat" });
describe("durable coaching decisions", () => {
  it("reopens an edited same-day check-in without losing the previous coach reply", async () => {
    await seedClient({ client_id: "CL-1" });
    const input = { clientId: "CL-1", clientRecordId: "CL-1", submittedDate: "2026-09-23", energy: "4", trainingNotes: "Felt good" };
    const first = await createCheckIn(input);
    await reviewCheckIn({ recordId: first.recordId!, coachResponse: "Keep the same plan" });
    expect((await listCheckIns())[0].coachReviewed).toBe(true);
    const second = await createCheckIn({ ...input, energy: "1", trainingNotes: "Correction: tired today" });
    expect(second.recordId).toBe(first.recordId);
    expect((await listCheckIns())[0]).toMatchObject({ coachReviewed: false, energy: "1", trainingNotes: "Correction: tired today", coachResponse: "Keep the same plan" });
    await reviewCheckIn({ recordId: first.recordId!, coachResponse: "Reduce the session" });
    expect((await listCheckIns())[0].coachReviewed).toBe(true);
  });
  it("saves state and append-only history together, and reads them after another request", async () => {
    const res = await call("POST", decision()); expect(res.statusCode).toBe(200);
    expect((await call()).body.states[0]).toMatchObject({ version: 1, status: "resolved", item, note: "Discussed in WeChat" });
    await call("POST", { ...decision(1, "snoozed"), until: Date.now() + 86400000, note: "Check tomorrow" });
    const events = (await call("GET", {}, { key: item.key }, history)).body.events;
    expect(events.map((e: any) => e.status)).toEqual(["snoozed", "resolved"]);
    expect((await rows("select * from coaching_review_states"))).toHaveLength(1);
    expect((await rows("select * from coaching_review_history"))).toHaveLength(2);
  });
  it("rejects overlapping saves and stale tabs, including the first insert", async () => {
    const results = await Promise.all([call("POST", decision()), call("POST", decision())]);
    expect(results.map(r => r.statusCode).sort()).toEqual([200, 409]);
    expect((await call("POST", decision())).statusCode).toBe(409);
    expect(await rows("select * from coaching_review_history")).toHaveLength(1);
  });
  it("lets a revised source get a new decision without deleting prior events", async () => {
    await call("POST", decision());
    const res = await call("POST", { ...decision(1), revision: "v2", item: { ...item, revision: "v2" } });
    expect(res.body.state.revision).toBe("v2"); expect(await rows("select * from coaching_review_history")).toHaveLength(2);
  });
  it("validates snooze dates, version and snapshot; drops unexpected source data", async () => {
    for (const patch of [{ until: Date.now() - 1000, status: "snoozed" }, { version: -1 }, { item: { ...item, key: "wrong" } }, { note: "x".repeat(2001) }]) expect((await call("POST", { ...decision(), ...patch })).statusCode).toBe(400);
    const res = await call("POST", { ...decision(), item: { ...item, source: { unnecessary: "data" } } });
    expect(res.body.state.item.source).toBeUndefined();
    expect((await call("DELETE")).statusCode).toBe(405);
  });
  it("requires coach credentials on state, history and writes", async () => {
    vi.stubEnv("COACH_ACCESS_KEY", "test-secret");
    try { expect((await call()).statusCode).toBe(401); expect((await call("POST", decision())).statusCode).toBe(401); expect((await call("GET", {}, {}, history)).statusCode).toBe(401); }
    finally { vi.unstubAllEnvs(); }
    expect(await rows("select * from coaching_review_history")).toHaveLength(0);
  });
});
