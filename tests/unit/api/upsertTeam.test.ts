import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/upsertTeam.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/upsertTeam", () => {
  it("rejects non-POST methods with 405", async () => {
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
  });

  it("returns 400 when creating without a team name", async () => {
    stubFeishuEnv({ FEISHU_TEAMS_TABLE_ID: "tbl-teams" });
    stubFetch([]);
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: {} }) as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing team name");
  });

  it("returns 500 when the teams table is not configured", async () => {
    stubFeishuEnv({ FEISHU_TEAMS_TABLE_ID: "" });
    stubFetch([]);
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { teamName: "Alpha" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Teams table is not configured");
  });

  it("creates a team: members as id array, positions/groups as JSON text", async () => {
    stubFeishuEnv({ FEISHU_TEAMS_TABLE_ID: "tbl-teams" });
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: {
          code: 0,
          data: {
            items: [
              { field_name: "Team Name" },
              { field_name: "Members" },
              { field_name: "Positions" },
              { field_name: "Groups" },
            ],
          },
        },
      },
      {
        match: "/records",
        json: { code: 0, data: { record: { record_id: "recTeamNew" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          teamName: "Alpha Basketball",
          memberRecordIds: ["recM1", "", "recM2"],
          positions: { recM1: "PG" },
          groups: ["Guards"],
          coach: "Kent", // no Coach column -> omitted
        },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recordId).toBe("recTeamNew");
    expect(res.body.omittedFields).toContain("Coach");

    const createCall = fetchImpl.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith("/records") && (init as any)?.method === "POST"
    );
    const sent = JSON.parse((createCall![1] as any).body);
    expect(sent.fields["Team Name"]).toBe("Alpha Basketball");
    // Falsy member ids are stripped before the link write.
    expect(sent.fields.Members).toEqual(["recM1", "recM2"]);
    expect(sent.fields.Positions).toBe(JSON.stringify({ recM1: "PG" }));
    expect(sent.fields.Groups).toBe(JSON.stringify(["Guards"]));
  });

  it("returns 500 with the Lark payload when the write fails", async () => {
    stubFeishuEnv({ FEISHU_TEAMS_TABLE_ID: "tbl-teams" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/fields",
        json: { code: 0, data: { items: [{ field_name: "Team Name" }] } },
      },
      { match: "/records/recT1", json: { code: 1254043, msg: "RecordIdNotFound" } },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { recordId: "recT1", teamName: "Alpha" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Failed to update team");
    expect(res.body.larkResponse.code).toBe(1254043);
  });
});
