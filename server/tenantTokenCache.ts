type FetchLike = typeof fetch;

type TokenCacheEntry = {
  token: string;
  expiry: number;
};

type TokenInflightResult =
  | { token: string }
  | { response: Response };

const TOKEN_URL =
  "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal";

function tokenResponse(token: string, ttlMs: number) {
  return new Response(
    JSON.stringify({
      code: 0,
      msg: "ok",
      tenant_access_token: token,
      expire: Math.max(60, Math.round(ttlMs / 1000)),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function appIdFromRequest(init?: RequestInit) {
  if (typeof init?.body !== "string") return "";
  try {
    const parsed = JSON.parse(init.body) as { app_id?: unknown };
    return typeof parsed.app_id === "string" ? parsed.app_id : "";
  } catch {
    return "";
  }
}

/**
 * Wrap fetch so Feishu tenant tokens are reused without ever crossing app
 * boundaries. The server hosts more than one Feishu integration; app_id is
 * therefore part of the cache key and of the in-flight refresh key.
 */
export function createTenantTokenCachingFetch(realFetch: FetchLike): FetchLike {
  const tokenCache = new Map<string, TokenCacheEntry>();
  const tokenInflight = new Map<string, Promise<TokenInflightResult>>();

  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    if (url !== TOKEN_URL) return realFetch(input, init);

    // If a caller uses a non-JSON body, bypass the cache. Returning a cached
    // token without a trustworthy app_id would recreate the cross-app bug.
    const appId = appIdFromRequest(init);
    if (!appId) return realFetch(input, init);

    const now = Date.now();
    const cached = tokenCache.get(appId);
    if (cached?.token && now < cached.expiry) {
      return tokenResponse(cached.token, cached.expiry - now);
    }

    let inflight = tokenInflight.get(appId);
    if (!inflight) {
      inflight = (async () => {
        const response = await realFetch(input, init);
        let data: { tenant_access_token?: string; expire?: number } = {};
        try {
          data = (await response.clone().json()) as typeof data;
        } catch {
          // Keep the original upstream response untouched so every waiting
          // caller receives the real Feishu status/body without a second
          // credential request.
          return { response };
        }
        if (!data.tenant_access_token) {
          return { response };
        }
        const ttlSeconds = Number(data.expire) || 7200;
        const entry = {
          token: data.tenant_access_token,
          // Refresh five minutes before Feishu's stated expiry.
          expiry: Date.now() + Math.max(60, ttlSeconds - 300) * 1000,
        };
        tokenCache.set(appId, entry);
        return { token: entry.token };
      })().finally(() => {
        tokenInflight.delete(appId);
      });
      tokenInflight.set(appId, inflight);
    }
    const result = await inflight;
    if ("response" in result) return result.response.clone();
    const entry = tokenCache.get(appId);
    return tokenResponse(
      result.token,
      (entry?.expiry || Date.now()) - Date.now(),
    );
  }) as FetchLike;
}
