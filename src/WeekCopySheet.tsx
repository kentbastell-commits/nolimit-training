import { useState } from "react";
import { useTranslation } from "react-i18next";
import ProgrammingSheet from "./ProgrammingSheet";
import type { ProgramSession } from "./appCore";
import { progressExerciseLoad } from "./programmingBlockData";

export default function WeekCopySheet({ week, count, sessions, copy, close }: { week: number; count: number; sessions: ProgramSession[]; copy: (from: number, targets: number[], percent: number) => void; close: () => void }) {
  const { i18n } = useTranslation(); const zh = i18n.language.startsWith("zh");
  const [targets, setTargets] = useState<Set<number>>(new Set(week < 52 ? [week + 1] : [])), [pct, setPct] = useState("0");
  const source = sessions.filter(s => Number(s.week) === week);
  const percent = Number(pct), valid = pct.trim() !== "" && Number.isFinite(percent) && percent >= -50 && percent <= 100;
  return <ProgrammingSheet title={zh ? `复制第 ${week} 周` : `Copy week ${week}`} close={close}>
    <p>{zh ? "选择目标周和负重调整比例。动作顺序、循环设置和教练备注将一起复制。" : "Copy exercise order, circuit settings and coach notes into the selected weeks."}</p>
    <fieldset><legend>{zh ? "目标周" : "Target weeks"}</legend><div className="programmingFilters">{Array.from({ length: Math.min(52, Math.max(count, week + 1)) }, (_, i) => i + 1).filter(n => n !== week).map(n => <label className="weekCopyTarget" key={n}><input type="checkbox" checked={targets.has(n)} onChange={() => setTargets(cur => { const next = new Set(cur); next.has(n) ? next.delete(n) : next.add(n); return next; })} />{zh ? "第" : "Week"} {n}{zh ? "周" : ""}{sessions.some(s => Number(s.week) === n) ? (zh ? " · 已有训练" : " · has sessions") : ""}</label>)}</div></fieldset>
    <label>{zh ? "负重调整（%）" : "Load adjustment (%)"}<input type="number" min={-50} max={100} step={0.5} value={pct} onChange={e => setPct(e.target.value)} /></label>
    <p>{zh ? "仅调整纯数字负重；自重、百分比、带单位的数值及自动目标保持不变。" : "Only numeric loads change. Bodyweight, percentages, values with units and automatic targets are retained."}</p>
    <details className="weekCopyPreview"><summary>{zh ? "对比复制前后的负重" : "Compare source and copied loads"}</summary>{source.map(s => <div key={s.localId}><strong>{s.sessionName}</strong>{s.exercises.map((ex, i) => { const next = progressExerciseLoad(ex, valid ? percent : 0); const loads = (e: typeof ex) => e.setPrescriptions?.map(set => set.load || "—").join(" / ") || e.load || "—"; return <p key={i}>{ex.exerciseName}: {loads(ex)} → {loads(next)}</p>; })}</div>)}</details>
    {!source.length && <p role="alert">{zh ? "此周没有可复制的训练。" : "No sessions in this week."}</p>}
    <button type="button" className="goldButton" disabled={!targets.size || !valid || !source.length} onClick={() => copy(week, [...targets], percent)}>{zh ? "复制到所选周" : "Copy to selected weeks"}</button>
  </ProgrammingSheet>;
}
