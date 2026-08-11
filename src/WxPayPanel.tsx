// Real WeChat Pay panel for the store checkout: creates a Native transaction
// for the just-submitted order group, renders the payment QR, and polls until
// the payment lands. Self-contained on purpose — no App.tsx prop threading.
//
// Degrades safely (#35 pattern): if the feature is off (503) or anything
// fails, the panel renders nothing and the existing manual-payment
// instructions stand.
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

let enabledCache: boolean | null = null;
let enabledPromise: Promise<boolean> | null = null;

const IS_WECHAT = /MicroMessenger/i.test(navigator.userAgent);
const OPENID_TOKEN_KEY = "nl-wx-openid-token";
const OAUTH_ATTEMPT_KEY = "nl-wx-oauth-attempted";
const OA_APPID = "wxdf181d0891ae7ed1";

function stashedOpenidToken(): string {
  try {
    return sessionStorage.getItem(OPENID_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

// Inside the WeChat browser: silently round-trip through the service
// account's snsapi_base authorize page once per session so the checkout can
// open the NATIVE payment sheet instead of a long-press QR. Invisible to the
// user (base scope shows no consent screen); any failure just leaves the QR
// fallback in place.
async function bootstrapWechatOpenid(): Promise<void> {
  if (!IS_WECHAT || stashedOpenidToken()) return;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (code && state === "wxstore") {
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    window.history.replaceState(null, "", url.toString());
    try {
      const res = await fetch("/api/wxAuthWeb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.openidToken) {
        try {
          sessionStorage.setItem(OPENID_TOKEN_KEY, String(data.openidToken));
        } catch {
          // Storage blocked — the QR fallback still works.
        }
      }
    } catch {
      // Network failure — QR fallback stands.
    }
    return;
  }
  try {
    if (sessionStorage.getItem(OAUTH_ATTEMPT_KEY)) return;
    sessionStorage.setItem(OAUTH_ATTEMPT_KEY, "1");
  } catch {
    return; // No storage means we can't stop a redirect loop — don't start one.
  }
  const redirect = new URL(window.location.href);
  redirect.searchParams.delete("code");
  redirect.searchParams.delete("state");
  window.location.replace(
    "https://open.weixin.qq.com/connect/oauth2/authorize" +
      `?appid=${OA_APPID}&redirect_uri=${encodeURIComponent(redirect.toString())}` +
      "&response_type=code&scope=snsapi_base&state=wxstore#wechat_redirect"
  );
}

/** Module-cached probe of /api/wxpayConfig — one fetch per page load. */
export function useWxpayEnabled(): boolean {
  const [enabled, setEnabled] = useState(enabledCache === true);
  useEffect(() => {
    if (enabledCache !== null) {
      setEnabled(enabledCache);
      return;
    }
    if (!enabledPromise) {
      enabledPromise = fetch("/api/wxpayConfig")
        .then((res) => (res.ok ? res.json() : { enabled: false }))
        .then((data) => {
          enabledCache = data?.enabled === true;
          if (enabledCache) void bootstrapWechatOpenid();
          return enabledCache;
        })
        .catch(() => {
          enabledCache = false;
          return false;
        });
    }
    let mounted = true;
    void enabledPromise.then((value) => {
      if (mounted) setEnabled(value);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return enabled;
}

type PanelState =
  | { phase: "loading" }
  | { phase: "ready"; qrDataUrl: string; tradeNo: string; amountLabel: string }
  | { phase: "paid" }
  | { phase: "hidden" };

export default function WxPayPanel({
  orderId,
  lang,
  onPaid,
}: {
  orderId: string;
  lang: "en" | "zh";
  onPaid?: () => void;
}) {
  const [state, setState] = useState<PanelState>({ phase: "loading" });
  const pollRef = useRef<number | null>(null);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;
  const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

  useEffect(() => {
    let cancelled = false;
    const stopPolling = () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const startPolling = (tradeNo: string) => {
      const startedAt = Date.now();
      pollRef.current = window.setInterval(async () => {
        // Give up after 15 minutes; the manual flow still stands.
        if (Date.now() - startedAt > 15 * 60_000) {
          stopPolling();
          return;
        }
        try {
          const res = await fetch(
            `/api/wxpayStatus?tradeNo=${encodeURIComponent(tradeNo)}`
          );
          if (!res.ok) return;
          const data = await res.json();
          if (data?.paid === true && !cancelled) {
            stopPolling();
            setState({ phase: "paid" });
            onPaidRef.current?.();
          }
        } catch {
          // Transient network failure — keep polling.
        }
      }, 4_000);
    };

    // Inside WeChat with an authorized session: open the NATIVE payment
    // sheet. Falls through to the QR path on any failure.
    const tryJsapi = async (): Promise<boolean> => {
      const openidToken = stashedOpenidToken();
      if (!IS_WECHAT || !openidToken) return false;
      try {
        const res = await fetch("/api/wxpayCreateJsapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, openidToken }),
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return true;
        if (res.ok && data?.alreadyPaid) {
          setState({ phase: "paid" });
          onPaidRef.current?.();
          return true;
        }
        if (!res.ok || !data?.payment) return false;
        const bridge = (window as unknown as { WeixinJSBridge?: any }).WeixinJSBridge;
        if (!bridge?.invoke) return false;
        const outcome = await new Promise<string>((resolve) => {
          bridge.invoke("getBrandWCPayRequest", data.payment, (result: any) =>
            resolve(String(result?.err_msg || ""))
          );
        });
        if (cancelled) return true;
        if (outcome === "get_brand_wcpay_request:ok") {
          setState({ phase: "paid" });
          onPaidRef.current?.();
          return true;
        }
        // Cancelled/failed sheet: keep the panel useful with the QR path.
        return false;
      } catch {
        return false;
      }
    };

    (async () => {
      if (await tryJsapi()) return;
      try {
        const res = await fetch("/api/wxpayCreate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.alreadyPaid) {
          setState({ phase: "paid" });
          onPaidRef.current?.();
          return;
        }
        if (!res.ok || !data?.codeUrl) {
          setState({ phase: "hidden" });
          return;
        }
        const qrDataUrl = await QRCode.toDataURL(String(data.codeUrl), {
          width: 240,
          margin: 1,
          color: { dark: "#111111", light: "#ffffff" },
        });
        if (cancelled) return;
        setState({
          phase: "ready",
          qrDataUrl,
          tradeNo: String(data.tradeNo),
          amountLabel: `¥${(Number(data.amountFen) / 100).toLocaleString("zh-CN", {
            minimumFractionDigits: 2,
          })}`,
        });
        startPolling(String(data.tradeNo));
      } catch {
        if (!cancelled) setState({ phase: "hidden" });
      }
    })();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [orderId]);

  if (state.phase === "hidden") return null;

  const zh = lang === "zh";

  if (state.phase === "paid") {
    return (
      <div className="wxpayPanel wxpayPanel--paid" role="status">
        <span className="wxpayPaidMark" aria-hidden="true">
          ✓
        </span>
        <strong>{zh ? "支付成功！" : "Payment received!"}</strong>
        <p>
          {zh
            ? "训练计划已自动解锁——打开客户端即可开始。"
            : "Your program is unlocked — open your portal to get started."}
        </p>
      </div>
    );
  }

  if (state.phase === "loading") {
    return (
      <div className="wxpayPanel wxpayPanel--loading" role="status">
        <span className="wxpaySpinner" aria-hidden="true" />
        {zh ? "正在生成微信支付二维码…" : "Preparing WeChat Pay…"}
      </div>
    );
  }

  return (
    <div className="wxpayPanel">
      <div className="wxpayPanelHead">
        <strong>{zh ? "微信支付" : "Pay with WeChat"}</strong>
        <span className="wxpayAmount">{state.amountLabel}</span>
      </div>
      <img className="wxpayQr" src={state.qrDataUrl} alt={zh ? "微信支付二维码" : "WeChat Pay QR code"} />
      <p className="wxpayHint">
        {isWeChat
          ? zh
            ? "长按二维码，选择“识别图中二维码”即可付款。"
            : "Long-press the QR code and choose “Extract QR code” to pay."
          : zh
            ? "打开微信，使用“扫一扫”扫描二维码完成付款。"
            : "Open WeChat and use Scan to pay."}
      </p>
      <p className="wxpayAuto">
        {zh
          ? "付款成功后此页面会自动确认，训练计划立即解锁。"
          : "This page confirms automatically after payment — your program unlocks instantly."}
      </p>
    </div>
  );
}
