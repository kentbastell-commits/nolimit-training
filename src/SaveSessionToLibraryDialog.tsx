import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookmarkPlus, X } from "lucide-react";
import type { Workout } from "./appCore";
import { useDialog } from "./useDialog";
import PortalToApp from "./PortalToApp";
import "./SaveSessionToLibraryDialog.css";

type Snapshot = { workout: { sessionName?: string; sessionNameCn?: string; isDraft?: boolean }; templates: { exerciseName: string }[] };
type State = Snapshot & { version: string; hasRevision: boolean; conflicted: boolean; publishedSnapshot: Snapshot | null };
export default function SaveSessionToLibraryDialog({ workout, close, saved, registerClose }: { workout: Workout; close: () => void; saved: (name: string, programId: string) => void; registerClose?: (handler: (() => boolean) | null) => void }) {
  const { i18n } = useTranslation(); const zh = i18n.language.startsWith("zh");
  const tr = (en: string, cn: string) => zh ? cn : en;
  const [state, setState] = useState<State | null>(null), [name, setName] = useState("");
  const [source, setSource] = useState<"published" | "draft">("published");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [reload, setReload] = useState(0), [stale, setStale] = useState(false);
  const pending = useRef<{ key: string; id: string } | null>(null);
  const dialog = useDialog(() => { if (!busy) close(); });
  useEffect(() => { registerClose?.(() => { if (busy) return false; close(); return true; }); return () => registerClose?.(null); }, [busy, close, registerClose]);
  const id = workout.assignedWorkoutId || workout.id;
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    void fetch(`/api/assignedSession?assignedWorkoutId=${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(async r => { const data = await r.json(); if (!r.ok || !Array.isArray(data.templates) || !data.templates.length) throw Error("unavailable"); return data as State; })
      .then(data => { if (!controller.signal.aborted) { setState(data); setSource(data.workout.isDraft ? "draft" : "published"); setName(current => current || data.publishedSnapshot?.workout.sessionName || data.workout.sessionName || ""); setStale(false); } })
      .catch(() => { if (!controller.signal.aborted) setError(zh ? "无法加载训练，请重试。" : "Could not load this session. Try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, reload, zh]);
  const snapshot = source === "published" && state?.publishedSnapshot ? state.publishedSnapshot : state;
  const submit = async () => {
    if (busy || loading || stale || !state || !name.trim() || (source === "draft" && state.conflicted)) return;
    const key = JSON.stringify([id, state.version, source, name.trim()]);
    if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() };
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/saveSessionToLibrary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignedWorkoutId: id, version: state.version, source, name: name.trim(), requestId: pending.current.id }), signal: AbortSignal.timeout(30000) });
      const data = await r.json();
      if (!r.ok || !data.success) {
        if (r.status === 409) { setStale(true); throw Error(tr("This session changed. Reload the latest version before saving.", "训练内容已更改，请加载最新版本后再保存。")); }
        throw Error(tr("Could not save the session. Your name is kept; try again.", "训练保存失败，名称已保留，请重试。"));
      }
      saved(data.name, data.programId);
    } catch (e) { setError(e instanceof Error ? e.message : tr("Could not save. Try again.", "保存失败，请重试。")); }
    finally { setBusy(false); }
  };
  return <PortalToApp><div className="sessionLibraryScrim" onMouseDown={e => { if (e.target === e.currentTarget && !busy) close(); }}><div className="sessionLibraryDialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="session-library-title">
    <header><div><BookmarkPlus size={21} /><h2 id="session-library-title">{tr("Save session", "保存训练课")}</h2></div><button type="button" disabled={busy} onClick={close} aria-label={tr("Close save session", "关闭保存训练课")}><X size={20} /></button></header>
    <p>{tr("Save a reusable copy in Sessions for other clients. Exercises, sets, rest periods and setup/execution instructions in both languages are kept.", "在训练课库中保存可供其他学员使用的副本，保留动作、组次、休息时间和中英文准备姿势及动作执行说明。")}</p>
    {loading ? <p role="status">{tr("Loading session…", "正在加载训练课…")}</p> : state && <>
      {state.hasRevision && <fieldset disabled={busy}><legend>{tr("Which saved version?", "选择已保存的版本")}</legend><label><input type="radio" name="session-library-source" checked={source === "published"} onChange={() => setSource("published")} />{tr("Published session", "已发布训练课")}</label><label><input type="radio" name="session-library-source" checked={source === "draft"} disabled={state.conflicted} onChange={() => setSource("draft")} />{tr("Private draft", "私人草稿")}</label>{state.conflicted && <small>{tr("Review the conflicting draft before saving it to the library.", "请先检查有冲突的草稿，再保存到训练课库。")}</small>}</fieldset>}
      <label className="sessionLibraryName" htmlFor="session-library-name">{tr("Session name", "训练课名称")}<input data-autofocus id="session-library-name" autoComplete="off" maxLength={200} value={name} disabled={busy} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void submit(); } }} /></label>
      <small>{tr("Keep this name or enter a new one.", "可以保留原名称，也可以输入新名称。")}</small>
      <div className="sessionLibraryContents"><strong>{tr("Included exercises", "包含动作")} · {snapshot?.templates.length}</strong><ol>{snapshot?.templates.map((e, index) => <li key={index}>{e.exerciseName}</li>)}</ol></div>
      <p className="sessionLibraryHint">{tr("The original calendar workout stays unchanged. Logged results and client feedback are not included.", "原日历训练不会更改，学员完成记录和反馈不会复制。")}</p>
    </>}
    {error && <div className="sessionLibraryError" role="alert">{error}{(!state || stale) && <button type="button" disabled={busy || loading} onClick={() => setReload(n => n + 1)}>{tr("Reload session", "重新加载训练课")}</button>}</div>}
    <footer><button type="button" disabled={busy} onClick={close}>{tr("Cancel", "取消")}</button><button type="button" className="sessionLibraryPrimary" disabled={busy || loading || stale || !state || !name.trim() || (source === "draft" && state.conflicted)} onClick={() => void submit()}>{busy ? tr("Saving…", "正在保存…") : tr("Save to Sessions", "保存到训练课库")}</button></footer>
  </div></div></PortalToApp>;
}
