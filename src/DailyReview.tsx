/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Clock3, RefreshCw, X } from "lucide-react";
import ReviewPage from "./ReviewPage";
import { coachingDate, coachingToday, daysBetween, decisionStatus, isAdminItem, type CoachingItem, type ReviewDecision } from "./coachingReview";
import "./DailyCoaching.css";

export type ReviewView = { filter: string; athlete: string; search: string; selected: string; limit: number; scroll: number };
export const initialReviewView: ReviewView = { filter: "dailyAll", athlete: "", search: "", selected: "", limit: 18, scroll: 0 };
export default function DailyReview(props: any) {
  const { t } = useTranslation();
  const { items, decisions, decisionReady, saveDecision, view, setView, clients, coachReviewLoading, coachReviewError, refreshReviewQueue } = props;
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const notes: Record<string, string> = props.notes || localNotes;
  const setNotes: typeof setLocalNotes = props.setNotes || setLocalNotes;
  const [events, setEvents] = useState<any[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const scroll = useRef(view.scroll);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => window.scrollTo(0, scroll.current));
    const capture = () => { scroll.current = window.scrollY; };
    window.addEventListener("scroll", capture, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", capture); setView((v: ReviewView) => ({ ...v, scroll: scroll.current })); };
  }, [setView]);
  const change = (patch: Partial<ReviewView>) => { setView((v: ReviewView) => ({ ...v, selected: "", limit: 18, ...patch })); setEvents(null); setError(""); };
  const states = decisions as ReviewDecision[];
  const currentItems = items as CoachingItem[];
  const archived = states.filter(s => clients.some((c: any) => c.clientCode === s.item.clientId) && !currentItems.some(i => i.key === s.key)).map(s => ({ ...s.item, source: null } as CoachingItem));
  const all = [...currentItems, ...archived];
  const status = (item: CoachingItem) => decisionStatus(item, states, now);
  const scoped = all.filter(i => (!view.athlete || i.clientId === view.athlete) && `${i.clientName} ${i.title}`.toLowerCase().includes(view.search.toLowerCase()));
  const matches = (item: CoachingItem, filter: string) => {
    const state = status(item);
    if (filter === "dailySnoozed") return state === "snoozed";
    if (filter === "dailyHistory") return state === "resolved";
    if (!item.source || state !== "open") return false;
    if (filter === "dailyAdmin") return isAdminItem(item);
    if (isAdminItem(item)) return false;
    if (filter === "dailyWaiting") return item.priority === 0;
    if (filter === "dailyTraining") return item.priority === 1;
    if (filter === "dailyFollowups") return item.priority === 2 || item.priority === 3;
    return true;
  };
  const visible = scoped.filter(i => matches(i, view.filter));
  const selected = all.find(i => i.key === view.selected);
  useEffect(() => {
    if (view.selected && (!selected || !matches(selected, view.filter))) change({ selected: "" });
  }, [items, decisions, view.selected, view.filter]); // resolving/replying advances to remaining work
  const settle = async (item: CoachingItem, next: "resolved" | "snoozed" | "open") => {
    setSaving(item.key); setError("");
    const tomorrow = Date.parse(`${coachingToday()}T00:00:00+08:00`) + 86400000;
    try {
      await saveDecision(item, next, next === "snoozed" ? tomorrow : null, notes[item.key] ?? states.find(s => s.key === item.key)?.note ?? "");
      change({ selected: "" });
    } catch (e: any) { setError(t(e.message === "conflict" ? "dailyConflict" : "dailySaveError")); }
    finally { setSaving(""); }
  };
  const openHistory = async (item: CoachingItem) => {
    setHistoryError(false); setEvents(null);
    try { const res = await fetch(`/api/coachingReviewHistory?key=${encodeURIComponent(item.key)}`); if (!res.ok) throw new Error(); const data = await res.json(); setEvents(data.events); }
    catch { setHistoryError(true); }
  };
  const detail = (item: CoachingItem) => {
    const map: Record<string, string> = { message: "clientMessages", comment: "globalUnreviewedWorkoutComments", checkin: "coachReviewCheckIns", video: "reviewFormVideos", submission: "globalReviewSubmissionItems", order: "globalReviewOrders", enquiry: "newEnquiries" };
    const sections: Record<string, string> = { message: "messages", comment: "comments", checkin: "checkins", video: "formVideos", submission: "submissions", order: "comments", enquiry: "enquiries" };
    const narrow: Record<string, any[]> = Object.fromEntries(Object.values(map).map(k => [k, []]));
    if (map[item.kind] && item.source) narrow[map[item.kind]] = [item.source];
    return <div className="dailyDetail">
      {(item.source?.coachReply || item.source?.coachResponse) && <p className="coachTimelineNote"><strong>{t("dailyCoachFeedback")}</strong><br />{item.source.coachReply || item.source.coachResponse}</p>}
      {item.source && map[item.kind] && <ReviewPage {...props} {...narrow} embeddedSection={sections[item.kind]} openReviewSections={{ [sections[item.kind]]: true }} />}
      {item.source && ["workout", "missed"].includes(item.kind) && <button className="dailyPrimary" onClick={() => props.openReviewWorkout(item.source)}>{t("dailyOpen")} <ArrowRight size={16} /></button>}
      {item.source && item.kind === "coverage" && <p>{item.title ? t("dailyEnds", { date: item.title }) : t("dailyNoCoverage")}</p>}
      {!item.source && <p>{t("dailySourceGone")}</p>}
      {item.clientId && <button className="dailyLink" onClick={() => props.openReviewClient(item.clientId, item.clientName)}>{t("dailyContext")} <ArrowRight size={16} /></button>}
      <label className="dailyNoteLabel">{t("dailyNote")}<textarea value={notes[item.key] ?? states.find(s => s.key === item.key)?.note ?? ""} placeholder={t("dailyNoteHint")} onChange={e => setNotes(n => ({ ...n, [item.key]: e.target.value }))} /></label>
      {["message", "checkin", "video"].includes(item.kind) && <p className="dailyHint">{t("dailyReplyHint")}</p>}
      <div className="dailyActions">
        {status(item) === "open" ? <>
          <button className="dailyPrimary" disabled={!decisionReady || !!saving} onClick={() => void settle(item, "resolved")}><Check size={16} />{saving === item.key ? t("dailySaving") : t("dailyResolve")}</button>
          <button disabled={!decisionReady || !!saving} onClick={() => void settle(item, "snoozed")}><Clock3 size={16} />{t("dailySnooze")}</button>
        </> : !item.sourceDone && <button disabled={!decisionReady || !!saving || !item.source} onClick={() => void settle(item, "open")}>{t("dailyReopen")}</button>}
        <button onClick={() => void openHistory(item)}>{t("dailyDecision")}</button>
      </div>
      {historyError && <p role="alert">{t("dailyStateError")}</p>}
      {events && <ol className="dailyHistory">{events.length ? events.map(e => <li key={e.eventId}><strong>{t(e.status === "resolved" ? "dailyResolved" : e.status === "snoozed" ? "dailySnoozed" : "dailyReopen")}</strong> · {new Date(e.updatedAt).toLocaleString()}<p>{e.note}</p></li>) : <li>{t("dailyEmpty")}</li>}</ol>}
    </div>;
  };
  return <section className="dailyReview">
    <header className="dailyHeader"><div><h1>{t("dailyReview")}</h1><p>{t("dailyOpenCount", { count: currentItems.filter(i => !isAdminItem(i) && status(i) === "open").length })}</p></div><button aria-label={t("dailyRefresh")} onClick={refreshReviewQueue} disabled={coachReviewLoading}><RefreshCw size={17} /><span>{t(coachReviewLoading ? "dailyRefreshing" : "dailyRefresh")}</span></button></header>
    <nav className="dailyFilters" aria-label={t("dailyReview")}>{["dailyAll", "dailyWaiting", "dailyTraining", "dailyFollowups", "dailyAdmin", "dailySnoozed", "dailyHistory"].map(f => <button key={f} aria-label={`${t(f)} ${scoped.filter(i => matches(i, f)).length}`} aria-pressed={view.filter === f} onClick={() => change({ filter: f })}>{t(f)} <span>{scoped.filter(i => matches(i, f)).length}</span></button>)}</nav>
    <div className="dailySearch"><input aria-label={t("dailySearch")} placeholder={t("dailySearch")} value={view.search} onChange={e => change({ search: e.target.value })} /><select aria-label={t("dailyAllAthletes")} value={view.athlete} onChange={e => change({ athlete: e.target.value })}><option value="">{t("dailyAllAthletes")}</option>{clients.map((c: any) => <option key={c.clientCode} value={c.clientCode}>{c.name}</option>)}</select></div>
    {coachReviewError && <p role="alert" className="dailyError">{coachReviewError}</p>}
    {!decisionReady && <p className="dailyHint" role="status">{t(coachReviewLoading ? "dailyLoading" : "dailyStateError")}</p>}
    {error && <p role="alert" className="dailyError">{error}</p>}
    <div className="dailyQueue">{visible.slice(0, view.limit).map(item => {
      const state = states.find(s => s.key === item.key), age = item.date ? daysBetween(item.date, coachingDate(now)) : null;
      return <article className={`dailyItem ${view.selected === item.key ? "isOpen" : ""}`} key={`${item.key}:${item.revision}`}>
        <button className="dailyItemOpen" aria-expanded={view.selected === item.key} onClick={() => change({ selected: view.selected === item.key ? "" : item.key, limit: view.limit })}>
          <div className="dailyItemIdentity"><strong>{item.clientName || item.title || t(`dailyKind_${item.kind}`)}</strong><small>{age === null ? t("dailyUndated") : age <= 0 ? item.date : t("dailyAge", { count: age })}</small></div>
          <div className="dailyItemBody"><div><span className={`dailyReason priority${item.priority}`}>{t(`dailyKind_${item.kind}`)}</span><p>{item.kind === "coverage" ? (item.title ? t("dailyEnds", { date: item.title }) : t("dailyNoCoverage")) : item.title}</p>{status(item) === "snoozed" && <small>{t("dailyUntil", { date: coachingDate(state?.until) })}</small>}</div>{view.selected === item.key ? <X size={18} /> : <ArrowRight size={18} />}</div>
        </button>
        {view.selected === item.key && detail(item)}
      </article>;
    })}</div>
    {!visible.length && <p className="dailyEmpty">{t(coachReviewLoading ? "dailyLoading" : "dailyEmpty")}</p>}
    {visible.length > view.limit && <button className="dailyLoadMore" onClick={() => setView((v: ReviewView) => ({ ...v, limit: v.limit + 18 }))}>{t("dailyMore")} ({visible.length - view.limit})</button>}
  </section>;
}
