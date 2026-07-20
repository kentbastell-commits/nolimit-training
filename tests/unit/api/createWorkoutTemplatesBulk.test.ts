import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/createWorkoutTemplatesBulk.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubTables() {
  stubFeishuEnv({
    FEISHU_WORKOUT_TEMPLATES_TABLE_ID: "tbl-wt-bulk",
    FEISHU_EXERCISE_LIBRARY_TABLE_ID: "tbl-ex-bulk",
    FEISHU_SET_PRESCRIPTIONS_TABLE_ID: "",
    FEISHU_EXERCISE_ALTERNATES_TABLE_ID: "",
  });
}

const session = (week: number, day: number, name: string) => ({
  week,
  day,
  sessionName: name,
  sessionType: "Strength",
  exercises: [
    {
      exerciseRecordId: `recEx-${day}`,
      exerciseId: `EX-${day}`,
      exerciseName: "Back Squat",
      order: 1,
      sets: 3,
      reps: "5",
      tempo: "",
      rest: "",
      coachingNotes: "Section: Main",
    },
  ],
});

describe("api/createWorkoutTemplatesBulk", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("400s when sessions are missing/empty", async () => {
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { programId: "PR-1", programRecordId: "recProg1", sessions: [] },
      }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("No sessions provided");
  });

  it("400s when a session has no exercises", async () => {
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          programId: "PR-1",
          programRecordId: "recProg1",
          sessions: [{ week: 1, day: 1, sessionName: "Day 1", exercises: [] }],
        },
      }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
  });

  it("flattens all sessions into ONE batch_create and reports counts", async () => {
    stubTables();
    const impl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-wt-bulk/records/batch_create",
        json: {
          code: 0,
          data: { records: [{ record_id: "recT1" }, { record_id: "recT2" }] },
        },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          programId: "PR-1",
          programRecordId: "recProg1",
          sessions: [session(1, 1, "Day 1"), session(1, 2, "Day 2")],
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recordsCreated).toBe(2);
    expect(res.body.sessionsSaved).toBe(2);

    // A SINGLE batch_create carried both sessions' rows.
    const batchCalls = impl.mock.calls.filter(([url]: any[]) =>
      String(url).includes("tbl-wt-bulk/records/batch_create")
    );
    expect(batchCalls).toHaveLength(1);
    const { records } = JSON.parse(batchCalls[0][1].body);
    expect(records).toHaveLength(2);
    expect(records[0].fields.Day).toBe(1);
    expect(records[1].fields.Day).toBe(2);
    expect(records[0].fields["Program ID"]).toEqual(["recProg1"]);
    expect(records[1].fields["Exercise ID"]).toEqual(["recEx-2"]);
  });

  it("rolls back and 500s when the template write fails", async () => {
    stubTables();
    const impl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      // Template create fails on every attempt.
      {
        match: "tbl-wt-bulk/records/batch_create",
        json: { code: 1254000, msg: "boom" },
      },
      {
        match: "tbl-wt-bulk/records/batch_delete",
        json: { code: 0, data: { records: [] } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          programId: "PR-1",
          programRecordId: "recProg1",
          sessions: [session(1, 1, "Day 1")],
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Failed to create workout template records");
    // Nothing was created, so no rows to roll back — but the batch_create was
    // attempted twice (retry) before giving up.
    const createCalls = impl.mock.calls.filter(([url]: any[]) =>
      String(url).includes("records/batch_create")
    );
    expect(createCalls.length).toBe(2);
  });
});
