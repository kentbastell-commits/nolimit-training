import { afterAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import handler from "../../../api/coachDrafts.ts";
import { closeDb, makeReq, makeRes, resetDb, rows } from "./helpers.ts";
beforeEach(async () => { await resetDb(); vi.stubEnv("COACH_ACCESS_KEY", "coach-a"); });
afterEach(() => vi.unstubAllEnvs()); afterAll(closeDb);
const input = () => ({ id: randomUUID(), revision: randomUUID(), expectedRevision: null, title: "核心 · Draft", snapshot: { programName: "Core", programSessions: [{ localId:"s1", exercises:[{ coachingNotesCn:"保持底部姿势。", sets:"2" }] }], selectedProgramExercises:[], assignedSessionEdit: {version:"live-version",baseSession:{sets:2}} } });
async function call(method = "GET", body: any = {}, key = "coach-a") { const res = makeRes(); await handler(makeReq({ method, body, headers: { "x-coach-key": key } }) as any, res as any); return res; }
describe("unpublished cloud drafts", () => {
  it("round trips bilingual snapshots and recovery baselines without changing assignments", async () => {
    const body = input(); expect((await call("POST", body)).statusCode).toBe(200);
    expect((await call()).body.drafts[0]).toMatchObject({ id: body.id, revision: body.revision, snapshot: body.snapshot });
    expect((await call()).body.drafts[0].owner).toBeUndefined();
    expect(await rows("select * from assigned_workouts")).toHaveLength(0);
    expect(await rows("select * from programs")).toHaveLength(0);
  });
  it("uses atomic revisions across concurrent devices, and retries safely", async () => {
    const first = input(); await call("POST", first);
    const a = { ...first, revision: randomUUID(), expectedRevision: first.revision }, b = { ...a, revision:randomUUID() };
    const result = await Promise.all([call("POST", a), call("POST", b)]);
    expect(result.map(r=>r.statusCode).sort()).toEqual([200,409]);
    const winner = result[0].statusCode === 200 ? a : b;
    expect((await call("POST", winner)).statusCode).toBe(200);
    expect((await call("POST", {...winner, revision:randomUUID(), expectedRevision:first.revision, deleted:true})).statusCode).toBe(409);
  });
  it("retains deletion tombstones so offline copies cannot resurrect published drafts", async () => {
    const body = input(); await call("POST",body);
    const deletion = {...body,revision:randomUUID(),expectedRevision:body.revision,deleted:true};
    expect((await call("POST",deletion)).statusCode).toBe(200);
    expect((await call("POST",deletion)).statusCode).toBe(200);
    expect((await call()).body.drafts[0]).toMatchObject({deleted:true,snapshot:null,title:""});
    expect((await call("POST",{...body,revision:randomUUID()})).statusCode).toBe(409);
    expect((await call("POST",{...body,revision:randomUUID(),expectedRevision:deletion.revision})).statusCode).toBe(409);
  });
  it("requires positive coach proof and scopes drafts to server-derived identity", async () => {
    await call("POST",input());
    expect((await call("GET",{},"wrong")).statusCode).toBe(401);
    vi.stubEnv("COACH_ACCESS_KEY","coach-b"); expect((await call("GET",{},"coach-b")).body.drafts).toEqual([]);
    vi.stubEnv("COACH_ACCESS_KEY",""); expect((await call()).statusCode).toBe(401);
  });
  it("rejects malformed snapshot, identity and revision before storage", async () => {
    for(const patch of [{snapshot:{}},{id:"bad"},{expectedRevision:5},{title:"x".repeat(501)},{snapshot:{programName:"X",selectedProgramExercises:[],programSessions:[{}]}}]) expect((await call("POST",{...input(),...patch})).statusCode).toBe(400);
    expect(await rows("select * from coach_drafts")).toHaveLength(0);
  });
});
