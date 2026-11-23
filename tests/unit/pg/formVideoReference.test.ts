// Reference-only clips and coach voice notes on /api/formVideos.
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import formVideosHandler from "../../../api/formVideos.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";
import { resetMiniAccessTokenCache } from "../../../server/wechat/miniPhone.ts";

async function call(method: string, body: Record<string, any> = {}, query: Record<string, any> = {}) {
  const res = makeRes();
  await formVideosHandler(makeReq({ method, body, query, headers: { host: "trainnolimit.cn" } }) as any, res as any);
  return res;
}

beforeEach(async () => {
  await resetDb();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv("FEISHU_BOT_WEBHOOK_URL", "");
  resetMiniAccessTokenCache();
  await seedClient({ client_id: "CL-9001", full_name: "Bob Tan", wechat_openid: "o-bob", client_type: "Online Coaching" });
});
afterAll(closeDb);

describe("reference-only uploads", () => {
  it("stores a clip the athlete kept for their record as Reference, never queued", async () => {
    const kept = await call("POST", { clientId: "CL-9001", exerciseName: "Deadlift", videoUrl: "/uploads/fv-1.mp4", reviewRequested: false });
    expect(kept.statusCode).toBe(200);
    const asked = await call("POST", { clientId: "CL-9001", exerciseName: "Squat", videoUrl: "/uploads/fv-2.mp4" });
    expect(asked.statusCode).toBe(200);
    const statuses = await rows("select exercise_name, status from form_videos order by exercise_name");
    expect(statuses).toEqual([
      { exercise_name: "Deadlift", status: "Reference" },
      { exercise_name: "Squat", status: "New" },
    ]);
    const list = await call("GET", {}, { clientId: "CL-9001" });
    const byName = Object.fromEntries(list.body.videos.map((v: any) => [v.exerciseName, v]));
    expect(byName.Deadlift.status).toBe("Reference");
    expect(byName.Squat.status).toBe("New");
  });

  it("does not ping the coach for a reference-only clip", async () => {
    vi.stubEnv("FEISHU_BOT_WEBHOOK_URL", "https://feishu.example/hook");
    const fetcher = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetcher);
    await call("POST", { clientId: "CL-9001", exerciseName: "Deadlift", videoUrl: "/uploads/fv-1.mp4", reviewRequested: false });
    await new Promise((r) => setTimeout(r, 30));
    expect(fetcher).not.toHaveBeenCalled();
    await call("POST", { clientId: "CL-9001", exerciseName: "Squat", videoUrl: "/uploads/fv-2.mp4" });
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  });
});

describe("coach voice notes", () => {
  it("attaches an uploaded voice note to the review and lists it back", async () => {
    await pool.query(`insert into form_videos (video_id, client_id, exercise_name, status) values ('FV-1', 'CL-9001', 'Row', 'New')`);
    const res = await call("PUT", { recordId: "FV-1", coachReply: "", status: "Reviewed", coachReplyAudioUrl: "/uploads/fa-0123456789abcdef01234567.m4a" });
    expect(res.statusCode).toBe(200);
    const list = await call("GET", {}, { clientId: "CL-9001" });
    expect(list.body.videos[0]).toMatchObject({ recordId: "FV-1", status: "Reviewed", coachReply: "", coachReplyAudioUrl: "/uploads/fa-0123456789abcdef01234567.m4a" });
    // A later text-only update keeps the voice note; an explicit null clears it.
    await call("PUT", { recordId: "FV-1", coachReply: "Nice", status: "Reviewed" });
    expect((await rows("select coach_reply_audio_url from form_videos"))[0].coach_reply_audio_url).toBe("/uploads/fa-0123456789abcdef01234567.m4a");
    await call("PUT", { recordId: "FV-1", status: "Reviewed", coachReplyAudioUrl: null });
    expect((await rows("select coach_reply_audio_url from form_videos"))[0].coach_reply_audio_url).toBeNull();
  });

  it("refuses a voice note URL that is not one of our fa- uploads", async () => {
    await pool.query(`insert into form_videos (video_id, client_id, exercise_name, status) values ('FV-1', 'CL-9001', 'Row', 'New')`);
    const res = await call("PUT", { recordId: "FV-1", status: "Reviewed", coachReplyAudioUrl: "https://evil.example/x.m4a" });
    expect(res.statusCode).toBe(400);
    expect((await rows("select status from form_videos"))[0].status).toBe("New");
  });

  it("sends the WeChat 'coach replied' push for a voice-only reply", async () => {
    vi.stubEnv("WECHAT_MINI_APPID", "wx-test");
    vi.stubEnv("WECHAT_MINI_SECRET", "secret");
    await pool.query(`insert into form_videos (video_id, client_id, exercise_name, status) values ('FV-1', 'CL-9001', 'Row', 'New')`);
    await pool.query(`insert into wx_subscribe_credits (credit_id, client_id, template_type, granted_at) values ('WXC-1', 'CL-9001', 'summary', 1)`);
    const sent: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL, init?: RequestInit) => {
      if (String(url).includes("/cgi-bin/token")) return new Response(JSON.stringify({ access_token: "tok", expires_in: 7200 }));
      sent.push(JSON.parse(String(init?.body || "{}")));
      return new Response(JSON.stringify({ errcode: 0 }));
    }));
    await call("PUT", { recordId: "FV-1", status: "Reviewed", coachReplyAudioUrl: "/uploads/fa-0123456789abcdef01234567.m4a" });
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].touser).toBe("o-bob");
  });
});
