import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ProgrammingSheet from "./ProgrammingSheet";
import SessionSnapshotPreview, { type SessionSnapshot } from "./SessionSnapshotPreview";

export default function SessionVersionHistory({ id, close, restore }: { id: string; close: () => void; restore: (snapshot: SessionSnapshot) => void }) {
  const { i18n } = useTranslation(); const zh = i18n.language.startsWith("zh");
  const [versions, setVersions] = useState<{ id: string; createdAt: number; kind: string; snapshot: SessionSnapshot }[] | null>(null);
  const [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setError(false); setVersions(null);
    void fetch(`/api/assignedSession?assignedWorkoutId=${encodeURIComponent(id)}&history=1`, { signal: controller.signal }).then(async r => {
      if (!r.ok) throw new Error(); const data = await r.json(); if (!controller.signal.aborted) setVersions(data.versions);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [id, retry]);
  return <ProgrammingSheet title={zh ? "已保存的训练版本" : "Saved session history"} close={close}>
    <p>{zh ? "恢复后会载入编辑器供您检查。点击发布前，学员的训练保持不变。版本记录从此功能启用后的首次保存开始。" : "Restore a version into the editor to review it. The athlete’s workout changes only when you publish. History starts with the first save after this feature was enabled."}</p>
    {error ? <><p role="alert">{zh ? "无法读取版本。" : "Could not load history."}</p><button type="button" onClick={() => setRetry(n => n + 1)}>{zh ? "重试" : "Retry"}</button></> : !versions ? <p role="status">{zh ? "正在读取…" : "Loading…"}</p> : !versions.length ? <p>{zh ? "暂无历史版本。" : "No earlier saved versions yet."}</p> : versions.map(v => <details key={v.id} className="sessionVersionItem"><summary>{new Date(v.createdAt).toLocaleString(zh ? "zh-CN" : "en-GB", { timeZone: "Asia/Shanghai" })} · {zh ? v.kind === "Draft" ? "草稿" : "已发布" : v.kind}</summary>
      <SessionSnapshotPreview snapshot={v.snapshot} /><button type="button" className="outlineButton" onClick={() => restore(v.snapshot)}>{zh ? "恢复到编辑器" : "Restore to editor"}</button>
    </details>)}
  </ProgrammingSheet>;
}
