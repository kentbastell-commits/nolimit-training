// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import PortalHome from "./PortalHome";
import PortalTraining from "./PortalTraining";
import PortalPrograms from "./PortalPrograms";
import ClientOverview from "./ClientOverview";
import { BookOpen, CalendarDays, Home, MoreVertical, UserCircle } from "lucide-react";
import { languagePreferenceToCode, normalizeDate } from "./appCore";

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
  athleteMetricsLoading,
  buildClientPortalLink,
  calendarAnchorDate,
  calendarAssignmentDateInputRef,
  calendarDates,
  calendarDropWorkoutId,
  calendarRangeLabel,
  calendarView,
  clearCalendarLongPress,
  clientCalendarStyle,
  clientCalendarTouchDrag,
  clientComments,
  clientMonthAnchorDate,
  clientMonthCalendarDates,
  clientPerformanceMetrics,
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
  hasKarvonenHr,
  hasMasForZones,
  hrMaxMetric,
  hrMaxValue,
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
  paceZones,
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
  restingHrValue,
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
  updateAssignableWorkoutDate,
  updateClientLanguagePreference,
  updateClientPackage,
  updatingClientStatus,
  useChineseClientText,
  weightUnit,
  workouts,
  workoutsLoading,
}: { [key: string]: any }) {
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
              <div className="clientTop">
                {isClientPortal ? (
                  <div className="clientPortalMonogram" aria-hidden="true">
                    <img src="/nl_monogram_clean.png" alt="" aria-hidden="true" />
                  </div>
                ) : (
                  <div className="clientAvatar largeAvatar">
                    {selectedClient.initials}
                  </div>
                )}
                <div>
                  <h1>
                    {isClientPortal
                      ? clientTab === "Home"
                        ? t("hi", {
                            name: selectedClient.name.split(" ")[0] || "there",
                          })
                        : clientTab === "Overview"
                        ? t("profile")
                        : clientTab === "Programs"
                        ? t("myPrograms")
                        : t("calendar")
                      : selectedClient.name}
                  </h1>
                  <p>
                    {isClientPortal
                      ? `${selectedClient.status} - ${selectedClient.program}`
                      : `${selectedClient.clientCode || "Client"} - ${
                          getCoachDisplayName(
                            selectedClient.coach || selectedClient.primaryCoach || "Coach view"
                          )
                        }`}
                  </p>
                  {!isClientPortal && (
                    <div className="clientLayerBadges">
                      <span>{selectedClient.clientType || "Client"}</span>
                      <span>
                        Intake: {selectedClient.intakeStatus || "Not Sent"}
                      </span>
                      <span>
                        Payment: {selectedClient.paymentStatus || "Unpaid"}
                      </span>
                    </div>
                  )}
                  <div
                    className="clientPortalLanguageSwitch"
                    aria-label={t("languagePreference")}
                  >
                    <button
                      type="button"
                      className={
                        languagePreferenceToCode(
                          selectedClient.languagePreference
                        ) === "en"
                          ? "active"
                          : ""
                      }
                      onClick={() => updateClientLanguagePreference("English")}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      className={
                        languagePreferenceToCode(
                          selectedClient.languagePreference
                        ) === "zh"
                          ? "active"
                          : ""
                      }
                      onClick={() => updateClientLanguagePreference("Mandarin")}
                    >
                      中文
                    </button>
                  </div>
                </div>
                {!isClientPortal && (
                <div className="clientProfileActions">
                  <details className="clientActionMenu">
                    <summary
                      className="iconActionButton profileIconButton"
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
                      <button onClick={() => openEditClientForm(selectedClient)}>
                        Edit / assign coach
                      </button>
                      <button
                        onClick={() => updateClientPackage(selectedClient, "Archived")}
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
                )}
              </div>

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
                  athleteMetricsLoading={athleteMetricsLoading}
                  clientComments={clientComments}
                  clientPerformanceMetrics={clientPerformanceMetrics}
                  clientPortalUpcomingTasks={clientPortalUpcomingTasks}
                  coachDashTab={coachDashTab}
                  coachInboxItems={coachInboxItems}
                  completedTaskCount={completedTaskCount}
                  completionRate={completionRate}
                  contentAssignments={contentAssignments}
                  contentResponsesLoading={contentResponsesLoading}
                  getTaskActionLabel={getTaskActionLabel}
                  handleHomeTouchEnd={handleHomeTouchEnd}
                  handleHomeTouchStart={handleHomeTouchStart}
                  handleOpenContentAssignment={handleOpenContentAssignment}
                  hasKarvonenHr={hasKarvonenHr}
                  hasMasForZones={hasMasForZones}
                  hrMaxValue={hrMaxValue}
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
                  paceZones={paceZones}
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
                  restingHrValue={restingHrValue}
                  selectedClient={selectedClient}
                  setClientTab={setClientTab}
                  setCoachDashTab={setCoachDashTab}
                  setPortalHomeTab={setPortalHomeTab}
                  toReviewWorkouts={toReviewWorkouts}
                  todayValue={todayValue}
                  totalTaskCount={totalTaskCount}
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
                  programs={programs}
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
                />
              )}

              {clientTab === "Training" && (
                <PortalTraining
                  calendarDropWorkoutId={calendarDropWorkoutId}
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
