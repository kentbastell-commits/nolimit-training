// WeChat subscribe-message pushes (server/wechat/subscribe.ts): the morning
// 训练提醒 target selection, the credit lifecycle around a send, and the
// 训练总结通知 fired by a coach's video reply.
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import formVideosHandler from "../../../api/formVideos.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";
import { resetMiniAccessTokenCache } from "../../../server/wechat/miniPhone.ts";
import {
  SUBSCRIBE_TEMPLATES,
  clipThing,
  formatWxTime,
  listSessionReminderTargets,
  pushToClient,
  sessionReminderValues,
} from "../../../server/wechat/subscribe.ts";

const DAY = Date.parse("2026-11-06T00:00:00+08:00");

type Sent = { url: string; body: any };
function wxFetcher(errcode: number, sent: Sent[] = []) {
  return vi.fn(async (url: string | URL, init?: RequestInit) => {
    const href = String(url);
    if (href.includes("/cgi-bin/token")) {
      return new Response(JSON.stringify({ access_token: "tok", expires_in: 7200 }));
    }
    sent.push({ url: href, body: JSON.parse(String(init?.body || "{}")) });
    return new Response(JSON.stringify({ errcode, errmsg: errcode ? "boom" : "ok" }));
  }) as unknown as typeof fetch;
}

async function seedWorkout(values: Record<string, any>) {
  const v = { program_id: "PR-1001", is_draft: false, ...values };
  const keys = Object.keys(v);
  await pool.query(
    `insert into assigned_workouts (${keys.map((k) => `"${k}"`).join(", ")}) values (${keys.map((_, i) => `$${i + 1}`).join(", ")})`,
    keys.map((k) => v[k])
  );
}

async function grant(clientId: string, kind: string, creditId = `WXC-${Math.random().toString(36).slice(2)}`, grantedAt = Date.now()) {
  await pool.query(
    `insert into wx_subscribe_credits (credit_id, client_id, template_type, granted_at) values ($1, $2, $3, $4)`,
    [creditId, clientId, kind, grantedAt]
  );
  return creditId;
}

beforeEach(async () => {
  await resetDb();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv("WECHAT_MINI_APPID", "wx-test");
  vi.stubEnv("WECHAT_MINI_SECRET", "secret");
  vi.stubEnv("FEISHU_BOT_WEBHOOK_URL", "");
  resetMiniAccessTokenCache();
  await seedClient({ client_id: "CL-9001", full_name: "Bob Tan", wechat_openid: "o-bob", language_preference: "en", primary_coach_id: "Kent" });
  await seedProgram({ program_id: "PR-1001", name: "Season 1" });
});

afterAll(async () => {
  await closeDb();
});

describe("listSessionReminderTargets", () => {
  it("picks athletes with a published, uncompleted session today and a banked grant", async () => {
    await seedClient({ client_id: "CL-9002", full_name: "Mei Lin", wechat_openid: "o-mei", language_preference: "Chinese" });
    await seedClient({ client_id: "CL-9003", full_name: "No Grant", wechat_openid: "o-none" });
    await seedClient({ client_id: "CL-9004", full_name: "No WeChat", wechat_openid: null });
    await grant("CL-9001", "session");
    await grant("CL-9002", "session");
    await grant("CL-9004", "session");
    // Bob: two sessions today; the coach-ordered one wins over the unordered.
    await seedWorkout({ assigned_workout_id: "AW-1", client_id: "CL-9001", scheduled_date: DAY, session_name: "Upper Pull", day_order: null });
    await seedWorkout({ assigned_workout_id: "AW-2", client_id: "CL-9001", scheduled_date: DAY + 3600_000, session_name: "Warmup", day_order: 1 });
    // Mei: today's session is a private draft, tomorrow's is published — neither counts today.
    await seedWorkout({ assigned_workout_id: "AW-3", client_id: "CL-9002", scheduled_date: DAY, session_name: "Draft", is_draft: true });
    await seedWorkout({ assigned_workout_id: "AW-4", client_id: "CL-9002", scheduled_date: DAY + 86_400_000, session_name: "Tomorrow" });
    // Completed already this morning.
    await seedWorkout({ assigned_workout_id: "AW-5", client_id: "CL-9003", scheduled_date: DAY, session_name: "Done", completion_status: "Completed" });
    await seedWorkout({ assigned_workout_id: "AW-6", client_id: "CL-9004", scheduled_date: DAY, session_name: "Unreachable" });

    const targets = await listSessionReminderTargets(DAY);
    expect(targets).toEqual([
      { clientId: "CL-9001", sessionName: "Warmup", sessionNameCn: "", languagePreference: "en" },
    ]);
  });

  it("formats the template values per language", () => {
    const zh = sessionReminderValues({ clientId: "CL-1", sessionName: "Upper Pull", sessionNameCn: "上肢拉", languagePreference: "Chinese" }, DAY);
    expect(zh).toEqual(["上肢拉", "2026-11-06 07:30", "打开小程序查看今天的训练安排"]);
    const en = sessionReminderValues({ clientId: "CL-1", sessionName: "", sessionNameCn: "上肢拉", languagePreference: "en" }, DAY);
    expect(en[0]).toBe("上肢拉");
    expect(en[2]).toBe("Your plan is ready");
  });

  it("clips thing fields to WeChat's 20 characters and strips emoji", () => {
    expect(clipThing("🔥 Week 3 Day 2 Lower Body Strength Session")).toBe("Week 3 Day 2 Lower B");
    expect(clipThing("")).toBe("-");
    expect(formatWxTime(Date.parse("2026-11-06T20:30:00+08:00"))).toBe("2026-11-06 20:30");
  });
});

describe("pushToClient", () => {
  it("sends with the template's field codes and retires the oldest grant", async () => {
    const old = await grant("CL-9001", "session", "WXC-old", 1000);
    await grant("CL-9001", "session", "WXC-new", 2000);
    const sent: Sent[] = [];
    const outcome = await pushToClient({ clientId: "CL-9001", kind: "session", values: ["Upper Pull", "2026-11-06 07:30", "Your plan is ready"], fetcher: wxFetcher(0, sent) });
    expect(outcome).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toMatchObject({
      touser: "o-bob",
      template_id: SUBSCRIBE_TEMPLATES.session.id,
      page: "pages/home/index",
      lang: "en",
      data: { thing1: { value: "Upper Pull" }, time2: { value: "2026-11-06 07:30" }, thing3: { value: "Your plan is ready" } },
    });
    const credits = await rows("select credit_id, used_at from wx_subscribe_credits order by credit_id");
    expect(credits.find((c: any) => c.credit_id === old)?.used_at).not.toBeNull();
    expect(credits.find((c: any) => c.credit_id === "WXC-new")?.used_at).toBeNull();
  });

  it("keeps the grant when WeChat refuses, spends it when the athlete revoked", async () => {
    await grant("CL-9001", "summary", "WXC-1");
    expect(await pushToClient({ clientId: "CL-9001", kind: "summary", values: ["Kent", "Squat", "2026-11-06 20:30"], fetcher: wxFetcher(45009) })).toBe("error:45009");
    expect((await rows("select used_at from wx_subscribe_credits"))[0].used_at).toBeNull();
    expect(await pushToClient({ clientId: "CL-9001", kind: "summary", values: ["Kent", "Squat", "2026-11-06 20:30"], fetcher: wxFetcher(43101) })).toBe("revoked");
    expect((await rows("select used_at from wx_subscribe_credits"))[0].used_at).not.toBeNull();
  });

  it("never sends without a grant, a WeChat identity, or configuration", async () => {
    const fetcher = wxFetcher(0);
    expect(await pushToClient({ clientId: "CL-9001", kind: "session", values: ["a", "b", "c"], fetcher })).toBe("no-credit");
    await seedClient({ client_id: "CL-9002", full_name: "No WeChat" });
    await grant("CL-9002", "session");
    expect(await pushToClient({ clientId: "CL-9002", kind: "session", values: ["a", "b", "c"], fetcher })).toBe("no-openid");
    vi.stubEnv("WECHAT_MINI_SECRET", "");
    await grant("CL-9001", "session");
    expect(await pushToClient({ clientId: "CL-9001", kind: "session", values: ["a", "b", "c"], fetcher })).toBe("unconfigured");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("throttles a burst of the same kind inside minGapMs", async () => {
    await grant("CL-9001", "summary", "WXC-a", 1000);
    await grant("CL-9001", "summary", "WXC-b", 2000);
    const fetcher = wxFetcher(0);
    expect(await pushToClient({ clientId: "CL-9001", kind: "summary", values: ["Kent", "Squat", "t"], minGapMs: 60_000, fetcher })).toBe("sent");
    expect(await pushToClient({ clientId: "CL-9001", kind: "summary", values: ["Kent", "Bench", "t"], minGapMs: 60_000, fetcher })).toBe("throttled");
    expect(await rows("select 1 from wx_subscribe_credits where used_at is null")).toHaveLength(1);
  });
});

describe("api/formVideos PUT → 训练总结通知", () => {
  async function put(body: Record<string, any>) {
    const res = makeRes();
    await formVideosHandler(makeReq({ method: "PUT", body }) as any, res as any);
    return res;
  }

  it("pushes the coach's reply to the athlete once the review is saved", async () => {
    await pool.query(
      `insert into form_videos (video_id, client_id, exercise_name, exercise_name_cn, status) values ('FV-1', 'CL-9001', 'Back Squat', '后蹲', 'New')`
    );
    await grant("CL-9001", "summary");
    const sent: Sent[] = [];
    vi.stubGlobal("fetch", wxFetcher(0, sent));

    const res = await put({ recordId: "FV-1", coachReply: "Nice depth, brace harder.", status: "Reviewed" });
    expect(res.statusCode).toBe(200);
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].body).toMatchObject({
      touser: "o-bob",
      template_id: SUBSCRIBE_TEMPLATES.summary.id,
      page: "pages/inbox/index",
      data: { thing1: { value: "Kent" }, thing2: { value: "Back Squat" } },
    });
    expect(sent[0].body.data.time3.value).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect((await rows("select used_at from wx_subscribe_credits"))[0].used_at).not.toBeNull();
  });

  it("does not push for a bare mark-as-reviewed", async () => {
    await pool.query(`insert into form_videos (video_id, client_id, exercise_name, status) values ('FV-2', 'CL-9001', 'Row', 'New')`);
    await grant("CL-9001", "summary");
    const fetcher = wxFetcher(0);
    vi.stubGlobal("fetch", fetcher);
    expect((await put({ recordId: "FV-2", status: "Reviewed" })).statusCode).toBe(200);
    await new Promise((r) => setTimeout(r, 50));
    expect(fetcher).not.toHaveBeenCalled();
    expect((await rows("select used_at from wx_subscribe_credits"))[0].used_at).toBeNull();
  });
});
