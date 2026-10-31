import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import findPortal from "../../../api/findMyPortal.ts";
import wxAuth from "../../../api/wxAuth.ts";
import { authorizeAthleteRequest } from "../../../server/athleteAccess.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";

beforeEach(async () => {
  await resetDb();
  vi.stubEnv("ATHLETE_SESSION_MODE", "required"); vi.stubEnv("COACH_ACCESS_KEY", "test-coach");
  vi.stubEnv("WECHAT_MINI_APPID", "test-mini"); vi.stubEnv("WECHAT_MINI_SECRET", "test-secret");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
afterAll(closeDb);
const accounts = [
  { label: "trial administrator", source: "Trial", client_type: null, payment_status: null, subscription_status: "Active" },
  { label: "trial athlete", source: "Trial", client_type: "Online Coaching", payment_status: "Unpaid", subscription_status: "Active" },
  { label: "manually added non-paying athlete", source: "Coach", client_type: "Online Coaching", payment_status: "Pending", subscription_status: "Active" },
  { label: "manually added paying athlete", source: "Coach", client_type: "Online Coaching", payment_status: "Paid", subscription_status: "Active" },
  { label: "paused account", source: "Coach", client_type: "Digital Program", payment_status: "Unpaid", subscription_status: "Paused" },
];
it.each(accounts)("$label can sign in and open coach-assigned training without a purchase requirement", async ({ label, ...fields }) => {
  await seedClient({ ...fields, full_name: label, login_pin: "123456", wechat_openid: "eligibility-openid" });
  await seedProgram(); await seedProgram({ program_id: "PR-OTHER" });
  await rows("insert into assigned_workouts(assigned_workout_id,client_id,program_id,is_draft) values('AW-ELIGIBLE','CL-9001','PR-1001',false)");
  const [before] = await rows("select payment_status,subscription_status,client_type,source from clients");
  const pinResponse = makeRes();
  await findPortal(makeReq({ method: "POST", headers: { host: "localhost", "x-athlete-platform": "mini" }, body: { pin: "123456" } }) as any, pinResponse as any);
  expect(pinResponse.statusCode).toBe(200); expect(pinResponse.body.sessionToken).toHaveLength(43);
  vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ openid: "eligibility-openid" }) })));
  const wechatResponse = makeRes();
  await wxAuth(makeReq({ method: "POST", headers: { host: "localhost", "x-athlete-platform": "mini" }, body: { code: "test-provider-code" } }) as any, wechatResponse as any);
  expect(wechatResponse.statusCode).toBe(200); expect(wechatResponse.body.clientCode).toBe("CL-9001");
  for (const programId of ["PR-1001", "PR-OTHER"]) {
    const request = makeReq({ method: "GET", query: { programId, clientCode: "CL-9001" }, headers: { authorization: `Bearer ${pinResponse.body.sessionToken}` } });
    const response = makeRes();
    expect(await authorizeAthleteRequest("workoutDetails", request as any, response as any)).toBe(programId === "PR-1001");
  }
  expect((await rows("select payment_status,subscription_status,client_type,source from clients"))[0]).toEqual(before);
  expect(await rows("select 1 from product_orders")).toHaveLength(0);
  // A trial/admin label on an athlete record never substitutes for coach proof.
  const coachResponse = makeRes();
  expect(await authorizeAthleteRequest("teams", makeReq({ method: "GET", headers: { authorization: `Bearer ${pinResponse.body.sessionToken}` } }) as any, coachResponse as any)).toBe(false);
});
