import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/duplicateAssignedWorkout.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  invalidateCache("");
});

describe("api/duplicateAssignedWorkout", () => {
  it("rejects non-POST methods with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("400 when assignedWorkoutRecordId or scheduledDate is missing", async () => {
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { scheduledDate: "2026-07-10" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing assignedWorkoutRecordId or scheduledDate");
  });

  it("500 when the assigned workouts table is not configured", async () => {
    vi.stubEnv("FEISHU_ASSIGNED_WORKOUTS_TABLE_ID", "");
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { assignedWorkoutRecordId: "rec-src", scheduledDate: "2026-07-10" },
      }) as any,
      res as any
    );
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Missing FEISHU_ASSIGNED_WORKOUTS_TABLE_ID");
  });

  it("clones the workout with a fresh ID, new date, Scheduled status, and no log links", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw" });
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-aw/records/rec-src",
        json: {
          code: 0,
          data: {
            record: {
              fields: {
                "Workout Name": "Day 1 Lower",
                "Assigned Workout ID": "AW-111111",
                "Completion Status": "Completed",
                "Workout Logs": [{ record_ids: ["log1"] }],
                "Workout Logs1": [{ record_ids: ["log2"] }],
                SourceID: "S-1",
              },
            },
          },
        },
      },
      {
        match: "tbl-aw/records",
        json: { code: 0, data: { record: { record_id: "rec-new" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { assignedWorkoutRecordId: "rec-src", scheduledDate: "2026-07-10" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recordId).toBe("rec-new");

    const createCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "POST" && String(url).endsWith("tbl-aw/records")
    );
    const sent = JSON.parse(createCall![1].body).fields;
    expect(sent["Assigned Workout ID"]).toMatch(/^AW-\d{6}$/);
    expect(sent["Assigned Workout ID"]).not.toBe("AW-111111");
    expect(sent["Scheduled Date"]).toBe(new Date(2026, 6, 10).getTime());
    expect(sent["Completion Status"]).toBe("Scheduled");
    expect(sent["Workout Name"]).toBe("Day 1 Lower");
    expect(sent["Workout Logs"]).toBeUndefined();
    expect(sent["Workout Logs1"]).toBeUndefined();
    expect(sent.SourceID).toBeUndefined();
  });

  it("500 with the Lark response when the source workout cannot be read", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "tbl-aw/records/rec-src", json: { code: 1254005, msg: "not found" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { assignedWorkoutRecordId: "rec-src", scheduledDate: "2026-07-10" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not read assigned workout");
  });
});
