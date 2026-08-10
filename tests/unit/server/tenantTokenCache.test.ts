import { describe, expect, it, vi } from "vitest";
import { createTenantTokenCachingFetch } from "../../../server/tenantTokenCache.ts";

const tokenUrl =
  "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal";

describe("tenant token cache", () => {
  it("caches tokens independently for each Feishu app", async () => {
    const upstream = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || "{}")) as { app_id?: string };
      return new Response(
        JSON.stringify({
          code: 0,
          tenant_access_token: `token-for-${body.app_id}`,
          expire: 7200,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    });
    const cachedFetch = createTenantTokenCachingFetch(upstream as typeof fetch);

    const request = (appId: string) =>
      cachedFetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: appId, app_secret: "not-used" }),
      }).then((response) => response.json());

    const firstA = await request("app-a");
    const firstB = await request("app-b");
    const secondA = await request("app-a");

    expect(firstA.tenant_access_token).toBe("token-for-app-a");
    expect(firstB.tenant_access_token).toBe("token-for-app-b");
    expect(secondA.tenant_access_token).toBe("token-for-app-a");
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it("bypasses caching when app_id cannot be parsed", async () => {
    const upstream = vi.fn(async () =>
      new Response(JSON.stringify({ code: 1, msg: "bad request" })),
    );
    const cachedFetch = createTenantTokenCachingFetch(upstream as typeof fetch);

    await cachedFetch(tokenUrl, { method: "POST", body: "not-json" });
    await cachedFetch(tokenUrl, { method: "POST", body: "not-json" });

    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it("returns an upstream auth failure without issuing a duplicate request", async () => {
    const upstream = vi.fn(async () =>
      new Response(JSON.stringify({ code: 10003, msg: "invalid app secret" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const cachedFetch = createTenantTokenCachingFetch(upstream as typeof fetch);

    const response = await cachedFetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: "app-a", app_secret: "wrong" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 10003 });
    expect(upstream).toHaveBeenCalledTimes(1);
  });
});
