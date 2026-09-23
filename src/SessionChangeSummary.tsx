import { useTranslation } from "react-i18next";
import { sessionChanges, type SessionChange } from "./sessionChanges";
import type { SessionSnapshot } from "./SessionSnapshotPreview";
import "./SessionChangeSummary.css";

export default function SessionChangeSummary({ before, after }: { before: SessionSnapshot | null; after: SessionSnapshot }) {
  const { i18n } = useTranslation(), zh = i18n.language.startsWith("zh");
  if (!before) return <section className="sessionChanges"><h3>{zh ? "新增训练" : "New session"}</h3><p>{zh ? "此训练尚未向学员发布。请查看下方完整预览。" : "This session is not visible to the athlete yet. Check the full preview below."}</p></section>;
  const { changes, exercises } = sessionChanges(before, after, zh);
  const pair = (change: SessionChange, index: number) => {
    const values = <div className="sessionChangeValues"><div><small>{zh ? "当前发布" : "Currently live"}</small><span>{change.before || (zh ? "未设置" : "Not set")}</span></div><span aria-hidden="true">→</span><div><small>{zh ? "发布后" : "After publishing"}</small><strong>{change.after || (zh ? "移除" : "Removed")}</strong></div></div>;
    return change.long || change.before.length + change.after.length > 220
      ? <details className="sessionChange" key={index}><summary>{change.label}</summary>{values}</details>
      : <div className="sessionChange" key={index}><h5>{change.label}</h5>{values}</div>;
  };
  return <section className="sessionChanges" aria-label={zh ? "修改摘要" : "Change summary"}>
    <h3>{zh ? "修改摘要" : "What will change"}</h3>
    {!changes.length && !exercises.length && <p>{zh ? "训练内容没有变化。" : "No workout content changes."}</p>}
    {changes.map(pair)}
    {exercises.map((exercise, i) => <article key={i} className="sessionChangeExercise"><h4>{exercise.name} <span className={`sessionChangeKind ${exercise.kind}`}>{exercise.kind === "added" ? (zh ? "新增" : "Added") : exercise.kind === "removed" ? (zh ? "移除" : "Removed") : (zh ? "修改" : "Changed")}</span></h4>{exercise.changes.map(pair)}</article>)}
  </section>;
}
