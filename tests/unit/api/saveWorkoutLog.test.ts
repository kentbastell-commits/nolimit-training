import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/saveWorkoutLog.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  invalidateCache("");
});

// FEISHU_EXERCISE_LIBRARY_TABLE_ID is deliberately left unset so the
// exercise-results side skips its library scan (links are optional there).
const SAVE_ENV = {
  FEISHU_WORKOUT_LOGS_TABLE_ID: "tbl-logs",
  FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw",
  FEISHU_EXERCISE_RESULTS_TABLE_ID: "tbl-res",
};

const tokenRoute = {
  match: "tenant_access_token",
  json: { code: 0, tenant_access_token: "tok", expire: 7200 },
};

const logsFieldsRoute = {
  match: "tbl-logs/fields",
  json: { code: 0, data: { items: [{ field_name: "Notes" }] } },
};

const assignedFieldsRoute = {
  match: "tbl-aw/fields",
  json: {
    code: 0,
    data: {
      items: [
        { field_name: "Client Notes" },
        { field_name: "Session RPE" },
        { field_name: "Session Duration" },
        { field_name: "Session Load" },
      ],
    },
  },
};

const resultsFieldsRoute = {
  // No Client ID / Excercise ID columns -> the results writer skips link fields.
  match: "tbl-res/fields",
  json: {
    code: 0,
    data: {
      items: [
        "Result ID",
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

describe("api/saveWorkoutLog", () => {
  it("rejects non-POST methods with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("400 when clientId or assignedWorkoutRecordId is missing", async () => {
    stubFeishuEnv(SAVE_ENV);
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { clientId: "recClient" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing clientId or assignedWorkoutRecordId");
  });

  it("400 when logs are missing", async () => {
    stubFeishuEnv(SAVE_ENV);
    stubFetch([tokenRoute]);
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { clientId: "recClient", assignedWorkoutRecordId: "rec-aw" },
      }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("No logs received");
  });

  it("batch-creates set logs, marks the workout Completed with sRPE load, writes results", async () => {
    stubFeishuEnv(SAVE_ENV);
    const fetchImpl = stubFetch([
      tokenRoute,
      logsFieldsRoute,
      assignedFieldsRoute,
      resultsFieldsRoute,
      {
        match: "tbl-logs/records/batch_create",
        json: {
          code: 0,
          data: { records: [{ record_id: "log1" }, { record_id: "log2" }] },
        },
      },
      { match: "tbl-aw/records/rec-aw", json: { code: 0 } },
      {
        match: "tbl-res/records",
        json: { code: 0, data: { record: { record_id: "res1" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientId: "recClient",
          clientCode: "NL-0001",
          assignedWorkoutId: "AW-100001",
          assignedWorkoutRecordId: "rec-aw",
          workoutDate: "2026-07-01",
          submissionNote: "Solid session",
          sessionRpe: 8,
          sessionDurationMin: 60,
          logs: [
            {
              exerciseName: "Back Squat",
              setNumber: 1,
              actualWeight: 100,
              actualReps: 5,
              prescribedReps: 5,
              exerciseOrder: 1,
            },
            {
              exerciseName: "Back Squat",
              setNumber: 2,
              actualWeight: 105,
              actualReps: 5,
              prescribedReps: 5,
              exerciseOrder: 1,
            },
          ],
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recordsCreated).toBe(2);
    expect(res.body.createdRecords).toEqual(["log1", "log2"]);

    // One batch_create with one record per set.
    const batchCall = fetchImpl.mock.calls.find(([url]: any[]) =>
      String(url).includes("batch_create")
    );
    const records = JSON.parse(batchCall![1].body).records;
    expect(records).toHaveLength(2);
    const setFields = records[0].fields;
    expect(setFields["Client ID"]).toEqual(["recClient"]);
    expect(setFields["Assigned Workout ID"]).toEqual(["rec-aw"]);
    expect(setFields["Exercise Name"]).toBe("Back Squat");
    expect(setFields["Actual Weight"]).toBe(100);
    expect(setFields["Actual Reps"]).toBe(5);
    expect(setFields["Completed"]).toBe(true);
    expect(setFields.Notes).toBe("Solid session");

    // Assigned workout flips to Completed and gets Session Load = RPE x minutes.
    const assignedCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "PUT" && String(url).includes("tbl-aw/records/rec-aw")
    );
    const assignedFields = JSON.parse(assignedCall![1].body).fields;
    expect(assignedFields["Completion Status"]).toBe("Completed");
    expect(assignedFields["Session RPE"]).toBe(8);
    expect(assignedFields["Session Duration"]).toBe(60);
    expect(assignedFields["Session Load"]).toBe(480);

    // One aggregated exercise-result row was written.
    const resultCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "POST" && String(url).endsWith("tbl-res/records")
    );
    const resultFields = JSON.parse(resultCall![1].body).fields;
    expect(resultFields["Best Weight"]).toBe(105);
    expect(resultFields["Volume"]).toBe(1025); // 100*5 + 105*5
    expect(resultFields["Source Workout ID"]).toBe("AW-100001");
  });

  it("skipped sets keep Completed:false, store no actuals, and mint no results", async () => {
    stubFeishuEnv(SAVE_ENV);
    const fetchImpl = stubFetch([
      tokenRoute,
      logsFieldsRoute,
      assignedFieldsRoute,
      resultsFieldsRoute,
      {
        match: "tbl-logs/records/batch_create",
        json: { code: 0, data: { records: [{ record_id: "log1" }] } },
      },
      { match: "tbl-aw/records/rec-aw", json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientId: "recClient",
          assignedWorkoutRecordId: "rec-aw",
          workoutDate: "2026-07-01",
          logs: [
            {
              exerciseName: "Back Squat",
              setNumber: 1,
              completed: false,
              actualWeight: 100, // prefilled plan value — must NOT be stored
              actualReps: 5,
            },
          ],
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const batchCall = fetchImpl.mock.calls.find(([url]: any[]) =>
      String(url).includes("batch_create")
    );
    const setFields = JSON.parse(batchCall![1].body).records[0].fields;
    expect(setFields["Completed"]).toBe(false);
    expect(setFields["Actual Weight"]).toBeUndefined();
    expect(setFields["Actual Reps"]).toBeUndefined();

    // All sets skipped -> no exercise-result row is created at all.
    const resultCreate = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "POST" && String(url).endsWith("tbl-res/records")
    );
    expect(resultCreate).toBeUndefined();
  });

  it("500 with the failing chunk when the batch create is rejected", async () => {
    stubFeishuEnv(SAVE_ENV);
    stubFetch([
      tokenRoute,
      logsFieldsRoute,
      assignedFieldsRoute,
      {
        match: "tbl-logs/records/batch_create",
        json: { code: 1254045, msg: "FieldNameNotFound" },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientId: "recClient",
          assignedWorkoutRecordId: "rec-aw",
          workoutDate: "2026-07-01",
          logs: [{ exerciseName: "Row", setNumber: 1, actualReps: 8 }],
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not create workout logs");
    expect(res.body.details.code).toBe(1254045);
  });
});
