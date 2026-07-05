// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { stripLocalizedExerciseMeta } from "./appCore";
import { Check, ChevronLeft, ChevronRight, ClipboardList, Clock3, Film, MoreVertical, Play, RefreshCw, Shuffle, Timer, Trash2, X } from "lucide-react";
import { getDisplayTaskStatus, makeExerciseLabel, parseExerciseNotes, videoThumbnail } from "./appCore";

export default function WorkoutPlayerModal({
  getLabelColorClass,
  t,
  checkAndSaveWorkoutSet,
  checkedWorkoutPageItems,
  coachReviewMode,
  deleteWorkout,
  detailsLoading,
  editingWorkoutDate,
  formVideoBusy,
  formVideoInputRef,
  formVideoSentIds,
  getWorkoutGroupBounds,
  getWorkoutGroupIndexes,
  getWorkoutGroupRoundCount,
  goToFocusExercise,
  handleFocusTouchEnd,
  handleFocusTouchStart,
  i18n,
  isClientPortal,
  isExerciseFullyLogged,
  isPremiumClient,
  isSetComplete,
  isWarmupSection,
  lastLoggedWeight,
  latestReadiness,
  localizeDefaultSection,
  localizeRestValue,
  localizeText,
  localizedExerciseName,
  localizedWorkoutName,
  openWorkoutActionMenuId,
  openWorkoutExerciseFromGlance,
  openWorkoutFinish,
  originalExercisesRef,
  paceZh,
  resetWodState,
  resolvePrescribedHr,
  resolvePrescribedLoad,
  resolvePrescribedPace,
  restTimer,
  saveWorkout,
  savingWorkout,
  sectionAccentColor,
  selectedWorkout,
  setAlternatePickerExercise,
  setEditingWorkoutDate,
  setFormVideoExercise,
  setHistoryExerciseName,
  setLogs,
  setOpenWorkoutActionMenuId,
  setRestTimer,
  setSavedExerciseDraftIds,
  setSelectedWorkout,
  setSetLogs,
  setTechnicalCueExercise,
  setWodRounds,
  setWodTimer,
  setWorkoutDetails,
  setWorkoutFocusMode,
  setWorkoutFocusSetRound,
  setWorkoutHistoryLogs,
  setWorkoutLoggingStarted,
  setWorkoutSubmissionNote,
  setWorkoutVideoOverlay,
  startRestTimer,
  toggleWorkoutReviewed,
  updateSetLog,
  updateWorkoutDate,
  updatingWorkoutDate,
  useMobileWorkoutRows,
  vibrate,
  weightUnit,
  wodElapsedMs,
  wodRounds,
  wodTimer,
  workoutDetails,
  workoutFocusIndex,
  workoutFocusMode,
  workoutFocusSetRound,
  workoutGroupTitle,
  workoutLoggingStarted,
  workoutSetCheckKey,
  workoutSubmissionNote,
}: { [key: string]: any }) {
  return (
    <>
          <div
            className={`workout-modal-overlay${
              // Coach view: scope the portal's light player theme onto this
              // overlay so coaches see the workout exactly as athletes do
              // (the ~100 .clientPortalApp player rules apply via descent).
              isClientPortal ? " clientWorkoutPlayerOverlay" : " clientPortalApp"
            }`}
          >
            <div
              className={`workout-modal${
                coachReviewMode ? " coachReviewModal" : ""
              }${isClientPortal ? " clientWorkoutPlayerModal" : ""}${
                isClientPortal && workoutLoggingStarted
                  ? " clientWorkoutPlayerActive"
                  : ""
              }`}
            >
              <div className="modal-header">
                <div>
                  <h2>{localizedWorkoutName(selectedWorkout)}</h2>
                  {coachReviewMode && (
                    <span className="coachReviewBadge">
                      {paceZh ? "审阅模式" : "Review mode"}
                    </span>
                  )}
                  <div className="workoutHeaderMeta">
                    <span>
                      {t("week")} {selectedWorkout.week} • {t("day")} {selectedWorkout.day}
                    </span>
                    <span>
                      {t(
                        getDisplayTaskStatus(
                          selectedWorkout.completionStatus,
                          selectedWorkout.scheduledDate
                        ).toLowerCase()
                      )}
                    </span>
                    {!isClientPortal && (
                      <>
                    <label className="headerDateControl">
                      <input
                        type="date"
                        value={editingWorkoutDate}
                        onChange={(e) => setEditingWorkoutDate(e.target.value)}
                      />
                    </label>
                    <button
                      className="miniMoveWorkoutButton"
                      onClick={updateWorkoutDate}
                      disabled={updatingWorkoutDate || !editingWorkoutDate}
                    >
                      {updatingWorkoutDate ? t("saving") : t("move")}
                    </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="modalHeaderActions">
                  {!isClientPortal && (
                  <button
                    className="iconActionButton dangerIconButton"
                    onClick={() => deleteWorkout(selectedWorkout)}
                    title={t("deleteWorkout")}
                    aria-label={t("deleteWorkout")}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                  )}

                  <button
                    className="drawerClose"
                    onClick={() => {
                      setSelectedWorkout(null);
                      setWorkoutLoggingStarted(false);
                      setWorkoutDetails([]);
                      setSetLogs([]);
                      setSavedExerciseDraftIds([]);
                      setWorkoutHistoryLogs([]);
                      setHistoryExerciseName("");
                      setRestTimer(null);
                    }}
                  >
                    <X size={28} strokeWidth={3} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="modal-body">
                {detailsLoading && <p>{t("loadingWorkouts")}</p>}

                {!detailsLoading &&
                  workoutDetails.length > 0 &&
                  (!isClientPortal || !workoutLoggingStarted) && (
                  <section className="workoutGlancePanel">
                    <h3>{t("atAGlance")}</h3>
                    {isClientPortal &&
                      (() => {
                        const score = latestReadiness();
                        if (score === null || score > 55) return null;
                        const pct = score < 40 ? 10 : 5;
                        return (
                          <div className="readinessAdviceBanner">
                            {paceZh
                              ? `今日恢复度 ${score} — 建议负荷降低约 ${pct}%，重质量不硬撑。`
                              : `Readiness ${score} today — consider dropping loads ~${pct}%. Quality over grinding.`}
                          </div>
                        );
                      })()}
                    {isClientPortal && !workoutLoggingStarted && (
                      <p className="workoutGlanceIntro">
                        {t("selectFirstExercise")}
                      </p>
                    )}

                    {workoutDetails.map((exercise: any, index: any) => {
                      const meta = parseExerciseNotes(exercise.notes);
                      const previousMeta =
                        index > 0
                          ? parseExerciseNotes(workoutDetails[index - 1].notes)
                          : null;
                      const sectionName = meta.sectionName || "Main";
                      const sectionNameDisplay = exercise.sectionNameCn
                        ? localizeText(sectionName, exercise.sectionNameCn)
                        : localizeDefaultSection(sectionName);
                      const showSectionHeader =
                        !previousMeta ||
                        sectionName !== (previousMeta.sectionName || "Main");
                      const inCircuit =
                        meta.groupType === "Circuit" && Boolean(meta.groupName);
                      const isCircuitStart =
                        inCircuit &&
                        (!previousMeta ||
                          previousMeta.groupType !== "Circuit" ||
                          previousMeta.groupName !== meta.groupName);
                      const prescription = inCircuit
                        ? exercise.reps
                          ? paceZh
                            ? `每轮 ${exercise.reps}`
                            : `${exercise.reps} / round`
                          : t("forCompletion")
                        : exercise.sets && exercise.reps
                          ? `${exercise.sets} x ${exercise.reps}`
                          : t("forCompletion");
                      const accessoryLabel = meta.accessoryParentLabel
                        ? paceZh
                          ? `${meta.accessoryParentLabel} 的辅助动作`
                          : `Accessory for ${meta.accessoryParentLabel}`
                        : paceZh
                        ? "辅助动作"
                        : "Accessory";
                      const prescriptionDetails = [
                        prescription,
                        exercise.tempo ? `${t("tempo")} ${exercise.tempo}` : "",
                        exercise.rest
                          ? `${t("rest")} ${localizeRestValue(exercise.rest)}`
                          : "",
                      ].filter(Boolean);

                      return (
                        <div key={`${exercise.id}-glance`}>
                          {showSectionHeader && (
                            <h4
                              className="workoutGlanceSection"
                              style={{
                                ["--sectionAccent" as string]:
                                  sectionAccentColor(sectionName),
                              } as React.CSSProperties}
                            >
                              {sectionNameDisplay}
                            </h4>
                          )}

                          {isCircuitStart && (
                            <div className="workoutGlanceCircuitHeader">
                              <RefreshCw size={13} aria-hidden="true" />
                              <span>
                                {meta.groupMode
                                  ? paceZh
                                    ? `${meta.groupMode} · ${meta.groupMinutes || "12"} 分钟`
                                    : `${meta.groupMode} · ${meta.groupMinutes || "12"} min`
                                  : paceZh
                                    ? `循环 · ${exercise.sets || "3"} 轮`
                                    : `Circuit · ${exercise.sets || "3"} rounds`}
                              </span>
                            </div>
                          )}

                          <button
                            className={`workoutGlanceRow ${
                              meta.isAccessory ? "accessoryGlanceRow" : ""
                            }${inCircuit ? " circuitGlanceRow" : ""}`}
                            type="button"
                            onClick={() => openWorkoutExerciseFromGlance(index)}
                          >
                            <span
                              className={`exerciseLabelBadge ${
                                isWarmupSection(sectionName)
                                  ? "exerciseLabelBadgeWarmup"
                                  : getLabelColorClass(
                                      meta.exerciseLabel,
                                      sectionName
                                    )
                              }`}
                            >
                              {isWarmupSection(sectionName)
                                ? index + 1
                                : meta.exerciseLabel || makeExerciseLabel(index)}
                            </span>
                            <span>
                              <strong>{localizedExerciseName(exercise)}</strong>
                              {meta.isAccessory && (
                                <em className="exerciseAccessoryInline">
                                  {accessoryLabel}
                                </em>
                              )}
                              <small>{prescriptionDetails.join(" • ")}</small>
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </section>
                )}

                {!detailsLoading && isClientPortal && workoutLoggingStarted && (
                  <button
                    className="outlineButton workoutGlanceBackButton"
                    onClick={() => setWorkoutLoggingStarted(false)}
                  >
                    {t("backToAtAGlance")}
                  </button>
                )}

                {!detailsLoading &&
                  isClientPortal &&
                  workoutLoggingStarted &&
                  workoutDetails.length > 0 &&
                  (() => {
                    const focusBounds = getWorkoutGroupBounds(workoutFocusIndex);
                    const focusGroupIndexes = focusBounds.indexes;
                    const isGroupedFocus = focusGroupIndexes.length > 1;
                    const roundCount = getWorkoutGroupRoundCount(focusGroupIndexes);
                    const focusEx = workoutDetails[workoutFocusIndex];
                    // Circuits count grouped passes as "rounds"; supersets keep "sets".
                    const focusIsCircuit =
                      isGroupedFocus &&
                      focusEx &&
                      parseExerciseNotes(focusEx.notes).groupType === "Circuit";
                    const focusIds = new Set(
                      focusGroupIndexes
                        .map((index: any) => workoutDetails[index]?.exerciseId)
                        .filter(Boolean)
                    );
                    const focusLogs =
                      isGroupedFocus && focusIds.size
                        ? setLogs.filter((log: any) => focusIds.has(log.exerciseId))
                        : focusEx
                        ? setLogs.filter(
                            (log: any) => log.exerciseId === focusEx.exerciseId
                          )
                        : [];
                    const completedSets = focusLogs.filter(isSetComplete).length;
                    const totalSets = Math.max(focusLogs.length, completedSets);
                    const completedExercises = workoutDetails.filter((ex: any) =>
                      isExerciseFullyLogged(ex.exerciseId)
                    ).length;
                    const exerciseProgress =
                      ((focusBounds.end + 1) / workoutDetails.length) * 100;
                    return (
                      <section className="workoutPlayerProgress">
                        <button
                          type="button"
                          className="workoutPlayerBannerBack"
                          onClick={() => setWorkoutLoggingStarted(false)}
                          aria-label={t("backToAtAGlance")}
                        >
                          <ChevronLeft size={24} />
                        </button>
                        <div className="workoutPlayerProgressContent">
                          <div className="workoutPlayerProgressTop">
                            <span>
                              {paceZh ? "动作" : "Exercise"}{" "}
                              {isGroupedFocus
                                ? `${focusBounds.start + 1}-${focusBounds.end + 1}`
                                : workoutFocusIndex + 1}
                              /{workoutDetails.length}
                            </span>
                            <strong>{localizedWorkoutName(selectedWorkout)}</strong>
                          </div>
                          <div
                            className="workoutPlayerProgressTrack"
                            aria-hidden="true"
                          >
                            <span style={{ width: `${exerciseProgress}%` }} />
                          </div>
                          <div className="workoutPlayerProgressMeta">
                            <span>
                              {paceZh ? "当前动作" : "Current"}:{" "}
                              {focusEx ? localizedExerciseName(focusEx) : "--"}
                            </span>
                            <span>
                              {isGroupedFocus
                                ? focusIsCircuit
                                  ? paceZh
                                    ? `第 ${workoutFocusSetRound}/${roundCount} 轮`
                                    : `Round ${workoutFocusSetRound}/${roundCount}`
                                  : `${paceZh ? "第" : "Set "} ${workoutFocusSetRound}/${roundCount}`
                                : `${completedSets}/${totalSets || "--"} ${
                                    paceZh ? "组" : "sets"
                                  }`}
                            </span>
                            <span>
                              {completedExercises}/{workoutDetails.length}{" "}
                              {paceZh ? "完成" : "done"}
                            </span>
                          </div>
                        </div>
                      </section>
                    );
                  })()}

                {restTimer && (
                  <div
                    className={`restTimerWidget ${
                      restTimer.remaining === 0 ? "restTimerDone" : ""
                    }`}
                  >
                    <div className="restTimerLabel">
                      {restTimer.remaining === 0
                        ? paceZh
                          ? "继续训练！"
                          : "GO!"
                        : paceZh
                        ? "休息"
                        : "REST"}
                      {restTimer.label ? ` · ${restTimer.label}` : ""}
                    </div>
                    <div className="restTimerTime">
                      {Math.floor(restTimer.remaining / 60)}:
                      {String(restTimer.remaining % 60).padStart(2, "0")}
                    </div>
                    <div className="restTimerControls">
                      <button
                        type="button"
                        onClick={() =>
                          setRestTimer((rt: any) =>
                            rt ? { ...rt, remaining: rt.remaining + 15, running: true } : rt
                          )
                        }
                      >
                        +15s
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRestTimer((rt: any) =>
                            rt && rt.remaining > 0 ? { ...rt, running: !rt.running } : rt
                          )
                        }
                      >
                        {restTimer.running
                          ? paceZh
                            ? "暂停"
                            : "Pause"
                          : paceZh
                          ? "继续"
                          : "Resume"}
                      </button>
                      <button type="button" onClick={() => setRestTimer(null)}>
                        {paceZh ? "关闭" : "Done"}
                      </button>
                    </div>
                  </div>
                )}

                {!detailsLoading &&
                  (!isClientPortal || workoutLoggingStarted) &&
                  workoutDetails.map((exercise: any, index: any) => {
                    const focusGroupIndexes =
                      isClientPortal && workoutFocusMode
                        ? getWorkoutGroupIndexes(workoutFocusIndex)
                        : [];
                    // Focus player: in the client portal, render one exercise at
                    // a time, or the whole superset/circuit when the active
                    // exercise is grouped. The "View all" toggle falls back to
                    // the full scrolling list.
                    if (
                      isClientPortal &&
                      workoutFocusMode &&
                      !focusGroupIndexes.includes(index)
                    ) {
                      return null;
                    }
                    const exerciseLogs = setLogs.filter((log: any) =>
                      log.occurrenceId
                        ? log.occurrenceId === exercise.id
                        : log.exerciseId === exercise.exerciseId
                    );
                    const isGroupedFocus =
                      isClientPortal &&
                      workoutFocusMode &&
                      focusGroupIndexes.length > 1;
                    const groupRoundCount = isGroupedFocus
                      ? getWorkoutGroupRoundCount(focusGroupIndexes)
                      : 1;
                    const visibleExerciseLogs = isGroupedFocus
                      ? exerciseLogs.filter(
                          (log: any) => Number(log.setNumber) === workoutFocusSetRound
                        )
                      : exerciseLogs;
                    const meta = parseExerciseNotes(exercise.notes);
                    const previousMeta =
                      index > 0
                        ? parseExerciseNotes(workoutDetails[index - 1].notes)
                        : null;
                    const sectionName = meta.sectionName || "Main";
                    const sectionNameDisplay = exercise.sectionNameCn
                      ? localizeText(sectionName, exercise.sectionNameCn)
                      : localizeDefaultSection(sectionName);
                    const showSectionHeader =
                      isClientPortal && workoutFocusMode
                        ? false
                        : !previousMeta ||
                          sectionName !== (previousMeta.sectionName || "Main");
                    // When the athlete has swapped in an alternate, the coach's
                    // slot note was written for the original exercise, so show
                    // the alternate's own library cue instead.
                    const swappedOriginal = originalExercisesRef.current.find(
                      (o: any) => o.id === exercise.id
                    );
                    const isSwappedAlternate =
                      !!swappedOriginal &&
                      swappedOriginal.exerciseId !== exercise.exerciseId;
                    const coachingNotes = isSwappedAlternate
                      ? localizeText(
                          exercise.cueNotes || "",
                          stripLocalizedExerciseMeta(exercise.cueNotesCn || "")
                        )
                      : localizeText(
                          meta.coachingNotes,
                          stripLocalizedExerciseMeta(exercise.notesCn || "")
                        );
                    const exerciseVideoUrl = localizeText(
                      exercise.videoUrl || "",
                      exercise.videoUrlCn || ""
                    );
                    const exerciseThumb = videoThumbnail(exerciseVideoUrl);
                    const isTimedCircuit =
                      meta.groupType === "Circuit" && !!meta.groupMode;
                    const rawFocusGroupTitle =
                      isClientPortal &&
                      workoutFocusMode &&
                      (focusGroupIndexes.length > 1 ||
                        (isTimedCircuit && focusGroupIndexes.length === 1)) &&
                      focusGroupIndexes[0] === index
                        ? workoutGroupTitle(meta) ||
                          `Superset ${
                            meta.exerciseLabel ||
                            makeExerciseLabel(focusGroupIndexes[0])
                          }`
                        : "";
                    // Translate the "Superset"/"Circuit" word in the group title
                    // when the portal is in Chinese (the label letter stays).
                    const focusGroupTitle =
                      paceZh && rawFocusGroupTitle
                        ? rawFocusGroupTitle
                            .replace(/superset/gi, "超级组")
                            .replace(/circuit/gi, "循环")
                        : rawFocusGroupTitle;
                    const accessoryLabel = meta.accessoryParentLabel
                      ? paceZh
                        ? `${meta.accessoryParentLabel} 的辅助动作`
                        : `Accessory for ${meta.accessoryParentLabel}`
                      : paceZh
                      ? "辅助动作"
                      : "Accessory";

                    const focusSwipe =
                      isClientPortal && workoutFocusMode
                        ? {
                            onTouchStart: handleFocusTouchStart,
                            onTouchEnd: (e: React.TouchEvent) =>
                              handleFocusTouchEnd(e, workoutDetails.length),
                          }
                        : {};
                    const visiblePageLogs =
                      isClientPortal && workoutFocusMode
                        ? focusGroupIndexes.flatMap((exerciseIndex: any) => {
                            const focusExercise = workoutDetails[exerciseIndex];
                            if (!focusExercise) return [];
                            return setLogs.filter(
                              (log: any) =>
                                log.exerciseId === focusExercise.exerciseId &&
                                (!isGroupedFocus ||
                                  Number(log.setNumber) === workoutFocusSetRound)
                            );
                          })
                        : visibleExerciseLogs;

                    return (
                      <div key={exercise.id} {...focusSwipe}>
                        {focusGroupTitle && (
                          <div className="workoutPlayerGroupHeader">
                            <span>
                              {meta.groupType === "Circuit" && meta.groupMode
                                ? `${meta.groupMode} · ${meta.groupMinutes || "12"} min`
                                : meta.groupType === "Circuit"
                                  ? paceZh
                                    ? `第 ${workoutFocusSetRound}/${groupRoundCount} 轮`
                                    : `Round ${workoutFocusSetRound}/${groupRoundCount}`
                                  : paceZh
                                    ? `第 ${workoutFocusSetRound}/${groupRoundCount} 组`
                                    : `Set ${workoutFocusSetRound}/${groupRoundCount}`}
                            </span>
                            <strong>{focusGroupTitle}</strong>
                          </div>
                        )}
                        {(focusGroupTitle ||
                          (isClientPortal &&
                            !workoutFocusMode &&
                            getWorkoutGroupIndexes(index)[0] === index)) &&
                          meta.groupType === "Circuit" &&
                          meta.groupMode &&
                          (() => {
                            // The shared clock belongs to one circuit; any
                            // other timed block renders a fresh zeroed card.
                            const ownsTimer =
                              !wodTimer.groupId ||
                              wodTimer.groupId === exercise.id;
                            const groupElapsedMs = ownsTimer ? wodElapsedMs : 0;
                            const groupRounds = ownsTimer ? wodRounds : 0;
                            const claimTimer = () => {
                              setWodTimer({
                                running: true,
                                startedAt: Date.now(),
                                accumulatedMs: 0,
                                groupId: exercise.id,
                              });
                              setWodRounds(0);
                            };
                            const capMs =
                              (Number(meta.groupMinutes) || 12) * 60000;
                            const remainMs = Math.max(0, capMs - groupElapsedMs);
                            const mm = Math.floor(remainMs / 60000);
                            const ss = Math.floor((remainMs % 60000) / 1000);
                            const minuteNow = Math.min(
                              Number(meta.groupMinutes) || 12,
                              Math.floor(groupElapsedMs / 60000) + 1
                            );
                            const timeUp = remainMs <= 0;
                            return (
                              <div
                                className={`wodTimerCard${timeUp ? " timeUp" : ""}`}
                              >
                                <div className="wodTimerClock">
                                  {timeUp
                                    ? paceZh
                                      ? "时间到！"
                                      : "TIME!"
                                    : `${mm}:${String(ss).padStart(2, "0")}`}
                                </div>
                                {meta.groupMode === "EMOM" && !timeUp && (
                                  <div className="wodTimerMinute">
                                    {paceZh
                                      ? `第 ${minuteNow}/${meta.groupMinutes || "12"} 分钟`
                                      : `Minute ${minuteNow}/${meta.groupMinutes || "12"}`}
                                  </div>
                                )}
                                <div className="wodTimerActions">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!ownsTimer) {
                                        claimTimer();
                                        return;
                                      }
                                      setWodTimer((t: any) =>
                                        t.running
                                          ? {
                                              ...t,
                                              running: false,
                                              startedAt: 0,
                                              accumulatedMs:
                                                t.accumulatedMs +
                                                (Date.now() - t.startedAt),
                                            }
                                          : {
                                              ...t,
                                              running: true,
                                              startedAt: Date.now(),
                                              groupId: exercise.id,
                                            }
                                      );
                                    }}
                                  >
                                    {ownsTimer && wodTimer.running
                                      ? paceZh
                                        ? "暂停"
                                        : "Pause"
                                      : paceZh
                                        ? "开始"
                                        : "Start"}
                                  </button>
                                  <button type="button" onClick={resetWodState}>
                                    {paceZh ? "重置" : "Reset"}
                                  </button>
                                </div>
                                {meta.groupMode === "AMRAP" && (
                                  <div className="wodRoundsCounter">
                                    <span>{paceZh ? "完成轮数" : "Rounds done"}</span>
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!ownsTimer) return;
                                          setWodRounds((r: any) => Math.max(0, r - 1));
                                        }}
                                      >
                                        −
                                      </button>
                                      <strong>{groupRounds}</strong>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!ownsTimer) {
                                            claimTimer();
                                            setWodTimer((t: any) => ({
                                              ...t,
                                              running: false,
                                            }));
                                            setWodRounds(1);
                                            vibrate(16);
                                            return;
                                          }
                                          setWodRounds((r: any) => r + 1);
                                          vibrate(16);
                                        }}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        {showSectionHeader && (
                          <h4
                            className="workoutSectionHeading"
                            style={{
                              ["--sectionAccent" as string]:
                                sectionAccentColor(sectionName),
                            } as React.CSSProperties}
                          >
                            {sectionNameDisplay}
                          </h4>
                        )}

                        <div
                          className={`exercise-card workoutLogExerciseCard ${
                            meta.isAccessory ? "accessoryWorkoutLogExerciseCard" : ""
                          }${
                            isClientPortal &&
                            workoutFocusMode &&
                            focusGroupIndexes.length > 1
                              ? " workoutFocusGroupExercise"
                              : ""
                          }`}
                          style={{
                            ["--sectionAccent" as string]:
                              sectionAccentColor(sectionName),
                          } as React.CSSProperties}
                          id={`workout-exercise-${index}`}
                        >
                        {isClientPortal && workoutFocusMode && exerciseVideoUrl && (
                          <button
                            type="button"
                            className={`workoutExerciseMedia${
                              exerciseThumb ? "" : " workoutExerciseMediaEmpty"
                            }`}
                            onClick={() =>
                              setWorkoutVideoOverlay({
                                url: exerciseVideoUrl,
                                title: localizedExerciseName(exercise),
                              })
                            }
                            style={
                              exerciseThumb
                                ? ({
                                    "--mediaThumb": `url("${exerciseThumb}")`,
                                  } as React.CSSProperties)
                                : undefined
                            }
                            aria-label={`Open video for ${exercise.exerciseName}`}
                          >
                            <span className="workoutExerciseMediaPlay">
                              <Play size={28} fill="currentColor" aria-hidden="true" />
                            </span>
                            <span className="workoutExerciseMediaLabel">
                              {paceZh ? "播放视频" : "Watch video"}
                            </span>
                          </button>
                        )}
                        <div className="exerciseTitleRow workoutExerciseHeader">
                          <div className="workoutExerciseTitle">
                            <span
                              className={`exerciseLabelBadge ${
                                isWarmupSection(sectionName)
                                  ? "exerciseLabelBadgeWarmup"
                                  : getLabelColorClass(
                                      meta.exerciseLabel,
                                      sectionName
                                    )
                              }`}
                            >
                              {isWarmupSection(sectionName)
                                ? index + 1
                                : meta.exerciseLabel || makeExerciseLabel(index)}
                            </span>
                            <div>
                              <h3>{localizedExerciseName(exercise)}</h3>
                              {meta.isAccessory && (
                                <em className="exerciseAccessoryInline">
                                  {accessoryLabel}
                                </em>
                              )}
                            </div>
                          </div>

                          <div className="workoutExerciseActions workoutExerciseActionsMenu">
                            <button
                              className="iconActionButton workoutActionMenuTrigger"
                              type="button"
                              onClick={() =>
                                setOpenWorkoutActionMenuId((current: any) =>
                                  current === exercise.id ? "" : exercise.id
                                )
                              }
                              title={paceZh ? "More" : "More actions"}
                              aria-label={`Open actions for ${exercise.exerciseName}`}
                            >
                              <MoreVertical size={20} aria-hidden="true" />
                            </button>

                            {localizeText(exercise.videoUrl || "", exercise.videoUrlCn || "") && (
                              <button
                                className="iconActionButton"
                                type="button"
                                onClick={() =>
                                  setWorkoutVideoOverlay({
                                    url: localizeText(
                                      exercise.videoUrl || "",
                                      exercise.videoUrlCn || ""
                                    ),
                                    title: localizedExerciseName(exercise),
                                  })
                                }
                                title={t("video")}
                                aria-label={`Open video for ${exercise.exerciseName}`}
                              >
                                <Play size={18} fill="currentColor" aria-hidden="true" />
                              </button>
                            )}

                            {exercise.longVideoUrl && (
                              <button
                                className="iconActionButton"
                                type="button"
                                onClick={() =>
                                  setWorkoutVideoOverlay({
                                    url: exercise.longVideoUrl || "",
                                    title: localizedExerciseName(exercise),
                                  })
                                }
                                title={paceZh ? "详细讲解" : "In-depth video"}
                                aria-label={`Open in-depth video for ${exercise.exerciseName}`}
                              >
                                <Film size={18} aria-hidden="true" />
                              </button>
                            )}

                            <button
                              className="iconActionButton"
                              onClick={() =>
                                setTechnicalCueExercise({
                                  recordId: exercise.id,
                                  exerciseId: exercise.exerciseId,
                                  exerciseName: exercise.exerciseName,
                                  exerciseNameCn: exercise.exerciseNameCn,
                                  videoUrl: exercise.videoUrl || "",
                                  videoUrlCn: exercise.videoUrlCn,
                                  category: exercise.category || "",
                                  categoryCn: exercise.categoryCn,
                                  equipment: exercise.equipment || "",
                                  equipmentCn: exercise.equipmentCn,
                                  movementPattern: exercise.movementPattern || "",
                                  movementPatternCn: exercise.movementPatternCn,
                                  technicalInstructionsCn:
                                    exercise.technicalInstructionsCn,
                                  coachingCuesCn: exercise.coachingCuesCn,
                                  commonMistakesCn: exercise.commonMistakesCn,
                                  notes: exercise.cueNotes || "",
                                  notesCn: exercise.cueNotesCn,
                                  status: "Active",
                                })
                              }
                              type="button"
                              title={t("technicalForm")}
                              aria-label={`View technical form for ${exercise.exerciseName}`}
                            >
                              <ClipboardList size={18} aria-hidden="true" />
                            </button>

                            <button
                              className="iconActionButton"
                              onClick={() =>
                                setHistoryExerciseName(exercise.exerciseName)
                              }
                              type="button"
                              title={t("history")}
                              aria-label={`View history for ${exercise.exerciseName}`}
                            >
                              <Clock3 size={18} aria-hidden="true" />
                            </button>

                            {exercise.rest && (
                              <button
                                className="iconActionButton restTimerTrigger"
                                type="button"
                                title={t("rest")}
                                aria-label={`Start rest timer for ${exercise.exerciseName}`}
                                onClick={() =>
                                  startRestTimer(
                                    exercise.rest,
                                    localizedExerciseName(exercise)
                                  )
                                }
                              >
                                <Timer size={18} aria-hidden="true" />
                              </button>
                            )}

                            {openWorkoutActionMenuId === exercise.id && (
                              <div className="workoutActionMenu">
                                {(exercise.alternateExercises || []).length >
                                  0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenWorkoutActionMenuId("");
                                      setAlternatePickerExercise(exercise);
                                    }}
                                  >
                                    <Shuffle size={16} aria-hidden="true" />
                                    <span>
                                      {paceZh
                                        ? "替代动作"
                                        : "Alternate Exercises"}
                                    </span>
                                  </button>
                                )}

                                {exerciseVideoUrl && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenWorkoutActionMenuId("");
                                      setWorkoutVideoOverlay({
                                        url: exerciseVideoUrl,
                                        title: localizedExerciseName(exercise),
                                      });
                                    }}
                                  >
                                    <Play size={16} fill="currentColor" aria-hidden="true" />
                                    <span>{t("video")}</span>
                                  </button>
                                )}

                                {exercise.longVideoUrl && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenWorkoutActionMenuId("");
                                      setWorkoutVideoOverlay({
                                        url: exercise.longVideoUrl || "",
                                        title: localizedExerciseName(exercise),
                                      });
                                    }}
                                  >
                                    <Film size={16} aria-hidden="true" />
                                    <span>{paceZh ? "In-depth" : "In-depth video"}</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenWorkoutActionMenuId("");
                                    setTechnicalCueExercise({
                                      recordId: exercise.id,
                                      exerciseId: exercise.exerciseId,
                                      exerciseName: exercise.exerciseName,
                                      exerciseNameCn: exercise.exerciseNameCn,
                                      videoUrl: exercise.videoUrl || "",
                                      videoUrlCn: exercise.videoUrlCn,
                                      category: exercise.category || "",
                                      categoryCn: exercise.categoryCn,
                                      equipment: exercise.equipment || "",
                                      equipmentCn: exercise.equipmentCn,
                                      movementPattern: exercise.movementPattern || "",
                                      movementPatternCn: exercise.movementPatternCn,
                                      technicalInstructionsCn:
                                        exercise.technicalInstructionsCn,
                                      coachingCuesCn: exercise.coachingCuesCn,
                                      commonMistakesCn: exercise.commonMistakesCn,
                                      notes: exercise.cueNotes || "",
                                      notesCn: exercise.cueNotesCn,
                                      status: "Active",
                                    });
                                  }}
                                >
                                  <ClipboardList size={16} aria-hidden="true" />
                                  <span>{t("technicalForm")}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenWorkoutActionMenuId("");
                                    setHistoryExerciseName(exercise.exerciseName);
                                  }}
                                >
                                  <Clock3 size={16} aria-hidden="true" />
                                  <span>{t("history")}</span>
                                </button>

                                {exercise.rest && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenWorkoutActionMenuId("");
                                      startRestTimer(
                                        exercise.rest,
                                        localizedExerciseName(exercise)
                                      );
                                    }}
                                  >
                                    <Timer size={16} aria-hidden="true" />
                                    <span>{t("rest")}</span>
                                  </button>
                                )}

                                {isPremiumClient() && (
                                  <button
                                    type="button"
                                    disabled={formVideoBusy}
                                    onClick={() => {
                                      setOpenWorkoutActionMenuId("");
                                      setFormVideoExercise({
                                        exerciseId: exercise.exerciseId,
                                        exerciseName: exercise.exerciseName,
                                      });
                                      formVideoInputRef.current?.click();
                                    }}
                                  >
                                    <Film size={16} aria-hidden="true" />
                                    <span>
                                      {formVideoSentIds.includes(
                                        exercise.exerciseId
                                      )
                                        ? paceZh
                                          ? "已发送 ✓"
                                          : "Sent ✓"
                                        : paceZh
                                          ? "动作视频"
                                          : "Form check"}
                                    </span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {(() => {
                          const exTracking = parseExerciseNotes(
                            exercise.notes
                          ).trackingType;
                          const isCardioEx =
                            exTracking === "Time" || exTracking === "Distance";
                          return (
                            <div className="workoutPrescriptionGrid">
                              <span>
                                <strong>{t("sets")}</strong>
                                {exercise.sets || "--"}
                              </span>
                              <span>
                                <strong>
                                  {exTracking === "Time"
                                    ? t("time")
                                    : exTracking === "Distance"
                                      ? t("distance")
                                      : t("reps")}
                                </strong>
                                {exercise.reps || "--"}
                              </span>
                              {!isCardioEx && exercise.tempo && (
                                <span>
                                  <strong>{t("tempo")}</strong>
                                  {exercise.tempo}
                                </span>
                              )}
                              <span>
                                <strong>{t("rest")}</strong>
                                {exercise.rest
                                  ? localizeRestValue(exercise.rest)
                                  : "--"}
                              </span>
                            </div>
                          );
                        })()}

                        {coachingNotes && (
                          <p className="workoutCoachNotes">{coachingNotes}</p>
                        )}

                        <div className="setLogHeader">
                          <span>{t("set")}</span>
                          <span>{t("actualReps")}</span>
                          <span>{t("weight")}</span>
                          <span>{t("time")}</span>
                          <span>{t("distance")}</span>
                        </div>

                        <div className="exerciseLoggingArea">
                          <div className="exerciseSetRows">
                        {visibleExerciseLogs.map((log: any) => {
                          const globalIndex = setLogs.findIndex(
                            (item: any) =>
                              item.exerciseId === log.exerciseId &&
                              (item.occurrenceId || "") ===
                                (log.occurrenceId || "") &&
                              item.setNumber === log.setNumber &&
                              item.side === log.side
                          );
                          const showWeightInputs = log.trackingType === "Weight";
                          const showTimeInput = log.trackingType === "Time";
                          const showDistanceInput = log.trackingType === "Distance";
                          const showPaceInput = log.trackingType === "Pace";
                          const sideLabel =
                            log.side === "Right"
                              ? t("right")
                              : log.side === "Left"
                              ? t("left")
                              : log.side;
                          const setComplete = isSetComplete(log);
                          const setChecked = checkedWorkoutPageItems.includes(
                            workoutSetCheckKey(log)
                          );

                          return (
                            <div
                              className={`${
                                useMobileWorkoutRows
                                  ? "setLogRow mobileSetLogRow"
                                  : "desktopWorkoutSetRow"
                              }${setComplete ? " setLogRowComplete" : ""}`}
                              key={`${log.occurrenceId || log.exerciseId}-${log.setNumber}-${log.side || "both"}`}
                            >
                              <div
                                className={
                                  useMobileWorkoutRows
                                    ? "setBanner"
                                    : "desktopWorkoutSetLabel"
                                }
                              >
                                <strong>
                                  {useMobileWorkoutRows
                                    ? log.setNumber
                                    : t("setNo", { number: log.setNumber })}
                                  {sideLabel ? ` · ${sideLabel}` : ""}
                                </strong>
                                {setComplete && (
                                  <Check
                                    className="setCompleteCheck"
                                    size={16}
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                              {showWeightInputs && (() => {
                                // Bodyweight movement: coach programmed "BW" as
                                // the load → show BW, leave reps as an open field.
                                const isBW = /^(bw|body\s*weight|bodyweight)$/i.test(
                                  String(log.prescribedLoad || "").trim()
                                );
                                const target = isBW
                                  ? null
                                  : resolvePrescribedLoad(
                                      log.prescribedPercent,
                                      log.prescribedLoad,
                                      log.exerciseName.split(" - ")[0]
                                    );
                                const fields =
                                  log.trackingFields && log.trackingFields.length
                                    ? log.trackingFields
                                    : ["Weight", "Reps"];
                                const renderField = (f: string) => {
                                  if (f === "Weight") {
                                    return isBW ? (
                                      <div className="setLogStatic" key="w">
                                        <span>{t("weight")}</span>
                                        <strong>
                                          {i18n.language === "zh" ? "自重" : "BW"}
                                        </strong>
                                      </div>
                                    ) : (
                                      <label className="setLogField" key="w">
                                        <span>
                                          {t("weight")} ({weightUnit})
                                        </span>
                                        <input
                                          inputMode="decimal"
                                          value={log.actualWeight}
                                          placeholder={
                                            lastLoggedWeight(log) || weightUnit
                                          }
                                          onChange={(e) =>
                                            updateSetLog(
                                              globalIndex,
                                              "actualWeight",
                                              e.target.value
                                            )
                                          }
                                        />
                                      </label>
                                    );
                                  }
                                  if (f === "Reps") {
                                    return (
                                      <label className="setLogField" key="r">
                                        <span>{t("actualReps")}</span>
                                        <input
                                          inputMode="numeric"
                                          value={log.actualReps}
                                          onChange={(e) =>
                                            updateSetLog(
                                              globalIndex,
                                              "actualReps",
                                              e.target.value
                                            )
                                          }
                                        />
                                      </label>
                                    );
                                  }
                                  if (f === "RPE") {
                                    return (
                                      <label className="setLogField" key="rpe">
                                        <span>
                                          RPE
                                          {log.prescribedRpe
                                            ? ` (${log.prescribedRpe})`
                                            : ""}
                                        </span>
                                        <input
                                          inputMode="decimal"
                                          value={log.actualRpe}
                                          placeholder="1-10"
                                          onChange={(e) =>
                                            updateSetLog(
                                              globalIndex,
                                              "actualRpe",
                                              e.target.value
                                            )
                                          }
                                        />
                                      </label>
                                    );
                                  }
                                  if (f === "RIR") {
                                    return (
                                      <label className="setLogField" key="rir">
                                        <span>
                                          RIR
                                          {log.prescribedRir
                                            ? ` (${log.prescribedRir})`
                                            : ""}
                                        </span>
                                        <input
                                          inputMode="decimal"
                                          value={log.actualRir}
                                          placeholder="0-5"
                                          onChange={(e) =>
                                            updateSetLog(
                                              globalIndex,
                                              "actualRir",
                                              e.target.value
                                            )
                                          }
                                        />
                                      </label>
                                    );
                                  }
                                  return null;
                                };
                                return (
                                  <>
                                    {fields.includes("Weight") &&
                                      (isBW ? (
                                        <div className="setLogStatic setLogTarget setLogTargetResolved">
                                          <span>
                                            {i18n.language === "zh"
                                              ? "负荷"
                                              : "Load"}
                                          </span>
                                          <strong>
                                            {i18n.language === "zh" ? "自重" : "BW"}
                                          </strong>
                                        </div>
                                      ) : target && target.display ? (
                                        <div
                                          className={`setLogStatic setLogTarget${
                                            target.resolved
                                              ? " setLogTargetResolved"
                                              : ""
                                          }`}
                                        >
                                          <span>
                                            {i18n.language === "zh"
                                              ? "目标"
                                              : "Target"}
                                          </span>
                                          <strong>{target.display}</strong>
                                        </div>
                                      ) : null)}
                                    {fields.map(renderField)}
                                  </>
                                );
                              })()}

                              {/* Cardio targets, by prescription method. */}
                              {(showTimeInput || showDistanceInput || showPaceInput) &&
                                (() => {
                                  const zh = i18n.language === "zh";
                                  const mode = log.prescribedIntensityMode || "";
                                  const exName = log.exerciseName.split(" - ")[0];
                                  const isRun = /run|treadmill|track|jog/i.test(
                                    log.exerciseName
                                  );
                                  const isTread = /treadmill/i.test(log.exerciseName);
                                  const chips: { label: string; value: string }[] = [];

                                  // Pace-tracked sets carry the target pace directly.
                                  if (showPaceInput && log.prescribedReps) {
                                    chips.push({
                                      label: zh ? "目标配速" : "Target pace",
                                      value: log.prescribedReps,
                                    });
                                  }

                                  if (mode === "hr") {
                                    if (log.prescribedIntensityValue)
                                      chips.push({
                                        label: zh ? "目标心率" : "Target HR",
                                        value: `${log.prescribedIntensityValue} bpm`,
                                      });
                                  } else if (mode === "rpe") {
                                    if (log.prescribedIntensityValue)
                                      chips.push({
                                        label: zh ? "目标RPE" : "Target RPE",
                                        value: `${log.prescribedIntensityValue}/10`,
                                      });
                                  } else if (log.prescribedPercentMas) {
                                    if (isRun) {
                                      const pace = resolvePrescribedPace(
                                        log.prescribedPercentMas,
                                        exName
                                      );
                                      if (pace.display)
                                        chips.push({
                                          label: zh ? "目标配速" : "Target pace",
                                          value: pace.display,
                                        });
                                      if (
                                        isTread &&
                                        pace.resolved &&
                                        Number.isFinite(pace.speedKmh)
                                      )
                                        chips.push({
                                          label: zh ? "跑步机速度" : "Treadmill speed",
                                          value: `${pace.speedKmh.toFixed(1)} km/h`,
                                        });
                                    }
                                    const hr = resolvePrescribedHr(
                                      log.prescribedPercentMas
                                    );
                                    if (hr.display)
                                      chips.push({
                                        label: zh ? "目标心率" : "Target HR",
                                        value: hr.display,
                                      });
                                  }

                                  if (!chips.length) return null;
                                  return chips.map((chip, chipIndex) => (
                                    <div
                                      key={chipIndex}
                                      className="setLogStatic setLogTarget setLogTargetResolved"
                                    >
                                      <span>{chip.label}</span>
                                      <strong>{chip.value}</strong>
                                    </div>
                                  ));
                                })()}

                              {(showTimeInput ||
                                showDistanceInput ||
                                showPaceInput) && (
                                <>
                                  <label className="setLogField">
                                    <span>
                                      {i18n.language === "zh"
                                        ? "实际距离 (km)"
                                        : "Actual (km)"}
                                    </span>
                                    <input
                                      inputMode="decimal"
                                      value={
                                        log.actualDistance
                                          ? String(
                                              Number(log.actualDistance) / 1000
                                            )
                                          : ""
                                      }
                                      placeholder="km"
                                      onChange={(e) => {
                                        const km = e.target.value.replace(
                                          /[^\d.]/g,
                                          ""
                                        );
                                        updateSetLog(
                                          globalIndex,
                                          "actualDistance",
                                          km
                                            ? String(
                                                Math.round(parseFloat(km) * 1000)
                                              )
                                            : ""
                                        );
                                      }}
                                    />
                                  </label>
                                  {(() => {
                                    const totalSec = Number(log.actualTime) || 0;
                                    const mm = totalSec
                                      ? String(Math.floor(totalSec / 60))
                                      : "";
                                    const ss = totalSec
                                      ? String(totalSec % 60).padStart(2, "0")
                                      : "";
                                    const writeTime = (m: string, s: string) => {
                                      const sec =
                                        (Number(m) || 0) * 60 + (Number(s) || 0);
                                      updateSetLog(
                                        globalIndex,
                                        "actualTime",
                                        sec ? String(sec) : ""
                                      );
                                    };
                                    return (
                                      <label className="setLogField">
                                        <span>
                                          {i18n.language === "zh"
                                            ? "实际时间"
                                            : "Actual time"}
                                        </span>
                                        <div className="setLogTimeRow">
                                          <input
                                            inputMode="numeric"
                                            value={mm}
                                            placeholder="min"
                                            onChange={(e) =>
                                              writeTime(
                                                e.target.value.replace(/\D/g, ""),
                                                ss
                                              )
                                            }
                                          />
                                          <span>:</span>
                                          <input
                                            inputMode="numeric"
                                            value={ss}
                                            placeholder="sec"
                                            onChange={(e) =>
                                              writeTime(
                                                mm,
                                                e.target.value
                                                  .replace(/\D/g, "")
                                                  .slice(0, 2)
                                              )
                                            }
                                          />
                                        </div>
                                      </label>
                                    );
                                  })()}
                                </>
                              )}

                              {isClientPortal && !coachReviewMode && (
                                <button
                                  className={`setSaveCheckButton${
                                    setChecked ? " setSaveCheckButtonDone" : ""
                                  }`}
                                  onClick={() =>
                                    checkAndSaveWorkoutSet(log, visiblePageLogs)
                                  }
                                  type="button"
                                  aria-label={`Save set ${log.setNumber}`}
                                >
                                  <Check size={18} aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                          </div>
                        </div>
                        </div>
                      </div>
                    );
                  })}

                {isClientPortal && workoutLoggingStarted && (
                  <button
                    type="button"
                    className="workoutFocusToggle"
                    onClick={() => setWorkoutFocusMode((v: any) => !v)}
                  >
                    {workoutFocusMode
                      ? paceZh
                        ? "查看全部动作"
                        : "View all exercises"
                      : paceZh
                      ? "单个动作模式"
                      : "Focus mode"}
                  </button>
                )}

                {coachReviewMode
                  ? selectedWorkout?.clientNotes && (
                      <div className="workoutReviewComment">
                        <span>{paceZh ? "运动员备注" : "Athlete comment"}</span>
                        <p>{selectedWorkout.clientNotes}</p>
                      </div>
                    )
                  : (!isClientPortal ||
                      (workoutLoggingStarted &&
                        (!workoutFocusMode ||
                          workoutFocusIndex >= workoutDetails.length - 1))) && (
                      <label className="workoutSubmissionNoteField">
                        <span>{t("workoutComment")}</span>
                        <textarea
                          value={workoutSubmissionNote}
                          onChange={(event) =>
                            setWorkoutSubmissionNote(event.target.value)
                          }
                          placeholder={t("workoutCommentPlaceholder")}
                        />
                      </label>
                    )}

                {coachReviewMode ? (
                  <label className="coachReviewedToggle">
                    <input
                      type="checkbox"
                      checked={!!selectedWorkout?.coachReviewed}
                      onChange={(e) => void toggleWorkoutReviewed(e.target.checked)}
                    />
                    <span>{paceZh ? "已审阅" : "Coach reviewed"}</span>
                  </label>
                ) : (
                  (!isClientPortal ||
                    (workoutLoggingStarted && !workoutFocusMode)) && (
                    <button
                      className="goldButton saveWorkoutButton"
                      onClick={isClientPortal ? openWorkoutFinish : saveWorkout}
                      disabled={savingWorkout}
                    >
                      {savingWorkout
                        ? t("submitting")
                        : isClientPortal
                        ? paceZh
                          ? "完成训练"
                          : "Finish Workout"
                        : t("submitWorkout")}
                    </button>
                  )
                )}

                {isClientPortal &&
                  workoutLoggingStarted &&
                  workoutFocusMode &&
                  workoutDetails.length > 0 &&
                  (() => {
                    const focusBounds = getWorkoutGroupBounds(workoutFocusIndex);
                    const isGroupedFocus = focusBounds.indexes.length > 1;
                    const roundCount = getWorkoutGroupRoundCount(focusBounds.indexes);
                    const isLastExercise =
                      focusBounds.end >= workoutDetails.length - 1;
                    const isLastRound =
                      !isGroupedFocus || workoutFocusSetRound >= roundCount;
                    const isLast = isLastExercise && isLastRound;
                    const previousIndex = Math.max(0, focusBounds.start - 1);
                    const nextIndex = Math.min(
                      workoutDetails.length - 1,
                      focusBounds.end + 1
                    );
                    const focusEx = workoutDetails[workoutFocusIndex];
                    const navIsCircuit =
                      isGroupedFocus &&
                      focusEx &&
                      parseExerciseNotes(focusEx.notes).groupType === "Circuit";
                    const focusIds = new Set(
                      focusBounds.indexes
                        .map((index: any) => workoutDetails[index]?.exerciseId)
                        .filter(Boolean)
                    );
                    const roundLogs = isGroupedFocus
                      ? setLogs.filter(
                          (log: any) =>
                            focusIds.has(log.exerciseId) &&
                            Number(log.setNumber) === workoutFocusSetRound
                        )
                      : [];
                    const focusLogged = isGroupedFocus
                      ? roundLogs.length > 0 && roundLogs.every(isSetComplete)
                      : focusEx
                      ? isExerciseFullyLogged(focusEx.exerciseId)
                      : false;
                    const scrollPlayerTop = () => {
                      window.setTimeout(() => {
                        document
                          .querySelector<HTMLElement>(
                            ".clientWorkoutPlayerModal > .modal-body"
                          )
                          ?.scrollTo({ top: 0, behavior: "smooth" });
                      }, 0);
                    };
                    return (
                      <div className="workoutFocusNav">
                        <button
                          type="button"
                          className="workoutFocusNavBtn"
                          disabled={
                            focusBounds.start === 0 && workoutFocusSetRound === 1
                          }
                          onClick={() => {
                            if (isGroupedFocus && workoutFocusSetRound > 1) {
                              setWorkoutFocusSetRound((round: any) =>
                                Math.max(1, round - 1)
                              );
                              scrollPlayerTop();
                              return;
                            }
                            goToFocusExercise(previousIndex, workoutDetails.length);
                          }}
                        >
                          <ChevronLeft size={18} />
                          {paceZh ? "上一个" : "Prev"}
                        </button>
                        <div
                          className="workoutFocusDots"
                          role="tablist"
                          aria-label={paceZh ? "动作进度" : "Exercise progress"}
                        >
                          {workoutDetails.map((ex: any, i: any) => (
                            <button
                              key={ex.id}
                              type="button"
                              className={`workoutFocusDot${
                                i === workoutFocusIndex
                                  ? " workoutFocusDotActive"
                                  : ""
                              }${
                                isExerciseFullyLogged(ex.exerciseId)
                                  ? " workoutFocusDotDone"
                                  : ""
                              }`}
                              onClick={() =>
                                goToFocusExercise(i, workoutDetails.length)
                              }
                              aria-label={`${
                                paceZh ? "动作" : "Exercise"
                              } ${i + 1}`}
                              aria-selected={i === workoutFocusIndex}
                            />
                          ))}
                        </div>
                        {!isLast ? (
                          <button
                            type="button"
                            className={`workoutFocusNavBtn workoutFocusNavBtnPrimary${
                              focusLogged ? " workoutFocusNavBtnReady" : ""
                            }`}
                            onClick={() => {
                              if (isGroupedFocus && workoutFocusSetRound < roundCount) {
                                setWorkoutFocusSetRound((round: any) =>
                                  Math.min(roundCount, round + 1)
                                );
                                scrollPlayerTop();
                                return;
                              }
                              goToFocusExercise(nextIndex, workoutDetails.length);
                            }}
                          >
                            {isGroupedFocus && workoutFocusSetRound < roundCount
                              ? navIsCircuit
                                ? paceZh
                                  ? "下一轮"
                                  : "Next round"
                                : paceZh
                                  ? "下一组"
                                  : "Next set"
                              : paceZh
                              ? "下一个动作"
                              : "Next exercise"}
                            <ChevronRight size={18} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`workoutFocusNavBtn workoutFocusNavBtnPrimary workoutFocusFinishBtn${
                              focusLogged ? " workoutFocusNavBtnReady" : ""
                            }`}
                            onClick={openWorkoutFinish}
                            disabled={savingWorkout}
                          >
                            {paceZh ? "完成训练" : "Finish Workout"}
                            <Check size={18} />
                          </button>
                        )}
                      </div>
                    );
                  })()}
              </div>
            </div>
          </div>
    </>
  );
}
