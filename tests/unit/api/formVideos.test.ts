import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/formVideos.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  invalidateCache("");
});

// The handler hardcodes its table id.
const TABLE = "tbleqym6RxbSw4i2";

function videoEnv() {
  stubFeishuEnv({
    // Keep the coach gate open and the bot webhook silent regardless of the
    // machine's real environment.
    COACH_ACCESS_KEY: "",
    FEISHU_BOT_WEBHOOK_URL: "",
  });
}

const tokenRoute = {
  match: "tenant_access_token",
  json: { code: 0, tenant_access_token: "tok" },
};

describe("api/formVideos", () => {
  it("rejects unsupported methods with 405", async () => {
    videoEnv();
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(makeReq({ method: "PATCH" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("GET maps rows (URL fields resolve to the link) sorted newest-first", async () => {
    videoEnv();
    stubFetch([
      tokenRoute,
      {
        match: `${TABLE}/records`,
        json: {
          code: 0,
          data: {
            items: [
              {
                record_id: "v1",
                fields: {
                  "Video ID": "FV-100001",
                  "Client ID": "NL-0001",
                  "Client Name": "Kent",
                  "Exercise Name": "Snatch",
                  "Video URL": [{ link: "https://x/1.mp4", text: "Form video" }],
                  "Client Note": "Check my catch",
                  "Submitted At": 100,
                  Status: "New",
                },
              },
              {
                record_id: "v2",
                fields: { "Video ID": "FV-100002", "Submitted At": 200 },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.videos).toHaveLength(2);
    expect(res.body.videos[0].videoId).toBe("FV-100002"); // newest first
    const older = res.body.videos[1];
    expect(older.videoUrl).toBe("https://x/1.mp4"); // link, not the display text
    expect(older.clientNote).toBe("Check my catch");
    expect(older.status).toBe("New");
  });

  it("POST 400 when there is neither a video nor a note", async () => {
    videoEnv();
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { clientId: "NL-0001" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("clientId and a videoUrl or note required");
  });

  it("POST accepts a note-only submission and omits the URL column", async () => {
    // Retrospective notes ride this channel without a video. The Video URL
    // field must be OMITTED (an empty value on a Feishu URL column fails the
    // whole record write).
    videoEnv();
    const fetchImpl = stubFetch([
      tokenRoute,
      { match: `${TABLE}/records`, json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { clientId: "NL-0001", exerciseName: "Squat", note: "Knee felt off" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    const createCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "POST" && String(url).includes(`${TABLE}/records`)
    );
    const fields = JSON.parse(createCall![1].body).fields;
    expect(fields["Client Note"]).toBe("Knee felt off");
    expect("Video URL" in fields).toBe(false);
  });

  it("POST stores an absolute video URL built from the requesting host", async () => {
    videoEnv();
    const fetchImpl = stubFetch([
      tokenRoute,
      { match: `${TABLE}/records`, json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        headers: { host: "app.trainnolimit.com" },
        body: {
          clientId: "NL-0001",
          clientName: "Kent",
          exerciseName: "Snatch",
          videoUrl: "/uploads/v.mp4",
          note: "hips early?",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.videoId).toMatch(/^FV-\d{6}$/);

    const createCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "POST" && String(url).endsWith(`${TABLE}/records`)
    );
    const sent = JSON.parse(createCall![1].body).fields;
    expect(sent["Video URL"]).toEqual({
      link: "https://app.trainnolimit.com/uploads/v.mp4",
      text: "Form video",
    });
    expect(sent["Client ID"]).toBe("NL-0001");
    expect(sent.Status).toBe("New");
  });

  it("PUT 400 when recordId is missing (coach gate open)", async () => {
    videoEnv();
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(
      makeReq({ method: "PUT", body: { coachReply: "Nice lift" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("recordId required");
  });

  it("PUT writes the coach reply and review status", async () => {
    videoEnv();
    const fetchImpl = stubFetch([
      tokenRoute,
      { match: `${TABLE}/records/v1`, json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "PUT",
        body: { recordId: "v1", coachReply: "Catch looks good", status: "Reviewed" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });

    const putCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "PUT" && String(url).includes(`${TABLE}/records/v1`)
    );
    const sent = JSON.parse(putCall![1].body).fields;
    expect(sent.Status).toBe("Reviewed");
    expect(sent["Coach Reply"]).toBe("Catch looks good");
    expect(typeof sent["Reviewed At"]).toBe("number");
  });
});
