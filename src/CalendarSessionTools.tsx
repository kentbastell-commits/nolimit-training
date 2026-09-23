import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ProgrammingSheet from "./ProgrammingSheet";
import { calendarDayOffset, coachingDate } from "./coachingCalendar";
import { formatCalendarLabel } from "./appCore";
import "./CalendarDraftControls.css";

type Item = { id: string; name: string; nameCn?: string; date: number; draft: boolean; locked: boolean; hasRevision: boolean; version: string };
export default function CalendarSessionTools({ clientId, refreshKey, draftCount, review, changed }: {
  clientId: string; refreshKey: string; draftCount: number; review: () => void; changed: () => void;
}) {
  const { i18n } = useTranslation(); const zh = i18n.language.startsWith("zh");
  const [open, setOpen] = useState(false), [items, setItems] = useState<Item[] | null>(null);
  const [loadError, setLoadError] = useState(false), [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoadError(false); setItems(null);
    void fetch(`/api/calendarSessions?clientId=${encodeURIComponent(clientId)}`, { signal: controller.signal }).then(async r => {
      if (!r.ok) throw new Error(); const data = await r.json(); if (!controller.signal.aborted) setItems(data.items);
    }).catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    return () => controller.abort();
  }, [clientId, refreshKey, reload]);
  const revisions = items?.filter(i => i.hasRevision).length || 0;
  return <div className="calendarDraftBanner">
    <div><strong>{zh ? "日历工具" : "Calendar tools"}</strong><p>{revisions ? (zh ? `${revisions} 次训练有待发布的私人修改。` : `${revisions} session(s) have private changes awaiting publication.`) : (zh ? "一起安排多次训练，检查草稿后再发布。" : "Arrange sessions together and review drafts before publishing.")}</p></div>
    <div className="calendarToolActions"><button type="button" className="outlineButton" onClick={review}>{zh ? "查看并发布" : "Review & publish"}{draftCount + revisions > 0 ? ` (${draftCount + revisions})` : ""}</button>
      <button type="button" className="outlineButton" onClick={() => setOpen(true)}>{zh ? "选择训练 · 移动 / 复制" : "Select sessions · Move / Copy"}</button></div>
    {open && <CalendarSessionSheet key={clientId} {...{ clientId, items, loadError }} reload={() => setReload(n => n + 1)} close={() => setOpen(false)} changed={() => { setOpen(false); setReload(n => n + 1); changed(); }} />}
  </div>;
}
function CalendarSessionSheet({ clientId, items, loadError, reload, close, changed }: {
  clientId: string; items: Item[] | null; loadError: boolean; reload: () => void; close: () => void; changed: () => void;
}) {
  const { i18n } = useTranslation(); const zh = i18n.language.startsWith("zh");
  const [selected, setSelected] = useState<Set<string>>(new Set()), [action, setAction] = useState<"move" | "copy">("move");
  const [dates, setDates] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const submission = useRef<{ fingerprint: string; id: string } | null>(null), submitting = useRef(false);
  const eligible = (items || []).filter(i => !i.locked), chosen = eligible.filter(i => selected.has(i.id));
  const selectable = eligible.filter(i => !i.hasRevision);
  const first = chosen[0] ? coachingDate(chosen[0].date) : "";
  const target = (i: Item) => dates[i.id] || coachingDate(i.date);
  const shift = (date: string) => {
    if (!date || !first) return;
    const days = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)) / 86400000);
    setDates(Object.fromEntries(chosen.map(i => [i.id, calendarDayOffset(coachingDate(i.date), days)])));
  };
  const submit = async () => {
    if (!chosen.length || submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    const body = { clientId, action, items: chosen.map(i => ({ id: i.id, version: i.version, date: target(i) })) };
    const fingerprint = JSON.stringify(body);
    if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, id: crypto.randomUUID() };
    try {
      const response = await fetch("/api/calendarSessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, requestId: submission.current.id }) });
      if (!response.ok) { setStale(response.status === 409); throw new Error(); }
      changed();
    } catch { setError(zh ? "尚未确认保存结果。可重试；若日历已更改，请重新读取并检查。" : "Save was not confirmed. Retry safely, or reload and review if the calendar changed."); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <ProgrammingSheet title={zh ? "移动或复制训练" : "Move or copy sessions"} close={() => !busy && close()}>
    <p>{zh ? "选择训练并检查每个目标日期。移动已发布的训练会立即更新学员日历；复制的训练保存为草稿。" : "Select sessions and check each destination date. Moving published sessions updates the athlete’s calendar immediately; copies are saved as drafts."}</p>
    {loadError && <p role="alert">{zh ? "无法读取日历。" : "Could not load the calendar."}</p>}
    {!items && !loadError && <p role="status">{zh ? "正在读取…" : "Loading…"}</p>}
    {(loadError || error) && <button type="button" className="outlineButton" disabled={busy} onClick={() => { setSelected(new Set()); setDates({}); setError(""); setStale(false); reload(); }}>{zh ? "重新读取日历" : "Reload calendar"}</button>}
    {items && <>
      <label>{zh ? "操作" : "Action"}<select aria-label={zh ? "操作" : "Action"} value={action} disabled={busy} onChange={e => setAction(e.target.value as "move" | "copy")}><option value="move">{zh ? "移动" : "Move"}</option><option value="copy">{zh ? "复制为草稿" : "Copy as drafts"}</option></select></label>
      <label className="calendarDraftChoice"><input type="checkbox" disabled={busy || !selectable.length} checked={!!selectable.length && selected.size === selectable.length} onChange={e => setSelected(new Set(e.target.checked ? selectable.map(i => i.id) : []))} />{zh ? "全选可编辑训练" : "Select all editable sessions"}</label>
      <div className="calendarMultiSelect">{eligible.map(item => <label className="calendarDraftChoice" key={item.id}><input type="checkbox" disabled={busy || item.hasRevision} checked={selected.has(item.id)} onChange={() => setSelected(cur => { const next = new Set(cur); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next; })} /><span><strong>{zh && item.nameCn ? item.nameCn : item.name}</strong><small>{formatCalendarLabel(coachingDate(item.date))} · {item.draft ? (zh ? "草稿" : "Draft") : (zh ? "已发布" : "Published")}</small>{item.hasRevision && <small>{zh ? "请先查看并发布私人修改。" : "Review and publish the private revision first."}</small>}</span></label>)}</div>
      {!eligible.length && <p>{zh ? "没有可移动或复制的训练。" : "No sessions available to move or copy."}</p>}
      {!!chosen.length && <><h3>{zh ? `已选择 ${chosen.length} 次训练` : `${chosen.length} sessions selected`}</h3>
        <label>{zh ? "首个目标日期（保持训练间隔）" : "First destination date (keep session spacing)"}<input type="date" value={target(chosen[0])} disabled={busy} onChange={e => shift(e.target.value)} /></label>
        <div className="calendarMovePreview">{chosen.map(item => <label key={item.id}><strong>{zh && item.nameCn ? item.nameCn : item.name}</strong><small>{formatCalendarLabel(coachingDate(item.date))} →</small><input aria-label={`${zh ? "目标日期" : "Destination"}: ${item.name}`} type="date" disabled={busy} value={target(item)} onChange={e => setDates(d => ({ ...d, [item.id]: e.target.value }))} /></label>)}</div>
      </>}
      {error && <p role="alert">{error}</p>}
      <div className="weekProgressSave"><button type="button" className="goldButton" disabled={busy || stale || !chosen.length || chosen.some(i => !target(i)) || chosen.length > 100 || (action === "move" && chosen.every(i => target(i) === coachingDate(i.date)))} onClick={() => void submit()}>{busy ? (zh ? "正在保存…" : "Saving…") : action === "move" ? (zh ? `移动 ${chosen.length} 次训练` : `Move ${chosen.length} sessions`) : (zh ? `复制 ${chosen.length} 次训练为草稿` : `Copy ${chosen.length} sessions as drafts`)}</button></div>
    </>}
  </ProgrammingSheet>;
}
