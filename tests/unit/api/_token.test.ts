import { afterEach, describe, expect, it, vi } from "vitest";
import { getTenantToken } from "../../../api/_token.ts";
import { stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// NOTE: _token.ts keeps the token in module-level state, so test order matters
// inside this file: the error case runs first (nothing gets cached on failure),
// then the success case proves both the fetch and the cache.
describe("api/_token", () => {
  it("throws when Feishu does not return a tenant_access_token", async () => {
    stubFeishuEnv();
    stubFetch([
      { match: "tenant_access_token", json: { code: 99, msg: "app not found" } },
    ]);

    await expect(getTenantToken()).rejects.toThrow("Could not get tenant token");
  });

  it("fetches the token once and serves later calls from the in-memory cache", async () => {
    stubFeishuEnv();
    const impl = stubFetch([
      {
        match: "tenant_access_token",
        json: { code: 0, tenant_access_token: "tok-cached", expire: 7200 },
      },
    ]);

    // Concurrent burst + a follow-up call: all share one fetch.
    const [first, second] = await Promise.all([
      getTenantToken(),
      getTenantToken(),
    ]);
    const third = await getTenantToken();

    expect(first).toBe("tok-cached");
    expect(second).toBe("tok-cached");
    expect(third).toBe("tok-cached");
    expect(impl).toHaveBeenCalledTimes(1);

    const [url, options] = impl.mock.calls[0];
    expect(String(url)).toContain("auth/v3/tenant_access_token/internal");
    expect(JSON.parse(options.body)).toEqual({
      app_id: "test-app-id",
      app_secret: "test-secret",
    });
  });
});
