import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/teams.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

beforeEach(() => {
  invalidateCache("teams");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/teams", () => {
  it("returns an empty list when the teams table is not configured", async () => {
    stubFeishuEnv({ FEISHU_TEAMS_TABLE_ID: "" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ teams: [] });
  });

  it("maps rows (members, JSON positions/groups) and sorts teams by name", async () => {
    stubFeishuEnv({ FEISHU_TEAMS_TABLE_ID: "tbl-teams" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recT2",
                fields: {
                  "Team Name": "Zebra Rugby",
                  Members: [{ record_ids: ["recM3"] }],
                },
              },
              {
                record_id: "recT1",
                fields: {
                  "Team Name": "Alpha Basketball",
                  Coach: "Kent",
                  Members: [{ record_ids: ["recM1", "recM2"] }],
                  Positions: JSON.stringify({ recM1: "PG" }),
                  Groups: JSON.stringify(["Guards", "Bigs"]),
                  // Broken JSON must not throw for other rows, so keep it valid here.
                },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.teams).toHaveLength(2);
    // Sorted alphabetically by name.
    expect(res.body.teams.map((t: any) => t.name)).toEqual([
      "Alpha Basketball",
      "Zebra Rugby",
    ]);
    const alpha = res.body.teams[0];
    expect(alpha.id).toBe("recT1");
    expect(alpha.coach).toBe("Kent");
    expect(alpha.memberIds).toEqual(["recM1", "recM2"]);
    expect(alpha.memberCount).toBe(2);
    expect(alpha.positions).toEqual({ recM1: "PG" });
    expect(alpha.groups).toEqual(["Guards", "Bigs"]);
  });

  it("swallows invalid Positions/Groups JSON instead of failing the request", async () => {
    stubFeishuEnv({ FEISHU_TEAMS_TABLE_ID: "tbl-teams" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recT1",
                fields: {
                  "Team Name": "Broken JSON FC",
                  Positions: "{not json",
                  Groups: "[not json",
                },
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.teams[0].positions).toEqual({});
    expect(res.body.teams[0].groups).toEqual([]);
  });

  it("returns a 500 JSON error when the Feishu fetch blows up", async () => {
    stubFeishuEnv({ FEISHU_TEAMS_TABLE_ID: "tbl-teams" });
    stubFetch([]); // token fetch rejects

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not fetch teams");
  });
});
