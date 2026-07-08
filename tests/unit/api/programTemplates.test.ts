import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/programTemplates.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  invalidateCache(""); // handler caches the raw table scan as "workoutTemplatesRaw"
});

const TEMPLATES_ENV = { FEISHU_WORKOUT_TEMPLATES_TABLE_ID: "tbl-tmpl" };
const tokenRoute = {
  match: "tenant_access_token",
  json: { code: 0, tenant_access_token: "tok" },
};

const recordsRoute = {
  match: "tbl-tmpl/records",
  json: {
    code: 0,
    data: {
      has_more: false,
      items: [
        {
          record_id: "t2",
          fields: {
            "Program ID": "PR-1001",
            Week: "1",
            Day: "3",
            "Session Name": "Lower B",
            Order: "2",
          },
        },
        {
          record_id: "t1",
          fields: {
            "Program ID": "PR-1001",
            Week: "1",
            Day: "1",
            "Session Name": "Upper A",
            "Session Type": "Strength",
            Intensity: "RPE 8",
            "Exercise Name": "Back Squat",
            "Exercise ID": [{ record_ids: ["recEx"] }],
            Order: "1",
            Sets: "3",
            Reps: "5",
            Tempo: "31X1",
            Rest: "180s",
            "Coaching Notes": "Brace hard",
          },
        },
        {
          record_id: "t3",
          fields: { "Program ID": "PR-2000", Week: "1", "Session Name": "Not mine" },
        },
        {
          record_id: "t4",
          fields: {
            "Program ID": [{ record_ids: ["recProgLink"] }],
            Week: "2",
            "Session Name": "Linked session",
          },
        },
      ],
    },
  },
};

describe("api/programTemplates", () => {
  it("400 when neither programId nor programRecordId is given", async () => {
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing programId");
  });

  it("returns only the program's sessions, mapped and sorted week/day/order", async () => {
    stubFeishuEnv(TEMPLATES_ENV);
    stubFetch([tokenRoute, recordsRoute]);

    const res = makeRes();
    await handler(makeReq({ query: { programId: "PR-1001" } }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.templates).toHaveLength(2);
    // Sorted by week, then day, then order.
    expect(res.body.templates.map((t: any) => t.recordId)).toEqual(["t1", "t2"]);
    const first = res.body.templates[0];
    expect(first.sessionName).toBe("Upper A");
    expect(first.week).toBe(1);
    expect(first.day).toBe(1);
    expect(first.exerciseName).toBe("Back Squat");
    expect(first.exerciseRecordId).toBe("recEx");
    expect(first.sets).toBe("3");
    expect(first.reps).toBe("5");
    expect(first.tempo).toBe("31X1");
    expect(first.rest).toBe("180s");
    expect(first.notes).toBe("Brace hard");
  });

  it("matches link-based templates by programRecordId", async () => {
    stubFeishuEnv(TEMPLATES_ENV);
    stubFetch([tokenRoute, recordsRoute]);

    const res = makeRes();
    await handler(
      makeReq({ query: { programRecordId: "recProgLink" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.templates).toHaveLength(1);
    expect(res.body.templates[0].sessionName).toBe("Linked session");
  });

  it("500 when Feishu returns no template records", async () => {
    stubFeishuEnv(TEMPLATES_ENV);
    stubFetch([
      tokenRoute,
      { match: "tbl-tmpl/records", json: { code: 1254607, msg: "Data not ready" } },
    ]);

    const res = makeRes();
    await handler(makeReq({ query: { programId: "PR-1001" } }) as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("No workout template records returned");
  });
});
