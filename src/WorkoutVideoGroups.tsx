import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import ReviewVideo from "./ReviewVideo";
import { groupWorkoutVideos, isVideoPending, type WorkoutVideo } from "./videoSessionGrouping";
import "./WorkoutVideoGroups.css";

export type ReplyExtras = { audioUrl?: string };

// `open` on <details> is a controlled attribute in React: passing
// `pending > 0` folded a session the instant the coach reviewed its last
// clip, hiding the reply they had just sent. Initial state only; the user owns
// the toggle after that.
function VideoGroup({ initiallyOpen, className, children }: { initiallyOpen: boolean; className: string; children: ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  return <details className={className} open={open} onToggle={event => setOpen((event.currentTarget as HTMLDetailsElement).open)}>{children}</details>;
}

// One tap instead of typing the same sentence for the fortieth time. Five
// athletes sent 359 clips in 30 days (2026-11); the reply was the bottleneck,
// not the watching. Chips APPEND, so two taps compose a two-point reply.
const QUICK_REPLIES: Array<{ zh: string; en: string }> = [
  { zh: "👍 很好，保持这样", en: "👍 Good, keep this" },
  { zh: "深度再低一点", en: "Go a little deeper" },
  { zh: "起动前先收紧核心", en: "Brace before you start" },
  { zh: "下放再慢一点", en: "Slow the lowering" },
  { zh: "手肘收紧", en: "Elbows in" },
  { zh: "全程保持背部中立", en: "Keep the back neutral throughout" },
  { zh: "下次从侧面拍", en: "Film from the side next time" },
  { zh: "重量可以加一点", en: "You can add a little weight" },
];
const CUSTOM_KEY = "nl-quick-replies";
function readCustom(): string[] {
  try { const raw = JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]"); return Array.isArray(raw) ? raw.filter((x) => typeof x === "string").slice(0, 20) : []; } catch { return []; }
}
function writeCustom(list: string[]) { try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(list.slice(0, 20))); } catch { /* private mode */ } }
const appendReply = (current: string, chip: string) => (current.trim() ? `${current.trimEnd()}${/[。.!！?？]$/.test(current.trimEnd()) ? " " : "; "}${chip}` : chip);

function QuickReplies({ zh, value, onPick }: { zh: boolean; value: string; onPick: (next: string) => void }) {
  const [custom, setCustom] = useState<string[]>(() => readCustom());
  const save = () => { const text = value.trim(); if (!text || custom.includes(text)) return; const next = [text, ...custom]; setCustom(next); writeCustom(next); };
  const remove = (text: string) => { const next = custom.filter(c => c !== text); setCustom(next); writeCustom(next); };
  return <div className="quickReplies" role="group" aria-label={zh ? "快捷回复" : "Quick replies"}>
    {custom.map(text => <span className="quickReplyChip quickReplyChip--custom" key={text}>
      <button type="button" onClick={() => onPick(appendReply(value, text))}>{text}</button>
      <button type="button" aria-label={zh ? `删除快捷回复 ${text}` : `Remove quick reply ${text}`} onClick={() => remove(text)}>×</button>
    </span>)}
    {QUICK_REPLIES.map(chip => { const text = zh ? chip.zh : chip.en; return <button type="button" className="quickReplyChip" key={chip.en} onClick={() => onPick(appendReply(value, text))}>{text}</button>; })}
    {value.trim() && !custom.includes(value.trim()) && <button type="button" className="quickReplyChip quickReplyChip--save" onClick={save}>{zh ? "＋ 存为快捷回复" : "＋ Save as quick reply"}</button>}
  </div>;
}

// Record → upload → URL. Typing is the slow part of a review; a 15-second
// voice note says more than three lines and takes a tenth of the time. The
// server converts whatever the browser records to m4a for phones.
function pickMimeType(): string {
  const MR = (window as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;
  if (!MR || typeof MR.isTypeSupported !== "function") return "";
  return ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"].find(type => MR.isTypeSupported(type)) || "";
}
export function VoiceReply({ zh, audioUrl, onChange }: { zh: boolean; audioUrl: string; onChange: (url: string) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "uploading" | "error">("idle");
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const supported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && !!(window as unknown as { MediaRecorder?: unknown }).MediaRecorder;
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); recorder.current?.stream.getTracks().forEach(t => t.stop()); }, []);
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunks.current = [];
      rec.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); void upload(rec.mimeType || mimeType); };
      recorder.current = rec;
      rec.start(250);
      setSeconds(0); setState("recording");
      timer.current = setInterval(() => setSeconds(s => { if (s + 1 >= 120) stop(); return s + 1; }), 1000);
    } catch { setState("error"); }
  };
  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; if (recorder.current?.state === "recording") recorder.current.stop(); };
  const upload = async (mimeType: string) => {
    setState("uploading");
    try {
      const blob = new Blob(chunks.current, { type: mimeType || "application/octet-stream" });
      const ext = /mp4|m4a|aac/i.test(mimeType) ? "m4a" : /ogg/i.test(mimeType) ? "ogg" : "webm";
      const response = await fetch(`/api/uploadFormVideoFile?kind=audio&name=${encodeURIComponent(`reply.${ext}`)}`, { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.url) throw new Error("upload");
      onChange(String(data.url)); setState("idle");
    } catch { setState("error"); }
  };
  if (!supported) return null;
  if (audioUrl) return <div className="voiceReply voiceReply--ready">
    <audio controls preload="none" src={audioUrl} aria-label={zh ? "语音反馈预览" : "Voice reply preview"} />
    <button type="button" className="voiceReplyRemove" onClick={() => onChange("")}>{zh ? "删除语音" : "Remove voice note"}</button>
  </div>;
  return <div className="voiceReply">
    {state === "recording"
      ? <button type="button" className="voiceReplyBtn voiceReplyBtn--stop" onClick={stop} aria-label={zh ? "停止录音" : "Stop recording"}>■ {zh ? "停止" : "Stop"} {String(Math.floor(seconds / 60)).padStart(1, "0")}:{String(seconds % 60).padStart(2, "0")}</button>
      : <button type="button" className="voiceReplyBtn" disabled={state === "uploading"} onClick={start}>{state === "uploading" ? (zh ? "上传中…" : "Uploading…") : (zh ? "🎤 录语音反馈" : "🎤 Record voice reply")}</button>}
    {state === "error" && <span className="voiceReplyError" role="alert">{zh ? "录音失败，请检查麦克风权限。" : "Recording failed. Check microphone permission."}</span>}
  </div>;
}

function CoachReplyBlock({ zh, video }: { zh: boolean; video: WorkoutVideo }) {
  if (!video.coachReply && !video.coachReplyCn && !video.coachReplyAudioUrl) return null;
  return <blockquote><strong>{zh ? "教练反馈" : "Coach feedback"}</strong>
    {video.coachReplyAudioUrl && <audio controls preload="none" src={video.coachReplyAudioUrl} aria-label={zh ? "教练语音反馈" : "Coach voice note"} />}
    {(video.coachReply || video.coachReplyCn) && <p>{zh ? video.coachReplyCn || video.coachReply : video.coachReply || video.coachReplyCn}</p>}
  </blockquote>;
}

// One reply for every pending clip in a session. Athletes who film each set
// send 10-20 clips per workout; replying clip by clip is why 71 sat unanswered.
function SessionReply({ zh, pending, onReviewMany }: { zh: boolean; pending: WorkoutVideo[]; onReviewMany: (ids: string[], reply: string, extras?: ReplyExtras) => void | Promise<void> }) {
  const [text, setText] = useState(""); const [audioUrl, setAudioUrl] = useState(""); const [busy, setBusy] = useState(false);
  const n = pending.length;
  const canSend = Boolean(text.trim() || audioUrl);
  const send = async () => {
    if (!canSend || busy) return;
    setBusy(true);
    // Extras only when there is a voice note, so text-only callers keep the
    // two-argument shape (and their existing tests).
    try { await (audioUrl ? onReviewMany(pending.map(v => v.recordId), text.trim(), { audioUrl }) : onReviewMany(pending.map(v => v.recordId), text.trim())); setText(""); setAudioUrl(""); } finally { setBusy(false); }
  };
  return <div className="workoutVideoSessionReply">
    <strong>{zh ? `一条反馈，发给这次训练的 ${n} 个待反馈视频` : `One reply for all ${n} pending clip${n === 1 ? "" : "s"} in this session`}</strong>
    <QuickReplies zh={zh} value={text} onPick={setText} />
    <textarea aria-label={zh ? "整节训练反馈" : "Session feedback"} placeholder={zh ? "写一条反馈，会发送到这次训练的每个待反馈视频…" : "Write one reply — it goes to every pending clip in this session…"} value={text} onChange={event => setText(event.target.value)} />
    <VoiceReply zh={zh} audioUrl={audioUrl} onChange={setAudioUrl} />
    <button type="button" className="rvGoldBtn" disabled={busy || !canSend} onClick={send}>{busy ? (zh ? "发送中…" : "Sending…") : (zh ? `发送并标记 ${n} 个已审核` : `Send to ${n} clip${n === 1 ? "" : "s"} & mark reviewed`)}</button>
  </div>;
}

function ClipReply({ zh, video, value, setValue, onReview }: { zh: boolean; video: WorkoutVideo; value: string; setValue: (next: string) => void; onReview?: (id: string, extras?: ReplyExtras) => void }) {
  const [audioUrl, setAudioUrl] = useState("");
  return <>
    <QuickReplies zh={zh} value={value} onPick={setValue} />
    <textarea aria-label={`${zh ? "反馈" : "Feedback"}: ${video.exerciseName || video.recordId}`} placeholder={zh ? "填写教练反馈…" : "Write coaching feedback…"} value={value} onChange={event => setValue(event.target.value)} />
    <VoiceReply zh={zh} audioUrl={audioUrl} onChange={setAudioUrl} />
    <button type="button" className="rvGoldBtn" onClick={() => { if (audioUrl) onReview?.(video.recordId, { audioUrl }); else onReview?.(video.recordId); setAudioUrl(""); }}>{video.status === "Reviewed" ? (zh ? "更新反馈" : "Update feedback") : (zh ? "发送反馈并标记已审核" : "Send reply & mark reviewed")}</button>
  </>;
}

const statusLabel = (video: WorkoutVideo, zh: boolean) =>
  video.status === "Reviewed" ? (zh ? "已反馈" : "Reviewed") : video.status === "Reference" ? (zh ? "仅记录，未请求点评" : "Reference only") : (zh ? "等待教练反馈" : "Awaiting coach feedback");

export default function WorkoutVideoGroups({ videos, coach = false, replies = {}, setReplies, onReview, onReviewMany }: {
  videos: WorkoutVideo[]; coach?: boolean; replies?: Record<string, string>;
  setReplies?: (update: (previous: Record<string, string>) => Record<string, string>) => void;
  onReview?: (id: string, extras?: ReplyExtras) => void;
  onReviewMany?: (ids: string[], reply: string, extras?: ReplyExtras) => void | Promise<void>;
}) {
  const { i18n } = useTranslation(); const zh = i18n.language.startsWith("zh");
  return <div className="workoutVideoGroups">{groupWorkoutVideos(videos).map((group, index) => <VideoGroup className="workoutVideoGroup" key={group.key} initiallyOpen={group.pending > 0 || index === 0}>
    <summary><div>{coach && <small>{group.clientName || group.clientId}</small>}<h3>{zh ? group.workoutNameCn || group.workoutName || "其他上传" : group.workoutName || "Other uploads"}</h3>
      <span>{group.dateBasis === "upload" ? (zh ? "上传日期" : "Uploaded") : (zh ? "训练日期" : "Session date")} · <time>{group.date || (zh ? "日期未知" : "Unknown date")}</time></span></div>
      <div className="workoutVideoCounts"><span>{group.videos.length} {zh ? "项上传" : group.videos.length === 1 ? "upload" : "uploads"}</span><strong>{group.pending ? `${group.pending} ${zh ? "待反馈" : "awaiting feedback"}` : zh ? "已反馈" : "Reviewed"}</strong></div>
    </summary>
    {coach && onReviewMany && group.pending > 1 && <SessionReply zh={zh} pending={group.videos.filter(isVideoPending)} onReviewMany={onReviewMany} />}
    <div className="workoutVideoCards">{group.videos.map(video => <article className={`workoutVideoCard${video.status === "Reference" ? " workoutVideoCard--reference" : ""}`} key={video.recordId}>
      <header><h4>{video.exerciseName || (zh ? "动作视频" : "Exercise video")}</h4><span>{statusLabel(video, zh)}</span></header>
      {video.videoUrl && <ReviewVideo url={video.videoUrl} title={video.exerciseName || "Workout video"} />}
      {video.clientNote && <p className="workoutVideoNote">{coach ? video.clientNoteEn || video.clientNote : video.clientNote}</p>}
      <CoachReplyBlock zh={zh} video={video} />
      {coach && <ClipReply zh={zh} video={video} value={replies[video.recordId] ?? video.coachReply ?? ""} setValue={value => setReplies?.(previous => ({ ...previous, [video.recordId]: value }))} onReview={onReview} />}
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
