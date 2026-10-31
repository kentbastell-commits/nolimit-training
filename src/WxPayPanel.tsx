import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { authorizeWechatPayment, clearWechatPaymentAuthorization, isWechatBrowser } from "./useWxpayEnabled";
import "./WxPayPanel.css";

type Payment = Record<string, string>;
type Bridge = { invoke: (method: string, payment: Payment, callback: (result: { err_msg?: string }) => void) => void };
type Attempt = { payment: Payment; tradeNo: string };
type DirectNotice = "ready" | "cancelled" | "error" | "authorizing" | "opening" | "confirming";
type PanelState =
  | { phase: "loading" }
  | { phase: "direct"; notice: DirectNotice }
  | { phase: "ready"; qrDataUrl: string; amountLabel: string }
  | { phase: "paid" }
  | { phase: "hidden" };

function waitForBridge(signal: AbortSignal): Promise<Bridge> {
  const getBridge = () => (window as unknown as { WeixinJSBridge?: Bridge }).WeixinJSBridge;
  const bridge = getBridge();
  if (bridge?.invoke) return Promise.resolve(bridge);
  return new Promise((resolve, reject) => {
    const finish = (value?: Bridge) => {
      clearTimeout(timer);
      document.removeEventListener("WeixinJSBridgeReady", ready);
      signal.removeEventListener("abort", abort);
      if (value) resolve(value); else reject(new Error("WeChat payment interface unavailable"));
    };
    const ready = () => { const value = getBridge(); if (value?.invoke) finish(value); };
    const abort = () => finish();
    const timer = setTimeout(() => finish(), 8_000);
    document.addEventListener("WeixinJSBridgeReady", ready);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort(); else ready();
  });
}

export default function WxPayPanel({ orderId, checkoutKey, lang, onPaid, variant = "store" }: {
  orderId: string;
  checkoutKey?: string;
  lang: "en" | "zh";
  onPaid?: () => void;
  variant?: "store" | "collect";
}) {
  const isWeChat = isWechatBrowser();
  const zh = lang === "zh";
  const [state, setState] = useState<PanelState>(() => isWeChat ? { phase: "direct", notice: "ready" } : { phase: "loading" });
  const onPaidRef = useRef(onPaid);
  const attemptRef = useRef<Attempt | null>(null);
  const busyRef = useRef(false);
  const paidRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { onPaidRef.current = onPaid; }, [onPaid]);

  const stopPolling = () => {
    if (pollRef.current !== null) clearInterval(pollRef.current);
    pollRef.current = null;
  };
  const markPaid = () => {
    if (paidRef.current) return;
    paidRef.current = true;
    stopPolling();
    setState({ phase: "paid" });
    onPaidRef.current?.();
  };
  const checkPaid = async (tradeNo: string, signal: AbortSignal): Promise<boolean> => {
    const res = await fetch(`/api/wxpayStatus?tradeNo=${encodeURIComponent(tradeNo)}`, { signal });
    const data = await res.json().catch(() => null);
    if (signal.aborted) return false;
    if (res.ok && data?.paid === true) { markPaid(); return true; }
    return false;
  };
  const startPolling = (tradeNo: string, signal: AbortSignal) => {
    stopPolling();
    const startedAt = Date.now();
    pollRef.current = setInterval(() => {
      if (signal.aborted || Date.now() - startedAt > 15 * 60_000) { stopPolling(); return; }
      void checkPaid(tradeNo, signal).catch(() => { /* Retry on next poll. */ });
    }, 4_000);
  };

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    attemptRef.current = null;
    busyRef.current = false;
    paidRef.current = false;
    if (!isWeChat) {
      void (async () => {
        try {
          const res = await fetch("/api/wxpayCreate", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, checkoutKey }), signal: controller.signal,
          });
          const data = await res.json().catch(() => null);
          if (controller.signal.aborted) return;
          if (res.ok && data?.alreadyPaid) { markPaid(); return; }
          if (!res.ok || !data?.codeUrl) { setState({ phase: "hidden" }); return; }
          const qrDataUrl = await QRCode.toDataURL(String(data.codeUrl), {
            width: 240, margin: 1, color: { dark: "#111111", light: "#ffffff" },
          });
          if (controller.signal.aborted) return;
          setState({ phase: "ready", qrDataUrl, amountLabel: `¥${(Number(data.amountFen) / 100).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}` });
          startPolling(String(data.tradeNo), controller.signal);
        } catch { if (!controller.signal.aborted) setState({ phase: "hidden" }); }
      })();
    }
    return () => { controller.abort(); stopPolling(); };
    // The order owns this lifecycle; polling uses refs for the current callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, checkoutKey, isWeChat]);

  const payDirect = async () => {
    const signal = controllerRef.current?.signal;
    if (!signal || signal.aborted || busyRef.current || paidRef.current) return;
    busyRef.current = true;
    try {
      const existing = attemptRef.current;
      if (existing) {
        const confirmed = await checkPaid(existing.tradeNo, signal);
        if (signal.aborted || confirmed) return;
        if (state.phase === "direct" && state.notice === "confirming") return;
      }
      setState({ phase: "direct", notice: "authorizing" });
      const openidToken = await authorizeWechatPayment();
      if (signal.aborted) return;
      if (!openidToken) return; // The browser is leaving for silent authorization.
      setState({ phase: "direct", notice: "opening" });
      const bridge = await waitForBridge(signal);
      if (signal.aborted) return;
      let attempt = existing;
      if (!attempt) {
        const res = await fetch("/api/wxpayCreateJsapi", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, checkoutKey, openidToken }), signal,
        });
        const data = await res.json().catch(() => null);
        if (signal.aborted) return;
        if (res.ok && data?.alreadyPaid) { markPaid(); return; }
        if (res.status === 401) clearWechatPaymentAuthorization();
        if (!res.ok || !data?.payment || !data?.tradeNo) throw new Error("Could not prepare WeChat Pay");
        attempt = { payment: data.payment as Payment, tradeNo: String(data.tradeNo) };
        attemptRef.current = attempt;
      }
      startPolling(attempt.tradeNo, signal);
      const outcome = await new Promise<string>((resolve) => {
        const abort = () => resolve("");
        signal.addEventListener("abort", abort, { once: true });
        bridge.invoke("getBrandWCPayRequest", attempt.payment, (result) => {
          signal.removeEventListener("abort", abort);
          resolve(String(result.err_msg || ""));
        });
      });
      if (signal.aborted || paidRef.current) return;
      if (outcome === "get_brand_wcpay_request:ok") {
        setState({ phase: "direct", notice: "confirming" });
        await checkPaid(attempt.tradeNo, signal);
      } else {
        if (outcome !== "get_brand_wcpay_request:cancel") attemptRef.current = null;
        setState({ phase: "direct", notice: outcome === "get_brand_wcpay_request:cancel" ? "cancelled" : "error" });
      }
    } catch {
      if (!signal.aborted && !paidRef.current) {
        setState((current) => current.phase === "direct" && current.notice === "confirming"
          ? current : { phase: "direct", notice: "error" });
      }
    } finally { busyRef.current = false; }
  };

  if (state.phase === "hidden") return null;
  if (state.phase === "paid") return (
    <div className="wxpayPanel wxpayPanel--paid" role="status">
      <span className="wxpayPaidMark" aria-hidden="true">✓</span>
      <strong>{zh ? "支付成功！" : "Payment received!"}</strong>
      <p>{variant === "collect" ? zh ? "已记录，谢谢！教练会看到这笔付款。" : "Recorded — thank you! Your coach can see this payment."
        : zh ? "训练计划已自动解锁——打开客户端即可开始。" : "Your program is unlocked — open your portal to get started."}</p>
      {variant === "store" ? <div className="wxpayFollow">
        <img src="/oa-follow-qr.jpg" alt={zh ? "公众号二维码" : "Official account QR"} />
        <p>{isWeChat ? zh ? "长按二维码关注公众号，获取训练提醒与内容更新。" : "Long-press to follow our official account for training reminders."
          : zh ? "微信扫码关注公众号，获取训练提醒与内容更新。" : "Scan with WeChat to follow us for training reminders."}</p>
      </div> : null}
    </div>
  );
  if (state.phase === "loading") return (
    <div className="wxpayPanel wxpayPanel--loading" role="status"><span className="wxpaySpinner" aria-hidden="true" />{zh ? "正在准备微信支付…" : "Preparing WeChat Pay…"}</div>
  );
  if (state.phase === "direct") {
    const busy = state.notice === "authorizing" || state.notice === "opening";
    const confirming = state.notice === "confirming";
    return (
      <div className="wxpayDirect">
        <p className="wxpayDirectHint" role={state.notice === "error" ? "alert" : "status"}>
          {state.notice === "cancelled" ? zh ? "付款已取消。可点击下方按钮继续付款。" : "Payment cancelled. You can try again below."
            : state.notice === "error" ? zh ? "暂时无法打开微信支付，请重试。" : "Couldn’t open WeChat Pay. Please try again."
            : confirming ? zh ? "正在确认付款结果，请勿重复付款。" : "Confirming your payment. Please don’t pay again."
            : busy ? zh ? "正在打开微信支付…" : "Opening WeChat Pay…"
            : zh ? "点击下方按钮，在微信内直接付款。" : "Tap below to pay directly in WeChat."}
        </p>
        <button type="button" className="wxpayDirectButton" disabled={busy} onClick={() => void payDirect()}>
          {busy ? zh ? "正在打开…" : "Opening…"
            : confirming ? zh ? "查询付款结果" : "Check payment status"
            : state.notice === "cancelled" || state.notice === "error" ? zh ? "重试微信支付" : "Retry WeChat Pay"
            : zh ? "微信支付" : "Pay with WeChat"}
        </button>
      </div>
    );
  }
  return (
    <div className="wxpayPanel">
      <div className="wxpayPanelHead"><strong>{zh ? "微信支付" : "Pay with WeChat"}</strong><span className="wxpayAmount">{state.amountLabel}</span></div>
      <img className="wxpayQr" src={state.qrDataUrl} alt={zh ? "微信支付二维码" : "WeChat Pay QR code"} />
      <p className="wxpayHint">{zh ? "打开微信，使用“扫一扫”扫描二维码完成付款。" : "Open WeChat and use Scan to pay."}</p>
      <p className="wxpayAuto">{variant === "collect" ? zh ? "付款成功后此页面会自动确认。" : "This page confirms automatically after payment."
        : zh ? "付款成功后此页面会自动确认，训练计划立即解锁。" : "This page confirms automatically after payment — your program unlocks instantly."}</p>
    </div>
  );
}
