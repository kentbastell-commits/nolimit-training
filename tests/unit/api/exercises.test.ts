import { afterEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import handler from "../../../api/exercises.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/exercises", () => {
  it("maps Feishu records to library exercises (debug=1 bypasses cache)", async () => {
    stubFeishuEnv({ FEISHU_EXERCISE_LIBRARY_TABLE_ID: "tbl-ex" });
    stubFetch([
      {
        match: "tenant_access_token",
        json: { code: 0, tenant_access_token: "tok" },
      },
      {
        match: "/fields",
        json: { code: 0, data: { items: [{ field_name: "Exercise Name" }] } },
      },
      {
        match: "/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "rec1",
                fields: {
                  "Exercise ID": "EX-TST-1001",
                  "Exercise Name": "Back Squat",
                  Category: "Squat",
                  Equipment: ["Barbell"],
                  "Professional Coaching Cues": "Brace hard.",
                },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq({ query: { debug: "1" } }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.exercises).toHaveLength(1);
    const exercise = res.body.exercises[0];
    expect(exercise.exerciseId).toBe("EX-TST-1001");
    expect(exercise.exerciseName).toBe("Back Squat");
    expect(exercise.category).toBe("Squat");
    expect(exercise.equipment).toBe("Barbell");
    expect(exercise.notes).toBe("Brace hard.");
    expect(exercise.status).toBe("Active");
    // debug payload present when debug=1
    expect(res.body.availableFields).toEqual(["Exercise Name"]);
  });

  it("marks [Archived]-prefixed cues as Archived status", async () => {
    stubFeishuEnv({ FEISHU_EXERCISE_LIBRARY_TABLE_ID: "tbl-ex" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/fields", json: { code: 0, data: { items: [] } } },
      {
        match: "/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "rec2",
                fields: {
                  "Exercise Name": "Old Move",
                  "Professional Coaching Cues": "[Archived]\nRetired.",
                },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq({ query: { debug: "1" } }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.exercises[0].status).toBe("Archived");
  });

  it("returns a 500 JSON error when Feishu returns an error code", async () => {
    stubFeishuEnv({ FEISHU_EXERCISE_LIBRARY_TABLE_ID: "tbl-ex" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/fields", json: { code: 1, msg: "nope" } },
      { match: "/records", json: { code: 1254607, msg: "Data not ready" } },
    ]);

    const res = makeRes();
    await handler(makeReq({ query: { debug: "1" } }) as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Server error");
  });
});
