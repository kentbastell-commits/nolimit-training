import { useTranslation } from "react-i18next";
import type { ProgramSession } from "./appCore";
import { canProgressLoad, progressExerciseLoad, progressionKey } from "./programmingBlockData";
import { previousExerciseSets, useAthletePrescriptionHistory } from "./AthletePrescriptionHistory";
import { coachingDate, coachingToday } from "./coachingCalendar";

export default function WeekProgressionReview({ sessions, clientCode, percent, selected, toggle }: { sessions: ProgramSession[]; clientCode: string; percent: number; selected: Set<string>; toggle: (key: string) => void }) {
  const { i18n } = useTranslation(), zh = i18n.language.startsWith("zh");
  const history = useAthletePrescriptionHistory(clientCode);
  const loads = (ex: ProgramSession["exercises"][number]) => ex.setPrescriptions?.map(s => s.load || "—").join(" / ") || ex.load || "—";
  return <>
    {!clientCode && <p>{zh ? "此草稿未关联学员。关联学员后可查看最近的实际训练。" : "Choose an athlete in Workout Details to include recent training."}</p>}
    {history.loading && <p role="status">{zh ? "正在读取训练记录…" : "Loading training history…"}</p>}
    {history.error && <p role="alert">{zh ? "训练记录暂不可用。关闭后重新打开可重试；当前计划不会丢失。" : "History unavailable. Reopen to retry; your plan is retained."}</p>}
    {sessions.map(s => <section className="weekProgressSession" key={s.localId}><h3>{s.sessionName}</h3>{s.exercises.map((ex, i) => {
      const key = progressionKey(s.localId, i), checked = selected.has(key), sets = previousExerciseSets(ex, history.logs, coachingToday());
      const next = progressExerciseLoad(ex, checked ? percent : 0);
      return <article className="weekProgressExercise" key={key}>
        <label className="weekCopyTarget"><input type="checkbox" checked={checked} disabled={!canProgressLoad(ex)} onChange={() => toggle(key)} /><strong>{ex.exerciseName}</strong></label>
        <dl className="weekProgressLoads"><div><dt>{zh ? "本周计划负重" : "Source plan load"}</dt><dd>{loads(ex)}</dd></div><div><dt>{zh ? "复制后负重" : "Copied load"}</dt><dd>{loads(next)}</dd></div></dl>
        {clientCode && !history.loading && !history.error && <details><summary>{sets.length ? `${zh ? "最近训练" : "Last performed"} · ${coachingDate(sets[0].date)} · ${sets.length} ${zh ? "条组记录" : "logged sets"}` : (zh ? "暂无已完成的组记录" : "No completed sets recorded")}</summary>
          {sets.length > 0 && <><p>{zh ? "这是最近一次训练记录，不一定来自所选源周。未记录的数据不作推断。" : "Latest recorded session; it may be from a different week. Missing values are not inferred."}</p><table className="weekProgressTable"><thead><tr><th>{zh ? "组" : "Set"}</th><th>{zh ? "当时计划次数" : "Prescribed reps"}</th><th>{zh ? "实际完成" : "Logged result"}</th></tr></thead><tbody>{sets.map((set: any, j: number) => <tr key={set.recordId || j}><td>{set.setNumber}{/ - (Left|Right)$/.test(set.exerciseName) ? ` ${set.exerciseName.endsWith("Left") ? (zh ? "左" : "L") : (zh ? "右" : "R")}` : ""}</td><td>{set.prescribedReps || "—"}</td><td>{[[set.actualReps, zh ? "次" : "reps"], [set.actualWeight, "kg"], [set.actualTime, "s"], [set.actualDistance, "m"]].filter(([v]) => v !== "" && v != null).map(([v, unit]) => `${v} ${unit}`).join(" · ") || "—"}{set.athleteNotes && <small>{set.athleteNotes}</small>}</td></tr>)}</tbody></table></>}
        </details>}
      </article>;
    })}</section>)}
  </>;
}
