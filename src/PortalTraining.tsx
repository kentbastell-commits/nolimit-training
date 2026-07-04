// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DragEvent } from "react";
import { CalendarDays, Copy, Plus, Scissors } from "lucide-react";
import type { CalendarView } from "./appCore";
import { dateToInputValue, formatCalendarLabel, formatMonthTitle, getAssignmentColorClass, getDisplayTaskStatus, getMonthDates, getSessionTypeClass, getStatusClass, getWorkoutColorClass, normalizeDate } from "./appCore";

export default function PortalTraining({
  calendarDropWorkoutId,
  t,
  todayValue,
  assignLoading,
  assignProgramToClient,
  assignStartDate,
  assignableWorkouts,
  assigningProgram,
  assignmentTemplateId,
  assignmentTemplateOptions,
  assignmentType,
  calendarAnchorDate,
  calendarAssignmentDateInputRef,
  calendarDates,
  calendarRangeLabel,
  calendarView,
  clearCalendarLongPress,
  clientCalendarStyle,
  clientCalendarTouchDrag,
  clientMonthAnchorDate,
  clientMonthCalendarDates,
  clientPortalUpcomingWorkouts,
  clientWeekRangeLabel,
  clientWeekStripDates,
  coachMonthCalendarDates,
  consumeCalendarLongPressClick,
  contentAssignments,
  copiedCalendarItem,
  createContentAssignment,
  creatingAssignment,
  deleteContentAssignment,
  draggingAssignmentId,
  draggingWorkoutId,
  endClientCalendarWorkoutTouch,
  getAssignmentDisplayName,
  getAssignmentsForDate,
  getCalendarItemCountForDate,
  getWorkoutsForDate,
  handleClientCalendarWorkoutDrop,
  handleOpenContentAssignment,
  isClientPortal,
  jumpClientCalendarToToday,
  loadProgramSessionsForAssignment,
  localizeTaskStatus,
  localizedCalendarLabel,
  localizedMonthTitle,
  localizedWeekStripLabel,
  localizedWorkoutName,
  moveCalendarRange,
  moveClientCalendarWorkoutTouch,
  moveClientMonth,
  moveContentAssignmentToDate,
  moveWorkoutToDate,
  movingAssignmentId,
  movingWorkoutId,
  openAssignmentHubFromCalendar,
  openCalendarActionMenu,
  openWorkout,
  pasteCalendarItemToDate,
  programs,
  selectClientCalendarDate,
  selectedAssignProgramId,
  selectedCalendarDateAssignments,
  selectedCalendarDateItemCount,
  selectedCalendarDateWorkouts,
  selectedClient,
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
  setDraggingAssignmentId,
  setDraggingWorkoutId,
  setSelectedAssignProgramId,
  setShowCalendarActionMenu,
  shiftAssignableWorkoutsToStartDate,
  showCalendarActionMenu,
  startCalendarLongPress,
  startClientCalendarWorkoutTouch,
  suppressClientCalendarTouchClick,
  updateAssignableWorkoutDate,
  useChineseClientText,
  workouts,
  workoutsLoading,
}: { [key: string]: any }) {
  return (
    <>
                <div className="trainingCalendar">
                  {isClientPortal && clientPortalUpcomingWorkouts[0] && (
                    <section className="clientPortalTrainingHero">
                      <div>
                        <span>{t("nextWorkout")}</span>
                        <h2>
                          {clientPortalUpcomingWorkouts[0]
                            ? localizedWorkoutName(clientPortalUpcomingWorkouts[0])
                            : t("calendar")}
                        </h2>
                        <p>
                          {clientPortalUpcomingWorkouts[0]
                            ? `${localizedCalendarLabel(
                                normalizeDate(
                                  String(
                                    clientPortalUpcomingWorkouts[0].scheduledDate
                                  )
                                )
                              )} • ${t("week")} ${
                                clientPortalUpcomingWorkouts[0].week
                              } ${t("day")} ${clientPortalUpcomingWorkouts[0].day}`
                            : t("noUpcomingWorkouts")}
                        </p>
                      </div>

                      {clientPortalUpcomingWorkouts[0] && (
                        <button
                          className="goldButton compactNextWorkoutButton"
                          onClick={() =>
                            openWorkout(clientPortalUpcomingWorkouts[0])
                          }
                        >
                          {t("start")}
                        </button>
                      )}
                    </section>
                  )}

                  {false && isClientPortal && clientPortalUpcomingWorkouts.length > 0 && (
                    <section className="clientPortalWorkoutList">
                      <h3>Upcoming Workouts</h3>
                      {clientPortalUpcomingWorkouts.map((workout: any) => (
                        <button
                          key={workout.id}
                          className="clientPortalWorkoutItem"
                          onClick={() => openWorkout(workout)}
                        >
                          <span>
                            {formatCalendarLabel(
                              normalizeDate(String(workout.scheduledDate))
                            )}
                          </span>
                          <strong>{workout.sessionName || "Workout"}</strong>
                          <small>
                            Week {workout.week} • Day {workout.day} •{" "}
                            {getDisplayTaskStatus(
                              workout.completionStatus,
                              workout.scheduledDate
                            )}
                          </small>
                        </button>
                      ))}
                    </section>
                  )}

                  <div className="calendarHeader">
                    <h2>{t("trainingCalendar")}</h2>

                    {isClientPortal && (
                      <div className="clientCalendarViewToggle">
                        {(["Week", "Month", "Full"] as const).map((view) => (
                          <button
                            key={view}
                            className={
                              clientCalendarStyle === view ? "active" : ""
                            }
                            onClick={() => setClientCalendarStyle(view)}
                            type="button"
                          >
                            {t(view.toLowerCase())}
                          </button>
                        ))}
                      </div>
                    )}

                    {!isClientPortal && (
                    <div className="calendarControls">
                      {(["Week", "Month", "Full"] as CalendarView[]).map(
                        (view) => (
                          <button
                            key={view}
                            className={
                              calendarView === view ? "goldButton" : "outlineButton"
                            }
                            onClick={() => setCalendarView(view)}
                          >
                            {view}
                          </button>
                        )
                      )}

                      <div className="calendarAddMenuWrap">
                        <button
                          className="iconActionButton calendarAddButton"
                          onClick={() =>
                            setShowCalendarActionMenu((current: any) => !current)
                          }
                          type="button"
                          title="Add to calendar"
                          aria-label="Add to calendar"
                        >
                          <Plus size={19} aria-hidden="true" />
                        </button>

                        {showCalendarActionMenu && (
                          <div className="calendarAddMenu">
                            <button
                              type="button"
                              onClick={() => {
                                openAssignmentHubFromCalendar("Program");
                              }}
                            >
                              Add Workout
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                openAssignmentHubFromCalendar("Check-in");
                              }}
                            >
                              Add Check-in Program
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                openAssignmentHubFromCalendar("Questionnaire");
                              }}
                            >
                              Add Form
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                openAssignmentHubFromCalendar("Physical Test");
                              }}
                            >
                              Add Physical Test
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    )}
                  </div>

                  <div className="calendarNavigator">
                    <div className="calendarRangeControls">
                      <button
                        className="outlineButton"
                        onClick={() => moveCalendarRange(-1)}
                      >
                        {t("previous")}
                      </button>

                      <strong>
                        {isClientPortal && clientCalendarStyle === "Week"
                          ? clientWeekRangeLabel
                          : isClientPortal && clientCalendarStyle === "Month"
                          ? localizedMonthTitle(clientMonthAnchorDate)
                          : isClientPortal && clientCalendarStyle === "Full"
                          ? localizedMonthTitle(calendarAnchorDate)
                          : calendarRangeLabel}
                      </strong>

                      <button
                        className="outlineButton"
                        onClick={() => moveCalendarRange(1)}
                      >
                        {t("next")}
                      </button>
                    </div>

                    <div className="calendarQuickControls">
                      <button
                        className="outlineButton todayButton"
                        onClick={() => {
                          if (isClientPortal) {
                            jumpClientCalendarToToday();
                            return;
                          }

                          setCalendarAnchorDate(dateToInputValue(new Date()));
                        }}
                      >
                        {t("today")}
                      </button>

                      <label className="calendarDatePickerButton" title="Choose date">
                        <CalendarDays size={18} strokeWidth={2.2} aria-hidden="true" />
                        <span className="srOnly">{t("chooseDate")}</span>
                        <input
                          type="date"
                          value={calendarAnchorDate}
                          onChange={(e) => {
                            const nextDate = normalizeDate(e.target.value);
                            if (isClientPortal) {
                              selectClientCalendarDate(nextDate);
                              return;
                            }

                            setCalendarAnchorDate(nextDate);
                            setAssignStartDate(nextDate);
                            setAssignmentDueDate(nextDate);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {false && !isClientPortal && (
                  <section className="assignProgramPanel">
                    <h3>Assign Task</h3>

                    <div className="assignProgramGrid">
                      <label>
                        <span>Type</span>
                        <select
                          className="miniSearch"
                          value={assignmentType}
                          onChange={(e) => {
                            const nextType = e.target.value;
                            setAssignmentType(nextType);
                            setAssignmentTemplateId("");
                            setAssignableWorkouts([]);
                            if (selectedClient) {
                              setAssignmentClientId(selectedClient.id);
                            }
                            setAssignmentDueDate(calendarAnchorDate);
                            setAssignStartDate(calendarAnchorDate);
                          }}
                        >
                          <option>Program</option>
                          <option>Check-in</option>
                          <option>Questionnaire</option>
                          <option>Physical Test</option>
                        </select>
                      </label>

                      {assignmentType === "Program" ? (
                        <label>
                          <span>Program</span>
                          <select
                            className="miniSearch"
                            value={selectedAssignProgramId}
                            onChange={(e) => {
                              setSelectedAssignProgramId(e.target.value);
                              setAssignableWorkouts([]);
                            }}
                          >
                            {programs.map((program: any) => (
                              <option key={program.recordId} value={program.programId}>
                                {program.programName}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <label>
                          <span>
                            {assignmentType === "Physical Test"
                              ? "Saved Test"
                              : "Saved Form"}
                          </span>
                          <select
                            key={assignmentType}
                            className="miniSearch"
                            value={assignmentTemplateId}
                            onChange={(e) => setAssignmentTemplateId(e.target.value)}
                          >
                            <option value="">
                              {assignmentTemplateOptions.length === 0
                                ? assignmentType === "Physical Test"
                                  ? "No saved tests"
                                  : "No saved forms"
                                : "Select saved item"}
                            </option>
                            {assignmentTemplateOptions.map((option: any) => (
                              <option key={option.id} value={option.id}>
                                {option.label} ({option.meta})
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      <label>
                        <span>Start Date</span>
                        <input
                          ref={calendarAssignmentDateInputRef}
                          type="date"
                          className="miniSearch"
                          value={
                            assignmentType === "Program"
                              ? assignStartDate
                              : calendarAnchorDate
                          }
                          onChange={(e) => {
                            const nextDate = normalizeDate(e.target.value);
                            if (assignmentType === "Program") {
                              shiftAssignableWorkoutsToStartDate(nextDate);
                            } else {
                              setCalendarAnchorDate(nextDate);
                            }
                          }}
                        />
                      </label>

                      {assignmentType === "Program" ? (
                        <>
                          <button
                            className="outlineButton"
                            onClick={loadProgramSessionsForAssignment}
                            disabled={assignLoading}
                          >
                            {assignLoading ? "Loading..." : "Load Sessions"}
                          </button>

                          <button
                            className="goldButton"
                            onClick={assignProgramToClient}
                            disabled={assigningProgram}
                          >
                            {assigningProgram ? "Assigning..." : "Assign Program"}
                          </button>
                        </>
                      ) : (
                        <button
                          className="goldButton"
                          onClick={() => {
                            void createContentAssignment({
                              assignmentType,
                              assignmentTemplateId,
                              assignmentClientId: selectedClient?.id || "",
                              assignmentDueDate: normalizeDate(
                                calendarAssignmentDateInputRef.current?.value ||
                                  calendarAnchorDate
                              ),
                            });
                          }}
                          disabled={creatingAssignment}
                        >
                          {creatingAssignment ? "Assigning..." : "Assign Task"}
                        </button>
                      )}
                    </div>

                    {assignmentType === "Program" && assignableWorkouts.length > 0 && (
                      <div className="arrangeWorkouts">
                        <h4>Arrange Workouts</h4>

                        {assignableWorkouts.map((workout: any) => (
                          <div
                            key={workout.localId}
                            className="arrangeWorkoutRow"
                          >
                            <span>Week {workout.week}</span>
                            <span>Day {workout.day}</span>
                            <strong>{workout.sessionName}</strong>
                            {workout.sessionType && (
                              <span className="sessionTypeMini">
                                {workout.sessionType}
                              </span>
                            )}

                            <input
                              type="date"
                              className="miniSearch"
                              value={workout.scheduledDate}
                              onChange={(e) =>
                                updateAssignableWorkoutDate(
                                  workout.localId,
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                  )}

                  {workoutsLoading && <p>Loading workouts...</p>}

                  <div
                    className={
                      isClientPortal && clientCalendarStyle === "Week"
                        ? "clientTrainingCalendarSolo"
                        : "clientTrainingCalendarSolo"
                    }
                  >
                    <div className="clientTrainingWeekPanel">
                  <div
                    className={
                      isClientPortal && clientCalendarStyle === "Week"
                        ? "calendarGrid clientWeekStripCalendar"
                        : isClientPortal && clientCalendarStyle === "Month"
                        ? "clientCalendarHidden"
                        : isClientPortal && clientCalendarStyle === "Full"
                        ? "calendarGrid monthCalendar clientFullCalendar"
                        : !isClientPortal && calendarView === "Month"
                        ? "clientCalendarHidden"
                        : calendarView === "Week"
                        ? "calendarGrid weekCalendar"
                        : "calendarGrid monthCalendar"
                    }
                  >
                    {(isClientPortal && clientCalendarStyle === "Week"
                      ? clientWeekStripDates
                      : isClientPortal && clientCalendarStyle === "Full"
                      ? getMonthDates(calendarAnchorDate)
                      : !isClientPortal && calendarView === "Month"
                      ? []
                      : calendarDates
                    ).map((date: any) => {
                      const dayWorkouts = getWorkoutsForDate(date);
                      const dayAssignments = getAssignmentsForDate(date);
                      const dayItemCount = dayWorkouts.length + dayAssignments.length;
                      const weekStripLabel = localizedWeekStripLabel(date);

                      return (
                        <div
                          className={`calendarDay ${
                            draggingWorkoutId || draggingAssignmentId
                              ? "calendarDropTarget"
                              : ""
                          } ${
                            isClientPortal && date === calendarAnchorDate
                              ? "selectedCalendarDay"
                              : ""
                          } ${
                            dayItemCount > 0 ? "hasCalendarWork" : ""
                          }`}
                          key={date}
                          onDragOver={(event: DragEvent<HTMLDivElement>) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(event: DragEvent<HTMLDivElement>) => {
                            event.preventDefault();
                            setCalendarDropWorkoutId("");

                            const transferType = event.dataTransfer.getData(
                              "application/x-nolimit-type"
                            );
                            const transferId =
                              event.dataTransfer.getData("text/plain") ||
                              draggingWorkoutId ||
                              draggingAssignmentId;
                            const assignment =
                              transferType === "assignment"
                                ? contentAssignments.find(
                                    (item: any) => item.recordId === transferId
                                  )
                                : undefined;

                            if (assignment) {
                              void moveContentAssignmentToDate(assignment, date);
                              return;
                            }

                            const workout = workouts.find(
                              (item: any) => item.id === transferId
                            );

                            if (workout) {
                              void moveWorkoutToDate(workout, date);
                            }
                          }}
                          onContextMenu={(event) => {
                            if (isClientPortal || !copiedCalendarItem) return;
                            event.preventDefault();
                            event.stopPropagation();
                            openCalendarActionMenu(event.clientX, event.clientY, {
                              kind: "date",
                              date,
                            });
                          }}
                          onTouchStart={(event) => {
                            if (!copiedCalendarItem) return;
                            startCalendarLongPress(event, {
                              kind: "date",
                              date,
                            });
                          }}
                          onTouchMove={clearCalendarLongPress}
                          onTouchEnd={clearCalendarLongPress}
                          onTouchCancel={clearCalendarLongPress}
                          onClick={() => {
                            if (consumeCalendarLongPressClick()) return;
                            if (isClientPortal) {
                              selectClientCalendarDate(
                                date,
                                clientCalendarStyle !== "Week"
                              );
                            } else {
                              setCalendarAnchorDate(date);
                              setAssignStartDate(date);
                              setAssignmentDueDate(date);
                            }
                          }}
                        >
                          <strong className="calendarDateLabel">
                            {isClientPortal &&
                            clientCalendarStyle === "Week" ? (
                              <>
                                <span>{weekStripLabel.weekday}</span>
                                <b>{weekStripLabel.day}</b>
                              </>
                            ) : (
                              localizedCalendarLabel(date)
                            )}
                          </strong>

                          {!isClientPortal &&
                            (calendarView === "Week" || calendarView === "Full") && (
                              <div className="calendarDayActions">
                                {copiedCalendarItem && (
                                  <button
                                    className="calendarDayActionButton pasteDayButton"
                                    type="button"
                                    aria-label={`Paste ${copiedCalendarItem.label} on ${localizedCalendarLabel(date)}`}
                                    title={`Paste ${copiedCalendarItem.label}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void pasteCalendarItemToDate(date);
                                    }}
                                  >
                                    {copiedCalendarItem.action === "copy"
                                      ? "Paste Copy"
                                      : "Paste Cut"}
                                  </button>
                                )}
                                <button
                                  className="calendarDayActionButton"
                                  type="button"
                                  aria-label={`Add item on ${localizedCalendarLabel(date)}`}
                                  title="Add program or session"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setCalAddMenu({
                                      date,
                                      x: event.clientX,
                                      y: event.clientY,
                                    });
                                  }}
                                >
                                  <Plus size={16} aria-hidden="true" />
                                </button>
                              </div>
                            )}

                          {isClientPortal && (
                            <span className="calendarWorkMarkers" aria-hidden="true">
                              {dayItemCount > 0 ? (
                                <>
                                  {Array.from({
                                    length: Math.min(dayItemCount, 3),
                                  }).map((_: any, index: any) => (
                                    <span key={`${date}-marker-${index}`} />
                                  ))}
                                </>
                              ) : (
                                <span className="emptyMarker" />
                              )}
                            </span>
                          )}

                          {(!isClientPortal ||
                            clientCalendarStyle === "Full") &&
                            dayWorkouts.map((workout: any) => (
                            <div
                              className={`workoutBlock ${getStatusClass(
                                getDisplayTaskStatus(
                                  workout.completionStatus,
                                  workout.scheduledDate
                                )
                              )} ${getSessionTypeClass(
                                workout.sessionType
                              )} ${getWorkoutColorClass(
                                workout.sessionName,
                                workout.sessionType
                              )} ${
                                normalizeDate(String(workout.scheduledDate)) ===
                                  todayValue &&
                                getDisplayTaskStatus(
                                  workout.completionStatus,
                                  workout.scheduledDate
                                ) === "Scheduled"
                                  ? "dueTodayCalendarItem"
                                  : ""
                              } ${
                                draggingWorkoutId === workout.id
                                  ? "draggingWorkout"
                                  : ""
                              } ${
                                movingWorkoutId === workout.id
                                  ? "movingWorkout"
                                  : ""
                              } ${
                                calendarDropWorkoutId === workout.id
                                  ? "calendarReorderTarget"
                                  : ""
                              }`}
                              key={workout.id}
                              data-client-calendar-workout-id={workout.id}
                              data-client-calendar-date={date}
                              draggable
                              role="button"
                              tabIndex={0}
                              title={
                                isClientPortal
                                  ? "Drag to another date or tap to open"
                                  : "Drag to another day to reschedule"
                              }
                              onDragStart={(event) => {
                                event.dataTransfer.setData("text/plain", workout.id);
                                event.dataTransfer.effectAllowed = "move";
                                setDraggingWorkoutId(workout.id);
                              }}
                              onDragOver={(event) => {
                                if (
                                  !isClientPortal ||
                                  !draggingWorkoutId ||
                                  draggingWorkoutId === workout.id
                                ) {
                                  return;
                                }

                                event.preventDefault();
                                event.stopPropagation();
                                setCalendarDropWorkoutId(workout.id);
                                event.dataTransfer.dropEffect = "move";
                              }}
                              onDrop={(event) =>
                                handleClientCalendarWorkoutDrop(event, workout, date)
                              }
                              onDragEnd={() => {
                                setDraggingWorkoutId("");
                                setCalendarDropWorkoutId("");
                              }}
                              onContextMenu={(event) => {
                                if (isClientPortal) return;
                                event.preventDefault();
                                event.stopPropagation();
                                openCalendarActionMenu(event.clientX, event.clientY, {
                                  kind: "item",
                                  item: { type: "workout", workout },
                                });
                              }}
                              onTouchStart={(event) => {
                                event.stopPropagation();
                                if (isClientPortal) {
                                  startClientCalendarWorkoutTouch(
                                    event,
                                    workout,
                                    date
                                  );
                                  return;
                                }
                                startCalendarLongPress(event, {
                                  kind: "item",
                                  item: { type: "workout", workout },
                                });
                              }}
                              onTouchMove={(event) => {
                                if (isClientPortal) {
                                  moveClientCalendarWorkoutTouch(event);
                                  return;
                                }
                                clearCalendarLongPress();
                              }}
                              onTouchEnd={(event) => {
                                if (isClientPortal) {
                                  endClientCalendarWorkoutTouch(event);
                                  return;
                                }
                                clearCalendarLongPress();
                              }}
                              onTouchCancel={() => {
                                if (isClientPortal) {
                                  clientCalendarTouchDrag.current = null;
                                  setDraggingWorkoutId("");
                                  return;
                                }
                                clearCalendarLongPress();
                              }}
                              onClick={() => {
                                if (suppressClientCalendarTouchClick.current) return;
                                if (consumeCalendarLongPressClick()) return;
                                openWorkout(workout);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openWorkout(workout);
                                }
                              }}
                            >
                              <div className="workoutBlockMain">
                                {localizedWorkoutName(workout)}
                                <span>
                                  {workout.sessionType
                                    ? `${workout.sessionType} - `
                                    : ""}
                                  {movingWorkoutId === workout.id
                                    ? t("moving")
                                    : localizeTaskStatus(
                                        getDisplayTaskStatus(
                                          workout.completionStatus,
                                          workout.scheduledDate
                                        )
                                      )}
                                </span>
                              </div>

                            </div>
                          ))}

                          {(!isClientPortal ||
                            clientCalendarStyle === "Full") &&
                            dayAssignments.map((assignment: any) => (
                              <div
                                className={`workoutBlock ${getStatusClass(
                                  getDisplayTaskStatus(
                                    assignment.status,
                                    assignment.dueDate || assignment.assignedDate
                                  )
                                )} ${
                                  normalizeDate(
                                    String(
                                      assignment.dueDate ||
                                        assignment.assignedDate
                                    )
                                  ) === todayValue &&
                                  getDisplayTaskStatus(
                                    assignment.status,
                                    assignment.dueDate ||
                                      assignment.assignedDate
                                  ) === "Scheduled"
                                    ? "dueTodayCalendarItem"
                                    : ""
                                } assignmentBlock ${getAssignmentColorClass(
                                  assignment.assignmentType
                                )} ${
                                  draggingAssignmentId === assignment.recordId
                                    ? "draggingWorkout"
                                    : ""
                                } ${
                                  movingAssignmentId === assignment.recordId
                                    ? "movingWorkout"
                                    : ""
                                }`}
                                key={assignment.recordId}
                                role="button"
                                tabIndex={0}
                                draggable={!isClientPortal}
                                title="Open assignment"
                                onDragStart={(event) => {
                                  if (isClientPortal) return;
                                  event.dataTransfer.setData(
                                    "application/x-nolimit-type",
                                    "assignment"
                                  );
                                  event.dataTransfer.setData(
                                    "text/plain",
                                    assignment.recordId
                                  );
                                  event.dataTransfer.effectAllowed = "move";
                                  setDraggingAssignmentId(assignment.recordId);
                                }}
                                onDragEnd={() => setDraggingAssignmentId("")}
                                onContextMenu={(event) => {
                                  if (isClientPortal) return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  openCalendarActionMenu(event.clientX, event.clientY, {
                                    kind: "item",
                                    item: { type: "assignment", assignment },
                                  });
                                }}
                                onTouchStart={(event) => {
                                  event.stopPropagation();
                                  startCalendarLongPress(event, {
                                    kind: "item",
                                    item: { type: "assignment", assignment },
                                  });
                                }}
                                onTouchMove={clearCalendarLongPress}
                                onTouchEnd={clearCalendarLongPress}
                                onTouchCancel={clearCalendarLongPress}
                                onClick={() => {
                                  if (consumeCalendarLongPressClick()) return;
                                  handleOpenContentAssignment(assignment);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    handleOpenContentAssignment(assignment);
                                  }
                                }}
                              >
                                <div className="workoutBlockMain">
                                  {getAssignmentDisplayName(assignment)}
                                  <span>
                                    {movingAssignmentId === assignment.recordId
                                      ? t("moving")
                                      : localizeTaskStatus(
                                          getDisplayTaskStatus(
                                            assignment.status,
                                            assignment.dueDate ||
                                              assignment.assignedDate
                                          )
                                        )}
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      );
                    })}
                  </div>

                  {isClientPortal && clientCalendarStyle === "Week" && (
                    <section className="selectedDayGlance">
                      <div className="selectedDayGlanceHeader">
                        <span>{localizedCalendarLabel(calendarAnchorDate)}</span>
                        <strong>
                          {selectedCalendarDateItemCount > 0
                            ? t("itemCount", {
                                count: selectedCalendarDateItemCount,
                              })
                            : t("nothingScheduledShort")}
                        </strong>
                      </div>

                      {selectedCalendarDateItemCount > 0 ? (
                        <>
                        {selectedCalendarDateWorkouts.map((workout: any) => (
                          <button
                            className={`selectedDayWorkout draggableSelectedDayWorkout ${getStatusClass(
                              getDisplayTaskStatus(
                                workout.completionStatus,
                                workout.scheduledDate
                              )
                            )} ${getWorkoutColorClass(
                              workout.sessionName,
                              workout.sessionType
                            )} ${
                              draggingWorkoutId === workout.id
                                ? "draggingWorkout"
                                : ""
                            } ${
                              movingWorkoutId === workout.id ? "movingWorkout" : ""
                            } ${
                              calendarDropWorkoutId === workout.id
                                ? "calendarReorderTarget"
                                : ""
                            }`}
                            key={workout.id}
                            data-client-calendar-workout-id={workout.id}
                            data-client-calendar-date={calendarAnchorDate}
                            draggable
                            title="Drag to another date or tap to open"
                            onDragStart={(event) => {
                              event.dataTransfer.setData("text/plain", workout.id);
                              event.dataTransfer.effectAllowed = "move";
                              setDraggingWorkoutId(workout.id);
                            }}
                            onDragOver={(event) => {
                              if (
                                !draggingWorkoutId ||
                                draggingWorkoutId === workout.id
                              ) {
                                return;
                              }

                              event.preventDefault();
                              event.stopPropagation();
                              setCalendarDropWorkoutId(workout.id);
                              event.dataTransfer.dropEffect = "move";
                            }}
                            onDrop={(event) =>
                              handleClientCalendarWorkoutDrop(
                                event,
                                workout,
                                calendarAnchorDate
                              )
                            }
                            onDragEnd={() => {
                              setDraggingWorkoutId("");
                              setCalendarDropWorkoutId("");
                            }}
                            onClick={() => openWorkout(workout)}
                          >
                            <div>
                              <span>
                                {t("week")} {workout.week} - {t("day")} {workout.day}
                              </span>
                              <strong>{localizedWorkoutName(workout)}</strong>
                              <small>
                                {movingWorkoutId === workout.id
                                  ? t("moving")
                                  : getDisplayTaskStatus(
                                      workout.completionStatus,
                                      workout.scheduledDate
                                    )}
                              </small>
                            </div>
                            <span className="selectedDayWorkoutAction">
                              {t("view")}
                            </span>
                          </button>
                        ))}
                        {selectedCalendarDateAssignments.map((assignment: any) => (
                          <button
                            className={`selectedDayWorkout selectedDayAssignment ${getStatusClass(
                              getDisplayTaskStatus(
                                assignment.status,
                                assignment.dueDate || assignment.assignedDate
                              )
                            )} ${getAssignmentColorClass(
                              assignment.assignmentType
                            )}`}
                            key={assignment.recordId}
                            onClick={() => handleOpenContentAssignment(assignment)}
                          >
                            <div>
                              <span>{assignment.assignmentType || "Questionnaire"}</span>
                              <strong>
                                {getAssignmentDisplayName(assignment)}
                              </strong>
                              <small>
                                {getDisplayTaskStatus(
                                  assignment.status,
                                  assignment.dueDate || assignment.assignedDate
                                )}
                              </small>
                            </div>
                            <span className="selectedDayWorkoutAction">
                              {String(assignment.assignmentType)
                                .toLowerCase()
                                .includes("test")
                                ? t("start")
                                : "Answer"}
                            </span>
                            {!isClientPortal && (
                              <span
                                className="selectedDayDeleteAction"
                                role="button"
                                tabIndex={0}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void deleteContentAssignment(assignment);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    void deleteContentAssignment(assignment);
                                  }
                                }}
                              >
                                Delete
                              </span>
                            )}
                          </button>
                        ))}
                        </>
                      ) : (
                        <p className="homeEmptyText">
                          {t("nothingScheduled")}
                        </p>
                      )}
                    </section>
                  )}
                    </div>

                    {isClientPortal && clientCalendarStyle === "Month" && (
                      <aside className="clientMonthCalendarCard standaloneClientMonthCalendar">
                        <div className="clientMonthCalendarHeader">
                          <button
                            type="button"
                            className="clientMonthArrow"
                            onClick={() => moveClientMonth(-1)}
                            aria-label="Previous month"
                          >
                            {"<"}
                          </button>
                          <strong>{localizedMonthTitle(clientMonthAnchorDate)}</strong>
                          <button
                            type="button"
                            className="clientMonthArrow"
                            onClick={() => moveClientMonth(1)}
                            aria-label="Next month"
                          >
                            {">"}
                          </button>
                        </div>

                        <div className="clientMonthWeekdays">
                          {(useChineseClientText
                            ? ["一", "二", "三", "四", "五", "六", "日"]
                            : ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]
                          ).map((day) => (
                            <span key={day}>{day}</span>
                          ))}
                        </div>

                        <div className="clientMonthGrid">
                          {clientMonthCalendarDates.map((date: any, index: any) => {
                            if (!date) {
                              return (
                                <span
                                  className="clientMonthDay emptyClientMonthDay"
                                  key={`empty-${index}`}
                                />
                              );
                            }

                            const dateItemCount = getCalendarItemCountForDate(date);
                            const dayNumber = new Date(`${date}T00:00:00`).getDate();

                            return (
                              <button
                                type="button"
                                key={date}
                                className={`clientMonthDay ${
                                  date === calendarAnchorDate
                                    ? "selectedClientMonthDay"
                                    : ""
                                } ${
                                  date === todayValue ? "todayClientMonthDay" : ""
                                } ${
                                  dateItemCount > 0 ? "hasClientMonthWork" : ""
                                } ${
                                  draggingWorkoutId ? "calendarDropTarget" : ""
                                }`}
                                onDragOver={(event) => {
                                  event.preventDefault();
                                  event.dataTransfer.dropEffect = "move";
                                }}
                                onDrop={(event) => {
                                  event.preventDefault();
                                  setCalendarDropWorkoutId("");
                                  const transferId =
                                    event.dataTransfer.getData("text/plain") ||
                                    draggingWorkoutId;
                                  const workout = workouts.find(
                                    (item: any) => item.id === transferId
                                  );

                                  if (workout) {
                                    void moveWorkoutToDate(workout, date);
                                  }
                                }}
                                onClick={() => selectClientCalendarDate(date)}
                              >
                                <span>{dayNumber}</span>
                                <span
                                  className="calendarWorkMarkers"
                                  aria-hidden="true"
                                >
                                  {dateItemCount > 0 ? (
                                    Array.from({
                                      length: Math.min(dateItemCount, 3),
                                    }).map((_, markerIndex) => (
                                      <span key={`${date}-month-marker-${markerIndex}`} />
                                    ))
                                  ) : (
                                    <span className="emptyMarker" />
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </aside>
                    )}

                    {isClientPortal && clientCalendarStyle === "Month" && (
                      <section className="selectedDayGlance monthSelectedDayGlance">
                        <div className="selectedDayGlanceHeader">
                          <span>{localizedCalendarLabel(calendarAnchorDate)}</span>
                          <strong>
                            {selectedCalendarDateItemCount > 0
                              ? t("taskCount", {
                                  count: selectedCalendarDateItemCount,
                                })
                              : t("nothingScheduledShort")}
                          </strong>
                        </div>

                        {selectedCalendarDateItemCount > 0 ? (
                          <>
                          {selectedCalendarDateWorkouts.map((workout: any) => (
                            <button
                              className={`selectedDayWorkout draggableSelectedDayWorkout ${getStatusClass(
                              getDisplayTaskStatus(
                                workout.completionStatus,
                                workout.scheduledDate
                              )
                            )} ${getWorkoutColorClass(
                              workout.sessionName,
                              workout.sessionType
                            )} ${
                                draggingWorkoutId === workout.id
                                  ? "draggingWorkout"
                                  : ""
                              } ${
                                movingWorkoutId === workout.id ? "movingWorkout" : ""
                              } ${
                                calendarDropWorkoutId === workout.id
                                  ? "calendarReorderTarget"
                                  : ""
                              }`}
                              key={workout.id}
                              data-client-calendar-workout-id={workout.id}
                              data-client-calendar-date={calendarAnchorDate}
                              draggable
                              title="Drag to another date or tap to open"
                              onDragStart={(event) => {
                                event.dataTransfer.setData("text/plain", workout.id);
                                event.dataTransfer.effectAllowed = "move";
                                setDraggingWorkoutId(workout.id);
                              }}
                              onDragOver={(event) => {
                                if (
                                  !draggingWorkoutId ||
                                  draggingWorkoutId === workout.id
                                ) {
                                  return;
                                }

                                event.preventDefault();
                                event.stopPropagation();
                                setCalendarDropWorkoutId(workout.id);
                                event.dataTransfer.dropEffect = "move";
                              }}
                              onDrop={(event) =>
                                handleClientCalendarWorkoutDrop(
                                  event,
                                  workout,
                                  calendarAnchorDate
                                )
                              }
                              onDragEnd={() => {
                                setDraggingWorkoutId("");
                                setCalendarDropWorkoutId("");
                              }}
                              onTouchStart={(event) =>
                                startClientCalendarWorkoutTouch(
                                  event,
                                  workout,
                                  calendarAnchorDate
                                )
                              }
                              onTouchMove={moveClientCalendarWorkoutTouch}
                              onTouchEnd={endClientCalendarWorkoutTouch}
                              onTouchCancel={() => {
                                clientCalendarTouchDrag.current = null;
                                setDraggingWorkoutId("");
                                setCalendarDropWorkoutId("");
                              }}
                              onClick={() => {
                                if (suppressClientCalendarTouchClick.current) return;
                                openWorkout(workout);
                              }}
                            >
                              <div>
                                <span>
                                  {t("program")} - {t("week")} {workout.week}, {t("day")} {workout.day}
                                </span>
                                <strong>{localizedWorkoutName(workout)}</strong>
                                <small>
                                  {movingWorkoutId === workout.id
                                    ? t("moving")
                                    : getDisplayTaskStatus(
                                        workout.completionStatus,
                                        workout.scheduledDate
                                      )}
                                </small>
                              </div>
                              <span className="selectedDayWorkoutAction">
                                {t("start")}
                              </span>
                            </button>
                          ))}
                          {selectedCalendarDateAssignments.map((assignment: any) => (
                            <button
                              className={`selectedDayWorkout selectedDayAssignment ${getStatusClass(
                              getDisplayTaskStatus(
                                assignment.status,
                                assignment.dueDate || assignment.assignedDate
                              )
                            )} ${getAssignmentColorClass(
                              assignment.assignmentType
                            )}`}
                              key={assignment.recordId}
                              onClick={() => handleOpenContentAssignment(assignment)}
                            >
                              <div>
                                <span>
                                  {assignment.assignmentType || "Questionnaire"}
                                </span>
                                <strong>
                                  {getAssignmentDisplayName(assignment)}
                                </strong>
                                <small>
                                  {getDisplayTaskStatus(
                                    assignment.status,
                                    assignment.dueDate || assignment.assignedDate
                                  )}
                                </small>
                              </div>
                              <span className="selectedDayWorkoutAction">
                                {String(assignment.assignmentType)
                                  .toLowerCase()
                                  .includes("test")
                                  ? t("start")
                                  : "Answer"}
                              </span>
                              {!isClientPortal && (
                                <span
                                  className="selectedDayDeleteAction"
                                  role="button"
                                  tabIndex={0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void deleteContentAssignment(assignment);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      void deleteContentAssignment(assignment);
                                    }
                                  }}
                                >
                                  Delete
                                </span>
                              )}
                            </button>
                          ))}
                          </>
                        ) : (
                          <p className="homeEmptyText">
                            {t("nothingScheduled")}
                          </p>
                        )}
                      </section>
                    )}

                    {!isClientPortal && calendarView === "Month" && (
                      <div className="coachMonthSchedule">
                        <aside className="clientMonthCalendarCard standaloneClientMonthCalendar">
                          <div className="clientMonthCalendarHeader">
                            <button
                              type="button"
                              className="clientMonthArrow"
                              onClick={() => moveCalendarRange(-1)}
                              aria-label="Previous month"
                            >
                              {"<"}
                            </button>
                            <strong>{formatMonthTitle(calendarAnchorDate)}</strong>
                            <button
                              type="button"
                              className="clientMonthArrow"
                              onClick={() => moveCalendarRange(1)}
                              aria-label="Next month"
                            >
                              {">"}
                            </button>
                          </div>

                          <div className="clientMonthWeekdays">
                            {["MO", "TU", "WE", "TH", "FR", "SA", "SU"].map(
                              (day) => (
                                <span key={day}>{day}</span>
                              )
                            )}
                          </div>

                          <div className="clientMonthGrid">
                            {coachMonthCalendarDates.map((date: any, index: any) => {
                              if (!date) {
                                return (
                                  <span
                                    className="clientMonthDay emptyClientMonthDay"
                                    key={`coach-empty-${index}`}
                                  />
                                );
                              }

                              const dateWorkouts = getWorkoutsForDate(date);
                              const dateItemCount =
                                dateWorkouts.length + getAssignmentsForDate(date).length;
                              const dayNumber = new Date(
                                `${date}T00:00:00`
                              ).getDate();

                              return (
                                <button
                                  type="button"
                                  key={date}
                                  className={`clientMonthDay ${
                                    date === calendarAnchorDate
                                      ? "selectedClientMonthDay"
                                      : ""
                                  } ${
                                    date === todayValue ? "todayClientMonthDay" : ""
                                  } ${
                                    dateItemCount > 0 ? "hasClientMonthWork" : ""
                                  }`}
                                  onClick={() => {
                                    setCalendarAnchorDate(date);
                                    setAssignStartDate(date);
                                    setAssignmentDueDate(date);
                                  }}
                                >
                                  <span>{dayNumber}</span>
                                  <span
                                    className="calendarWorkMarkers"
                                    aria-hidden="true"
                                  >
                                    {dateItemCount > 0 ? (
                                      Array.from({
                                        length: Math.min(dateItemCount, 3),
                                      }).map((_, markerIndex) => (
                                        <span
                                          key={`${date}-coach-month-marker-${markerIndex}`}
                                        />
                                      ))
                                    ) : (
                                      <span className="emptyMarker" />
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </aside>

                        <section className="selectedDayGlance coachSelectedDayGlance">
                          <div className="selectedDayGlanceHeader">
                            <span>{formatCalendarLabel(calendarAnchorDate)}</span>
                            <strong>
                              {selectedCalendarDateItemCount > 0
                                ? `${selectedCalendarDateItemCount} task${
                                    selectedCalendarDateItemCount === 1
                                      ? ""
                                      : "s"
                                  }`
                                : "Nothing scheduled"}
                            </strong>
                          </div>

                          {selectedCalendarDateItemCount > 0 ? (
                            <>
                            {selectedCalendarDateWorkouts.map((workout: any) => (
                              <button
                                className="selectedDayWorkout"
                                key={workout.id}
                                onClick={() => openWorkout(workout)}
                              >
                                <div>
                                  <span>
                                    Week {workout.week} - Day {workout.day}
                                  </span>
                                  <strong>{workout.sessionName || "Workout"}</strong>
                                  <small>
                                    {getDisplayTaskStatus(
                                      workout.completionStatus,
                                      workout.scheduledDate
                                    )}
                                  </small>
                                </div>
                                <span className="selectedDayWorkoutAction">
                                  Open
                                </span>
                              </button>
                            ))}
                            {selectedCalendarDateAssignments.map((assignment: any) => (
                              <button
                                className={`selectedDayWorkout selectedDayAssignment ${getStatusClass(
                              getDisplayTaskStatus(
                                assignment.status,
                                assignment.dueDate || assignment.assignedDate
                              )
                            )} ${getAssignmentColorClass(
                              assignment.assignmentType
                            )}`}
                                key={assignment.recordId}
                                onClick={() => handleOpenContentAssignment(assignment)}
                              >
                                <div>
                                  <span>
                                    {assignment.assignmentType || "Questionnaire"}
                                  </span>
                                  <strong>
                                    {getAssignmentDisplayName(assignment)}
                                  </strong>
                                  <small>
                                    {getDisplayTaskStatus(
                                      assignment.status,
                                      assignment.dueDate || assignment.assignedDate
                                    )}
                                  </small>
                                </div>
                                <span className="selectedDayWorkoutAction">
                                  Open
                                </span>
                                <span
                                  className="selectedDayDeleteAction"
                                  role="button"
                                  tabIndex={0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void deleteContentAssignment(assignment);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      void deleteContentAssignment(assignment);
                                    }
                                  }}
                                >
                                  Delete
                                </span>
                              </button>
                            ))}
                            </>
                          ) : (
                            <p className="homeEmptyText">
                              Nothing scheduled for this date.
                            </p>
                          )}
                          {!isClientPortal && (
                            <>
                            {copiedCalendarItem && (
                              <button
                                className="outlineButton selectedDayAddButton selectedDayPasteButton"
                                type="button"
                                onClick={() =>
                                  void pasteCalendarItemToDate(calendarAnchorDate)
                                }
                              >
                                {copiedCalendarItem.action === "copy" ? (
                                  <Copy size={16} aria-hidden="true" />
                                ) : (
                                  <Scissors size={16} aria-hidden="true" />
                                )}
                                {copiedCalendarItem.action === "copy"
                                  ? "Paste copied item"
                                  : "Paste cut item"}
                              </button>
                            )}
                            <button
                              className="outlineButton selectedDayAddButton"
                              type="button"
                              onClick={() =>
                                openAssignmentHubFromCalendar(
                                  "Program",
                                  calendarAnchorDate
                                )
                              }
                            >
                              <Plus size={16} aria-hidden="true" />
                              Add item to this date
                            </button>
                            </>
                          )}
                        </section>
                      </div>
                    )}
                  </div>
                </div>
    </>
  );
}
