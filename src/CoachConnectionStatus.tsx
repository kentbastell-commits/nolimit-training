import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "./CoachConnectionStatus.css";

export default function CoachConnectionStatus({ onRefresh, busy, failed, updatedAt, draftsStatus, showDrafts }: {
  onRefresh: () => Promise<void>; busy: boolean; failed: boolean; updatedAt: number; draftsStatus: string; showDrafts: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [online, setOnline] = useState(navigator.onLine);
  const [reconnected, setReconnected] = useState(false);
  useEffect(() => {
    const offline = () => { setOnline(false); setReconnected(false); };
    const restored = () => { setOnline(true); setReconnected(true); };
    window.addEventListener("offline", offline); window.addEventListener("online", restored);
    return () => { window.removeEventListener("offline", offline); window.removeEventListener("online", restored); };
  }, []);
  const draftProblem = ["unavailable", "conflict"].includes(draftsStatus);
  if (online && !reconnected && !failed && !draftProblem && !showDrafts) return null;
  return <aside className="coachConnectionStatus" role="status">
    <div><strong>{t(!online ? "coachOffline" : failed ? "coachReadFailed" : reconnected ? "coachReconnected" : draftProblem ? "coachReplyDraftProblem" : "coachReplyDraftSaved")}</strong>
      {(!online || reconnected || failed) && <p>{t("coachConnectionHint")}{updatedAt > 0 && ` ${t("coachLastRead", { time: new Date(updatedAt).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" }) })}`}</p>}
      {draftProblem && <p>{t(draftsStatus === "conflict" ? "coachDraftConflict" : "coachDraftUnavailable")}</p>}
    </div>
    {online && (reconnected || failed) && <button type="button" disabled={busy} onClick={async () => { await onRefresh(); setReconnected(false); }}>{t(busy ? "dailyRefreshing" : "dailyRefresh")}</button>}
  </aside>;
}
