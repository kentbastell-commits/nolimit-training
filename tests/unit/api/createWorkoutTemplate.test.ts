import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/createWorkoutTemplate.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubTables() {
  stubFeishuEnv({
    FEISHU_WORKOUT_TEMPLATES_TABLE_ID: "tbl-wt-cwt",
    FEISHU_EXERCISE_LIBRARY_TABLE_ID: "tbl-ex-cwt",
    // Child tables off: no set-prescription / alternates fan-out.
    FEISHU_SET_PRESCRIPTIONS_TABLE_ID: "",
    FEISHU_EXERCISE_ALTERNATES_TABLE_ID: "",
  });
}

const baseBody = {
  programId: "PR-1",
  programRecordId: "recProg1",
  week: 1,
  day: 1,
  sessionName: "Day 1",
};

describe("api/createWorkoutTemplate", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("400s when required fields are missing", async () => {
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { programId: "PR-1" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing required fields");
    expect(res.body.required).toContain("programRecordId");
  });

  it("400s when no exercises are provided", async () => {
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { ...baseBody, exercises: [] } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("No exercises provided");
  });

  it("batch-creates template rows with link arrays and parsed meta columns", async () => {
    stubTables();
    const impl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      // exerciseRecordId is provided, so the library is never fetched.
      {
        match: "tbl-wt-cwt/records/batch_create",
        json: { code: 0, data: { records: [{ record_id: "recT1" }] } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          ...baseBody,
          sessionType: "Strength",
          estimatedDuration: "60",
          exercises: [
            {
              exerciseRecordId: "recEx1",
              exerciseId: "EX-1",
              exerciseName: "Back Squat",
              order: 1,
              sets: 3,
              reps: "5",
              tempo: "31X1",
              rest: "120s",
              coachingNotes: "Section: Main Block\nTracking: Time\nUnilateral: Yes",
            },
          ],
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recordsCreated).toBe(1);
    expect(res.body.childWrites).toEqual({}); // no set prescriptions/alternates

    const batchCall = impl.mock.calls.find(([url]: any[]) =>
      String(url).includes("tbl-wt-cwt/records/batch_create")
    );
    expect(batchCall).toBeTruthy();
    const { records } = JSON.parse(batchCall![1].body);
    expect(records).toHaveLength(1);
    const fields = records[0].fields;
    // Duplex links as record-id arrays.
    expect(fields["Program ID"]).toEqual(["recProg1"]);
    expect(fields["Exercise ID"]).toEqual(["recEx1"]);
    expect(fields["Template ID"]).toMatch(/^WT-\d{6}$/);
    expect(fields.Week).toBe(1);
    expect(fields.Sets).toBe(3);
    expect(fields.Reps).toBe("5");
    expect(fields["Estimated Duration"]).toBe(60); // number, never ""
    // Meta parsed out of the Coaching Notes blob into typed columns.
    expect(fields["Section Name"]).toBe("Main Block");
    expect(fields["Tracking Type"]).toBe("Time");
    expect(fields["Is Unilateral"]).toBe(true);
    expect(fields["Coaching Notes"]).toContain("Section: Main Block");
  });

  it("resolves an exercise via the library when no record id is supplied, and 500s when unknown", async () => {
    stubTables();
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-ex-cwt/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              { record_id: "recExLib", fields: { "Exercise ID": "EX-OTHER" } },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          ...baseBody,
          exercises: [
            {
              exerciseId: "EX-MISSING",
              exerciseName: "Ghost Lift",
              order: 1,
              sets: 3,
              reps: "5",
              tempo: "",
              rest: "",
              coachingNotes: "",
            },
          ],
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Server error");
    expect(res.body.message).toContain("EX-MISSING");
  });
});
