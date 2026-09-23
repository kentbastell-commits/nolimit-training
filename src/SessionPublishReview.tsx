import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ProgrammingSheet from "./ProgrammingSheet";
import SessionChangeSummary from "./SessionChangeSummary";
import SessionSnapshotPreview, { type SessionSnapshot } from "./SessionSnapshotPreview";

export default function SessionPublishReview({ id, makeSnapshot, finish }: { id: string; makeSnapshot: (source: SessionSnapshot) => SessionSnapshot; finish: (publish: boolean) => void }) {
  const { i18n } = useTranslation(), zh = i18n.language.startsWith("zh");
  const [source, setSource] = useState<SessionSnapshot | null>(null), [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let alive = true;
    setSource(null); setFailed(false);
    const timeout = setTimeout(() => controller.abort(), 15000);
    void fetch(`/api/assignedSession?assignedWorkoutId=${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal })
      .then(async res => { const data = await res.json(); if (!res.ok || !data.publishedSnapshot?.templates) throw new Error(); if (alive) setSource(data.publishedSnapshot); })
      .catch(() => { if (alive) setFailed(true); }).finally(() => clearTimeout(timeout));
    return () => { alive = false; clearTimeout(timeout); controller.abort(); };
  }, [id, attempt]);
  const after = source ? makeSnapshot(source) : null;
  return <ProgrammingSheet title={zh ? "确认发布修改" : "Review changes before publishing"} close={() => finish(false)}>
    <p>{zh ? "对比学员当前看到的版本。确认发布后，学员即可看到修改。" : "Compare with the version your athlete currently sees. Confirm to make these changes live."}</p>
    {!source && !failed && <p role="status">{zh ? "正在读取当前版本…" : "Loading the published version…"}</p>}
    {failed && <><p role="alert">{zh ? "无法读取当前版本。修改仍保留在编辑器中，请重试。" : "Could not load the published version. Your edits are still in the builder. Please retry."}</p><button type="button" className="outlineButton" onClick={() => setAttempt(n => n + 1)}>{zh ? "重试" : "Retry"}</button></>}
    {source && after && <><SessionChangeSummary before={source} after={after} /><details className="calendarDraftPreview"><summary>{zh ? "完整学员预览" : "Full athlete preview"}</summary><SessionSnapshotPreview snapshot={after} /></details></>}
    <div className="weekProgressSave sessionPublishActions"><button type="button" className="goldButton" disabled={!source} onClick={() => finish(true)}>{zh ? "确认发布修改" : "Confirm & publish changes"}</button><button type="button" className="outlineButton" onClick={() => finish(false)}>{zh ? "返回编辑" : "Back to editing"}</button></div>
  </ProgrammingSheet>;
}
