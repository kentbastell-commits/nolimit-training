import { useState } from "react";
import { useTranslation } from "react-i18next";
import ProgrammingSheet from "./ProgrammingSheet";
import type { ProgramSession } from "./appCore";
import { canProgressLoad, progressionKey } from "./programmingBlockData";

import WeekProgressionReview from "./WeekProgressionReview";

export default function WeekCopySheet({ week, count, sessions, clientCode = "", copy, close }: { week: number; count: number; sessions: ProgramSession[]; clientCode?: string; copy: (from: number, targets: number[], percent: number, selected: Set<string>, replace: boolean) => void; close: () => void }) {
  const { i18n } = useTranslation(); const zh = i18n.language.startsWith("zh");
  const [targets, setTargets] = useState<Set<number>>(new Set(week < 52 ? [week + 1] : [])), [pct, setPct] = useState("0");
  const source = sessions.filter(s => Number(s.week) === week);
  const [replace, setReplace] = useState(false);
  const [selected, setSelected] = useState(() => new Set(source.flatMap(s => s.exercises.flatMap((ex, i) => canProgressLoad(ex) ? [progressionKey(s.localId, i)] : []))));
  const occupied = [...targets].filter(n => sessions.some(s => Number(s.week) === n && s.exercises.length));
  const percent = Number(pct), valid = pct.trim() !== "" && Number.isFinite(percent) && percent >= -50 && percent <= 100;
  return <ProgrammingSheet title={zh ? `复制与进阶 · 第 ${week} 周` : `Copy & progress · week ${week}`} close={close}>
    <p>{zh ? "先查看最近的实际训练，再选择要调整的动作。复制只修改当前草稿，动作顺序、循环设置和教练备注将一起保留。" : "Review recent training, then choose which loads to adjust. Copying changes this draft only, preserving exercise order, circuits and coach notes."}</p>
    <fieldset><legend>{zh ? "目标周" : "Target weeks"}</legend><div className="programmingFilters">{Array.from({ length: Math.min(52, Math.max(count, week + 1)) }, (_, i) => i + 1).filter(n => n !== week).map(n => <label className="weekCopyTarget" key={n}><input type="checkbox" checked={targets.has(n)} onChange={() => { setReplace(false); setTargets(cur => { const next = new Set(cur); next.has(n) ? next.delete(n) : next.add(n); return next; }); }} />{zh ? "第" : "Week"} {n}{zh ? "周" : ""}{sessions.some(s => Number(s.week) === n) ? (zh ? " · 已有训练" : " · has sessions") : ""}</label>)}</div></fieldset>
    <label>{zh ? "负重调整（%）" : "Load adjustment (%)"}<input type="number" min={-50} max={100} step={0.5} value={pct} onChange={e => setPct(e.target.value)} /></label>
    <p>{zh ? "仅调整勾选动作的纯数字负重；自重、百分比、带单位的数值及自动目标保持不变。" : "Adjust checked exercises with numeric loads. Bodyweight, percentages, values with units and automatic targets are retained."}</p>
    <div className="programmingFilters">{[-10, 0, 2.5, 5].map(n => <button type="button" key={n} aria-pressed={valid && percent === n} onClick={() => setPct(String(n))}>{n > 0 ? "+" : ""}{n}%</button>)}</div>
    <WeekProgressionReview sessions={source} clientCode={clientCode} percent={valid ? percent : 0} selected={selected} toggle={key => setSelected(cur => { const next = new Set(cur); next.has(key) ? next.delete(key) : next.add(key); return next; })} />
    {!source.length && <p role="alert">{zh ? "此周没有可复制的训练。" : "No sessions in this week."}</p>}
    {!!occupied.length && <label className="weekCopyTarget"><input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} />{zh ? `确认替换第 ${occupied.join("、")} 周已有的训练` : `Replace existing sessions in week ${occupied.join(", ")}`}</label>}
    <div className="weekProgressSave"><button type="button" className="goldButton" disabled={!targets.size || !valid || !source.length || (!!occupied.length && !replace)} onClick={() => copy(week, [...targets], percent, selected, replace)}>{zh ? "复制到所选周" : "Copy to selected weeks"}</button></div>
  </ProgrammingSheet>;
}
