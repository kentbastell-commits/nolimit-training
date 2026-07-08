// Shared helpers for unit-testing the Vercel-style api/ handlers without any
// network: fake req/res pairs and a scripted global fetch.
import { vi } from "vitest";

export type FakeRes = {
  statusCode: number;
  body: any;
  headersSent: boolean;
  status: (code: number) => FakeRes;
  json: (payload: any) => FakeRes;
  setHeader: (name: string, value: string) => FakeRes;
  end: (payload?: any) => FakeRes;
};

export function makeRes(): FakeRes {
  const res: FakeRes = {
    statusCode: 0,
    body: undefined,
    headersSent: false,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.body = payload;
      res.headersSent = true;
      return res;
    },
    setHeader() {
      return res;
    },
    end(payload?: any) {
      res.body = res.body ?? payload;
      res.headersSent = true;
      return res;
    },
  };
  return res;
}

export function makeReq(overrides: Record<string, any> = {}) {
  return {
    method: "GET",
    query: {},
    body: {},
    headers: {},
    ...overrides,
  };
}

// Script global fetch by URL substring. Unmatched URLs reject loudly so a test
// can never silently hit the real network.
//   stubFetch([
//     { match: "tenant_access_token", json: { tenant_access_token: "tok" } },
//     { match: "/records", json: { code: 0, data: { items: [], has_more: false } } },
//   ]);
export function stubFetch(
  routes: Array<{ match: string; json?: any; status?: number; text?: string }>
) {
  const impl = vi.fn(async (url: any) => {
    const target = String(url);
    const route = routes.find((r) => target.includes(r.match));
    if (!route) {
      throw new Error(`unit-test fetch: unmatched URL ${target.slice(0, 120)}`);
    }
    const status = route.status ?? 200;
    const bodyText = route.text ?? JSON.stringify(route.json ?? {});
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => JSON.parse(bodyText),
      text: async () => bodyText,
    } as any;
  });
  vi.stubGlobal("fetch", impl);
  return impl;
}

// Feishu env vars the handlers read. Call in beforeEach; pair with
// vi.unstubAllEnvs() in afterEach.
export function stubFeishuEnv(extra: Record<string, string> = {}) {
  const base: Record<string, string> = {
    FEISHU_APP_ID: "test-app-id",
    FEISHU_APP_SECRET: "test-secret",
    FEISHU_BASE_APP_TOKEN: "test-base",
  };
  for (const [key, value] of Object.entries({ ...base, ...extra })) {
    vi.stubEnv(key, value);
  }
}
