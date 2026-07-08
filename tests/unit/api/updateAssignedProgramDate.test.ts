import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/updateAssignedProgramDate.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/updateAssignedProgramDate", () => {
  it("rejects non-POST methods with 405", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("returns 400 when both record identifiers or the date are missing", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { scheduledDate: "2026-07-10" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("Missing assignedWorkoutRecordId");
  });

  it("updates Scheduled Date directly when given a rec… record id", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw" });
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/records/recAW1", json: { code: 0 } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { assignedWorkoutRecordId: "recAW1", scheduledDate: "2026-07-10" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.assignedWorkoutRecordId).toBe("recAW1");
    expect(res.body.scheduledDate).toBe("2026-07-10");

    const putCall = fetchImpl.mock.calls.find(([url]) =>
      String(url).includes("/records/recAW1")
    );
    const sent = JSON.parse((putCall![1] as any).body);
    expect(sent.fields["Scheduled Date"]).toBe(new Date("2026-07-10").getTime());
  });

  it("resolves an Assigned Workout ID to its record before updating", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "/records/recFound", json: { code: 0 } },
      {
        match: "/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recFound",
                fields: { "Assigned Workout ID": "AW-77" },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { assignedWorkoutId: "AW-77", scheduledDate: "2026-07-12" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.assignedWorkoutRecordId).toBe("recFound");
  });

  it("returns 500 when the token response has no tenant token", async () => {
    stubFeishuEnv({ FEISHU_ASSIGNED_WORKOUTS_TABLE_ID: "tbl-aw" });
    stubFetch([{ match: "tenant_access_token", json: { code: 99991663 } }]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { assignedWorkoutRecordId: "recAW1", scheduledDate: "2026-07-10" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not get Lark tenant token");
  });
});
