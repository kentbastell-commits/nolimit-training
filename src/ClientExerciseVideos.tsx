import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import ReviewVideo from "./ReviewVideo";
import { exerciseVideoDate, exerciseVideoHistory } from "./exerciseVideoHistory";
import type { WorkoutVideo } from "./videoSessionGrouping";
import "./ClientExerciseVideos.css";

export default function ClientExerciseVideos({ clientId, onOpenFeedback }: { clientId: string; onOpenFeedback?: (id: string) => void }) {
  const { t, i18n } = useTranslation(), zh = i18n.language.startsWith("zh"), id = useId();
  const [open, setOpen] = useState(false), [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ clientId: string; loading: boolean; error: boolean; videos: WorkoutVideo[] }>({ clientId, loading: true, error: false, videos: [] });
  const [selected, setSelected] = useState<string | null>(null), [order, setOrder] = useState("oldest"), [compare, setCompare] = useState(false), [limit, setLimit] = useState(6);
  const [pair, setPair] = useState<[string, string] | null>(null);
  useEffect(() => {
    if (!open) return;
    let active = true; const controller = new AbortController();
    setState({ clientId, loading: true, error: false, videos: [] });
    void fetch(`/api/formVideos?clientId=${encodeURIComponent(clientId)}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw Error(); const data = await response.json(); if (!Array.isArray(data.videos)) throw Error(); return data.videos; })
      .then(videos => { if (active) setState({ clientId, loading: false, error: false, videos: videos.filter((v: WorkoutVideo) => v && typeof v.recordId === "string") }); })
      .catch(() => { if (active) setState({ clientId, loading: false, error: true, videos: [] }); });
    return () => { active = false; controller.abort(); };
  }, [clientId, open, retry]);
  const groups = exerciseVideoHistory(state.clientId === clientId ? state.videos : [], clientId);
  const group = groups.find(g => g.key === selected) || groups[0];
  const dated = group?.videos.filter(v => exerciseVideoDate(v)) || [];
  const canCompare = Boolean(group?.name && group.videos.length > 1);
  const comparing = compare && canCompare;
  const known = group?.videos.filter(v => exerciseVideoDate(v)) || [], unknown = group?.videos.filter(v => !exerciseVideoDate(v)) || [];
  const timeline = [...(order === "newest" ? [...known].reverse() : known), ...unknown];
  const first = group?.videos.find(v => v.recordId === pair?.[0]) || dated[0] || group?.videos[0];
  const second = group?.videos.find(v => v.recordId === pair?.[1] && v.recordId !== first?.recordId)
    || [...dated].reverse().find(v => v.recordId !== first?.recordId)
    || group?.videos.find(v => v.recordId !== first?.recordId);
  const visible = comparing && first && second ? [first, second] : timeline.slice(0, limit);
  const clipLabel = (video: WorkoutVideo) => {
    const date = exerciseVideoDate(video), sameDay = group.videos.filter(v => exerciseVideoDate(v) === date);
    return [date || t("cvhUnknown"), zh ? video.workoutNameCn || video.workoutName : video.workoutName,
      sameDay.length > 1 ? t("cvhTake", { number: sameDay.findIndex(v => v.recordId === video.recordId) + 1 }) : ""].filter(Boolean).join(" · ");
  };
  return <section className="clientExerciseVideos" aria-labelledby={`${id}-title`}>
    <header className="cevhHeader"><div><h3 id={`${id}-title`}>{t("cvhTitle")}</h3><p>{t("cvhIntro")}</p></div>
      <button type="button" aria-expanded={open} aria-controls={`${id}-body`} onClick={() => setOpen(v => !v)}>{t(open ? "cvhClose" : "cvhOpen")}</button></header>
    {open && <div id={`${id}-body`} className="cevhBody">
      {state.clientId !== clientId || state.loading ? <p role="status">{t("cvhLoading")}</p> : state.error ? <p role="alert">{t("cvhError")} <button type="button" onClick={() => setRetry(v => v + 1)}>{t("cvhRetry")}</button></p> : !groups.length ? <p>{t("cvhEmpty")}</p> : <>
        <div className="cevhControls"><label>{t("cvhExercise")}<select aria-label={t("cvhExercise")} value={group.key} onChange={e => { setSelected(e.target.value); setCompare(false); setPair(null); setLimit(6); }}>
          {groups.map(g => <option key={g.key} value={g.key}>{g.name || t("cvhUnlabelled")} · {t("cvhCount", { count: g.videos.length })}</option>)}</select></label>
          {!comparing && <label>{t("cvhOrder")}<select aria-label={t("cvhOrder")} value={order} onChange={e => { setOrder(e.target.value); setLimit(6); }}><option value="oldest">{t("cvhOldest")}</option><option value="newest">{t("cvhNewest")}</option></select></label>}
          {canCompare && <button type="button" aria-pressed={comparing} onClick={() => setCompare(v => !v)}>{t(comparing ? "cvhTimeline" : "cvhCompare")}</button>}
        </div>
        <div className="cevhSummary"><strong>{group.name || t("cvhUnlabelled")}</strong><span>{t("cvhCount", { count: group.videos.length })}{dated.length > 0 && ` · ${t("cvhRange", { first: exerciseVideoDate(dated[0]), last: exerciseVideoDate(dated[dated.length - 1]) })}`}</span></div>
        {comparing && first && second && <>
          <p className="cevhCompareHint">{t("cvhCompareHint")}</p>
          <div className="cevhPairControls">{[first, second].map((video, index) => <label key={index}>{t(index === 0 ? "cvhDateA" : "cvhDateB")}
            <select aria-label={t(index === 0 ? "cvhDateA" : "cvhDateB")} value={video.recordId} onChange={e => setPair(index === 0 ? [e.target.value, second.recordId] : [first.recordId, e.target.value])}>
              {group.videos.map(option => <option key={option.recordId} value={option.recordId} disabled={option.recordId === (index === 0 ? second.recordId : first.recordId)}>{clipLabel(option)}</option>)}
            </select></label>)}</div>
        </>}
        <ol className={`cevhTimeline${comparing ? " cevhComparison" : ""}`} aria-label={group.name || t("cvhUnlabelled")}>
          {visible.map((video, index) => <li key={video.recordId} className="cevhClip">
            <header>{comparing && <strong className="cevhPosition">{t(index === 0 ? "cvhVideoA" : "cvhVideoB")}</strong>}<span>{t(video.workoutDate ? "cvhSession" : "cvhUploaded")} · <time>{exerciseVideoDate(video) || t("cvhUnknown")}</time></span>{!comparing && <><h4>{zh ? video.workoutNameCn || video.workoutName : video.workoutName}</h4><small>{t(video.status === "Reviewed" ? "cvhReviewed" : "cvhPending")}</small></>}</header>
            <ReviewVideo key={video.recordId} url={video.videoUrl!} title={`${group.name || t("cvhExerciseVideo")} · ${exerciseVideoDate(video) || t("cvhUnknown")}`} />
            {comparing && <div className="cevhClipDetails"><h4>{zh ? video.workoutNameCn || video.workoutName : video.workoutName}</h4><small>{t(video.status === "Reviewed" ? "cvhReviewed" : "cvhPending")}</small></div>}
            {video.clientNote && <div className="cevhNote"><strong>{t("cvhAthleteNote")}</strong><p>{zh ? video.clientNote : video.clientNoteEn || video.clientNote}</p></div>}
            {(video.coachReply || video.coachReplyCn) && <blockquote><strong>{t("cvhFeedback")}</strong><p>{zh ? video.coachReplyCn || video.coachReply : video.coachReply || video.coachReplyCn}</p></blockquote>}
            {onOpenFeedback && <button type="button" onClick={() => onOpenFeedback(video.recordId)}>{t("cvhOpenFeedback")}</button>}
          </li>)}
        </ol>
        {!comparing && timeline.length > limit && <button type="button" onClick={() => setLimit(v => v + 6)}>{t("cvhMore")}</button>}
      </>}
    </div>}
  </section>;
}
