import { useTranslation } from "react-i18next";
import "./CoachDraftNotice.css";
import type { DraftCloudStatus } from "./cloudCoachDrafts";

export const cloudDraftLabel = (status: DraftCloudStatus, zh: boolean) => ({
  synced: zh ? "草稿已同步 · 尚未发布" : "Draft synced · not published",
  syncing: zh ? "正在同步草稿…" : "Syncing draft…",
  offline: zh ? "仅保存在此设备 · 联网后重试同步" : "On this device · sync will retry",
  conflict: zh ? "另一设备有不同版本 · 返回草稿列表保留两份" : "Different version on another device · return to Drafts to keep both",
}[status]);

export default function CoachDraftNotice({ drafts, resume, discard, cloud }: {
  drafts: { id: string; title: string; updatedAt: number; revision: string; cloudRevision?: string | null }[];
  resume: (id: string) => void;
  discard: (id: string) => void;
  cloud: { statuses: Record<string, DraftCloudStatus>; state: DraftCloudStatus; refresh: () => void; keepBoth: (id: string) => void };
}) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  if (!drafts.length) return null;
  return <details className="coachDraftNotice">
    <summary>{t("coachDraftRecovered", { count: drafts.length })}</summary>
    <p>{zh ? "草稿自动同步到使用同一教练账号的设备。发布前，学员的训练安排保持不变。" : "Drafts sync between devices using the same coach sign-in. Publish separately when the program is ready."}</p>
    <button type="button" className="outlineButton" onClick={cloud.refresh} disabled={cloud.state === "syncing"}>{zh ? "刷新草稿" : "Refresh drafts"}</button>
    {drafts.map(draft => <div className="coachDraftRow" key={draft.id}>
      <div><strong>{draft.title}</strong><small>{new Date(draft.updatedAt).toLocaleString(i18n.language)}</small><small>{cloudDraftLabel(cloud.statuses[draft.id] === "conflict" ? "conflict" : draft.revision === draft.cloudRevision ? "synced" : cloud.state === "offline" ? "offline" : "syncing", zh)}</small></div>
      {cloud.statuses[draft.id] === "conflict" && <button type="button" onClick={() => cloud.keepBoth(draft.id)}>{zh ? "保留两个版本" : "Keep both versions"}</button>}
      <button type="button" onClick={() => resume(draft.id)}>{t("coachDraftResume")}</button>
      <button type="button" onClick={() => discard(draft.id)}>{t("coachDraftDiscard")}</button>
    </div>)}
  </details>;
}
