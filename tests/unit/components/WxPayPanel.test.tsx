import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const token = `payer.${Date.now() + 3600_000}.signed`;
const payment = { package: "prepay_id=test-prepay" };
const reply = (data: unknown, status = 200) => ({ ok: status === 200, status, json: async () => data });

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/pay/test-key-123");
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("MicroMessenger");
  sessionStorage.setItem("nl-wx-openid-token", token);
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function network({ statusPaid = true, createStatus = 200 } = {}) {
  const mock = vi.fn(async (url: string) => {
    if (url === "/api/wxpayConfig") return reply({ enabled: true });
    if (url === "/api/wxpayCreateJsapi") return reply({ payment, tradeNo: "NLTRADE123" }, createStatus);
    if (url.startsWith("/api/wxpayStatus?")) return reply({ paid: statusPaid });
    if (url === "/api/wxpayCreate") return reply({ codeUrl: "weixin://test", tradeNo: "NLQR12345", amountFen: 150000 });
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
function bridge(outcome = "ok") {
  const value = { invoke: vi.fn((_method, _payment, callback) => callback({ err_msg: `get_brand_wcpay_request:${outcome}` })) };
  vi.stubGlobal("WeixinJSBridge", value);
  return value;
}
async function panel(onPaid = vi.fn()) {
  const { default: Panel } = await import("../../../src/WxPayPanel");
  return { ...render(<Panel orderId="ORD-TEST" lang="en" variant="collect" onPaid={onPaid} />), onPaid };
}
function noQr(mock: ReturnType<typeof network>) {
  expect(mock).not.toHaveBeenCalledWith("/api/wxpayCreate", expect.anything());
  expect(screen.queryByAltText("WeChat Pay QR code")).not.toBeInTheDocument();
}

it("opens same-phone payment from Pay and waits for server confirmation", async () => {
  const mock = network();
  const native = bridge();
  const { onPaid } = await panel();
  expect(native.invoke).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Pay with WeChat" }));
  expect(await screen.findByText("Payment received!")).toBeInTheDocument();
  expect(onPaid).toHaveBeenCalledTimes(1);
  expect(mock).toHaveBeenCalledWith("/api/wxpayCreateJsapi", expect.objectContaining({ body: JSON.stringify({ orderId: "ORD-TEST", openidToken: token }) }));
  noQr(mock);
});

it("keeps confirmation pending when the payment sheet says OK but the server has not confirmed", async () => {
  const mock = network({ statusPaid: false });
  bridge();
  const { onPaid } = await panel();
  fireEvent.click(screen.getByRole("button", { name: "Pay with WeChat" }));
  const check = await screen.findByRole("button", { name: "Check payment status" });
  expect(screen.queryByText("Payment received!")).not.toBeInTheDocument();
  expect(onPaid).not.toHaveBeenCalled();
  fireEvent.click(check);
  await vi.waitFor(() => expect(mock.mock.calls.filter(([url]) => url === "/api/wxpayCreateJsapi")).toHaveLength(1));
  noQr(mock);
});

it("lets a cancelled payment retry on the same phone and reuses its unpaid attempt", async () => {
  const mock = network({ statusPaid: false });
  const native = bridge("cancel");
  await panel();
  fireEvent.click(screen.getByRole("button", { name: "Pay with WeChat" }));
  fireEvent.click(await screen.findByRole("button", { name: "Retry WeChat Pay" }));
  await vi.waitFor(() => expect(native.invoke).toHaveBeenCalledTimes(2));
  expect(mock.mock.calls.filter(([url]) => url === "/api/wxpayCreateJsapi")).toHaveLength(1);
  noQr(mock);
});

it("keeps a failed JSAPI request actionable without generating a QR", async () => {
  const mock = network({ createStatus: 502 });
  bridge();
  await panel();
  fireEvent.click(screen.getByRole("button", { name: "Pay with WeChat" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t open WeChat Pay");
  expect(screen.getByRole("button", { name: "Retry WeChat Pay" })).toBeEnabled();
  noQr(mock);
});

it("waits for WeixinJSBridgeReady before creating the payment", async () => {
  const mock = network();
  vi.stubGlobal("WeixinJSBridge", undefined);
  await panel();
  fireEvent.click(screen.getByRole("button", { name: "Pay with WeChat" }));
  await screen.findByText("Opening WeChat Pay…");
  expect(mock).not.toHaveBeenCalledWith("/api/wxpayCreateJsapi", expect.anything());
  await act(async () => { bridge(); document.dispatchEvent(new Event("WeixinJSBridgeReady")); });
  expect(await screen.findByText("Payment received!")).toBeInTheDocument();
  noQr(mock);
});

it("shows Retry when the WeChat interface does not become ready", async () => {
  const mock = network();
  vi.stubGlobal("WeixinJSBridge", undefined);
  await panel();
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole("button", { name: "Pay with WeChat" }));
  await act(async () => { await vi.advanceTimersByTimeAsync(8_001); });
  expect(screen.getByRole("button", { name: "Retry WeChat Pay" })).toBeEnabled();
  noQr(mock);
});

it("clears expired authorization rejected by the server instead of falling back to QR", async () => {
  const mock = network({ createStatus: 401 });
  bridge();
  await panel();
  fireEvent.click(screen.getByRole("button", { name: "Pay with WeChat" }));
  await screen.findByRole("button", { name: "Retry WeChat Pay" });
  expect(sessionStorage.getItem("nl-wx-openid-token")).toBeNull();
  noQr(mock);
});

it("finishes a delayed OAuth callback before displaying Pay, including when storage is blocked", async () => {
  sessionStorage.clear();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Blocked"); });
  window.history.replaceState(null, "", "/pay/test-key-123?code=oauth-code&state=wxstore");
  let finishAuth!: (response: unknown) => void;
  const pending = new Promise((resolve) => { finishAuth = resolve; });
  const mock = network();
  mock.mockImplementation(async (url: string) => {
    if (url === "/api/wxpayConfig") return reply({ enabled: true });
    if (url === "/api/wxAuthWeb") return pending as Promise<ReturnType<typeof reply>>;
    if (url === "/api/wxpayCreateJsapi") return reply({ payment, tradeNo: "NLTRADE123" });
    if (url.startsWith("/api/wxpayStatus?")) return reply({ paid: true });
    throw new Error(`Unexpected request: ${url}`);
  });
  bridge();
  const { useWxpayEnabled } = await import("../../../src/useWxpayEnabled");
  const { default: Panel } = await import("../../../src/WxPayPanel");
  function Checkout() {
    const enabled = useWxpayEnabled();
    return enabled ? <Panel orderId="ORD-TEST" lang="en" variant="collect" /> : <p>Authorizing</p>;
  }
  render(<Checkout />);
  await vi.waitFor(() => expect(mock).toHaveBeenCalledWith("/api/wxAuthWeb", expect.anything()));
  expect(screen.getByText("Authorizing")).toBeInTheDocument();
  await act(async () => { finishAuth(reply({ openidToken: token })); });
  fireEvent.click(await screen.findByRole("button", { name: "Pay with WeChat" }));
  expect(await screen.findByText("Payment received!")).toBeInTheDocument();
  noQr(mock);
});

it("recovers a failed OAuth callback without hiding payment or showing QR", async () => {
  sessionStorage.clear();
  sessionStorage.setItem("nl-wx-oauth-attempted", "1");
  window.history.replaceState(null, "", "/pay/test-key-123?code=bad-code&state=wxstore");
  const mock = network();
  mock.mockImplementation(async (url: string) => {
    if (url === "/api/wxAuthWeb") return reply({ error: "WeChat auth failed" }, 502);
    throw new Error(`Unexpected request: ${url}`);
  });
  await panel();
  fireEvent.click(screen.getByRole("button", { name: "Pay with WeChat" }));
  expect(await screen.findByRole("button", { name: "Retry WeChat Pay" })).toBeEnabled();
  expect(window.location.search).not.toContain("code=");
  noQr(mock);
});

it("retains camera-scannable checkout on desktop", async () => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Chrome Desktop");
  const mock = network();
  await panel();
  expect(await screen.findByAltText("WeChat Pay QR code")).toBeInTheDocument();
  expect(mock).toHaveBeenCalledWith("/api/wxpayCreate", expect.anything());
  expect(mock).not.toHaveBeenCalledWith("/api/wxpayCreateJsapi", expect.anything());
});
