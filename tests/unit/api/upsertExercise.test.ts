import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/upsertExercise.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const EXERCISE_FIELDS = [
  { field_name: "Exercise ID", type: 1 },
  { field_name: "Exercise Name", type: 1 },
  { field_name: "Status", type: 3 },
  { field_name: "Professional Coaching Cues", type: 1 },
  { field_name: "Short Video URL", type: 15 },
];

describe("api/upsertExercise", () => {
  it("rejects non-POST methods with 405", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("returns 400 when the exercise name is missing (and not archiving)", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: {} }) as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing exercise name");
  });

  it("creates an exercise, writing the video URL as a {link,text} object", async () => {
    stubFeishuEnv({ FEISHU_EXERCISE_LIBRARY_TABLE_ID: "tbl-ex" });
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/fields", json: { code: 0, data: { items: EXERCISE_FIELDS } } },
      {
        match: "/records",
        json: { code: 0, data: { record: { record_id: "recEx1" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          exerciseName: "Back Squat",
          notes: "Brace hard.",
          videoUrl: "https://video.example/squat.mp4",
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.exerciseId).toMatch(/^EX-BAC-\d{4}$/);
    expect(res.body.recordId).toBe("recEx1");
    expect(res.body.cueFieldName).toBe("Professional Coaching Cues");
    expect(res.body.archived).toBe(false);

    const createCall = fetchImpl.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith("/records") && (init as any)?.method === "POST"
    );
    const sent = JSON.parse((createCall![1] as any).body);
    expect(sent.fields["Exercise Name"]).toBe("Back Squat");
    expect(sent.fields.Status).toBe("Active");
    expect(sent.fields["Professional Coaching Cues"]).toBe("Brace hard.");
    // URL(15) column takes { link, text }, never a bare string.
    expect(sent.fields["Short Video URL"]).toEqual({
      link: "https://video.example/squat.mp4",
      text: "https://video.example/squat.mp4",
    });
  });

  it("archiving prefixes the cues with [Archived] and sets Status", async () => {
    stubFeishuEnv({ FEISHU_EXERCISE_LIBRARY_TABLE_ID: "tbl-ex" });
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/fields", json: { code: 0, data: { items: EXERCISE_FIELDS } } },
      { match: "/records/recEx1", json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          recordId: "recEx1",
          exerciseId: "EX-OLD-1000",
          exerciseName: "Old Move",
          notes: "Retired.",
          archive: true,
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.archived).toBe(true);

    const putCall = fetchImpl.mock.calls.find(([url]) =>
      String(url).includes("/records/recEx1")
    );
    const sent = JSON.parse((putCall![1] as any).body);
    expect(sent.fields.Status).toBe("Archived");
    expect(sent.fields["Professional Coaching Cues"]).toBe("[Archived]\nRetired.");
  });

  it("returns 400 when notes are given but the table has no cues column", async () => {
    stubFeishuEnv({ FEISHU_EXERCISE_LIBRARY_TABLE_ID: "tbl-ex" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Exercise ID", type: 1 },
              { field_name: "Exercise Name", type: 1 },
              { field_name: "Status", type: 3 },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { exerciseName: "Back Squat", notes: "Brace hard." },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(
      "Exercise Library table is missing a technical cues field"
    );
  });
});
