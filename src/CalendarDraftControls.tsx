import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileClock } from "lucide-react";
import ProgrammingSheet from "./ProgrammingSheet";
import { normalizeDate, formatCalendarLabel } from "./appCore";
import type { Client } from "./appCore";
import "./CalendarDraftControls.css";

export function CalendarDraftBadge({ draft }: { draft?: boolean }) {
  const { i18n } = useTranslation();
  return draft ? <span className="calendarDraftBadge"><FileClock size={13} />{i18n.language?.startsWith("zh") ? "草稿 · 仅教练可见" : "Draft · coach only"}</span> : null;
}
export function SaveCalendarDraftButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const { i18n } = useTranslation();
  return <button type="button" className="outlineButton calendarDraftSave" disabled={disabled} onClick={onClick}><FileClock size={17} />{i18n.language?.startsWith("zh") ? "保存为草稿" : "Save as draft"}</button>;
}
export function SaveCalendarDraftSheet({ clients, clientId, date, busy, save, close }: {
  clients: Client[]; clientId: string; date: string; busy: boolean;
  save: (clientId: string, date: string) => Promise<boolean>; close: () => void;
}) {
  const { i18n } = useTranslation(); const zh = i18n.language?.startsWith("zh");
  const [client, setClient] = useState(clientId), [start, setStart] = useState(date);
  return <ProgrammingSheet title={zh ? "保存到日历草稿" : "Save calendar draft"} close={() => !busy && close()}>
    <p>{zh ? "训练会显示在教练日历中，学员暂时看不到。继续编辑和安排日期，准备好后再发布。" : "Add this plan to your coaching calendar. The athlete cannot see it until you publish. You can keep editing sessions and moving dates."}</p>
    <label>{zh ? "学员" : "Athlete"}<select value={client} onChange={e => setClient(e.target.value)} disabled={busy}><option value="">{zh ? "选择学员" : "Select athlete"}</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label>{zh ? "开始日期" : "Start date"}<input type="date" value={start} onChange={e => setStart(e.target.value)} disabled={busy} /></label>
    <p>{zh ? "整个计划将保存为独立副本，已有的已发布训练不受影响。多日计划会按当前分配规则安排日期，可在日历中调整。" : "Saves a separate calendar copy. Existing published sessions are preserved. Multi-day plans use the usual assignment spacing; you can adjust dates on the calendar."}</p>
    <div className="weekProgressSave"><SaveCalendarDraftButton disabled={busy || !client || !start} onClick={() => { void save(client, start); }} />{busy && <span role="status">{zh ? "正在保存…" : "Saving…"}</span>}</div>
  </ProgrammingSheet>;
}

type DraftItem = { id: string; type: string; name: string; date: number };
export function CalendarDraftReview({ clientId, name, close, published }: { clientId: string; name: string; close: () => void; published: () => void }) {
  const { i18n } = useTranslation(); const zh = i18n.language?.startsWith("zh");
  const [data, setData] = useState<{ version: string; items: DraftItem[] } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set()), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const submitting = useRef(false);
  const load = async () => {
    setBusy(true); setError(""); setData(null);
    try {
      const response = await fetch(`/api/calendarDrafts?clientId=${encodeURIComponent(clientId)}`);
      const next = await response.json();
      if (!response.ok || !Array.isArray(next.items)) throw new Error();
      setData(next); setSelected(new Set(next.items.map((i: DraftItem) => i.id)));
    } catch { setError(zh ? "无法读取草稿，请重试。" : "Could not load drafts. Please retry."); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, [clientId]); // the sheet is keyed by athlete
  const publish = async () => {
    if (!data || !selected.size || submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/calendarDrafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", clientId, version: data.version, ids: [...selected] }) });
      if (!response.ok) {
        setError(response.status === 409 ? (zh ? "日历已更新，请重新读取草稿并确认后发布。" : "The calendar changed. Reload drafts and review before publishing.") : (zh ? "发布未确认，请重新读取草稿检查结果。" : "Publication was not confirmed. Reload drafts to check the result."));
        return;
      }
      published(); close();
    } catch { setError(zh ? "发布未确认，请重新读取草稿检查结果。" : "Publication was not confirmed. Reload drafts to check the result."); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <ProgrammingSheet title={zh ? "发布日历草稿" : "Publish calendar drafts"} close={() => !busy && close()}>
    <p><strong>{name}</strong> — {zh ? "确认训练和日期。发布后，学员即可在网页和微信小程序中看到所选训练。" : "Check the sessions and dates. Publishing makes the selected sessions visible on the website and WeChat mini program."}</p>
    {busy && <p role="status">{zh ? "正在处理…" : "Working…"}</p>}
    {error && <p role="alert">{error}</p>}
    {!busy && <button type="button" className="outlineButton" onClick={() => void load()}>{zh ? "重新读取草稿" : "Reload drafts"}</button>}
    {data && <><label className="calendarDraftChoice"><input type="checkbox" checked={!!data.items.length && selected.size === data.items.length} disabled={busy} onChange={e => setSelected(new Set(e.target.checked ? data.items.map(i => i.id) : []))} />{zh ? "全选" : "Select all"} ({data.items.length})</label>
      <div className="calendarDraftReviewList">{data.items.map(item => <label className="calendarDraftChoice" key={item.id}><input type="checkbox" checked={selected.has(item.id)} disabled={busy} onChange={() => setSelected(cur => { const next = new Set(cur); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next; })} /><span><strong>{item.name}</strong><small>{formatCalendarLabel(normalizeDate(String(item.date)))}</small></span></label>)}</div>
      {!data.items.length && <p>{zh ? "没有待发布的草稿。" : "No unpublished drafts."}</p>}
      <div className="weekProgressSave"><button type="button" className="goldButton" disabled={busy || !!error || !selected.size} onClick={() => void publish()}>{zh ? `发布所选训练 (${selected.size})` : `Publish selected (${selected.size})`}</button></div></>}
  </ProgrammingSheet>;
}
