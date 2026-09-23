import { useTranslation } from "react-i18next";
import { effectiveTrackingFields, STRENGTH_TRACKING_FIELDS, type ProgramExercise } from "./appCore";
import ProgrammingSheet from "./ProgrammingSheet";

export default function ExerciseFieldsSheet({ exercise, toggle, close }: {
  exercise: ProgramExercise;
  toggle: (field: string) => void;
  close: () => void;
}) {
  const { t } = useTranslation();
  const active = effectiveTrackingFields(exercise.trackingType, exercise.trackingFields);
  return <ProgrammingSheet title={t("editFields")} close={close}>
    <strong>{exercise.exerciseName}</strong>
    <p>{t("editFieldsHint")}</p>
    <div className="exerciseFieldChoices">
      {STRENGTH_TRACKING_FIELDS.map(field => {
        const selected = active.includes(field);
        return <button key={field} type="button" aria-pressed={selected}
          disabled={selected ? active.length === 1 : active.length >= 3}
          onClick={() => toggle(field)}>
          {selected && <span aria-hidden="true">{active.indexOf(field) + 1}. </span>}
          {t(`prescriptionField${field}`)}
        </button>;
      })}
    </div>
    <p>{t("editFieldsPreserveValues")}</p>
    <button type="button" className="goldButton" onClick={close}>{t("editFieldsDone")}</button>
  </ProgrammingSheet>;
}
