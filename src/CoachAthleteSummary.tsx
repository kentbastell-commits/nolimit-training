/* eslint-disable @typescript-eslint/no-explicit-any */
import { useTranslation } from "react-i18next";
import { athleteFacts, belongsTo, coachingDate, coachingPaused, type CoachingItem, type ReviewDecision } from "./coachingReview";
import "./DailyCoaching.css";

export default function CoachAthleteSummary({ client, workouts, checkIns, checkInsReady, items, decisions, videos, loading, loadFailed, feedLoading, feedError, retry, openWorkout, adjustNext, openReview, openCalendar, openProgress, openNotes, workoutName }: any) {
  const { t } = useTranslation();
  const facts = athleteFacts(client, workouts, checkIns);
  const { latest, next, checkIn, previousCheckIn } = facts;
  const unknown = t(loading ? "dailyLoading" : loadFailed ? "dailyActivityUnavailable" : "dailyNoResult");
  const checkReady = checkInsReady && !feedError;
  const readiness = checkIn?.readinessScore;
  const hasNumber = (v: any) => v !== "" && v != null && Number.isFinite(Number(v));
  const change = hasNumber(readiness) && hasNumber(previousCheckIn?.readinessScore) ? Number(readiness) - Number(previousCheckIn.readinessScore) : null;
  const events = [
    ...facts.done.map(w => ({ key: `workout:${w.assignedWorkoutId || w.id}`, date: coachingDate(w.scheduledDate), label: t("dailyKind_workout"), title: workoutName(w), note: w.clientNotes, noteLabel: t("dailyAthleteNote"), open: () => openWorkout(w) })),
    ...facts.checks.map(c => ({ key: `checkin:${c.recordId}`, date: coachingDate(c.submittedDate), label: t("dailyCheckin"), title: [c.trainingNotesEn || c.trainingNotes, c.problemsPainEn || c.problemsPain].filter(Boolean).join(" · ") || t("dailyCheckin"), note: c.coachResponse, noteLabel: t("dailyCoachFeedback"), open: () => openReview(`checkin:${c.recordId}`) })),
    ...(videos || []).filter((v: any) => belongsTo(v, client)).map((v: any) => ({ key: `video:${v.recordId}`, date: coachingDate(v.submittedAt || v.createdAt), label: t("dailyKind_video"), title: v.exerciseName, note: v.coachReply, noteLabel: t("dailyCoachFeedback"), open: () => openReview(`video:${v.recordId}`) })),
    ...(decisions as ReviewDecision[]).map(d => ({ key: `decision:${d.key}`, date: coachingDate(d.updatedAt), label: t("dailyCoachDecision"), title: `${t(`dailyKind_${d.item.kind}`)} · ${t(d.status === "resolved" ? "dailyResolved" : d.status === "snoozed" ? "dailySnoozed" : "dailyReopen")}`, note: d.note, noteLabel: t("dailyPrivate"), open: () => openReview(d.key, d.status === "resolved" ? "dailyHistory" : d.status === "snoozed" ? "dailySnoozed" : "dailyAll") })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  return <section className="coachSummary">
    {loadFailed && <div className="dailyError" role="alert">{t("dailyActivityUnavailable")} <button onClick={retry}>{t("dailyRefresh")}</button></div>}
    {coachingPaused(client) && <p className="dailyHint">{t("dailyPaused")}</p>}
    <div className="coachSummaryGrid">
      <article className="coachSummaryCard"><h3>{t("dailyLatest")}</h3><strong>{latest ? workoutName(latest) : unknown}</strong>
        {latest && <><small>{t("dailyTrainingDate", { date: coachingDate(latest.scheduledDate) })}</small><p>{t("dailyResult", { rpe: latest.sessionRpe || "—", duration: latest.sessionDuration || "—" })}</p>{latest.clientNotes && <p>{t("dailyAthleteNote")}: {latest.clientNotes}</p>}<button onClick={() => openWorkout(latest)}>{t("dailyReviewLast")}</button></>}
      </article>
      <article className="coachSummaryCard"><h3>{t("dailyNext")}</h3><strong>{next ? workoutName(next) : loading || loadFailed ? unknown : t("dailyNoCoverage")}</strong>
        {next && <><small>{coachingDate(next.scheduledDate)}</small><p>{t("dailyCoverage", { date: facts.end, count: facts.future.length })}</p></>}
        {!loading && !loadFailed && <button className="dailyPrimary" onClick={() => next ? adjustNext(next) : openCalendar()}>{t(next ? "dailyAdjust" : "dailyPlan")}</button>}
      </article>
      <article className="coachSummaryCard"><h3>{t("dailyCheckin")}</h3><strong>{checkIn ? coachingDate(checkIn.submittedDate) : !checkReady ? t(feedLoading ? "dailyLoading" : "dailyActivityUnavailable") : t("dailyNoCheckin")}</strong>
        {checkIn && <><div className="coachSummaryCheckin">{[["dailyReadiness", checkIn.readinessScore], ["dailyEnergy", checkIn.energy], ["dailySleep", checkIn.sleepQuality], ["dailySoreness", checkIn.soreness]].filter(([, value]) => hasNumber(value)).map(([label, value]) => <span key={label}>{t(label)} {value}</span>)}</div>{change !== null && <small>{t("dailyChange", { change: `${change > 0 ? "+" : ""}${change}` })}</small>}{(checkIn.problemsPainEn || checkIn.problemsPain) && <p>{checkIn.problemsPainEn || checkIn.problemsPain}</p>}<button onClick={() => openReview(`checkin:${checkIn.recordId}`)}>{t("dailyOpen")}</button></>}
      </article>
    </div>
    <div className="coachSummaryLinks"><button onClick={() => openReview()}>{feedLoading || feedError ? t("dailyFollowup") : items.length ? t("dailyFeedback", { count: items.length }) : t("dailyNoFeedback")}</button><button onClick={openProgress}>{t("dailyProgress")}</button><button onClick={openNotes}>{t("dailyNotes")}</button></div>
    {items.length > 0 && <div className="dailyHint">{t(`dailyKind_${(items[0] as CoachingItem).kind}`)} · {items[0].title || t("dailyNoCoverage")}</div>}
    <div className="coachTimeline"><h3>{t("dailyTimeline")}</h3>{events.map(e => <div key={e.key}><button className="coachTimelineItem" onClick={e.open}><small>{e.date || t("dailyUndated")} · {e.label}</small><strong>{e.title}</strong></button>{e.note && <p className="coachTimelineNote"><strong>{e.noteLabel}</strong><br />{e.note}</p>}</div>)}{!events.length && <p className="dailyHint">{t(loading || feedLoading ? "dailyLoading" : "dailyNoActivity")}</p>}</div>
  </section>;
}
