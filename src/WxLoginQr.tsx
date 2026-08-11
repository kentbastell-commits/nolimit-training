// "Scan with WeChat to log in" block for the portal-login modal. Mints a
// handshake token, renders the OAuth QR, polls until the phone completes the
// bind, then enters the portal. Renders nothing when the server has WeChat
// login switched off, so the classic name+phone lookup always stands.
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";

type QrState =
  | { phase: "loading" }
  | { phase: "ready"; qrDataUrl: string; token: string }
  | { phase: "expired" }
  | { phase: "ok" }
  | { phase: "hidden" };

export default function WxLoginQr({ zh }: { zh: boolean }) {
  const [state, setState] = useState<QrState>({ phase: "loading" });
  const pollRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const start = useCallback(async () => {
    stopPolling();
    setState({ phase: "loading" });
    try {
      const res = await fetch("/api/wxLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.token || !data?.qrUrl) {
        setState({ phase: "hidden" });
        return;
      }
      const qrDataUrl = await QRCode.toDataURL(String(data.qrUrl), {
        width: 180,
        margin: 1,
        color: { dark: "#111111", light: "#ffffff" },
      });
      const token = String(data.token);
      setState({ phase: "ready", qrDataUrl, token });
      pollRef.current = window.setInterval(async () => {
        try {
          const poll = await fetch(
            `/api/wxLogin?action=status&t=${encodeURIComponent(token)}`
          );
          if (!poll.ok) return;
          const status = await poll.json();
          if (status?.status === "ok" && status?.clientCode) {
            stopPolling();
            setState({ phase: "ok" });
            window.location.href = `/?portal=client&client=${encodeURIComponent(String(status.clientCode))}`;
          } else if (status?.status === "expired") {
            stopPolling();
            setState({ phase: "expired" });
          }
        } catch {
          // Transient — keep polling.
        }
      }, 2_500);
    } catch {
      setState({ phase: "hidden" });
    }
  }, []);

  useEffect(() => {
    void start();
    return stopPolling;
  }, [start]);

  if (state.phase === "hidden") return null;

  return (
    <div className="wxLoginQr">
      <div className="wxLoginQrDivider">
        <span>{zh ? "或" : "or"}</span>
      </div>
      {state.phase === "loading" ? (
        <p className="wxLoginQrHint">{zh ? "正在生成登录二维码…" : "Preparing WeChat login…"}</p>
      ) : null}
      {state.phase === "ready" ? (
        <>
          <img src={state.qrDataUrl} alt={zh ? "微信登录二维码" : "WeChat login QR"} />
          <p className="wxLoginQrHint">
            {zh
              ? "用微信「扫一扫」扫码登录（首次需验证一次账户）"
              : "Scan with WeChat to log in (first time verifies your account once)"}
          </p>
        </>
      ) : null}
      {state.phase === "expired" ? (
        <button type="button" className="ghostButton" onClick={() => void start()}>
          {zh ? "二维码已过期 — 点击刷新" : "QR expired — tap to refresh"}
        </button>
      ) : null}
      {state.phase === "ok" ? (
        <p className="wxLoginQrHint">{zh ? "登录成功，正在进入…" : "Logged in — opening your portal…"}</p>
      ) : null}
    </div>
  );
}
