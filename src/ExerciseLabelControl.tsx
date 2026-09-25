import { useTranslation } from "react-i18next";
import type { ProgramExercise } from "./appCore";

export default function ExerciseLabelControl({ exercise, index, change }: {
  exercise: ProgramExercise; index: number; change: (value: string) => void;
}) {
  const { t } = useTranslation();
  const id = `exercise-label-${index}`;
  return <div className="builderLabelControl">
    <label htmlFor={id}>{t("polishLabel7434")}</label>
    <div className="builderLabelInputRow">
      <input id={id} value={exercise.exerciseLabel || ""} placeholder={String(index + 1)}
        maxLength={6} autoCapitalize="characters" autoComplete="off" spellCheck={false}
        aria-describedby={`${id}-hint`} onChange={event => change(event.target.value)} />
      <button type="button" className="outlineButton compactBuilderButton" disabled={!exercise.isLabelCustom}
        onClick={() => change("")} aria-label={t("builderLabelReset")}>{t("builderLabelAuto")}</button>
    </div>
    <small id={`${id}-hint`}>{t(exercise.isLabelCustom ? "builderLabelCustomHint" : "builderLabelAutoHint")}</small>
  </div>;
}
