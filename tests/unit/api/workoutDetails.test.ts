import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/workoutDetails.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

beforeEach(() => {
  invalidateCache("workoutTemplatesRaw");
  invalidateCache("exerciseLibraryRaw");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function detailsEnv() {
  stubFeishuEnv({
    FEISHU_WORKOUT_TEMPLATES_TABLE_ID: "tbl-wt",
    FEISHU_EXERCISE_LIBRARY_TABLE_ID: "tbl-el",
  });
}

describe("api/workoutDetails", () => {
  it("returns 400 when programId/week/day are missing", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ query: { programId: "P1" } }) as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing required query params");
    expect(res.body.required).toEqual(["programId", "week", "day"]);
  });

  it("returns 500 when the token response has no tenant token", async () => {
    detailsEnv();
    stubFetch([{ match: "tenant_access_token", json: { code: 99991663 } }]);

    const res = makeRes();
    await handler(
      makeReq({ query: { programId: "P1", week: "1", day: "1" } }) as any,
      res as any
    );

    // getTenantToken (api/_token.ts) now throws on a missing token; the
    // handler's generic catch turns that into a 500 with the thrown message.
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Server error");
    expect(res.body.message).toMatch(/Could not get tenant token/);
  });

  it("joins template rows with the exercise library for the requested day", async () => {
    detailsEnv();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-wt/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recW2",
                fields: {
                  "Program ID": "P1",
                  Week: "1",
                  Day: "1",
                  "Exercise ID": "EX-2",
                  "Exercise Name": "Lunge",
                  Order: "2",
                  Sets: "3",
                  Reps: "10",
                },
              },
              {
                record_id: "recW1",
                fields: {
                  "Program ID": "P1",
                  Week: "1",
                  Day: "1",
                  "Exercise ID": "EX-1",
                  "Exercise Name": "Back Squat",
                  Order: "1",
                  Sets: "5",
                  Reps: "5",
                  "Coaching Notes": "Stay tight",
                },
              },
              {
                // Different day — must not appear.
                record_id: "recW3",
                fields: {
                  "Program ID": "P1",
                  Week: "1",
                  Day: "2",
                  "Exercise ID": "EX-1",
                  "Exercise Name": "Back Squat",
                  Order: "1",
                },
              },
            ],
          },
        },
      },
      {
        match: "tbl-el/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recL1",
                fields: {
                  "Exercise ID": "EX-1",
                  "Exercise Name": "Back Squat",
                  Category: "Squat",
                  Equipment: ["Barbell"],
                  "Short Video URL": {
                    link: "https://video.example/squat.mp4",
                    text: "watch",
                  },
                },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({ query: { programId: "P1", week: "1", day: "1" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.exercises).toHaveLength(2);
    // Sorted by Order.
    expect(res.body.exercises.map((e: any) => e.exerciseName)).toEqual([
      "Back Squat",
      "Lunge",
    ]);
    const squat = res.body.exercises[0];
    expect(squat.sets).toBe("5");
    expect(squat.reps).toBe("5");
    expect(squat.notes).toBe("Stay tight");
    // Library join fills category/equipment and prefers the real link.
    expect(squat.category).toBe("Squat");
    expect(squat.equipment).toBe("Barbell");
    expect(squat.videoUrl).toBe("https://video.example/squat.mp4");
    // Lunge has no library row -> library-driven fields stay empty.
    expect(res.body.exercises[1].category).toBe("");
  });
});
