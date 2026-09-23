import { useTranslation } from "react-i18next";
import "./CoachDraftNotice.css";

export default function CoachDraftNotice({ drafts, resume, discard }: {
  drafts: { id: string; title: string; updatedAt: number }[];
  resume: (id: string) => void;
  discard: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  if (!drafts.length) return null;
  return <details className="coachDraftNotice" open>
    <summary>{t("coachDraftRecovered", { count: drafts.length })}</summary>
    <p>{t("coachDraftLocalOnly")}</p>
    {drafts.map(draft => <div className="coachDraftRow" key={draft.id}>
      <div><strong>{draft.title}</strong><small>{new Date(draft.updatedAt).toLocaleString(i18n.language)}</small></div>
      <button type="button" onClick={() => resume(draft.id)}>{t("coachDraftResume")}</button>
      <button type="button" onClick={() => discard(draft.id)}>{t("coachDraftDiscard")}</button>
    </div>)}
  </details>;
}
