import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/assignProgram.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const workout = {
  week: 1,
  day: 1,
  sessionName: "Day 1",
  sessionType: "Strength",
  scheduledDate: "2026-07-08",
};

describe("api/assignProgram", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("400s without a client or programRecordId", async () => {
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { scheduledWorkouts: [workout] } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing client(s) or programRecordId");
  });

  it("400s when no scheduled workouts are provided", async () => {
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientRecordId: "recC1",
          programRecordId: "recP1",
          scheduledWorkouts: [],
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("No scheduled workouts provided");
  });

  it("batch-creates one record per client x workout with duplex link arrays", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw-ap" });
    const impl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-aw-ap/records/batch_create",
        json: {
          code: 0,
          data: { records: [{ record_id: "r1" }, { record_id: "r2" }] },
        },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientRecordIds: ["recC1", "recC2"],
          programRecordId: "recP1",
          scheduledWorkouts: [{ ...workout, estimatedDuration: "45" }],
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recordsCreated).toBe(2);

    const batchCall = impl.mock.calls.find(([url]: any[]) =>
      String(url).includes("tbl-aw-ap/records/batch_create")
    );
    expect(batchCall).toBeTruthy();
    const { records } = JSON.parse(batchCall![1].body);
    expect(records).toHaveLength(2); // 2 clients x 1 workout
    expect(records[0].fields["Client ID"]).toEqual(["recC1"]);
    expect(records[1].fields["Client ID"]).toEqual(["recC2"]);
    expect(records[0].fields["Program ID"]).toEqual(["recP1"]);
    expect(records[0].fields["Session Name"]).toBe("Day 1");
    expect(records[0].fields["Completion Status"]).toBe("Scheduled");
    expect(records[0].fields["Estimated Duration"]).toBe(45); // number, never ""
    expect(records[0].fields["Scheduled Date"]).toBe(
      new Date("2026-07-08").getTime()
    );
    expect(records[0].fields["Assigned Workout ID"]).toMatch(/^AW-\d{6}$/);
  });

  it("500s with the Lark response when the batch create fails", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw-ap" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-aw-ap/records/batch_create",
        json: { code: 1254040, msg: "NumberFieldConvFail" },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          clientRecordId: "recC1",
          programRecordId: "recP1",
          scheduledWorkouts: [workout],
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Failed to assign program");
    expect(res.body.larkResponse.code).toBe(1254040);
  });
});
