import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/clients.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  // The handler caches the mapped list under "clients" for 10 minutes.
  invalidateCache("clients");
});

describe("api/clients", () => {
  it("maps Feishu records to the client shape", async () => {
    stubFeishuEnv({ FEISHU_CLIENTS_TABLE_ID: "tbl-cli-list" });
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      {
        match: "tbl-cli-list/records",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [
              {
                record_id: "recC1",
                fields: {
                  "Full Name": "Alice Wong",
                  "Client ID": "CL-9",
                  "Package Type": "Premium",
                  Email: "alice@example.com",
                  "Phone/WeChat": "138000",
                  "Language Preference": "Chinese",
                  Tags: '["strong","fast"]',
                  "Last Login": "1750000000000",
                },
              },
              {
                record_id: "recC2",
                fields: {},
              },
            ],
          },
        },
      },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.clients).toHaveLength(2);

    const alice = res.body.clients[0];
    expect(alice.id).toBe("recC1");
    expect(alice.clientCode).toBe("CL-9");
    expect(alice.name).toBe("Alice Wong");
    expect(alice.initials).toBe("AW");
    expect(alice.status).toBe("Premium");
    expect(alice.email).toBe("alice@example.com");
    expect(alice.languagePreference).toBe("Chinese");
    expect(alice.tags).toEqual(["strong", "fast"]);
    expect(alice.lastLogin).toBe(1750000000000);

    // Defaults when fields are missing.
    const empty = res.body.clients[1];
    expect(empty.name).toBe("Unnamed Client");
    expect(empty.status).toBe("Active");
    expect(empty.program).toBe("--");
    expect(empty.languagePreference).toBe("English");
    expect(empty.tags).toEqual([]);
  });

  it("500s with a JSON error when the Feishu call blows up", async () => {
    stubFeishuEnv({ FEISHU_CLIENTS_TABLE_ID: "tbl-cli-list" });
    // Only the token is routed; the records fetch hits an unmatched URL and
    // rejects, which the handler must turn into a 500.
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
    ]);

    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Could not fetch clients");
  });
});
