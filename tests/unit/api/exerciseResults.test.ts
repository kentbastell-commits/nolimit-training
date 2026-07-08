import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/exerciseResults.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  invalidateCache("");
});

const RESULTS_ENV = { FEISHU_EXERCISE_RESULTS_TABLE_ID: "tbl-res" };

// Real column names the handler resolves against (incl. the "Excercise ID" typo).
const fieldsRoute = {
  match: "tbl-res/fields",
  json: {
    code: 0,
    data: {
      items: [
        "Result ID",
        "Client ID",
        "Excercise ID",
        "Exercise Name",
        "Date",
        "Best Weight",
        "Best Reps",
        "Estimated 1 RM",
        "Volume",
        "Source Workout ID",
      ].map((field_name) => ({ field_name })),
    },
  },
};

const tokenRoute = {
  match: "tenant_access_token",
  json: { code: 0, tenant_access_token: "tok", expire: 7200 },
};

describe("api/exerciseResults", () => {
  it("500 when the results table is not configured", async () => {
    vi.stubEnv("FEISHU_EXERCISE_RESULTS_TABLE_ID", "");
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Missing FEISHU_EXERCISE_RESULTS_TABLE_ID");
  });

  it("rejects non-GET/POST methods with 405", async () => {
    stubFeishuEnv(RESULTS_ENV);
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(makeReq({ method: "PUT" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("GET maps result rows and filters by clientId (record id match)", async () => {
    stubFeishuEnv(RESULTS_ENV);
    const dateMs = Date.UTC(2026, 6, 1);
    stubFetch([
      tokenRoute,
      fieldsRoute,
      {
        match: "tbl-res/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "r1",
                fields: {
                  "Result ID": "RES-1",
                  "Client ID": [{ record_ids: ["recA"] }],
                  "Exercise Name": "Back Squat",
                  Date: dateMs,
                  "Best Weight": 120,
                  "Best Reps": 5,
                  "Estimated 1 RM": 140,
                  Volume: 600,
                  "Source Workout ID": "AW-1",
                },
              },
              {
                record_id: "r2",
                fields: {
                  "Result ID": "RES-2",
                  "Client ID": [{ record_ids: ["recB"] }],
                  "Exercise Name": "Bench Press",
                  Date: dateMs,
                },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq({ query: { clientId: "recA" } }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.results).toHaveLength(1);
    const result = res.body.results[0];
    expect(result.resultId).toBe("RES-1");
    expect(result.exerciseName).toBe("Back Squat");
    expect(result.clientRecordIds).toEqual(["recA"]);
    expect(result.bestWeight).toBe("120");
    expect(result.bestReps).toBe("5");
    expect(result.estimatedOneRepMax).toBe("140");
    expect(result.volume).toBe("600");
    expect(result.date).toBe(new Date(dateMs).toISOString().split("T")[0]);
  });

  it("POST aggregates a workout's sets into one PR row per exercise", async () => {
    stubFeishuEnv(RESULTS_ENV); // exercise library env left unset -> no library scan
    const fetchImpl = stubFetch([
      tokenRoute,
      fieldsRoute,
      {
        match: "tbl-res/records",
        json: { code: 0, data: { record: { record_id: "resNew" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientId: "NL-0001",
          clientRecordId: "recA",
          workoutDate: "2026-07-01",
          logs: [
            { exerciseId: "EX-1", exerciseName: "Back Squat", actualWeight: 100, actualReps: 5 },
            { exerciseId: "EX-1", exerciseName: "Back Squat", actualWeight: 110, actualReps: 3 },
          ],
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recordsCreated).toBe(1);
    expect(res.body.createdRecords).toEqual(["resNew"]);

    const createCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "POST" && String(url).includes("tbl-res/records")
    );
    const sent = JSON.parse(createCall![1].body).fields;
    expect(sent["Exercise Name"]).toBe("Back Squat");
    expect(sent["Best Weight"]).toBe(110);
    expect(sent["Best Reps"]).toBe(3); // reps on the heaviest set
    expect(sent["Volume"]).toBe(830); // 100*5 + 110*3
    expect(sent["Estimated 1 RM"]).toBe(121); // 110 * (1 + 3/30)
    expect(sent["Client ID"]).toEqual(["recA"]);
    expect(sent["Result ID"]).toMatch(/^RES-/);
  });

  it("POST reports a 500 with details when Feishu rejects the rows", async () => {
    stubFeishuEnv(RESULTS_ENV);
    stubFetch([
      tokenRoute,
      fieldsRoute,
      { match: "tbl-res/records", json: { code: 1254045, msg: "FieldNameNotFound" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientId: "NL-0001",
          workoutDate: "2026-07-01",
          logs: [{ exerciseName: "Row", actualWeight: 60, actualReps: 8 }],
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Some exercise results could not be created");
    expect(res.body.errors).toHaveLength(1);
  });
});
