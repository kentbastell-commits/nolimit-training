// /api/wxAuth sign-up branch: WeChat's verified phone number (getPhoneNumber
// code) finds an existing account by phone — e.g. one a payment link created
// — or creates one from the typed name, then binds the openid so the next
// open is a one-tap login. WeChat's HTTP endpoints are stubbed.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/wxAuth.ts";
import { createClient } from "../../../server/db/repositories/clients.ts";
import { resetMiniAccessTokenCache } from "../../../server/wechat/miniPhone.ts";
import { closeDb, makeReq, makeRes, resetDb, rows } from "./helpers.ts";

process.env.WECHAT_MINI_APPID = "wx-test-app";
process.env.WECHAT_MINI_SECRET = "test-secret";

const json = (body: unknown) => ({ json: async () => body, ok: true, status: 200 }) as unknown as Response;

function stubWeChat(phone: string, openid = "openid-A") {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push(url.split("?")[0] + (init?.method ? ` ${init.method}` : ""));
    if (url.includes("/sns/jscode2session")) return json({ openid, session_key: "k" });
    if (url.includes("/cgi-bin/token")) return json({ access_token: "tok", expires_in: 7200 });
    if (url.includes("/wxa/business/getuserphonenumber")) {
      return json({ errcode: 0, phone_info: { phoneNumber: phone, purePhoneNumber: phone, countryCode: "86" } });
    }
    throw new Error(`unexpected fetch ${url}`);
  }));
  return calls;
}

beforeEach(async () => {
  await resetDb();
  resetMiniAccessTokenCache();
});
afterEach(() => vi.unstubAllGlobals());
afterAll(async () => {
  await closeDb();
});

describe("wxAuth sign-up with a WeChat-verified phone", () => {
  it("binds and logs into the account a payment link already created for that phone", async () => {
    const made = await createClient({ name: "Zhao Yanjun", phone: "13900001111", source: "Pay link" });
    const existingCode = String((made as { recordId?: string }).recordId);
    stubWeChat("13900001111");

    const res = makeRes();
    await handler(makeReq({ method: "POST", body: { code: "jscode", phoneCode: "pc", name: "赵艳军" } }) as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, clientCode: existingCode, created: false, bound: true });
    const client = await rows<{ wechat_openid: string }>("select wechat_openid from clients where client_id = $1", [existingCode]);
    expect(client[0].wechat_openid).toBe("openid-A");
    expect((await rows("select client_id from clients")).length).toBe(1);

    // Next open: plain { code } one-tap login resolves by openid.
    const again = makeRes();
    await handler(makeReq({ method: "POST", body: { code: "jscode" } }) as any, again as any);
    expect(again.body).toMatchObject({ success: true, clientCode: existingCode });
  });

  it("finds a coach-created account whose phone was typed with +86, spaces and dashes", async () => {
    // Kent adds an athlete before she opens the app; WeChat reports bare digits.
    const made = await createClient({ name: "Zhou Yanjun", phone: "+86 139-0000-1111", source: "Coach" });
    const existingCode = String((made as { recordId?: string }).recordId);
    stubWeChat("13900001111");

    const res = makeRes();
    await handler(makeReq({ method: "POST", body: { code: "jscode", phoneCode: "pc" } }) as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, clientCode: existingCode, created: false });
    expect((await rows("select client_id from clients")).length).toBe(1);
  });

  it("asks for a name when the phone is new, then creates the account and binds it", async () => {
    stubWeChat("13700002222", "openid-B");
    const noName = makeRes();
    await handler(makeReq({ method: "POST", body: { code: "jscode", phoneCode: "pc" } }) as any, noName as any);
    expect(noName.statusCode).toBe(404);
    expect(noName.body.needsName).toBe(true);
    expect(typeof noName.body.phoneToken).toBe("string");
    expect((await rows("select client_id from clients")).length).toBe(0);

    // The phone code is single-use: the second round trip carries the signed
    // phone token instead (the stub now returns a different number to prove
    // the phone endpoint is not consulted again).
    vi.unstubAllGlobals();
    stubWeChat("00000000000", "openid-B");
    const withName = makeRes();
    await handler(makeReq({ method: "POST", body: { code: "jscode", phoneToken: noName.body.phoneToken, name: "Li Meini" } }) as any, withName as any);
    expect(withName.statusCode).toBe(200);
    expect(withName.body).toMatchObject({ success: true, created: true, bound: true });
    const client = await rows<{ full_name: string; phone: string; source: string; wechat_openid: string }>(
      "select full_name, phone, source, wechat_openid from clients where client_id = $1",
      [withName.body.clientCode],
    );
    expect(client[0]).toMatchObject({ full_name: "Li Meini", phone: "13700002222", source: "Mini program", wechat_openid: "openid-B" });

    const expired = makeRes();
    await handler(makeReq({ method: "POST", body: { code: "jscode", phoneToken: "bad.token.here", name: "X Y" } }) as any, expired as any);
    expect(expired.statusCode).toBe(401);
  });

  it("refuses to hijack an account already bound to a different WeChat", async () => {
    const made = await createClient({ name: "Kent Test", phone: "13600003333", source: "Coach" });
    const code = String((made as { recordId?: string }).recordId);
    stubWeChat("13600003333", "openid-owner");
    await handler(makeReq({ method: "POST", body: { code: "jscode", phoneCode: "pc" } }) as any, makeRes() as any);
    vi.unstubAllGlobals();
    stubWeChat("13600003333", "openid-intruder");
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: { code: "jscode", phoneCode: "pc" } }) as any, res as any);
    expect(res.statusCode).toBe(409);
    const client = await rows<{ wechat_openid: string }>("select wechat_openid from clients where client_id = $1", [code]);
    expect(client[0].wechat_openid).toBe("openid-owner");
  });
});
