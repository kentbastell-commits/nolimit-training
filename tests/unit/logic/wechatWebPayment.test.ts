import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); });

it("allows a fresh authorization after a failed callback, preserving the original payment link", async () => {
  vi.resetModules();
  const replace = vi.fn();
  let href = "https://trainnolimit.cn/pay/signed-order?lang=zh&code=failed&state=wxstore";
  vi.stubGlobal("window", {
    location: { get href() { return href; }, replace },
    history: { replaceState: (_state: unknown, _title: string, next: string) => { href = next; } },
  });
  vi.stubGlobal("navigator", { userAgent: "MicroMessenger" });
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => key === "nl-wx-oauth-attempted" ? "1" : null,
    setItem: vi.fn(), removeItem: vi.fn(),
  });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({ error: "Auth failed" }) })));
  const { authorizeWechatPayment } = await import("../../../src/useWxpayEnabled");
  await expect(authorizeWechatPayment()).rejects.toThrow("WeChat authorization failed");
  expect(replace).not.toHaveBeenCalled();
  await authorizeWechatPayment();
  expect(replace).toHaveBeenCalledTimes(1);
  const redirect = new URL(replace.mock.calls[0][0]);
  expect(redirect.hostname).toBe("open.weixin.qq.com");
  expect(redirect.searchParams.get("redirect_uri")).toBe("https://trainnolimit.cn/pay/signed-order?lang=zh");
  expect(redirect.searchParams.get("scope")).toBe("snsapi_base");
});

it("renews a locally expired token instead of sending it to the payment API", async () => {
  vi.resetModules();
  const replace = vi.fn(), removeItem = vi.fn();
  vi.stubGlobal("window", { location: { href: "https://trainnolimit.cn/pay/signed-order", replace } });
  vi.stubGlobal("navigator", { userAgent: "MicroMessenger" });
  vi.stubGlobal("sessionStorage", { getItem: () => `payer.${Date.now() - 1000}.signed`, removeItem });
  const { authorizeWechatPayment } = await import("../../../src/useWxpayEnabled");
  await authorizeWechatPayment();
  expect(removeItem).toHaveBeenCalledWith("nl-wx-openid-token");
  expect(replace).toHaveBeenCalledTimes(1);
});
