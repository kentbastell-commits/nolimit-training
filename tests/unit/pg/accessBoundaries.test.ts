import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createClient from "../../../api/createClient.ts";
import checkIns from "../../../api/checkIns.ts";
import workload from "../../../api/workloadLogs.ts";
import comments from "../../../api/workoutComments.ts";
import assignments from "../../../api/contentAssignments.ts";
import metrics from "../../../api/athleteMetrics.ts";
import notifications from "../../../api/notifications.ts";
import { findClientByPhoneName } from "../../../server/db/repositories/clients.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";

beforeEach(async () => { await resetDb(); vi.stubEnv("COACH_ACCESS_KEY", "audit-coach-key"); });
afterEach(() => vi.unstubAllEnvs());
afterAll(closeDb);
async function call(handler: any, method: string, data: Record<string, unknown>, coach = false) {
  const res = makeRes();
  await handler(makeReq({ method, ...(method === "GET" ? { query: data } : { body: data }),
    headers: coach ? { "x-coach-key": "audit-coach-key" } : {} }) as any, res as any);
  return res;
}

describe("public and coach write boundaries", () => {
  it.each(["program", "purchasedProgramId", "paymentStatus", "accessEndDate", "clientId", "primaryCoachId"])("refuses public signup field %s", async field => {
    await seedProgram();
    const res = await call(createClient, "POST", { name: "Public signup", [field]: field === "paymentStatus" ? "Paid" : field === "accessEndDate" ? "2030-01-01" : "PR-1001" });
    expect(res.statusCode).toBe(401);
    expect(await rows("select 1 from clients")).toHaveLength(0);
  });
  it("keeps the existing public coach-invite payload working", async () => {
    const res = await call(createClient, "POST", { name: "New athlete", phone: "wechat_athlete", email: "athlete@example.com", coach: "Kent Bastell", clientType: "Online Coaching", packageType: "Active", startDate: "2026-10-31", notes: "Intake answers", languagePreference: "Chinese" });
    expect(res.statusCode).toBe(200);
    expect((await rows("select full_name, program_id, purchased_program_id, payment_status from clients"))[0]).toMatchObject({ full_name: "New athlete", program_id: null, purchased_program_id: null });
  });
  it("retains coach-created program assignment and payment fields", async () => {
    await seedProgram();
    const res = await call(createClient, "POST", { name: "Coach signup", program: "PR-1001", paymentStatus: "Paid" }, true);
    expect(res.statusCode).toBe(200);
    expect((await rows("select program_id, payment_status from clients"))[0]).toMatchObject({ program_id: "PR-1001", payment_status: "Paid" });
  });
  it("refuses a forged coach review of an existing check-in", async () => {
    await seedClient();
    await rows("insert into check_ins(checkin_id,client_id,status) values('CHK-AUDIT','CL-9001','Submitted')");
    const res = await call(checkIns, "POST", { recordId: "CHK-AUDIT", coachResponse: "Forged advice" });
    expect(res.statusCode).toBe(401);
    expect((await rows("select coach_notes,status from check_ins"))[0]).toMatchObject({ coach_notes: null, status: "Submitted" });
  });
  it.each(["coachResponse", "reviewedDate", "status"])("refuses coach-owned field %s on an athlete check-in", async field => {
    await seedClient();
    const res = await call(checkIns, "POST", { clientId: "CL-9001", submittedDate: "2026-10-31", [field]: field === "reviewedDate" ? "2026-10-31" : "Reviewed" });
    expect(res.statusCode).toBe(401);
    expect(await rows("select 1 from check_ins")).toHaveLength(0);
  });
  it("permits the coach to reply and the athlete to submit wellness", async () => {
    await seedClient();
    const created = await call(checkIns, "POST", { clientId: "CL-9001", submittedDate: "2026-10-31", energy: 7 });
    expect(created.statusCode).toBe(200);
    const reviewed = await call(checkIns, "POST", { recordId: created.body.recordId, coachResponse: "Keep the next session easy" }, true);
    expect(reviewed.statusCode).toBe(200);
    expect((await rows("select coach_notes,status from check_ins"))[0]).toMatchObject({ coach_notes: "Keep the next session easy", status: "Reviewed" });
  });
  it("requires the coach key to create athlete notifications", async () => {
    await seedClient();
    const res = await call(notifications, "POST", { clientId: "CL-9001", title: "Forged coach notice" });
    expect(res.statusCode).toBe(401);
    expect(await rows("select 1 from notifications")).toHaveLength(0);
    expect((await call(notifications, "POST", { clientId: "CL-9001", title: "Coach notice" }, true)).statusCode).toBe(200);
  });
});

describe("athlete reads use whole identifiers", () => {
  beforeEach(async () => {
    await seedClient(); await seedClient({ client_id: "CL-90010", full_name: "Another athlete" });
    await rows("insert into check_ins(checkin_id,client_id,status) values('CHK-1','CL-9001','Submitted'),('CHK-2','CL-90010','Submitted')");
    await rows("insert into workload_logs(workload_log_id,client_id) values('CL-9001-2026-10-31','CL-9001'),('CL-90010-2026-10-31','CL-90010')");
    await rows("insert into workout_logs(log_id,client_id,client_code,athlete_notes) values('LOG-1','CL-9001','CL-9001','First note'),('LOG-2','CL-90010','CL-90010','Other note')");
    await rows("insert into assigned_forms(assigned_form_id,client_id,client_code) values('AF-1','CL-9001','CL-9001'),('AF-2','CL-90010','CL-90010')");
    await rows("insert into athlete_metrics(metric_id,client_id,value) values('AM-1','CL-9001',12),('AM-2','CL-90010',13)");
  });
  it.each([["checkIns",checkIns,"checkIns"],["workloadLogs",workload,"logs"],["workoutComments",comments,"comments"],["contentAssignments",assignments,"assignments"]] as const)("%s does not expose other athletes through a partial code", async (_name, handler, key) => {
    const partial = await call(handler, "GET", { clientId: "CL-" });
    expect(partial.body[key] || []).toEqual([]);
    const exact = await call(handler, "GET", { clientId: "CL-9001" });
    expect(exact.statusCode).toBe(200);
    expect(exact.body[key]).toHaveLength(1);
    expect(exact.body[key][0].clientId).toBe("CL-9001");
  });
  it.each(["clientId","clientCode","clientRecordId","clientName"])("blank %s cannot bypass metrics authentication", async field => {
    const res = await call(metrics,"GET",{ [field]: "   " });
    expect(res.statusCode).toBe(401);
  });
});

describe("signup identity and concurrency", () => {
  it("does not mistake an alphabetic WeChat contact for an athlete with no phone", async () => {
    await seedClient({ phone: "", full_name: "Existing athlete" });
    expect(await findClientByPhoneName("wechat_alice", "Existing athlete")).toBe("");
  });
  it("does not merge different WeChat IDs that share the same digits", async () => {
    await seedClient({ phone: "wechat_alice123", full_name: "Existing athlete" });
    expect(await findClientByPhoneName("wechat_bob123", "Existing athlete")).toBe("");
    expect(await findClientByPhoneName("wechat_alice123", "Existing athlete")).toBe("CL-9001");
  });
  it("accepts simultaneous new signups with distinct generated client codes", async () => {
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => call(createClient,"POST",{name:`Concurrent athlete ${i}`})));
    expect(results.map(r=>r.statusCode)).toEqual(Array(6).fill(200));
    expect(await rows("select distinct client_id from clients")).toHaveLength(6);
  });
});
