import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import ReviewVideo from "./ReviewVideo";
import { groupWorkoutVideos, type WorkoutVideo } from "./videoSessionGrouping";
import "./WorkoutVideoGroups.css";

// `open` on <details> is a controlled attribute in React: passing
// `pending > 0` folded a session the instant the coach reviewed its last
// clip, hiding the reply they had just sent. Initial state only; the user owns
// the toggle after that.
function VideoGroup({ initiallyOpen, className, children }: { initiallyOpen: boolean; className: string; children: ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  return <details className={className} open={open} onToggle={event => setOpen((event.currentTarget as HTMLDetailsElement).open)}>{children}</details>;
}

// One reply for every pending clip in a session. Athletes who film each set
// send 10-20 clips per workout; replying clip by clip is why 71 sat unanswered.
function SessionReply({ zh, pending, onReviewMany }: { zh: boolean; pending: WorkoutVideo[]; onReviewMany: (ids: string[], reply: string) => void | Promise<void> }) {
  const [text, setText] = useState(""); const [busy, setBusy] = useState(false);
  const n = pending.length;
  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try { await onReviewMany(pending.map(v => v.recordId), text.trim()); setText(""); } finally { setBusy(false); }
  };
  return <div className="workoutVideoSessionReply">
    <strong>{zh ? `一条反馈，发给这次训练的 ${n} 个待反馈视频` : `One reply for all ${n} pending clip${n === 1 ? "" : "s"} in this session`}</strong>
    <textarea aria-label={zh ? "整节训练反馈" : "Session feedback"} placeholder={zh ? "写一条反馈，会发送到这次训练的每个待反馈视频…" : "Write one reply — it goes to every pending clip in this session…"} value={text} onChange={event => setText(event.target.value)} />
    <button type="button" className="rvGoldBtn" disabled={busy || !text.trim()} onClick={send}>{busy ? (zh ? "发送中…" : "Sending…") : (zh ? `发送并标记 ${n} 个已审核` : `Send to ${n} clip${n === 1 ? "" : "s"} & mark reviewed`)}</button>
  </div>;
}

export default function WorkoutVideoGroups({ videos, coach = false, replies = {}, setReplies, onReview, onReviewMany }: {
  videos: WorkoutVideo[]; coach?: boolean; replies?: Record<string, string>;
  setReplies?: (update: (previous: Record<string, string>) => Record<string, string>) => void;
  onReview?: (id: string) => void;
  onReviewMany?: (ids: string[], reply: string) => void | Promise<void>;
}) {
  const { i18n } = useTranslation(); const zh = i18n.language.startsWith("zh");
  return <div className="workoutVideoGroups">{groupWorkoutVideos(videos).map((group, index) => <VideoGroup className="workoutVideoGroup" key={group.key} initiallyOpen={group.pending > 0 || index === 0}>
    <summary><div>{coach && <small>{group.clientName || group.clientId}</small>}<h3>{zh ? group.workoutNameCn || group.workoutName || "其他上传" : group.workoutName || "Other uploads"}</h3>
      <span>{group.dateBasis === "upload" ? (zh ? "上传日期" : "Uploaded") : (zh ? "训练日期" : "Session date")} · <time>{group.date || (zh ? "日期未知" : "Unknown date")}</time></span></div>
      <div className="workoutVideoCounts"><span>{group.videos.length} {zh ? "项上传" : group.videos.length === 1 ? "upload" : "uploads"}</span><strong>{group.pending ? `${group.pending} ${zh ? "待反馈" : "awaiting feedback"}` : zh ? "已反馈" : "Reviewed"}</strong></div>
    </summary>
    {coach && onReviewMany && group.pending > 1 && <SessionReply zh={zh} pending={group.videos.filter(v => v.status !== "Reviewed")} onReviewMany={onReviewMany} />}
    <div className="workoutVideoCards">{group.videos.map(video => <article className="workoutVideoCard" key={video.recordId}>
      <header><h4>{video.exerciseName || (zh ? "动作视频" : "Exercise video")}</h4><span>{video.status === "Reviewed" ? (zh ? "已反馈" : "Reviewed") : (zh ? "等待教练反馈" : "Awaiting coach feedback")}</span></header>
      {video.videoUrl && <ReviewVideo url={video.videoUrl} title={video.exerciseName || "Workout video"} />}
      {video.clientNote && <p className="workoutVideoNote">{coach ? video.clientNoteEn || video.clientNote : video.clientNote}</p>}
      {(video.coachReply || video.coachReplyCn) && <blockquote><strong>{zh ? "教练反馈" : "Coach feedback"}</strong><p>{zh ? video.coachReplyCn || video.coachReply : video.coachReply || video.coachReplyCn}</p></blockquote>}
      {coach && <><textarea aria-label={`${zh ? "反馈" : "Feedback"}: ${video.exerciseName || video.recordId}`} placeholder={zh ? "填写教练反馈…" : "Write coaching feedback…"} value={replies[video.recordId] ?? video.coachReply ?? ""}
        onChange={event => { const value = event.target.value; setReplies?.(previous => ({ ...previous, [video.recordId]: value })); }} />
        <button type="button" className="rvGoldBtn" onClick={() => onReview?.(video.recordId)}>{video.status === "Reviewed" ? (zh ? "更新反馈" : "Update feedback") : (zh ? "发送反馈并标记已审核" : "Send reply & mark reviewed")}</button></>}
    </article>)}</div>
  </VideoGroup>)}</div>;
}

export function AthleteWorkoutVideos({ clientId }: { clientId: string }) {
  const { i18n } = useTranslation(); const zh = i18n.language.startsWith("zh");
  const [state, setState] = useState<{ clientId: string; videos: WorkoutVideo[]; loading: boolean; error: boolean }>({ clientId, videos: [], loading: true, error: false });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setState({ clientId, videos: [], loading: true, error: false });
    fetch(`/api/formVideos?clientId=${encodeURIComponent(clientId)}`)
      .then(async response => { if (!response.ok) throw Error(); return response.json(); })
      .then(data => { if (active) setState({ clientId, videos: data.videos || [], loading: false, error: false }); })
      .catch(() => { if (active) setState({ clientId, videos: [], loading: false, error: true }); });
    return () => { active = false; };
  }, [clientId, retry]);
  if (state.clientId !== clientId || state.loading) return <p>{zh ? "正在加载视频…" : "Loading videos…"}</p>;
  if (state.error) return <p role="alert">{zh ? "视频暂时无法加载。" : "Videos could not load."} <button onClick={() => setRetry(n => n + 1)}>{zh ? "重试" : "Retry"}</button></p>;
  return state.videos.length ? <WorkoutVideoGroups videos={state.videos} /> : <p>{zh ? "还没有训练视频。" : "No workout videos yet."}</p>;
}
