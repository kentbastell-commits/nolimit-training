import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import findPortal from "../../../api/findMyPortal.ts";
import sessionHandler from "../../../api/athleteSession.ts";
import wxAuth from "../../../api/wxAuth.ts";
import wxLogin from "../../../api/wxLogin.ts";
import { createAthleteSession, readAthleteSession, athleteSessionsRequired } from "../../../server/athleteAuth.ts";
import { authorizeAthleteRequest } from "../../../server/athleteAccess.ts";
import { completeWxLoginToken, createWxLoginToken, consumeWxLoginToken } from "../../../server/db/pg/wxLoginTokens.ts";
import { makeCheckoutKey } from "../../../server/checkoutAuth.ts";
import { closeDb, resetDb, rows, seedClient, seedProgram, makeReq, makeRes } from "./helpers.ts";

beforeEach(async () => {
  await resetDb();
  vi.stubEnv("ATHLETE_SESSION_MODE", "required"); vi.stubEnv("COACH_ACCESS_KEY", "audit-coach");
  vi.stubEnv("PAY_LINK_SECRET", "audit-payment-link-secret");
  await seedClient({ full_name: "Athlete A", login_pin: "123456", phone: "13800000001", wechat_openid: "openid-a" });
  await seedClient({ client_id: "CL-9002", full_name: "Athlete B", login_pin: "654321", phone: "13800000002" });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
afterAll(closeDb);
function req(method = "GET", data: Record<string, unknown> = {}, token = "", headers = {}) {
  return makeReq({ method, ...(method === "GET" ? { query: data } : { body: data }),
    headers: { host: "localhost:5198", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers } }) as any;
}
function res() {
  const result = makeRes() as ReturnType<typeof makeRes> & { headers: Record<string, string> };
  result.headers = {}; result.setHeader = (name, value) => { result.headers[name.toLowerCase()] = value; return result; };
  return result;
}
async function access(name: string, method = "GET", data: Record<string, unknown> = {}, token = "", headers = {}) {
  const request = req(method, data, token, headers), response = res();
  const allowed = await authorizeAthleteRequest(name, request, response as any);
  return { allowed, request, response };
}

describe("athlete credentials", () => {
  it("stores only a hash of a random session and supports independent devices", async () => {
    const first = await createAthleteSession("CL-9001", "pin"), second = await createAthleteSession("CL-9001", "wechat");
    expect(first.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/); expect(first.sessionToken).not.toBe(second.sessionToken);
    const stored = await rows("select token_hash from athlete_sessions");
    expect(stored.map(r => r.token_hash)).toContain(createHash("sha256").update(first.sessionToken).digest("hex"));
    expect(JSON.stringify(stored)).not.toContain(first.sessionToken);
    expect(await readAthleteSession(req("GET", {}, first.sessionToken))).toMatchObject({ clientId: "CL-9001" });
    const response = res(); await sessionHandler(req("POST", { action: "logout" }, first.sessionToken), response as any);
    expect(await readAthleteSession(req("GET", {}, first.sessionToken))).toBeNull();
    expect(await readAthleteSession(req("GET", {}, second.sessionToken))).not.toBeNull();
  });
  it("expires sessions and never falls back from a forged bearer token to a cookie", async () => {
    const session = await createAthleteSession("CL-9001", "pin");
    const cookie = `nl-athlete-session=${session.sessionToken}`;
    expect(await readAthleteSession(req("GET", {}, "CL-9001", { cookie }))).toBeNull();
    await rows("update athlete_sessions set expires_at=$1", [Date.now() - 1]);
    expect(await readAthleteSession(req("GET", {}, "", { cookie }))).toBeNull();
  });
  it("mints a mini-program bearer only after a correct PIN; client codes are never PINs", async () => {
    const response = res();
    await findPortal(req("POST", { pin: "123456" }, "", { "x-athlete-platform": "mini" }), response as any);
    expect(response.statusCode).toBe(200); expect(response.body.sessionToken).toHaveLength(43);
    expect(await readAthleteSession(req("GET", {}, response.body.sessionToken))).toMatchObject({ clientId: "CL-9001", proof: "pin" });
    const guessed = res(); await findPortal(req("POST", { pin: "CL-9001" }), guessed as any);
    expect(guessed.statusCode).toBe(404);
  });
  it("uses a Secure HttpOnly host cookie on the web and omits the token from its response", async () => {
    const response = res(); await findPortal(req("POST", { pin: "123456" }, "", { host: "trainnolimit.cn", origin: "https://trainnolimit.cn" }), response as any);
    expect(response.headers["set-cookie"]).toContain("HttpOnly; SameSite=Lax");
    expect(response.headers["set-cookie"]).toContain("; Secure"); expect(response.headers["set-cookie"]).not.toContain("Domain=");
    expect(response.body.sessionToken).toBeUndefined();
  });
  it("does not treat a known name and phone number as proof of account ownership", async () => {
    const response = res(); await findPortal(req("POST", { phone: "13800000001", name: "Athlete A" }), response as any);
    expect(response.statusCode).toBe(401); expect(response.body.code).toBe("VERIFIED_LOGIN_REQUIRED");
    expect(await rows("select * from athlete_sessions")).toHaveLength(0);
  });
  it("keeps legacy lookup during rollout without issuing a trusted session", async () => {
    vi.stubEnv("ATHLETE_SESSION_MODE", "compat");
    const response = res(); await findPortal(req("POST", { phone: "13800000001", name: "Athlete A" }), response as any);
    expect(response.body.clientCode).toBe("CL-9001"); expect(response.body.sessionToken).toBeUndefined();
    expect(response.headers["set-cookie"]).toBeUndefined();
  });
  it("limits repeated PIN attempts in shared Postgres state", async () => {
    for (let i = 0; i < 10; i++) { const response = res(); await findPortal(req("POST", { pin: "wrong-pin" }), response as any); expect(response.statusCode).toBe(404); }
    const response = res(); await findPortal(req("POST", { pin: "123456" }), response as any);
    expect(response.statusCode).toBe(429); expect(response.headers["retry-after"]).toBe("900");
  });
  it("requires sessions unless compatibility is explicitly enabled", () => {
    for (const value of ["", "false", "off", "require", "required"]) { vi.stubEnv("ATHLETE_SESSION_MODE", value); expect(athleteSessionsRequired()).toBe(true); }
  });
});

describe("authenticated athlete resource boundary", () => {
  const protectedReads = ["clients", "myProfile", "workouts", "workoutHistory", "exerciseResults", "athleteMetrics", "checkIns", "workloadLogs", "workoutComments", "contentAssignments", "contentResponses", "notifications", "formVideos", "clientMessages", "referralStatus", "productOrders", "programTemplates", "workoutDetails", "formTemplates", "testTemplates", "testLibrary"];
  it.each(protectedReads)("a client code alone cannot read %s", async name => {
    const result = await access(name, "GET", { clientId: "CL-9001", clientCode: "CL-9001", code: "CL-9001" });
    expect(result.allowed).toBe(false); expect(result.response.statusCode).toBe(401);
  });
  it("binds every read alias to the authenticated identity and removes name-based OR filters", async () => {
    const session = await createAthleteSession("CL-9001", "pin");
    const result = await access("athleteMetrics", "GET", { clientName: "Athlete B" }, session.sessionToken);
    expect(result.allowed).toBe(true); expect(result.request.query).toMatchObject({ clientId: "CL-9001", clientCode: "CL-9001", clientRecordId: "CL-9001" });
    expect(result.request.query.clientName).toBeUndefined();
    expect((await access("workouts", "GET", { clientCode: "CL-9002" }, session.sessionToken)).response.statusCode).toBe(403);
  });
  it("does not accept another athlete's identity or privileged client fields on a write", async () => {
    const session = await createAthleteSession("CL-9001", "pin");
    expect((await access("saveWorkloadLog", "POST", { clientId: "CL-9002" }, session.sessionToken)).response.statusCode).toBe(403);
    expect((await access("updateClient", "POST", { clientRecordId: "CL-9001", paymentStatus: "Paid" }, session.sessionToken)).allowed).toBe(false);
    expect((await access("updateClient", "POST", { clientRecordId: "CL-9001", languagePreference: "Chinese" }, session.sessionToken)).allowed).toBe(true);
  });
  it("checks the actual workout owner when its client code is omitted", async () => {
    await seedProgram();
    await rows("insert into assigned_workouts(assigned_workout_id,client_id,program_id,is_draft) values('AW-OWN','CL-9001','PR-1001',false),('AW-OTHER','CL-9002','PR-1001',false),('AW-DRAFT','CL-9001','PR-1001',true)");
    const session = await createAthleteSession("CL-9001", "pin");
    for (const id of ["AW-OTHER", "AW-DRAFT"]) expect((await access("saveWorkoutLog", "POST", { assignedWorkoutRecordId: id }, session.sessionToken)).response.statusCode).toBe(404);
    expect((await access("saveWorkoutLog", "POST", { assignedWorkoutRecordId: "AW-OWN" }, session.sessionToken)).allowed).toBe(true);
    expect((await access("updateAssignedProgramDate", "POST", { assignedWorkoutRecordId: "AW-OTHER" }, session.sessionToken)).allowed).toBe(false);
  });
  it("cannot answer another athlete's form even when it claims the correct client code", async () => {
    await rows("insert into assigned_forms(assigned_form_id,client_id) values('AF-OTHER','CL-9002')");
    const session = await createAthleteSession("CL-9001", "pin");
    expect((await access("submitContentResponse", "POST", { assignmentId: "AF-OTHER", assignmentType: "Questionnaire", clientId: "CL-9001" }, session.sessionToken)).response.statusCode).toBe(404);
  });
  it("requires actual program access even for non-store coaching programs", async () => {
    await seedProgram();
    const session = await createAthleteSession("CL-9002", "pin");
    expect((await access("workoutDetails", "GET", { programId: "PR-1001", week: "1", day: "1" }, session.sessionToken)).response.statusCode).toBe(403);
  });
  it("refuses cross-site cookie writes and keeps previews read-only on the server", async () => {
    const session = await createAthleteSession("CL-9001", "pin");
    expect((await access("saveWorkloadLog", "POST", {}, "", { cookie: `nl-athlete-session=${session.sessionToken}`, origin: "https://attacker.example" })).response.statusCode).toBe(403);
    const preview = await createAthleteSession("CL-9001", "preview");
    expect((await access("myProfile", "GET", {}, preview.sessionToken)).allowed).toBe(true);
    expect((await access("createClient", "POST", { name: "Unwanted account" }, preview.sessionToken)).response.body.code).toBe("ATHLETE_PREVIEW_READ_ONLY");
  });
  it("keeps public reference/catalog reads and verified coach access working", async () => {
    expect((await access("coaches")).allowed).toBe(true); expect((await access("programs")).allowed).toBe(true);
    expect((await access("reviews", "GET", { storeOnly: "1" })).allowed).toBe(true);
    expect((await access("clients", "GET", {}, "", { "x-coach-key": "audit-coach" })).allowed).toBe(true);
  });
  it("scopes a checkout capability to its own order without granting an athlete session", async () => {
    await rows("insert into product_orders(order_id,client_id) values('ORD-OWN','CL-9001'),('ORD-OTHER','CL-9002')");
    const key = makeCheckoutKey("ORD-OWN");
    expect((await access("wxpayCreate", "POST", { orderId: "ORD-OWN", checkoutKey: key })).allowed).toBe(true);
    expect((await access("wxpayCreate", "POST", { orderId: "ORD-OTHER", checkoutKey: key })).allowed).toBe(false);
    const result = await access("coachingSignup", "POST", { stage: "intake", orderId: "ORD-OWN", checkoutKey: key, clientRecordId: "CL-9002" });
    expect(result.allowed).toBe(true); expect(result.request.body).toMatchObject({ checkoutOrderId: "ORD-OWN", clientRecordId: "CL-9001" });
    expect((await access("myProfile", "GET", { clientId: "CL-9001" })).allowed).toBe(false);
  });
});

describe("WeChat sessions", () => {
  it("never turns a compatibility phone/name lookup into a trusted WeChat binding", async () => {
    vi.stubEnv("ATHLETE_SESSION_MODE", "compat");
    vi.stubEnv("WECHAT_MINI_APPID", "test-mini"); vi.stubEnv("WECHAT_MINI_SECRET", "test-secret");
    vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ openid: "openid-stranger" }) })));
    const legacy = res();
    await wxAuth(req("POST", { code: "wx-code", phone: "13800000002", name: "Athlete B" }), legacy as any);
    expect(legacy.statusCode).toBe(200); expect(legacy.body).toMatchObject({ clientCode: "CL-9002", bound: false });
    expect(legacy.body.sessionToken).toBeUndefined();
    expect((await rows("select wechat_openid from clients where client_id='CL-9002'"))[0].wechat_openid).toBeNull();
    vi.stubEnv("ATHLETE_SESSION_MODE", "required");
    const retry = res(); await wxAuth(req("POST", { code: "wx-code" }), retry as any);
    expect(retry.statusCode).toBe(404); expect(await rows("select * from athlete_sessions")).toHaveLength(0);
  });
  it("issues a session from the server-resolved bound openid, not a supplied client code", async () => {
    vi.stubEnv("WECHAT_MINI_APPID", "test-mini"); vi.stubEnv("WECHAT_MINI_SECRET", "test-secret");
    vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ openid: "openid-a" }) })));
    const response = res(); await wxAuth(req("POST", { code: "wx-code", clientCode: "CL-9002" }, "", { "x-athlete-platform": "mini" }), response as any);
    expect(response.statusCode).toBe(200); expect(response.body.clientCode).toBe("CL-9001");
    expect(await readAthleteSession(req("GET", {}, response.body.sessionToken))).toMatchObject({ clientId: "CL-9001", proof: "wechat" });
  });
  it("consumes a verified QR handshake once and refuses legacy or expired proofs", async () => {
    vi.stubEnv("WECHAT_OA_APPID", "test-oa"); vi.stubEnv("WECHAT_OA_SECRET", "test-secret");
    const token = await createWxLoginToken(); await completeWxLoginToken(token, "CL-9001", "pin");
    const first = res(); await wxLogin(req("POST", { action: "status", t: token }), first as any);
    expect(first.body.status).toBe("ok"); expect(first.headers["set-cookie"]).toContain("HttpOnly");
    const replay = res(); await wxLogin(req("POST", { action: "status", t: token }), replay as any);
    expect(replay.body.status).toBe("expired"); expect(await rows("select * from athlete_sessions")).toHaveLength(1);
    const weak = await createWxLoginToken(); await completeWxLoginToken(weak, "CL-9002", "legacy");
    expect(await consumeWxLoginToken(weak)).toBeNull();
    const expired = await createWxLoginToken(); await rows("update wx_login_tokens set created_at=0 where token=$1", [expired]);
    expect(await completeWxLoginToken(expired, "CL-9001", "pin")).toBe(false);
  });
});
