// Portal Home tab (tasks / records / metrics / workload). Extracted from
// App.tsx (split phase H) — JSX verbatim; state/handlers via props.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { normalizeDate } from "./appCore";

export default function PortalHome({
  t,
  getTaskTone,
  clientComments,
  clientPortalUpcomingTasks,
  coachDashTab,
  coachInboxItems,
  completedTaskCount,
  completionRate,
  contentAssignments,
  contentResponsesLoading,
  getTaskActionLabel,
  handleHomeTouchEnd,
  handleHomeTouchStart,
  handleOpenContentAssignment,
  inboxSeenAt,
  isClientPortal,
  isWorkloadMonitored,
  loadContentResponses,
  localizeAssignmentKind,
  localizeTaskStatus,
  localizedCalendarLabel,
  localizedWorkoutName,
  markInboxSeen,
  needsAttentionItems,
  openWorkout,
  paceZh,
  portalHomeTab,
  recentWorkoutSubmissions,
  renderDailyCheckIn,
  renderExerciseHistoryBody,
  renderLoadDashboard,
  renderPerformanceMetrics,
  renderPrLeaderboard,
  renderTrophyCase,
  renderWellnessTrends,
  renderWorkloadTab,
  selectedClient,
  setClientTab,
  setCoachDashTab,
  setPortalHomeTab,
  toReviewWorkouts,
  todayValue,
  totalTaskCount,
}: { [key: string]: any }) {
  return (
                <div
                  className="clientHomeGrid"
                  onTouchStart={isClientPortal ? handleHomeTouchStart : undefined}
                  onTouchEnd={isClientPortal ? handleHomeTouchEnd : undefined}
                >
                  {isClientPortal && renderDailyCheckIn()}
                  {isClientPortal && (
                    <div
                      className="portalHomeTabs"
                      role="tablist"
                      aria-label={paceZh ? "主页分区" : "Home sections"}
                    >
                      {(
                        [
                          ["tasks", paceZh ? "任务" : "Tasks"],
                          ["records", paceZh ? "记录" : "Records"],
                          ["metrics", paceZh ? "指标" : "Metrics"],
                          ...(isWorkloadMonitored
                            ? [["workload", paceZh ? "负荷" : "Workload"]]
                            : []),
                        ] as Array<[typeof portalHomeTab, string]>
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          role="tab"
                          aria-selected={portalHomeTab === key}
                          className={`portalHomeTab${
                            portalHomeTab === key ? " portalHomeTabActive" : ""
                          }`}
                          onClick={() => setPortalHomeTab(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {!isClientPortal && (
                    <div
                      className="portalHomeTabs coachDashTabs"
                      role="tablist"
                      aria-label="Client dashboard sections"
                    >
                      {(
                        [
                          ["science", paceZh ? "运动科学" : "Sport Science"],
                          ["activity", paceZh ? "活动" : "Activity"],
                        ] as Array<[typeof coachDashTab, string]>
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          role="tab"
                          aria-selected={coachDashTab === key}
                          className={`portalHomeTab${
                            coachDashTab === key ? " portalHomeTabActive" : ""
                          }`}
                          onClick={() => setCoachDashTab(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {!isClientPortal && coachDashTab === "science" && (
                    <>
                      <section className="clientHomePanel coachSciencePanel">
                        <div className="clientHomePanelHeader">
                          <div>
                            <span>{paceZh ? "运动科学" : "Sport Science"}</span>
                            <h2>{paceZh ? "训练负荷" : "Training Load"}</h2>
                          </div>
                        </div>
                        {renderLoadDashboard()}
                      </section>
                      <section className="clientHomePanel coachSciencePanel">
                        <div className="clientHomePanelHeader">
                          <div>
                            <span>{paceZh ? "每日状态" : "Daily wellness"}</span>
                            <h2>{paceZh ? "状态趋势" : "Wellness Trends"}</h2>
                          </div>
                        </div>
                        {renderWellnessTrends()}
                      </section>
                    </>
                  )}

                  {isClientPortal &&
                    portalHomeTab === "tasks" &&
                    (() => {
                      // Unmissable next step for fresh buyers: a pending intake
                      // is the one thing between them and their program.
                      const pendingIntake = contentAssignments.find(
                        (assignment: any) =>
                          /questionnaire/i.test(assignment.assignmentType || "") &&
                          !/completed|submitted|reviewed/i.test(
                            assignment.status || ""
                          )
                      );
                      if (!pendingIntake) return null;
                      return (
                        <button
                          type="button"
                          className="portalIntakeHeroCard"
                          onClick={() =>
                            void handleOpenContentAssignment(pendingIntake)
                          }
                        >
                          <strong>
                            {paceZh
                              ? "📝 你的训练计划在等你"
                              : "📝 Your program is waiting"}
                          </strong>
                          <span>
                            {paceZh
                              ? "完成一份简短问卷（约2分钟），计划会立即加载到你的日历。"
                              : "Complete a short intake (~2 min) and your plan loads instantly."}
                          </span>
                          <em>{paceZh ? "开始问卷 →" : "Start intake →"}</em>
                        </button>
                      );
                    })()}

                  {isClientPortal &&
                    portalHomeTab === "tasks" &&
                    (() => {
                      const items = coachInboxItems();
                      if (items.length === 0) return null;
                      const latest = items[0].at;
                      return (
                        <section className="clientHomePanel coachInboxPanel">
                          <div className="clientHomePanelHeader">
                            <div>
                              <span>{paceZh ? "教练" : "Coach"}</span>
                              <h2>{paceZh ? "教练留言" : "From your coach"}</h2>
                            </div>
                            {latest > inboxSeenAt && (
                              <button
                                className="outlineButton"
                                onClick={() => markInboxSeen(latest)}
                              >
                                {paceZh ? "全部已读" : "Mark all read"}
                              </button>
                            )}
                          </div>
                          <div className="coachInboxList">
                            {items.map((item: any) => (
                              <div
                                key={item.id}
                                className={`coachInboxItem${
                                  item.at > inboxSeenAt ? " unread" : ""
                                }`}
                              >
                                <div className="coachInboxItemHead">
                                  <strong>
                                    {item.kind === "video" ? "📹 " : "💬 "}
                                    {item.title}
                                  </strong>
                                  {item.at > inboxSeenAt && (
                                    <em>{paceZh ? "新" : "NEW"}</em>
                                  )}
                                </div>
                                <p>{item.body}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      );
                    })()}

                  {((isClientPortal && portalHomeTab === "tasks") ||
                    (!isClientPortal && coachDashTab === "activity")) && (
                  <section className="clientHomePanel upcomingHomePanel">
                    <div className="clientHomePanelHeader">
                      <div>
                        <span>{t("program")}</span>
                        <h2>{t("upcomingTasks")}</h2>
                      </div>
                      <button
                        className="outlineButton"
                        onClick={() => setClientTab("Training")}
                      >
                        {t("calendar")}
                      </button>
                    </div>

                    <div className="homeWorkoutList">
                      {clientPortalUpcomingTasks.length > 0 ? (
                        clientPortalUpcomingTasks.slice(0, 4).map((task: any) => (
                          <button
                            key={`${task.type}-${task.id}`}
                            className={`homeWorkoutItem ${task.colorClass} ${
                              task.date === todayValue ? "dueTodayTaskItem" : ""
                            }`}
                            onClick={task.open}
                          >
                            <span className="taskDatePill">
                              {localizedCalendarLabel(task.date)}
                            </span>
                            <span className="taskChipRow">
                              <span className={`taskTypeChip ${task.type}`}>
                                {task.type === "assignment"
                                  ? localizeAssignmentKind(task.kindLabel)
                                  : task.kindLabel}
                              </span>
                              {task.date === todayValue && (
                                <span className="taskTodayMarker">
                                  {paceZh ? "今天" : "Today"}
                                </span>
                              )}
                            </span>
                            <strong>{task.title}</strong>
                            <small>
                              {task.meta} - {localizeTaskStatus(task.status)}
                            </small>
                            <em className={`taskActionBadge ${getTaskTone(task.status)}`}>
                              {getTaskActionLabel(task.status, task.hasProgress)}
                            </em>
                          </button>
                        ))
                      ) : (
                        <p className="homeEmptyText">
                          {t("noUpcomingWorkouts")}
                        </p>
                      )}
                    </div>
                  </section>
                  )}

                  {isClientPortal && portalHomeTab === "metrics" && (
                    <section className="clientHomePanel focusHomePanel">
                      <div className="clientHomePanelHeader">
                        <div>
                          <span>{t("testingData")}</span>
                          <h2>{t("performanceMetrics")}</h2>
                        </div>
                      </div>
                      {renderPerformanceMetrics(false)}
                    </section>
                  )}

                  {isClientPortal && portalHomeTab === "records" && (
                    <section className="clientHomePanel prHomePanel">
                      <div className="clientHomePanelHeader">
                        <div>
                          <span>{paceZh ? "成绩" : "Records"}</span>
                          <h2>{paceZh ? "我的个人记录" : "My Personal Records"}</h2>
                        </div>
                      </div>
                      {renderPrLeaderboard()}
                    </section>
                  )}

                  {isClientPortal && portalHomeTab === "records" && (
                    <section className="clientHomePanel trophyHomePanel">
                      <div className="clientHomePanelHeader">
                        <div>
                          <span>{paceZh ? "成就" : "Achievements"}</span>
                          <h2>{paceZh ? "奖杯陈列" : "Trophy Case"}</h2>
                        </div>
                      </div>
                      {renderTrophyCase()}
                    </section>
                  )}

                  {isClientPortal && portalHomeTab === "records" && (
                    <section className="clientHomePanel progressHomePanel">
                      <div className="clientHomePanelHeader">
                        <div>
                          <span>{t("progress")}</span>
                          <h2>{t("exerciseHistory")}</h2>
                        </div>
                      </div>
                      {renderExerciseHistoryBody()}
                    </section>
                  )}

                  {isClientPortal &&
                    portalHomeTab === "workload" &&
                    isWorkloadMonitored &&
                    renderWorkloadTab()}

                  {!isClientPortal && coachDashTab === "activity" && (
                  <section className="clientHomePanel focusHomePanel coachLogsPanel">
                    <div className="clientHomePanelHeader">
                      <div>
                        <span>{paceZh ? "训练记录" : "Sessions"}</span>
                        <h2>{paceZh ? "近期训练记录" : "Recent Session Logs"}</h2>
                      </div>
                    </div>

                    {(
                      <div className="sessionLogs">
                        <div className="sessionLogsCols">
                          <div className="sessionLogCol">
                            <h4 className="sessionLogColTitle">
                              {paceZh ? "已记录训练" : "Logged Workouts"}
                            </h4>
                            {recentWorkoutSubmissions.length > 0 ? (
                              recentWorkoutSubmissions.map((w: any) => (
                                <button
                                  type="button"
                                  className="sessionLogItem logged"
                                  key={w.id}
                                  onClick={() => openWorkout(w)}
                                >
                                  <span className="sessionLogDate">
                                    {localizedCalendarLabel(
                                      normalizeDate(String(w.scheduledDate))
                                    )}
                                  </span>
                                  <strong>{localizedWorkoutName(w)}</strong>
                                </button>
                              ))
                            ) : (
                              <p className="homeEmptyText">
                                {paceZh ? "暂无已记录训练。" : "No logged workouts yet."}
                              </p>
                            )}
                          </div>

                          <div className="sessionLogCol">
                            <h4 className="sessionLogColTitle">
                              {paceZh ? "缺席训练" : "Missed Workouts"}
                            </h4>
                            {(() => {
                              const missed = needsAttentionItems.filter(
                                (i: any) => i.type === "Workout"
                              );
                              return missed.length > 0 ? (
                                missed.map((item: any) => (
                                  <button
                                    type="button"
                                    className="sessionLogItem missed"
                                    key={item.key}
                                    onClick={item.open}
                                  >
                                    <span className="sessionLogDate">
                                      {localizedCalendarLabel(item.date)}
                                    </span>
                                    <strong>{item.title}</strong>
                                  </button>
                                ))
                              ) : (
                                <p className="homeEmptyText">
                                  {paceZh ? "没有缺席训练。" : "No missed workouts."}
                                </p>
                              );
                            })()}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="sessionLogsCompletion"
                          onClick={() => setClientTab("Training")}
                        >
                          <span>{paceZh ? "完成率" : "Completion"}</span>
                          <strong>{completionRate}%</strong>
                          <small>
                            {completedTaskCount}/{totalTaskCount || 0}{" "}
                            {paceZh ? "已分配任务" : "assigned tasks"}
                          </small>
                        </button>
                      </div>
                    )}
                  </section>
                  )}

                  {!isClientPortal && coachDashTab === "activity" && (
                    <section className="clientHomePanel coachLogsPanel">
                      <div className="clientHomePanelHeader">
                        <div>
                          <span>{paceZh ? "反馈" : "Results"}</span>
                          <h2>{paceZh ? "评价与待办" : "Reviews"}</h2>
                        </div>
                        <button
                          className="outlineButton"
                          onClick={() => loadContentResponses(selectedClient)}
                          disabled={contentResponsesLoading}
                        >
                          {contentResponsesLoading ? "Loading" : "Reload"}
                        </button>
                      </div>
                      <div className="sessionLogsCols">
                        <div className="sessionLogCol">
                          <h4 className="sessionLogColTitle">
                            {paceZh ? "客户留言" : "Client Comments"}
                          </h4>
                          {clientComments.length > 0 ? (
                            clientComments.map((c: any) => (
                              <button
                                type="button"
                                className="sessionLogItem"
                                key={c.key}
                                onClick={c.open}
                              >
                                <span className="sessionLogDate">
                                  {c.date || "--"} · {c.workoutName}
                                </span>
                                <strong>{c.note}</strong>
                              </button>
                            ))
                          ) : (
                            <p className="homeEmptyText">
                              {paceZh ? "暂无留言。" : "No client comments yet."}
                            </p>
                          )}
                        </div>
                        <div className="sessionLogCol">
                          <h4 className="sessionLogColTitle">
                            {paceZh ? "待审核训练" : "To be Reviewed"}
                          </h4>
                          {toReviewWorkouts.length > 0 ? (
                            toReviewWorkouts.map((w: any) => (
                              <button
                                type="button"
                                className="sessionLogItem missed"
                                key={w.id}
                                onClick={() => openWorkout(w)}
                              >
                                <span className="sessionLogDate">
                                  {normalizeDate(String(w.scheduledDate)) || "--"}
                                </span>
                                <strong>{localizedWorkoutName(w)}</strong>
                              </button>
                            ))
                          ) : (
                            <p className="homeEmptyText">
                              {paceZh
                                ? "没有待审核的训练。"
                                : "Nothing to review."}
                            </p>
                          )}
                        </div>
                      </div>
                    </section>
                  )}

                </div>
  );
}
