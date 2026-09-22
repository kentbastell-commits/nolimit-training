/* Shared athlete web/preview screens, following the mini-program hierarchy. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BookOpen, ChartNoAxesCombined, CheckCircle2, ChevronRight, ClipboardList, Dumbbell, Gauge, HeartPulse, History, MessageCircle, Settings, Sun } from "lucide-react";
import { normalizeDate } from "./appCore";
import { isAthletePreview } from "./athletePreviewPolicy";
import "./AthleteHub.css";

const JumpLabModal = lazy(() => import("./JumpLabModal"));
export function athleteContactKey(type: string) {
  return /digital/i.test(type) ? "athleteSupport" : type?.trim() ? "athleteCoach" : "athleteGetStarted";
}

function AthleteMessages({ client, t, preview }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [refresh, setRefresh] = useState(0);
  const code = client.clientCode;
  useEffect(() => {
    let active = true;
    setLoading(true); setFailed(false);
    fetch(`/api/clientMessages?clientId=${encodeURIComponent(code)}`)
      .then(async r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { if (active) setMessages(data.messages || []); })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [code, refresh]);
  const send = async () => {
    if (preview || sending || !body.trim()) return;
    setSending(true); setStatus("");
    try {
      const r = await fetch("/api/clientMessages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: code, clientName: client.name, body: body.trim() }) });
      const data = await r.json();
      if (!r.ok || !data.success) throw new Error();
      setBody(""); setStatus("athleteSent"); setRefresh(n => n + 1);
    } catch { setStatus("athleteSendFailed"); }
    finally { setSending(false); }
  };
  return <>
    <section className="athCard">
      <h2>{t("athleteMessages")}</h2><p>{t("athleteMessageHint")}</p>
      <label className="athField">{t("athleteMessageBody")}<textarea value={body} maxLength={1000} rows={4} onChange={e => setBody(e.target.value)} /></label>
      {preview && <p>{t("athletePreviewNotice")}</p>}
      <button className="athPrimary" disabled={preview || sending || !body.trim()} onClick={send}>{t(sending ? "redesignSaving" : "athleteSend")}</button>
      {status && <p role="status">{t(status)}</p>}
    </section>
    <section className="athCard">
      {loading ? <p>{t("loading")}</p> : failed ? <p role="alert">{t("athleteLoadFailed")} <button className="athLink" onClick={() => setRefresh(n => n + 1)}>{t("athleteRetry")}</button></p> : !messages.length ? <p>{t("athleteNoMessages")}</p> : messages.map(m => <article className="athMessage" key={m.messageId}>
        <p>{m.body}</p>{m.coachReply && <blockquote><strong>{t("athleteReply")}</strong><p>{m.coachReply}</p></blockquote>}
      </article>)}
    </section>
  </>;
}

export default function AthleteHub({ view, client, t, today, workouts = [], loading, loadFailed, retry, tasks = [], assignments = [], assignmentName, openAssignment, openWorkout, workoutName, dateLabel, setClientTab, renderWellness, renderWorkload, renderMetrics, renderHistory, renderRecords, renderTrophies, account, inbox = [], markInboxSeen, inboxSeenAt, workloadEnabled }: {
  view: string; client: any; t: any; today: string; workouts?: any[]; loading: boolean; loadFailed?: boolean; retry?: () => void; tasks?: any[]; assignments?: any[]; assignmentName?: (assignment: any) => string; openAssignment: any; openWorkout: any; workoutName: any; dateLabel: any; setClientTab: any; renderWellness: any; renderWorkload: any; renderMetrics: any; renderHistory: any; renderRecords: any; renderTrophies: any; account: ReactNode; inbox?: any[]; markInboxSeen: any; inboxSeenAt: number; workloadEnabled: boolean;
}) {
  const [detail, setDetail] = useState("");
  const [jumpLab, setJumpLab] = useState(false);
  const [coachSection, setCoachSection] = useState("");
  useEffect(() => { setDetail(""); setCoachSection(""); }, [view, client.clientCode]);
  const preview = isAthletePreview(window.location.search);
  const contactKey = athleteContactKey(client.clientType || "");
  const coached = contactKey === "athleteCoach";
  const completed = (w: any) => /completed/i.test(w.completionStatus || "");
  const dated = workouts.map(w => ({ w, date: normalizeDate(String(w.scheduledDate || "")) })).sort((a, b) => a.date.localeCompare(b.date));
  const todays = dated.filter(x => x.date === today);
  const pendingToday = todays.filter(x => !completed(x.w));
  const next = dated.find(x => x.date > today && !completed(x.w));
  const done = workouts.filter(completed).length;
  const progress = workouts.length ? Math.round(done / workouts.length * 100) : 0;
  const row = (key: string, Icon: any, action: () => void) => <button type="button" className="athMenuRow" onClick={action}><Icon size={21} /><span>{t(key)}</span><ChevronRight size={18} /></button>;
  const detailTitle: Record<string, string> = { wellness: "athleteWellness", workload: "athleteLoad", metrics: "athleteNumbers", records: "athleteHistory", assessments: "athleteAssessments", account: "athleteAccount" };
  const workoutRow = (w: any, action: boolean) => <button key={w.id || w.recordId} type="button" className="athWorkout" onClick={() => openWorkout(w)}>
    <span className="athWorkoutIcon"><Dumbbell size={25} /></span><span><strong>{workoutName(w)}</strong><small>{dateLabel(normalizeDate(String(w.scheduledDate)))} · {t("week")} {w.week || 1} · {t("day")} {w.day || 1}</small></span><span className="athWorkoutAction">{action ? t("start") : t("view")} <ChevronRight size={16} /></span>
  </button>;
  return <div className="athHub">
    {loadFailed && <section className="athCard" role="alert"><p>{t("athleteLoadFailed")}</p><button className="athLink" onClick={retry}>{t("athleteRetry")}</button></section>}
    {detail ? <>
      <button type="button" className="athBack" onClick={() => setDetail("")}><ArrowLeft size={18} />{t(view === "Home" ? "athleteBackToday" : "athleteBackMe")}</button>
      <h1 className="athPageTitle">{t(detailTitle[detail])}</h1>
      {detail === "wellness" && renderWellness()}
      {detail === "workload" && renderWorkload()}
      {detail === "metrics" && <><section className="athCard">{renderMetrics(false)}</section><button className="athMenuRow" onClick={() => setJumpLab(true)}>{t("jlbTitle")}<ChevronRight size={18} /></button></>}
      {detail === "records" && <><section className="athCard">{renderHistory()}</section><section className="athCard">{renderRecords()}{renderTrophies()}</section></>}
      {detail === "assessments" && <section className="athCard">{assignments.length ? assignments.map(a => <button className="athMenuRow" key={a.recordId || a.id} onClick={() => openAssignment(a)}><ClipboardList size={20} /><span>{assignmentName?.(a) || a.title || a.templateName || a.name || a.kind || t("athleteAssessments")}</span><ChevronRight size={18} /></button>) : !loadFailed && <p>{t("athleteNoAssessments")}</p>}</section>}
      {detail === "account" && account}
    </> : view === "Home" ? <>
      <header className="athHero"><h1>{t("athleteGreeting", { name: client.name || "" })}</h1><p>{dateLabel(today)}</p></header>
      {tasks.filter(x => x.type === "assignment").length > 0 && <section className="athCard">{tasks.filter(x => x.type === "assignment").map(x => <button className="athMenuRow" key={x.id} onClick={x.open}><ClipboardList size={20} /><span>{x.title}</span><ChevronRight size={18} /></button>)}</section>}
      <section className="athCard"><h2>{t("athleteTodayTraining")}</h2>
        {loading ? <p>{t("loadingWorkouts")}</p> : loadFailed ? null : pendingToday.length ? pendingToday.map(x => workoutRow(x.w, true)) : todays.length ? <p className="athRest"><CheckCircle2 size={24} />{t("athleteAllDone")}</p> : <p className="athRest"><Sun size={24} />{t(next ? "athleteRest" : "athleteNoPlan")}</p>}
        {!pendingToday.length && next && <div className="athNext"><h3>{t("athleteNext")}</h3>{workoutRow(next.w, false)}</div>}
      </section>
      {coached && <section className="athCard"><h2>{t("athleteHabits")}</h2><div className="athHabitGrid">
        <button className="athHabit athHabitWellness" onClick={() => setDetail("wellness")}><HeartPulse size={37} /><strong>{t("athleteWellness")}</strong><ChevronRight size={20} /></button>
        {workloadEnabled && <button className="athHabit athHabitLoad" onClick={() => setDetail("workload")}><Gauge size={37} /><strong>{t("athleteLoad")}</strong><ChevronRight size={20} /></button>}
      </div></section>}
      {!!workouts.length && <section className="athCard"><h2>{t("athleteProgress")}</h2><progress value={done} max={workouts.length} /><div className="athProgressMeta"><span>{t("athleteCompleted", { done, total: workouts.length })}</span><strong>{progress}%</strong></div><button className="athLink" onClick={() => setClientTab("Training")}>{t("athleteViewTraining")} <ArrowRight size={18} /></button></section>}
    </> : view === "Coach" ? <>
      {coachSection && <button className="athBack" onClick={() => setCoachSection("")}><ArrowLeft size={18} />{t("back")} · {t(contactKey)}</button>}
      {!coachSection && <><header className="athHero"><span>{t(contactKey)}</span><h1>{coached ? client.coach || client.primaryCoach || t(contactKey) : t(contactKey)}</h1><p>{t("athleteMessageHint")}</p></header>
        <section className="athCard athMenu">{row("athleteMessages", MessageCircle, () => setCoachSection("messages"))}{coached && row("athleteFeedback", ClipboardList, () => setCoachSection("feedback"))}{row(coached ? "athleteCoachContact" : "athleteSupportContact", MessageCircle, () => setCoachSection("contact"))}</section>
        {inbox.some(x => x.at > inboxSeenAt) && <button className="athLink" onClick={() => setCoachSection("feedback")}><span className="athUnread" />{t("athleteFeedback")}</button>}
      </>}
      {coachSection === "messages" && <AthleteMessages key={client.clientCode} client={client} t={t} preview={preview} />}
      {coachSection === "feedback" && <section className="athCard"><h2>{t("athleteFeedback")}</h2>{!inbox.length ? <p>{t("athleteNoFeedback")}</p> : <>{!preview && <button className="athLink" onClick={() => markInboxSeen(Math.max(...inbox.map(x => x.at)))}>{t("athleteMarkRead")}</button>}{inbox.map(x => <article className="athMessage" key={x.id}><strong>{x.title}</strong><p>{x.body}</p></article>)}</>}</section>}
      {coachSection === "contact" && <section className="athCard"><h2>{t(coached ? "athleteCoachContact" : "athleteSupportContact")}</h2>{client.coachQrUrl ? <><img className="athQr" src={client.coachQrUrl} alt={t("athleteScanQr")} /><p>{t("athleteScanQr")}</p></> : <p>{t("athleteNoContact")}</p>}</section>}
    </> : <>
      <header className="athCard athIdentity"><h1>{client.name}</h1><p>{t("athleteMyTraining")}</p></header>
      <section className="athCard athMenu"><h2>{t("athleteMyTraining")}</h2>
        {row("athleteNumbers", ChartNoAxesCombined, () => setDetail("metrics"))}
        {row("athleteHistory", History, () => setDetail("records"))}
        {row("athleteAssessments", ClipboardList, () => setDetail("assessments"))}
        {coached && workloadEnabled && row("athleteLoad", Gauge, () => setDetail("workload"))}
        {row("athletePrograms", BookOpen, () => setClientTab("Programs"))}
      </section>
      <section className="athCard athMenu">{row(contactKey, MessageCircle, () => setClientTab("Coach"))}</section>
      <section className="athCard athMenu">{row("athleteAccount", Settings, () => setDetail("account"))}</section>
    </>}
    {jumpLab && <Suspense fallback={null}><JumpLabModal selectedClient={client} t={t} onClose={() => setJumpLab(false)} /></Suspense>}
  </div>;
}
