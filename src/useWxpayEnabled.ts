import { useEffect, useState } from "react";

const OPENID_TOKEN_KEY = "nl-wx-openid-token";
const OA_APPID = "wxdf181d0891ae7ed1";
let tokenInMemory = "";
let authorizationPromise: Promise<string | null> | null = null;
let enabledCache: boolean | null = null;
let enabledPromise: Promise<boolean> | null = null;

export function isWechatBrowser(): boolean {
  return /MicroMessenger/i.test(navigator.userAgent);
}

export function clearWechatPaymentAuthorization(): void {
  tokenInMemory = "";
  try { sessionStorage.removeItem(OPENID_TOKEN_KEY); } catch { /* Memory still works. */ }
}

function storedToken(): string {
  let token = tokenInMemory;
  try { token ||= sessionStorage.getItem(OPENID_TOKEN_KEY) || ""; } catch { /* Use memory. */ }
  const expiry = Number(token.split(".")[1]);
  if (expiry && expiry < Date.now()) {
    clearWechatPaymentAuthorization();
    return "";
  }
  return token;
}

// Only a Pay/Retry click can initiate a redirect. A failed callback cannot
// trap the payer in an automatic redirect loop or a scan-only fallback.
export async function authorizeWechatPayment(): Promise<string | null> {
  if (!isWechatBrowser()) return null;
  if (authorizationPromise) return authorizationPromise;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  if (!(code && url.searchParams.get("state") === "wxstore")) {
    const token = storedToken();
    if (token) return token;
  }
  if (code && url.searchParams.get("state") === "wxstore") {
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    window.history.replaceState(null, "", url.toString());
    authorizationPromise = (async () => {
      const res = await fetch("/api/wxAuthWeb", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }), signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.openidToken) throw new Error("WeChat authorization failed");
      tokenInMemory = String(data.openidToken);
      try { sessionStorage.setItem(OPENID_TOKEN_KEY, tokenInMemory); } catch { /* Use memory. */ }
      return tokenInMemory;
    })();
    try { return await authorizationPromise; } finally { authorizationPromise = null; }
  }
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.location.replace(
    "https://open.weixin.qq.com/connect/oauth2/authorize" +
    `?appid=${OA_APPID}&redirect_uri=${encodeURIComponent(url.toString())}` +
    "&response_type=code&scope=snsapi_base&state=wxstore#wechat_redirect",
  );
  return null;
}

export function useWxpayEnabled(): boolean {
  const [enabled, setEnabled] = useState(enabledCache === true);
  useEffect(() => {
    if (!enabledPromise) {
      enabledPromise = fetch("/api/wxpayConfig")
        .then((res) => res.ok ? res.json() : { enabled: false })
        .then(async (data) => {
          const value = data?.enabled === true;
          const url = new URL(window.location.href);
          if (value && isWechatBrowser() && url.searchParams.get("code") && url.searchParams.get("state") === "wxstore") {
            // Finish the callback before Pay appears. On failure the next
            // click starts a fresh authorization, without a session lockout.
            await authorizeWechatPayment().catch(() => null);
          }
          enabledCache = value;
          return value;
        })
        .catch(() => { enabledCache = false; return false; });
    }
    let mounted = true;
    void enabledPromise.then((value) => { if (mounted) setEnabled(value); });
    return () => { mounted = false; };
  }, []);
  return enabled;
}
