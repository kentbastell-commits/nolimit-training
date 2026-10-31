import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import WxLoginQr from "./WxLoginQr";
import { nativeFetch } from "./appCore";
import { isAthletePreview } from "./athletePreviewPolicy";
import { setAthletePreviewToken, ATHLETE_SESSION_EXPIRED } from "./athleteSessionClient";
import { clearAthleteCachedReads } from "./cacheScope";
import { BRAND_WORDMARK_BLACK } from "./brandAssets";
import "./AthleteSessionGate.css";

type State = { phase: "checking" | "login" | "offline" | "ready" | "mismatch" | "previewError"; clientCode?: string; readOnly?: boolean };
export default function AthleteSessionGate({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const query = new URLSearchParams(window.location.search);
  const portal = query.get("portal") === "client";
  const preview = isAthletePreview(window.location.search);
  const requestedCode = (query.get("client") || query.get("clientCode") || "").trim();
  const [state, setState] = useState<State>({ phase: portal ? "checking" : "ready" });
  const [pin, setPin] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const check = useCallback(async (signal?: AbortSignal) => {
    if (!portal) return;
    setState({ phase: "checking" });
    try {
      let response: Response;
      if (preview) {
        const coachKey = localStorage.getItem("nl_coach_key") || "";
        if (!coachKey) { setState({ phase: "previewError" }); return; }
        response = await nativeFetch("/api/athleteSession", { method: "POST", signal, headers: { "Content-Type": "application/json", "x-coach-key": coachKey },
          body: JSON.stringify({ action: "preview", clientCode: requestedCode }) });
      } else response = await nativeFetch("/api/athleteSession", { signal, cache: "no-store" });
      const data = await response.json();
      if (signal?.aborted) return;
      if (!response.ok) throw new Error("Session unavailable");
      if (preview) {
        if (!data.sessionToken) throw new Error("Preview unavailable");
        setAthletePreviewToken(data.sessionToken);
        setState({ phase: "ready", clientCode: requestedCode, readOnly: true }); return;
      }
      if (!data.authenticated || !data.clientCode) {
        // Only the server's explicit transition mode can keep an old portal
        // link working. Offline/unknown/required responses never bypass login.
        if (data.required === false && /^CL-\d+$/i.test(requestedCode)) {
          setState({ phase: "ready", clientCode: requestedCode }); return;
        }
        setState({ phase: "login" }); return;
      }
      if (requestedCode && requestedCode.toUpperCase() !== String(data.clientCode).toUpperCase()) {
        setState({ phase: "mismatch", clientCode: String(data.clientCode) }); return;
      }
      if (requestedCode !== data.clientCode) {
        const url = new URL(window.location.href); url.searchParams.set("client", data.clientCode); url.searchParams.delete("clientCode");
        history.replaceState(null, "", url);
      }
      setState({ phase: "ready", clientCode: String(data.clientCode) });
    } catch {
      if (!signal?.aborted) setState({ phase: preview ? "previewError" : "offline" });
    }
  }, [portal, preview, requestedCode]);
  useEffect(() => {
    const controller = new AbortController(); void check(controller.signal);
    const expired = () => { setAthletePreviewToken(""); setState({ phase: preview ? "previewError" : "login" }); };
    window.addEventListener(ATHLETE_SESSION_EXPIRED, expired);
    return () => { controller.abort(); setAthletePreviewToken(""); window.removeEventListener(ATHLETE_SESSION_EXPIRED, expired); };
  }, [check, preview]);
  const ownPortal = (code: string) => { window.location.href = `/?portal=client&client=${encodeURIComponent(code)}`; };
  const signOut = async () => {
    if (busy) return; setBusy(true); setError("");
    try {
      const response = await nativeFetch("/api/athleteSession", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
      if (!response.ok) throw new Error("Logout unavailable");
      clearAthleteCachedReads(state.clientCode || ""); localStorage.removeItem("nl_portal_code");
      setPin(""); setState({ phase: "login" });
    } catch { setError(t("athleteSessionLogoutFailed")); } finally { setBusy(false); }
  };
  const signIn = async () => {
    if (!pin.trim() || busy) return; setBusy(true); setError("");
    try {
      const response = await nativeFetch("/api/findMyPortal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: pin.trim() }) });
      const data = await response.json();
      if (!response.ok || !data.clientCode) { setError(t(response.status === 429 ? "athleteSessionLimited" : "athleteSessionInvalid")); return; }
      ownPortal(String(data.clientCode));
    } catch { setError(t("athleteSessionUnavailable")); } finally { setBusy(false); }
  };
  if (!portal) return children;
  if (state.phase === "ready") return <>
    <nav className="athleteSessionAccount" aria-label={t("athleteSessionAccount")}>
      {state.readOnly ? <><span>{t("athleteSessionPreview")}</span><a href="/?view=coach">{t("athleteSessionReturnCoach")}</a></>
        : <button type="button" disabled={busy} onClick={() => void signOut()}>{t("athleteSessionLogout")}</button>}
      {error && <span role="alert">{error}</span>}
    </nav>{children}
  </>;
  return <main className="athleteSessionPage"><section className="athleteSessionCard">
    <img src={BRAND_WORDMARK_BLACK} alt="NX LIMIT Training" width="180" />
    <button type="button" className="athleteSessionLanguage" onClick={() => void i18n.changeLanguage(i18n.language.startsWith("zh") ? "en" : "zh")}>{t("athleteSessionLanguage")}</button>
    <h1>{t("athleteSessionTitle")}</h1>
    {state.phase === "checking" ? <p role="status">{t("athleteSessionChecking")}</p>
      : state.phase === "previewError" ? <><p role="alert">{t("athleteSessionPreviewError")}</p><a href="/?view=coach">{t("athleteSessionReturnCoach")}</a></>
      : state.phase === "mismatch" ? <><p>{t("athleteSessionMismatch")}</p><button type="button" onClick={() => ownPortal(state.clientCode!)}>{t("athleteSessionOwnPortal")}</button><button type="button" disabled={busy} onClick={() => void signOut()}>{t("athleteSessionLogout")}</button></>
      : <>
        <p>{t("athleteSessionIntro")}</p>
        {state.phase === "offline" && <><p role="alert">{t("athleteSessionUnavailable")}</p><button type="button" onClick={() => void check()}>{t("athleteSessionRetry")}</button></>}
        <form onSubmit={event => { event.preventDefault(); void signIn(); }}>
          <label htmlFor="athlete-login-pin">{t("athleteSessionPin")}</label>
          <input id="athlete-login-pin" autoComplete="current-password" type="password" value={pin} maxLength={64} onChange={event => setPin(event.target.value)} required />
          <button type="submit" disabled={busy || !pin.trim()}>{t(busy ? "athleteSessionBusy" : "athleteSessionSubmit")}</button>
        </form>
        <WxLoginQr zh={i18n.language.startsWith("zh")} />
      </>}
    {error && <p role="alert">{error}</p>}
  </section></main>;
}
