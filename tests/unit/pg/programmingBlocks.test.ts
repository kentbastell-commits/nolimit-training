import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import handler from "../../../api/programmingBlocks.ts";
import { closeDb, makeReq, makeRes, resetDb, rows } from "./helpers.ts";
beforeEach(resetDb); afterAll(closeDb);
const exercise = { exerciseId: "EX-1", exerciseName: "Hold", sectionName: "Core", groupType: "Circuit", groupName: "Core 1", groupMode: "EMOM", groupMinutes: "12", sets: "3", coachingNotes: "Hold the bottom position", coachingNotesCn: "保持底部姿势，脚掌均匀受力。", setPrescriptions: [{ time: "30 s", rest: "60 s" }] };
async function call(method = "GET", body: any = {}) { const res = makeRes(); await handler(makeReq({ method, body }) as any, res as any); return res; }
const input = () => ({ id: randomUUID(), version: 0, name: "Core circuit", nameCn: "核心循环", exercises: [exercise, { ...exercise, exerciseId: "EX-2" }] });
describe("durable exercise blocks", () => {
  it("preserves complete bilingual circuit prescriptions across requests", async () => {
    const body = input(); expect((await call("POST", body)).statusCode).toBe(200);
    expect((await call()).body.blocks[0]).toMatchObject({ ...body, version: 1 });
    await call("POST", { id: body.id, version: 1, action: "favorite" });
    await call("POST", { id: body.id, version: 2, action: "used" });
    const block = (await call()).body.blocks[0]; expect(block.favorite).toBe(true); expect(block.lastUsedAt).toBeGreaterThan(0); expect(block.exercises).toEqual(body.exercises);
    expect(await rows("select * from assigned_workouts")).toHaveLength(0);
  });
  it("rejects racing writes and stale deletes", async () => {
    const body = input(); const results = await Promise.all([call("POST", body), call("POST", body)]);
    expect(results.map(r => r.statusCode).sort()).toEqual([200, 409]);
    expect((await call("POST", { id: body.id, version: 0, action: "delete" })).statusCode).toBe(409);
    expect((await call("POST", { id: body.id, version: 1, action: "delete" })).statusCode).toBe(200);
    expect((await call()).body.blocks).toEqual([]);
  });
  it("rejects malformed blocks and unauthorized readers or writers", async () => {
    for (const patch of [{ name: " " }, { exercises: [] }, { exercises: [{ ...exercise, sets: "x" }] }, { version: -1 }]) expect((await call("POST", { ...input(), ...patch })).statusCode).toBe(400);
    vi.stubEnv("COACH_ACCESS_KEY", "test-key");
    try { expect((await call()).statusCode).toBe(401); expect((await call("POST", input())).statusCode).toBe(401); } finally { vi.unstubAllEnvs(); }
    expect(await rows("select * from programming_blocks")).toHaveLength(0);
  });
});
