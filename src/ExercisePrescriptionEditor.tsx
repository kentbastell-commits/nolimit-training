import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ProgramExercise } from "./appCore";
import "./ProgrammingTools.css";

export default function ExercisePrescriptionEditor({ exercise, update, table, percent, togglePercent, alternates }: { exercise: ProgramExercise; update: (key: keyof ProgramExercise, value: string | boolean) => void; table: ReactNode; percent: boolean; togglePercent: () => void; alternates: ReactNode }) {
  const { i18n } = useTranslation(); const zh = i18n.language.startsWith("zh");
  return <div className="sharedPrescription">
    {exercise.trackingType === "Weight" && <div className="sharedPrescriptionControls"><label><input type="checkbox" checked={exercise.isUnilateral} onChange={e => update("isUnilateral", e.target.checked)} />{zh ? "每侧" : "Each side"}</label><button type="button" className="outlineButton" aria-pressed={percent} onClick={togglePercent}>{zh ? "使用 %1RM" : "Use %1RM"}</button></div>}
    {table}
    <label>{zh ? "教练备注（英文）" : "Coach notes (English)"}<textarea value={exercise.coachingNotes || ""} onChange={e => { update("coachingNotes", e.target.value); }} placeholder={zh ? "设置、动作执行、训练意图…" : "Setup, execution, intent…"} /></label>
    <details><summary>{zh ? "中文教练备注" : "Chinese coach notes"}</summary><label><textarea aria-label={zh ? "中文教练备注" : "Coach notes (Chinese)"} value={exercise.coachingNotesCn || ""} onChange={e => update("coachingNotesCn", e.target.value)} placeholder={zh ? "为运动员提供清晰的中文动作指导" : "Chinese setup and execution cues"} /></label></details>
    {alternates}
  </div>;
}
