// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import PortalHome from "./PortalHome";
import "./ClientWorkspace.css";
import PortalTraining from "./PortalTraining";
import PortalPrograms from "./PortalPrograms";
import ClientOverview from "./ClientOverview";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Home,
  MoreVertical,
  UserCircle,
} from "lucide-react";
import { normalizeDate } from "./appCore";
import CountUp from "./CountUp";
import PortalToApp from "./PortalToApp";

export default function ClientWorkspace({
  t,
  assignLoading,
  assignProgramToClient,
  assignStartDate,
  assignableWorkouts,
  assigningProgram,
  assignmentClientId,
  assignmentDueDate,
  assignmentTemplateId,
  assignmentTemplateOptions,
  assignmentType,
  buildClientPortalLink,
  calendarAnchorDate,
  calendarAssignmentDateInputRef,
  calendarDates,
  clientCanReschedule,
  replanOpen,
  setReplanOpen,
  replanEdits,
  setReplanEdits,
  replanSaving,
  replanRemaining,
  saveReplan,
  calendarDropWorkoutId,
  calendarRangeLabel,
  calendarView,
  clearCalendarLongPress,
  clientCalendarStyle,
  clientCalendarTouchDrag,
  clientComments,
  clientHeroKpis,
  dragPreviewDate,
  clientMonthAnchorDate,
  clientMonthCalendarDates,
  clientPortalUpcomingTasks,
  clientPortalUpcomingWorkouts,
  clientProgramScheduleMode,
  clientProgramScheduledWorkouts,
  clientProgramSessions,
  clientProgramStartDate,
  clientProgramWeekNumbers,
  clientProgramWeekStarts,
  clientTab,
  clientWeekRangeLabel,
  clientWeekStripDates,
  coachDashTab,
  coachInboxItems,
  coachMonthCalendarDates,
  coachNotesDraft,
  completedTaskCount,
  completionRate,
  consumeCalendarLongPressClick,
  contentAssignments,
  contentResponsesLoading,
  copiedCalendarItem,
  copyToClipboard,
  createContentAssignment,
  creatingAssignment,
  deleteClient,
  deleteContentAssignment,
  draggingAssignmentId,
  draggingWorkoutId,
  editingMetrics,
  endClientCalendarWorkoutTouch,
  formatPace,
  getAssignmentDisplayName,
  getAssignmentsForDate,
  getCalendarItemCountForDate,
  getCoachDisplayName,
  getMasKmh,
  getTaskActionLabel,
  getTaskTone,
  getWorkoutsForDate,
  handleClientCalendarWorkoutDrop,
  handleHomeTouchEnd,
  handleHomeTouchStart,
  handleOpenContentAssignment,
  hrMaxMetric,
  i18n,
  inboxSeenAt,
  isClientPortal,
  isWorkloadMonitored,
  jumpClientCalendarToToday,
  latestMasMetric,
  loadClientProgramSessions,
  loadContentResponses,
  loadProgramSessionsForAssignment,
  loadingClientProgramSessions,
  localizeAssignmentKind,
  localizeTaskStatus,
  localizedAssignableWorkoutName,
  localizedCalendarLabel,
  localizedMonthTitle,
  localizedProductType,
  localizedProgramName,
  localizedWeekStripLabel,
  localizedWorkoutName,
  markInboxSeen,
  metricsDraft,
  moveCalendarRange,
  moveClientCalendarWorkoutTouch,
  moveClientMonth,
  moveContentAssignmentToDate,
  moveWorkoutToDate,
  movingAssignmentId,
  movingWorkoutId,
  needsAttentionItems,
  openAssignmentHubFromCalendar,
  openCalendarActionMenu,
  openEditClientForm,
  openMetricsEditor,
  openWorkout,
  overviewDetailsOpen,
  paceZh,
  parseBpm,
  parseOverride,
  pasteCalendarItemToDate,
  populateClientProgramCalendar,
  populatingClientProgram,
  portalHomeTab,
  programs,
  programsTab,
  recentWorkoutSubmissions,
  renderDailyCheckIn,
  renderExerciseHistoryBody,
  renderLoadDashboard,
  renderPerformanceMetrics,
  renderPersonalRecords,
  renderPrLeaderboard,
  renderProgramHome,
  renderProgramStore,
  renderTrophyCase,
  renderWellnessTrends,
  renderWorkloadTab,
  restingHrMetric,
  saveCoachNotes,
  saveMetricsOverrides,
  savingCoachNotes,
  savingMetrics,
  selectClientCalendarDate,
  selectedAssignProgramId,
  selectedCalendarDateAssignments,
  selectedCalendarDateItemCount,
  selectedCalendarDateWorkouts,
  selectedClient,
  selectedClientLatestOrder,
  selectedClientProgram,
  selectedClientProgramAlreadyLoaded,
  selectedClientProgramCalendarWorkouts,
  selectedClientProgramFirstDate,
  selectedClientProgramId,
  selectedClientProgramLastDate,
  setAssignStartDate,
  setAssignableWorkouts,
  setAssignmentClientId,
  setAssignmentDueDate,
  setAssignmentTemplateId,
  setAssignmentType,
  setCalAddMenu,
  setCalendarAnchorDate,
  setCalendarDropWorkoutId,
  setCalendarView,
  setClientCalendarStyle,
  setClientProgramDayDates,
  setClientProgramScheduleMode,
  setClientProgramSessions,
  setClientProgramStartDate,
  setClientProgramWeekStarts,
  setClientTab,
  setCoachDashTab,
  setCoachNotesDraft,
  setDraggingAssignmentId,
  setDraggingWorkoutId,
  setEditingMetrics,
  setMetricsDraft,
  setOverviewDetailsOpen,
  setPortalHomeTab,
  setProgramsTab,
  setSavedExerciseDraftIds,
  setSelectedAssignProgramId,
  setSelectedClient,
  setSelectedClientProgramId,
  setSelectedWorkout,
  setSetLogs,
  setShowCalendarActionMenu,
  setWeightUnitPref,
  setWorkoutDetails,
  shiftAssignableWorkoutsToStartDate,
  showCalendarActionMenu,
  startCalendarLongPress,
  startClientCalendarWorkoutTouch,
  suppressClientCalendarTouchClick,
  toReviewWorkouts,
  todayValue,
  totalTaskCount,
  uniqueClientPurchasedPrograms,
  clientProgramStatuses,
  clientProgramDashboard,
  rescheduleClientWorkout,
  restartClientProgram,
  updateAssignableWorkoutDate,
  updateClientLanguagePreference,
  updateClientPackage,
  updatingClientStatus,
  useChineseClientText,
  weightUnit,
  workouts,
  workoutsLoading,
}: { [key: string]: any }) {
  const portalCompletedWorkouts = isClientPortal
    ? (workouts || []).filter((workout: any) =>
        /complete/i.test(String(workout.completionStatus || ""))
      )
    : [];
  const portalInbox = isClientPortal ? coachInboxItems() : [];
  const portalUnreadCount = portalInbox.filter(
    (item: any) => item.at > inboxSeenAt
  ).length;
  const portalProgramStates = Object.values(
    clientProgramStatuses || {}
  ) as any[];
  const portalActivePrograms = portalProgramStates.filter(
    (status: any) => status?.status === "in-progress"
  ).length;
  const portalCompletedPrograms = portalProgramStates.filter(
    (status: any) => status?.status === "completed"
  ).length;
  const portalFirstName =
    (selectedClient?.name || "there").split(" ")[0] || "there";
  const portalNextWorkout = clientPortalUpcomingWorkouts?.[0];
  const safeCompletionRate = Number.isFinite(Number(completionRate))
    ? Math.round(Number(completionRate))
    : 0;

  const portalHero = (() => {
    if (clientTab === "Training") {
      return {
        eyebrow: t("clientHeroCalendarEyebrow"),
        title: t("trainingCalendar"),
        description: t("clientHeroCalendarSub"),
        stats: [
          {
            label: t("upcoming"),
            value: clientPortalUpcomingWorkouts?.length || 0,
            sub: t("scheduledSessions"),
          },
          {
            label: t("completed"),
            value: portalCompletedWorkouts.length,
            sub: t("completedSessions"),
          },
          {
            label: t("nextWorkout"),
            value: portalNextWorkout
              ? localizedCalendarLabel(
                  normalizeDate(String(portalNextWorkout.scheduledDate || ""))
                )
              : "--",
            sub: portalNextWorkout
              ? localizedWorkoutName(portalNextWorkout)
              : t("noUpcomingWorkouts"),
          },
        ],
        action: portalNextWorkout
          ? {
              label: t("start"),
              onClick: () => openWorkout(portalNextWorkout),
            }
          : null,
      };
    }

    if (clientTab === "Programs") {
      return {
        eyebrow: t("clientHeroProgramsEyebrow"),
        title: t("myPrograms"),
        description: t("clientHeroProgramsSub"),
        stats: [
          {
            label: t("clientHeroTotalPrograms"),
            value: uniqueClientPurchasedPrograms?.length || 0,
            sub: t("purchasedPrograms"),
          },
          {
            label: t("clientHeroActive"),
            value: portalActivePrograms,
            sub: t("clientHeroProgramsEyebrow"),
          },
          {
            label: t("completed"),
            value: portalCompletedPrograms,
            sub: t("completedSessions"),
          },
        ],
        action: null,
      };
    }

    if (clientTab === "Overview") {
      return {
        eyebrow: t("clientHeroProfileEyebrow"),
        title: t("profile"),
        description: t("clientHeroProfileSub"),
        stats: [
          {
            label: t("coach"),
            value: getCoachDisplayName(
              selectedClient?.coach || selectedClient?.primaryCoach || "--"
            ),
            sub: selectedClient?.clientType || "--",
          },
          {
            label: t("clientHeroPlan"),
            value:
              selectedClient?.package ||
              selectedClient?.program ||
              selectedClient?.status ||
              "--",
            sub: selectedClient?.status || "--",
          },
          {
            label: t("clientHeroAccess"),
            value: selectedClient?.accessEndDate || "--",
            sub: selectedClient?.email || "--",
          },
        ],
        action: null,
      };
    }

    return {
      eyebrow: t("clientHeroDashboardEyebrow"),
      title: t("hi", { name: portalFirstName }),
      description: t("clientHeroDashboardSub"),
      stats: [
        {
          label: t("upcomingTasks"),
          value: clientPortalUpcomingTasks?.length || 0,
          sub: t("clientHeroAssignedTasks", { count: totalTaskCount || 0 }),
        },
        {
          label: t("clientHeroCompletion"),
          value: `${safeCompletionRate}%`,
          sub: `${completedTaskCount || 0}/${totalTaskCount || 0}`,
        },
        {
          label: t("clientHeroMessages"),
          value: portalUnreadCount,
          sub: portalUnreadCount ? t("clientHeroMessages") : t("done"),
        },
      ],
      action: {
        label: t("calendar"),
        onClick: () => setClientTab("Training"),
      },
    };
  })();

  return (
    <>
          <div
            className={
              clientTab === "Training" ? "clientPage trainingFocus" : "clientPage"
            }
          >

            <section className="clientWorkspace">
              {!isClientPortal && (
              <button
                className="outlineButton"
                onClick={() => {
                  setSelectedClient(null);
                  setSelectedWorkout(null);
                  setWorkoutDetails([]);
                  setSetLogs([]);
                  setSavedExerciseDraftIds([]);
                }}
              >
                ← Back
              </button>

              )}

              {/* Portalled to the .app root: .clientPage carries a finished
                  entrance transform (identity matrix, held by fill-mode), which
                  makes it the containing block for position:fixed children — the
                  nav detached from the viewport and floated mid-page after the
                  first tab switch (named mistake #34). */}
              <PortalToApp>
                <nav className="mobileClientBottomNav" aria-label="Client navigation">
                  <button
                    className={clientTab === "Home" ? "active" : ""}
                    onClick={() => setClientTab("Home")}
                  >
                    <Home size={21} strokeWidth={2.2} />
                    <span>{t("home")}</span>
                    {isClientPortal &&
                      coachInboxItems().some((i: any) => i.at > inboxSeenAt) && (
                        <em className="navUnreadDot" aria-label="New coach messages" />
                      )}
                  </button>
                  <button
                    className={clientTab === "Training" ? "active" : ""}
                    onClick={() => setClientTab("Training")}
                  >
                    <CalendarDays size={21} strokeWidth={2.2} />
                    <span>{t("calendar")}</span>
                  </button>
                  <button
                    className={clientTab === "Programs" ? "active" : ""}
                    onClick={() => setClientTab("Programs")}
                  >
                    <BookOpen size={21} strokeWidth={2.2} />
                    <span>{t("myPrograms")}</span>
                  </button>
                  <button
                    className={clientTab === "Overview" ? "active" : ""}
                    onClick={() => setClientTab("Overview")}
                  >
                    <UserCircle size={21} strokeWidth={2.2} />
                    <span>{t("profile")}</span>
                  </button>
                </nav>
              </PortalToApp>

              {isClientPortal &&
                (() => {
                  // Access-expiry banner: appears in the last 14 days of a
                  // digital program's access window (and after it ends).
                  const end = normalizeDate(selectedClient.accessEndDate || "");
                  if (!end || end === "--") return null;
                  const endTime = new Date(`${end}T23:59:59`).getTime();
                  if (Number.isNaN(endTime)) return null;
                  const daysLeft = Math.ceil((endTime - Date.now()) / 86400000);
                  if (daysLeft > 14) return null;
                  const expired = daysLeft <= 0;
                  return (
                    <div
                      className={`portalAccessBanner${expired ? " expired" : ""}`}
                    >
                      <span>
                        {expired
                          ? paceZh
                            ? "你的计划访问已到期。"
                            : "Your program access has ended."
                          : paceZh
                            ? `计划访问还剩 ${daysLeft} 天。`
                            : `${daysLeft} day${daysLeft === 1 ? "" : "s"} of program access left.`}
                      </span>
                      <a href="/store">
                        {paceZh ? "续订 / 浏览计划" : "Renew / browse programs"}
                      </a>
                    </div>
                  );
                })()}
              {isClientPortal && (
                <>
                  <header
                    className={`clientPortalDesktopHero clientPortalDesktopHero${clientTab}`}
                  >
                    <div className="clientPortalDesktopHeroGlow" aria-hidden="true" />
                    <div className="clientPortalDesktopHeroTop">
                      <div className="clientPortalDesktopHeroCopy">
                        <span className="clientPortalDesktopHeroEyebrow">
                          {portalHero.eyebrow}
                        </span>
                        <h1>{portalHero.title}</h1>
                        <p>{portalHero.description}</p>
                      </div>
                      <div className="clientPortalDesktopHeroAside">
                        <div
                          className="clientPortalDesktopHeroAvatar"
                          aria-hidden="true"
                        >
                          {selectedClient.initials}
                        </div>
                        {portalHero.action && (
                          <button
                            type="button"
                            className="clientPortalDesktopHeroAction"
                            onClick={portalHero.action.onClick}
                          >
                            {portalHero.action.label}
                            <ArrowRight size={18} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="clientPortalDesktopHeroStats">
                      {portalHero.stats.map((stat: any) => (
                        <div className="clientPortalDesktopHeroStat" key={stat.label}>
                          <span>{stat.label}</span>
                          <strong>{stat.value}</strong>
                          <small>{stat.sub}</small>
                        </div>
                      ))}
                    </div>
                  </header>

                  <nav
                    className="clientDesktopNav"
                    aria-label={t("clientHeroDashboardEyebrow")}
                  >
                    <button
                      type="button"
                      className={clientTab === "Home" ? "active" : ""}
                      onClick={() => setClientTab("Home")}
                    >
                      <Home size={19} strokeWidth={2.2} />
                      <span>{t("home")}</span>
                      {portalUnreadCount > 0 && <em>{portalUnreadCount}</em>}
                    </button>
                    <button
                      type="button"
                      className={clientTab === "Training" ? "active" : ""}
                      onClick={() => setClientTab("Training")}
                    >
                      <CalendarDays size={19} strokeWidth={2.2} />
                      <span>{t("calendar")}</span>
                    </button>
                    <button
                      type="button"
                      className={clientTab === "Programs" ? "active" : ""}
                      onClick={() => setClientTab("Programs")}
                    >
                      <BookOpen size={19} strokeWidth={2.2} />
                      <span>{t("myPrograms")}</span>
                    </button>
                    <button
                      type="button"
                      className={clientTab === "Overview" ? "active" : ""}
                      onClick={() => setClientTab("Overview")}
                    >
                      <UserCircle size={19} strokeWidth={2.2} />
                      <span>{t("profile")}</span>
                    </button>
                  </nav>
                </>
              )}
              {isClientPortal ? (
                clientTab === "Home" &&
                (() => {
                  const first =
                    (selectedClient.name || "there").split(" ")[0] || "there";
                  const dateLabel = new Date(
                    `${todayValue}T00:00:00`
                  ).toLocaleDateString(
                    useChineseClientText ? "zh-CN" : "en-US",
                    { weekday: "long", month: "long", day: "numeric" }
                  );
                  return (
                    <header className="clientHomeGreeting">
                      <div>
                        <span className="clientGreetingDate">{dateLabel}</span>
                        <h1 className="clientGreetingName">
                          {t("hi", { name: first })}
                        </h1>
                      </div>
                      <div className="clientGreetingAvatar" aria-hidden="true">
                        {selectedClient.initials}
                      </div>
                    </header>
                  );
                })()
              ) : (
                <>
                  <div className="cdHeaderIntro">
                    <span className="cdEyebrow">
                      <UserCircle size={14} aria-hidden="true" /> Client Dashboard
                    </span>
                    <p className="cdIntro">
                      Training-load monitoring, wellness trends and session
                      activity for this athlete — at a glance.
                    </p>
                  </div>
                  <header className="cdHero">
                    <div className="cdHeroGlow" aria-hidden="true" />
                    <div className="cdHeroTop">
                      <div className="cdHeroAvatar">{selectedClient.initials}</div>
                      <div className="cdHeroIdentity">
                        <h1 className="cdHeroName">{selectedClient.name}</h1>
                        <p className="cdHeroCoach">
                          {getCoachDisplayName(
                            selectedClient.coach ||
                              selectedClient.primaryCoach ||
                              "Coach view"
                          )}
                        </p>
                        <div className="cdHeroPills">
                          <span className="cdHeroPill">
                            {selectedClient.clientType || "Client"}
                          </span>
                        </div>
                      </div>
                      <div className="clientProfileActions">
                        <details className="clientActionMenu">
                          <summary
                            className="iconActionButton cdHeroActionButton"
                            aria-label="Client actions"
                          >
                            <MoreVertical size={18} aria-hidden="true" />
                          </summary>
                          <div className="clientActionDropdown">
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  buildClientPortalLink(selectedClient),
                                  "Client portal link"
                                )
                              }
                            >
                              Copy portal link
                            </button>
                            <button
                              onClick={() => openEditClientForm(selectedClient)}
                            >
                              Edit / assign coach
                            </button>
                            <button
                              onClick={() =>
                                updateClientPackage(selectedClient, "Archived")
                              }
                              disabled={updatingClientStatus}
                            >
                              Archive client
                            </button>
                            <button
                              className="dangerMenuItem"
                              onClick={() => deleteClient(selectedClient)}
                            >
                              Delete client
                            </button>
                          </div>
                        </details>
                      </div>
                    </div>
                    {Array.isArray(clientHeroKpis) && clientHeroKpis.length > 0 && (
                      <div className="cdHeroKpis">
                        {clientHeroKpis.map((k: any) => (
                          <div className="cdHeroKpi" key={k.label}>
                            <span className="cdHeroKpiLabel">{k.label}</span>
                            <strong className="cdHeroKpiValue">
                              <CountUp value={k.value} />
                              {k.unit ? (
                                <em className="cdHeroKpiUnit">{k.unit}</em>
                              ) : null}
                            </strong>
                            <span className="cdHeroKpiSub">{k.sub}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </header>
                </>
              )}

              <div
                className={
                  isClientPortal
                    ? "clientTabs portalHidden"
                    : "clientTabs"
                }
              >
                <button
                  className={clientTab === "Home" ? "tab activeTab" : "tab"}
                  onClick={() => setClientTab("Home")}
                >
                  {t("dashboard")}
                </button>

                <button
                  className={clientTab === "Training" ? "tab activeTab" : "tab"}
                  onClick={() => setClientTab("Training")}
                >
                  {t("calendar")}
                </button>

                <button
                  className={clientTab === "Overview" ? "tab activeTab" : "tab"}
                  onClick={() => setClientTab("Overview")}
                >
                  {t("clientOverview")}
                </button>
              </div>

              {clientTab === "Home" && (
                <PortalHome
                  t={t}
                  getTaskTone={getTaskTone}
                  clientComments={clientComments}
                  clientPortalUpcomingTasks={clientPortalUpcomingTasks}
                  coachDashTab={coachDashTab}
                  coachInboxItems={coachInboxItems}
                  completedTaskCount={completedTaskCount}
                  completionRate={completionRate}
                  contentResponsesLoading={contentResponsesLoading}
                  getTaskActionLabel={getTaskActionLabel}
                  handleHomeTouchEnd={handleHomeTouchEnd}
                  handleHomeTouchStart={handleHomeTouchStart}
                  inboxSeenAt={inboxSeenAt}
                  isClientPortal={isClientPortal}
                  isWorkloadMonitored={isWorkloadMonitored}
                  loadContentResponses={loadContentResponses}
                  localizeAssignmentKind={localizeAssignmentKind}
                  localizeTaskStatus={localizeTaskStatus}
                  localizedCalendarLabel={localizedCalendarLabel}
                  localizedWorkoutName={localizedWorkoutName}
                  markInboxSeen={markInboxSeen}
                  needsAttentionItems={needsAttentionItems}
                  openWorkout={openWorkout}
                  paceZh={paceZh}
                  portalHomeTab={portalHomeTab}
                  recentWorkoutSubmissions={recentWorkoutSubmissions}
                  renderDailyCheckIn={renderDailyCheckIn}
                  renderExerciseHistoryBody={renderExerciseHistoryBody}
                  renderLoadDashboard={renderLoadDashboard}
                  renderPerformanceMetrics={renderPerformanceMetrics}
                  renderPrLeaderboard={renderPrLeaderboard}
                  renderTrophyCase={renderTrophyCase}
                  renderWellnessTrends={renderWellnessTrends}
                  renderWorkloadTab={renderWorkloadTab}
                  selectedClient={selectedClient}
                  setClientTab={setClientTab}
                  setCoachDashTab={setCoachDashTab}
                  setPortalHomeTab={setPortalHomeTab}
                  toReviewWorkouts={toReviewWorkouts}
                  todayValue={todayValue}
                  totalTaskCount={totalTaskCount}
                  workoutsLoading={workoutsLoading}
                />
              )}

              {clientTab === "Overview" && (
                <ClientOverview
                  t={t}
                  coachNotesDraft={coachNotesDraft}
                  editingMetrics={editingMetrics}
                  formatPace={formatPace}
                  getCoachDisplayName={getCoachDisplayName}
                  getMasKmh={getMasKmh}
                  hrMaxMetric={hrMaxMetric}
                  i18n={i18n}
                  isClientPortal={isClientPortal}
                  latestMasMetric={latestMasMetric}
                  metricsDraft={metricsDraft}
                  openMetricsEditor={openMetricsEditor}
                  overviewDetailsOpen={overviewDetailsOpen}
                  paceZh={paceZh}
                  parseBpm={parseBpm}
                  parseOverride={parseOverride}
                  renderPerformanceMetrics={renderPerformanceMetrics}
                  renderPersonalRecords={renderPersonalRecords}
                  restingHrMetric={restingHrMetric}
                  saveCoachNotes={saveCoachNotes}
                  saveMetricsOverrides={saveMetricsOverrides}
                  savingCoachNotes={savingCoachNotes}
                  savingMetrics={savingMetrics}
                  selectedClient={selectedClient}
                  selectedClientLatestOrder={selectedClientLatestOrder}
                  setCoachNotesDraft={setCoachNotesDraft}
                  setEditingMetrics={setEditingMetrics}
                  setMetricsDraft={setMetricsDraft}
                  setOverviewDetailsOpen={setOverviewDetailsOpen}
                  setWeightUnitPref={setWeightUnitPref}
                  updateClientLanguagePreference={updateClientLanguagePreference}
                  weightUnit={weightUnit}
                />
              )}

              {clientTab === "Programs" && (
                <PortalPrograms
                  selectedClientProgramCalendarWorkouts={selectedClientProgramCalendarWorkouts}
                  t={t}
                  clientProgramScheduleMode={clientProgramScheduleMode}
                  clientProgramScheduledWorkouts={clientProgramScheduledWorkouts}
                  clientProgramSessions={clientProgramSessions}
                  clientProgramStartDate={clientProgramStartDate}
                  clientProgramWeekNumbers={clientProgramWeekNumbers}
                  clientProgramWeekStarts={clientProgramWeekStarts}
                  loadClientProgramSessions={loadClientProgramSessions}
                  loadingClientProgramSessions={loadingClientProgramSessions}
                  localizedAssignableWorkoutName={localizedAssignableWorkoutName}
                  localizedCalendarLabel={localizedCalendarLabel}
                  localizedProductType={localizedProductType}
                  localizedProgramName={localizedProgramName}
                  paceZh={paceZh}
                  populateClientProgramCalendar={populateClientProgramCalendar}
                  populatingClientProgram={populatingClientProgram}
                  programsTab={programsTab}
                  renderProgramHome={renderProgramHome}
                  renderProgramStore={renderProgramStore}
                  selectedClientProgram={selectedClientProgram}
                  selectedClientProgramAlreadyLoaded={selectedClientProgramAlreadyLoaded}
                  selectedClientProgramFirstDate={selectedClientProgramFirstDate}
                  selectedClientProgramId={selectedClientProgramId}
                  selectedClientProgramLastDate={selectedClientProgramLastDate}
                  setClientProgramDayDates={setClientProgramDayDates}
                  setClientProgramScheduleMode={setClientProgramScheduleMode}
                  setClientProgramSessions={setClientProgramSessions}
                  setClientProgramStartDate={setClientProgramStartDate}
                  setClientProgramWeekStarts={setClientProgramWeekStarts}
                  setClientTab={setClientTab}
                  setProgramsTab={setProgramsTab}
                  setSelectedClientProgramId={setSelectedClientProgramId}
                  uniqueClientPurchasedPrograms={uniqueClientPurchasedPrograms}
                  clientProgramStatuses={clientProgramStatuses}
                  clientProgramDashboard={clientProgramDashboard}
                  openWorkout={openWorkout}
                  rescheduleClientWorkout={rescheduleClientWorkout}
                  restartClientProgram={restartClientProgram}
                />
              )}

              {clientTab === "Training" && (
                <PortalTraining
                  calendarDropWorkoutId={calendarDropWorkoutId}
                  dragPreviewDate={dragPreviewDate}
                  t={t}
                  todayValue={todayValue}
                  assignLoading={assignLoading}
                  assignProgramToClient={assignProgramToClient}
                  assignStartDate={assignStartDate}
                  assignableWorkouts={assignableWorkouts}
                  assigningProgram={assigningProgram}
                  assignmentClientId={assignmentClientId}
                  assignmentDueDate={assignmentDueDate}
                  assignmentTemplateId={assignmentTemplateId}
                  assignmentTemplateOptions={assignmentTemplateOptions}
                  assignmentType={assignmentType}
                  calendarAnchorDate={calendarAnchorDate}
                  calendarAssignmentDateInputRef={calendarAssignmentDateInputRef}
                  calendarDates={calendarDates}
                  calendarRangeLabel={calendarRangeLabel}
                  calendarView={calendarView}
                  clearCalendarLongPress={clearCalendarLongPress}
                  clientCalendarStyle={clientCalendarStyle}
                  clientCalendarTouchDrag={clientCalendarTouchDrag}
                  clientMonthAnchorDate={clientMonthAnchorDate}
                  clientMonthCalendarDates={clientMonthCalendarDates}
                  clientPortalUpcomingWorkouts={clientPortalUpcomingWorkouts}
                  clientWeekRangeLabel={clientWeekRangeLabel}
                  clientWeekStripDates={clientWeekStripDates}
                  coachMonthCalendarDates={coachMonthCalendarDates}
                  consumeCalendarLongPressClick={consumeCalendarLongPressClick}
                  contentAssignments={contentAssignments}
                  copiedCalendarItem={copiedCalendarItem}
                  createContentAssignment={createContentAssignment}
                  creatingAssignment={creatingAssignment}
                  deleteContentAssignment={deleteContentAssignment}
                  draggingAssignmentId={draggingAssignmentId}
                  draggingWorkoutId={draggingWorkoutId}
                  endClientCalendarWorkoutTouch={endClientCalendarWorkoutTouch}
                  getAssignmentDisplayName={getAssignmentDisplayName}
                  getAssignmentsForDate={getAssignmentsForDate}
                  getCalendarItemCountForDate={getCalendarItemCountForDate}
                  getWorkoutsForDate={getWorkoutsForDate}
                  handleClientCalendarWorkoutDrop={handleClientCalendarWorkoutDrop}
                  handleOpenContentAssignment={handleOpenContentAssignment}
                  isClientPortal={isClientPortal}
                  jumpClientCalendarToToday={jumpClientCalendarToToday}
                  loadProgramSessionsForAssignment={loadProgramSessionsForAssignment}
                  localizeTaskStatus={localizeTaskStatus}
                  localizedCalendarLabel={localizedCalendarLabel}
                  localizedMonthTitle={localizedMonthTitle}
                  localizedWeekStripLabel={localizedWeekStripLabel}
                  localizedWorkoutName={localizedWorkoutName}
                  moveCalendarRange={moveCalendarRange}
                  moveClientCalendarWorkoutTouch={moveClientCalendarWorkoutTouch}
                  moveClientMonth={moveClientMonth}
                  moveContentAssignmentToDate={moveContentAssignmentToDate}
                  moveWorkoutToDate={moveWorkoutToDate}
                  clientCanReschedule={clientCanReschedule}
                  replanOpen={replanOpen}
                  setReplanOpen={setReplanOpen}
                  replanEdits={replanEdits}
                  setReplanEdits={setReplanEdits}
                  replanSaving={replanSaving}
                  replanRemaining={replanRemaining}
                  saveReplan={saveReplan}
                  movingAssignmentId={movingAssignmentId}
                  movingWorkoutId={movingWorkoutId}
                  openAssignmentHubFromCalendar={openAssignmentHubFromCalendar}
                  openCalendarActionMenu={openCalendarActionMenu}
                  openWorkout={openWorkout}
                  pasteCalendarItemToDate={pasteCalendarItemToDate}
                  programs={programs}
                  selectClientCalendarDate={selectClientCalendarDate}
                  selectedAssignProgramId={selectedAssignProgramId}
                  selectedCalendarDateAssignments={selectedCalendarDateAssignments}
                  selectedCalendarDateItemCount={selectedCalendarDateItemCount}
                  selectedCalendarDateWorkouts={selectedCalendarDateWorkouts}
                  selectedClient={selectedClient}
                  setAssignStartDate={setAssignStartDate}
                  setAssignableWorkouts={setAssignableWorkouts}
                  setAssignmentClientId={setAssignmentClientId}
                  setAssignmentDueDate={setAssignmentDueDate}
                  setAssignmentTemplateId={setAssignmentTemplateId}
                  setAssignmentType={setAssignmentType}
                  setCalAddMenu={setCalAddMenu}
                  setCalendarAnchorDate={setCalendarAnchorDate}
                  setCalendarDropWorkoutId={setCalendarDropWorkoutId}
                  setCalendarView={setCalendarView}
                  setClientCalendarStyle={setClientCalendarStyle}
                  setDraggingAssignmentId={setDraggingAssignmentId}
                  setDraggingWorkoutId={setDraggingWorkoutId}
                  setSelectedAssignProgramId={setSelectedAssignProgramId}
                  setShowCalendarActionMenu={setShowCalendarActionMenu}
                  shiftAssignableWorkoutsToStartDate={shiftAssignableWorkoutsToStartDate}
                  showCalendarActionMenu={showCalendarActionMenu}
                  startCalendarLongPress={startCalendarLongPress}
                  startClientCalendarWorkoutTouch={startClientCalendarWorkoutTouch}
                  suppressClientCalendarTouchClick={suppressClientCalendarTouchClick}
                  updateAssignableWorkoutDate={updateAssignableWorkoutDate}
                  useChineseClientText={useChineseClientText}
                  workouts={workouts}
                  workoutsLoading={workoutsLoading}
                />
              )}
            </section>
          </div>
    </>
  );
}
