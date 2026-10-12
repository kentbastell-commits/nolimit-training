import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("waits for the OAuth exchange before creating an in-WeChat payment", async () => {
  vi.resetModules();
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("MicroMessenger");
  window.history.replaceState(null, "", "/pay/test?code=oauth-code&state=wxstore");
  let finishAuth!: (response: unknown) => void;
  const authPending = new Promise((resolve) => { finishAuth = resolve; });
  const fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/wxpayConfig") return { ok: true, json: async () => ({ enabled: true }) };
    if (url === "/api/wxAuthWeb") return authPending;
    if (url === "/api/wxpayCreateJsapi") return {
      ok: true, json: async () => ({ payment: { prepay_id: "test-prepay" } }),
    };
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  const bridge = { invoke: vi.fn((_method, _payment, callback) => {
    callback({ err_msg: "get_brand_wcpay_request:ok" });
  }) };
  vi.stubGlobal("WeixinJSBridge", bridge);
  const { default: WxPayPanel, useWxpayEnabled } = await import("../../../src/WxPayPanel");
  function Checkout() {
    const enabled = useWxpayEnabled();
    return enabled ? <WxPayPanel orderId="ORD-TEST" lang="en" variant="collect" /> : <p>Authorizing</p>;
  }
  render(<Checkout />);
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/wxAuthWeb", expect.anything()));
  expect(screen.getByText("Authorizing")).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalledWith("/api/wxpayCreate", expect.anything());
  await act(async () => {
    finishAuth({ ok: true, json: async () => ({ openidToken: "signed-token" }) });
  });
  expect(await screen.findByText("Payment received!")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith("/api/wxpayCreateJsapi", expect.objectContaining({
    body: JSON.stringify({ orderId: "ORD-TEST", openidToken: "signed-token" }),
  }));
  expect(fetchMock).not.toHaveBeenCalledWith("/api/wxpayCreate", expect.anything());
  expect(bridge.invoke).toHaveBeenCalledTimes(1);
});
