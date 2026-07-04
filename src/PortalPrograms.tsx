// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BookOpen } from "lucide-react";
import type { ClientProgramScheduleMode } from "./appCore";
import { addDays } from "./appCore";

export default function PortalPrograms({
  selectedClientProgramCalendarWorkouts,
  t,
  clientProgramScheduleMode,
  clientProgramScheduledWorkouts,
  clientProgramSessions,
  clientProgramStartDate,
  clientProgramWeekNumbers,
  clientProgramWeekStarts,
  loadClientProgramSessions,
  loadingClientProgramSessions,
  localizedAssignableWorkoutName,
  localizedCalendarLabel,
  localizedProductType,
  localizedProgramName,
  paceZh,
  populateClientProgramCalendar,
  populatingClientProgram,
  programsTab,
  renderProgramHome,
  renderProgramStore,
  selectedClientProgram,
  selectedClientProgramAlreadyLoaded,
  selectedClientProgramFirstDate,
  selectedClientProgramId,
  selectedClientProgramLastDate,
  setClientProgramDayDates,
  setClientProgramScheduleMode,
  setClientProgramSessions,
  setClientProgramStartDate,
  setClientProgramWeekStarts,
  setClientTab,
  setProgramsTab,
  setSelectedClientProgramId,
  uniqueClientPurchasedPrograms,
}: { [key: string]: any }) {
  return (
    <>
                <div className="clientProgramsPage">
                  <section className="clientProgramsPanel">
                    <div className="clientProgramsHeader">
                      <div>
                        <span>{t("purchasedPrograms")}</span>
                        <h2>{t("myPrograms")}</h2>
                      </div>
                      {clientProgramSessions.length > 0 && (
                        <strong>
                          {t("sessionsReady", {
                            count: clientProgramSessions.length,
                          })}
                        </strong>
                      )}
                    </div>

                    {uniqueClientPurchasedPrograms.length > 0 ? (
                      <>
                        <div className="clientProgramPicker">
                          <label>
                            {t("chooseProgram")}
                            <select
                              value={
                                selectedClientProgram?.recordId ||
                                selectedClientProgramId
                              }
                              onChange={(event) => {
                                setSelectedClientProgramId(event.target.value);
                                setClientProgramSessions([]);
                                setClientProgramDayDates({});
                                setClientProgramWeekStarts({});
                              }}
                            >
                              {uniqueClientPurchasedPrograms.map((program: any) => (
                                <option
                                  value={program.recordId}
                                  key={program.recordId}
                                >
                                  {localizedProgramName(program)}
                                </option>
                              ))}
                            </select>
                          </label>

                              {selectedClientProgram && (
                            <div className="clientProgramCard">
                              <div>
                                <span>
                                  {localizedProductType(
                                    selectedClientProgram.productType
                                  )}
                                </span>
                                <h3>{localizedProgramName(selectedClientProgram)}</h3>
                              </div>
                              <p>
                                {selectedClientProgram.durationWeeks || "--"} {t("week")}
                                {paceZh ||
                                Number(selectedClientProgram.durationWeeks) === 1
                                  ? ""
                                  : "s"}{" "}
                                - {selectedClientProgram.sessionsPerWeek || "--"}{" "}
                                {t("sessionsPerWeek")}
                              </p>
                            </div>
                          )}
                        </div>

                        {selectedClientProgram && (
                          <div
                            className="portalHomeTabs programSubTabs"
                            role="tablist"
                            aria-label={paceZh ? "计划分区" : "Program sections"}
                          >
                            {([
                              ["progress", paceZh ? "进度" : "Progress"],
                              ["edit", paceZh ? "编辑" : "Edit"],
                              ["store", paceZh ? "商店" : "Store"],
                            ] as Array<[typeof programsTab, string]>).map(
                              ([key, label]) => (
                                <button
                                  key={key}
                                  type="button"
                                  role="tab"
                                  aria-selected={programsTab === key}
                                  className={`portalHomeTab${
                                    programsTab === key ? " portalHomeTabActive" : ""
                                  }`}
                                  onClick={() => setProgramsTab(key)}
                                >
                                  {label}
                                </button>
                              )
                            )}
                          </div>
                        )}

                        {programsTab === "progress" &&
                          selectedClientProgram &&
                          (selectedClientProgramAlreadyLoaded ? (
                            renderProgramHome()
                          ) : (
                            <div className="clientProgramEmpty">
                              <BookOpen size={30} strokeWidth={1.8} />
                              <p>
                                {paceZh
                                  ? "先在“编辑”标签把计划加入日历，这里会显示你的进度。"
                                  : "Add this program to your calendar in the Edit tab to see your progress here."}
                              </p>
                            </div>
                          ))}

                        {programsTab === "store" && selectedClientProgram &&
                          renderProgramStore()}

                        {programsTab === "edit" && (
                          <>
                        {selectedClientProgram && (
                          <div
                            className={`clientProgramDeliveryStatus ${
                              selectedClientProgramAlreadyLoaded ? "loaded" : ""
                            }`}
                          >
                            <div>
                              <span>
                                {selectedClientProgramAlreadyLoaded
                                  ? paceZh
                                    ? "日历已加载"
                                    : "Calendar loaded"
                                  : paceZh
                                  ? "准备排程"
                                  : "Ready to schedule"}
                              </span>
                              <strong>{localizedProgramName(selectedClientProgram)}</strong>
                              <p>
                                {selectedClientProgramAlreadyLoaded
                                  ? paceZh
                                    ? `日历上有 ${selectedClientProgramCalendarWorkouts.length} 节训练${
                                        selectedClientProgramFirstDate
                                          ? `，从 ${localizedCalendarLabel(
                                              selectedClientProgramFirstDate
                                            )}${
                                              selectedClientProgramLastDate &&
                                              selectedClientProgramLastDate !==
                                                selectedClientProgramFirstDate
                                                ? ` 至 ${localizedCalendarLabel(
                                                    selectedClientProgramLastDate
                                                  )}`
                                                : ""
                                            }`
                                          : ""
                                      }。`
                                    : `${selectedClientProgramCalendarWorkouts.length} sessions on calendar${
                                        selectedClientProgramFirstDate
                                          ? ` from ${localizedCalendarLabel(
                                              selectedClientProgramFirstDate
                                            )}${
                                              selectedClientProgramLastDate &&
                                              selectedClientProgramLastDate !==
                                                selectedClientProgramFirstDate
                                                ? ` to ${localizedCalendarLabel(
                                                    selectedClientProgramLastDate
                                                  )}`
                                                : ""
                                            }`
                                          : ""
                                      }.`
                                  : paceZh
                                  ? "选择排程方式，预览日期，然后添加到日历。"
                                  : "Choose how you want to place this program, preview the dates, then add it to the calendar."}
                              </p>
                            </div>

                            <button
                              type="button"
                              className={
                                selectedClientProgramAlreadyLoaded
                                  ? "primaryButton"
                                  : "outlineButton"
                              }
                              onClick={() => setClientTab("Training")}
                            >
                              {selectedClientProgramAlreadyLoaded
                                ? t("calendar")
                                : "Open Calendar"}
                            </button>
                          </div>
                        )}

                        <div className="clientProgramScheduler">
                          <div>
                            <span>{t("scheduleMethod")}</span>
                            <div className="clientProgramModeToggle">
                              {(["Month", "Week", "Day"] as ClientProgramScheduleMode[]).map(
                                (mode) => (
                                  <button
                                    key={mode}
                                    type="button"
                                    className={
                                      clientProgramScheduleMode === mode
                                        ? "active"
                                        : ""
                                    }
                                    onClick={() => setClientProgramScheduleMode(mode)}
                                  >
                                    {mode === "Day" ? t("dayByDay") : t(mode.toLowerCase())}
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          <label>
                            {t("programStartDate")}
                            <input
                              type="date"
                              value={clientProgramStartDate}
                              onChange={(event) =>
                                setClientProgramStartDate(event.target.value)
                              }
                            />
                          </label>

                          <button
                            type="button"
                            className="outlineButton"
                            onClick={() => loadClientProgramSessions()}
                            disabled={
                              loadingClientProgramSessions || !selectedClientProgram
                            }
                          >
                            {loadingClientProgramSessions
                              ? t("loadingWorkouts")
                              : t("previewDates")}
                          </button>
                        </div>

                        {clientProgramScheduleMode === "Week" &&
                          clientProgramWeekNumbers.length > 0 && (
                            <div className="clientProgramDateGrid">
                              {clientProgramWeekNumbers.map((week: any) => (
                                <label key={week}>
                                  {t("weekStarts", { week })}
                                  <input
                                    type="date"
                                    value={
                                      clientProgramWeekStarts[String(week)] ||
                                      addDays(
                                        clientProgramStartDate,
                                        (Number(week) - 1) * 7
                                      )
                                    }
                                    onChange={(event) =>
                                      setClientProgramWeekStarts((current: any) => ({
                                        ...current,
                                        [String(week)]: event.target.value,
                                      }))
                                    }
                                  />
                                </label>
                              ))}
                            </div>
                          )}

                        {clientProgramScheduleMode === "Day" &&
                          clientProgramSessions.length > 0 && (
                            <div className="clientProgramDayList">
                              {clientProgramScheduledWorkouts.map((workout: any) => (
                                <label key={workout.localId}>
                                  <span>
                                    {localizedAssignableWorkoutName(workout)} - {t("week")}{" "}
                                    {workout.week}, {t("day")} {workout.day}
                                  </span>
                                  <input
                                    type="date"
                                    value={workout.scheduledDate}
                                    onChange={(event) =>
                                      setClientProgramDayDates((current: any) => ({
                                        ...current,
                                        [workout.localId]: event.target.value,
                                      }))
                                    }
                                  />
                                </label>
                              ))}
                            </div>
                          )}

                        {clientProgramScheduledWorkouts.length > 0 && (
                          <div className="clientProgramPreview">
                            <div className="clientProgramPreviewHeader">
                              <h3>{t("atAGlance")}</h3>
                              <button
                                type="button"
                                className="primaryButton"
                                onClick={populateClientProgramCalendar}
                                disabled={
                                  populatingClientProgram ||
                                  selectedClientProgramAlreadyLoaded
                                }
                              >
                                {selectedClientProgramAlreadyLoaded
                                  ? "Already Loaded"
                                  : populatingClientProgram
                                    ? t("submitting")
                                    : t("populateCalendar")}
                              </button>
                            </div>
                            <div className="clientProgramPreviewRows">
                              {clientProgramScheduledWorkouts.map((workout: any) => (
                                <div
                                  className="clientProgramPreviewRow"
                                  key={workout.localId}
                                >
                                  <div>
                                    <strong>
                                      {localizedAssignableWorkoutName(workout)}
                                    </strong>
                                    <span>
                                      {t("week")} {workout.week} • {t("day")}{" "}
                                      {workout.day}
                                    </span>
                                  </div>
                                  <time>{localizedCalendarLabel(workout.scheduledDate)}</time>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                          </>
                        )}
                      </>
                    ) : (
                      <div className="clientProgramEmpty">
                        <BookOpen size={34} strokeWidth={1.8} />
                        <h3>{t("noPurchasedPrograms")}</h3>
                        <p>
                          Your purchased digital programs will appear here after
                          checkout or coach setup.
                        </p>
                      </div>
                    )}
                  </section>
                </div>
    </>
  );
}
