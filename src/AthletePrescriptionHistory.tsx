/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { coachingDate } from "./coachingReview";
export function useAthletePrescriptionHistory(clientCode: string) {
  const [state, setState] = useState<{ client: string; logs: any[]; loading: boolean; error: boolean }>({ client: "", logs: [], loading: false, error: false });
  useEffect(() => {
    if (!clientCode) return;
    let cancelled = false;
    setState({ client: clientCode, logs: [], loading: true, error: false });
    void fetch(`/api/workoutHistory?clientCode=${encodeURIComponent(clientCode)}`).then(async res => {
      if (!res.ok) throw new Error(); return res.json();
    }).then(data => { if (!cancelled) setState({ client: clientCode, logs: data.logs || [], loading: false, error: false }); })
      .catch(() => { if (!cancelled) setState({ client: clientCode, logs: [], loading: false, error: true }); });
    return () => { cancelled = true; };
  }, [clientCode]);
  return state.client === clientCode ? state : { client: clientCode, logs: [], loading: !!clientCode, error: false };
}
export function previousExerciseSets(exercise: any, logs: any[], before: string) {
  const name = (n: string) => String(n || "").replace(/ - (Left|Right)$/, "").trim().toLowerCase();
  const matching = logs.filter(l => l.completed !== false && coachingDate(l.date) && coachingDate(l.date) <= before &&
    (l.exerciseId && exercise.exerciseId ? l.exerciseId === exercise.exerciseId : name(l.exerciseName) === name(exercise.exerciseName)))
    .sort((a, b) => coachingDate(b.date).localeCompare(coachingDate(a.date)) || String(b.assignedWorkoutId || "").localeCompare(String(a.assignedWorkoutId || "")));
  const first = matching[0];
  if (!first) return [];
  return matching.filter(l => coachingDate(l.date) === coachingDate(first.date) && (!first.assignedWorkoutId || l.assignedWorkoutId === first.assignedWorkoutId))
    .sort((a, b) => Number(a.setNumber) - Number(b.setNumber));
}
export default function AthletePrescriptionHistory({ exercise, history, date }: any) {
  const { t } = useTranslation();
  if (!history.client) return null;
  const sets = previousExerciseSets(exercise, history.logs, date);
  return <details className="previousPerformance"><summary>{t("dailyLastPerformed")}{sets.length ? ` · ${coachingDate(sets[0].date)}` : ""}</summary>
    {history.loading || history.error || !sets.length ? <p>{t(history.loading ? "dailyLoading" : history.error ? "dailyActivityUnavailable" : "dailyNoExerciseHistory")}</p> : <>
      <p>{t("dailyLoggedFacts")}</p><ul>{sets.map((s: any) => <li key={s.recordId}><strong>{t("dailySet", { count: s.setNumber })}</strong> · {[["dailyActualReps", s.actualReps], ["dailyActualLoad", s.actualWeight], ["dailyActualTime", s.actualTime], ["dailyActualDistance", s.actualDistance]].filter(([, v]) => v !== "" && v != null).map(([label, v]) => t(label, { value: v })).join(" · ") || t("dailyUnknown")}{/ - (Left|Right)$/.test(s.exerciseName) && ` · ${t(s.exerciseName.endsWith("Left") ? "dailyLeft" : "dailyRight")}`}{s.athleteNotes && <p>{t("dailyAthleteNote")}: {s.athleteNotes}</p>}</li>)}</ul>
    </>}
  </details>;
}
