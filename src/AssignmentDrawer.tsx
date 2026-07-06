// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatCalendarLabel, normalizeDate } from "./appCore";
import "./AssignmentDrawer.css";

export default function AssignmentDrawer({
  assignLoading,
  assignProgramKind,
  assignProgramToClient,
  assignStartDate,
  assignableWorkouts,
  assigningProgram,
  assignmentDueDate,
  assignmentTemplateId,
  assignmentTemplateOptions,
  assignmentType,
  calendarAnchorDate,
  calendarAssignmentDateInputRef,
  closeAssignmentDrawer,
  createContentAssignment,
  creatingAssignment,
  loadProgramSessionsForAssignment,
  programs,
  savedFormTemplates,
  savedTestTemplates,
  selectedAssignProgramId,
  selectedClient,
  setAssignStartDate,
  setAssignableWorkouts,
  setAssignmentClientId,
  setAssignmentDueDate,
  setAssignmentTemplateId,
  setAssignmentType,
  setCalendarAnchorDate,
  setSelectedAssignProgramId,
  shiftAssignableWorkoutsToStartDate,
  updateAssignableWorkoutDate,
}: { [key: string]: any }) {
  return (
    <>
          <div
            className="assignmentDrawerOverlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeAssignmentDrawer();
              }
            }}
          >
            <aside className="assignmentDrawer">
              <div className="assignmentDrawerHeader">
                <div>
                  <span>Assign</span>
                  <h2>New Task</h2>
                  <p>
                    {selectedClient.name} / {formatCalendarLabel(assignmentDueDate)}
                  </p>
                </div>
                <button
                  className="drawerClose"
                  onClick={closeAssignmentDrawer}
                  type="button"
                >
                  x
                </button>
              </div>

              <div className="assignmentDrawerTypes">
                {(["Program", "Questionnaire", "Physical Test", "Check-in"] as const).map(
                  (type) => (
                    <button
                      key={type}
                      className={assignmentType === type ? "active" : ""}
                      type="button"
                      onClick={() => {
                        setAssignmentType(type);
                        if (type === "Program") {
                          setAssignmentTemplateId("");
                        } else if (type === "Physical Test") {
                          const activeTests = savedTestTemplates.filter(
                            (test: any) => test.status !== "Archived"
                          );

                          setAssignmentTemplateId(
                            activeTests.length === 1
                              ? activeTests[0].testTemplateId
                              : ""
                          );
                        } else {
                          const formsForType = savedFormTemplates.filter((form: any) => {
                            const formType = form.type.toLowerCase();
                            return (
                              form.status !== "Archived" &&
                              (type === "Check-in"
                                ? formType.includes("check") ||
                                    formType.includes("readiness")
                                : true)
                            );
                          });

                          setAssignmentTemplateId(
                            formsForType.length === 1 ? formsForType[0].formId : ""
                          );
                        }
                        setAssignableWorkouts([]);
                        setAssignmentClientId(selectedClient.id);
                        setAssignmentDueDate(calendarAnchorDate);
                        setAssignStartDate(calendarAnchorDate);
                      }}
                    >
                      {type}
                    </button>
                  )
                )}
              </div>

              <div className="assignmentDrawerForm">
                <label>
                  <span>Client</span>
                  <input value={selectedClient.name} readOnly />
                </label>

                <label>
                  <span>Start Date</span>
                  <input
                    ref={calendarAssignmentDateInputRef}
                    type="date"
                    value={
                      assignmentType === "Program"
                        ? assignStartDate
                        : assignmentDueDate
                    }
                    onChange={(event) => {
                      const nextDate = normalizeDate(event.target.value);

                      setCalendarAnchorDate(nextDate);
                      setAssignmentDueDate(nextDate);

                      if (assignmentType === "Program") {
                        shiftAssignableWorkoutsToStartDate(nextDate);
                      }
                    }}
                  />
                </label>

                {assignmentType === "Program" ? (
                  <label className="assignmentDrawerWide">
                    <span>
                      {assignProgramKind === "session"
                        ? "Saved Session"
                        : "Saved Program"}
                    </span>
                    {(() => {
                      const assignList = programs.filter((p: any) =>
                        assignProgramKind === "session"
                          ? p.productType === "Single Workout"
                          : p.productType !== "Single Workout"
                      );
                      return (
                        <select
                          value={selectedAssignProgramId}
                          onChange={(event) => {
                            setSelectedAssignProgramId(event.target.value);
                            setAssignableWorkouts([]);
                          }}
                        >
                          {assignList.length > 0 ? (
                            assignList.map((program: any) => (
                              <option
                                key={program.recordId}
                                value={program.programId}
                              >
                                {program.programName}
                              </option>
                            ))
                          ) : (
                            <option value="">
                              {assignProgramKind === "session"
                                ? "No saved sessions"
                                : "No saved programs"}
                            </option>
                          )}
                        </select>
                      );
                    })()}
                  </label>
                ) : (
                  <label className="assignmentDrawerWide">
                    <span>
                      {assignmentType === "Physical Test"
                        ? "Saved Test"
                        : "Saved Form"}
                    </span>
                    <select
                      key={assignmentType}
                      value={assignmentTemplateId}
                      onChange={(event) =>
                        setAssignmentTemplateId(event.target.value)
                      }
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
              </div>

              {assignmentType === "Program" && assignableWorkouts.length > 0 && (
                <div className="assignmentDrawerSessions">
                  <div>
                    <span>Program Preview</span>
                    <strong>{assignableWorkouts.length} sessions</strong>
                  </div>
                  {assignableWorkouts.map((workout: any) => (
                    <label key={workout.localId} className="drawerSessionRow">
                      <span>
                        Week {workout.week}, Day {workout.day}
                        <strong>{workout.sessionName}</strong>
                      </span>
                      <input
                        type="date"
                        value={workout.scheduledDate}
                        onChange={(event) =>
                          updateAssignableWorkoutDate(
                            workout.localId,
                            event.target.value
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              )}

              <div className="assignmentDrawerActions">
                <button
                  className="outlineButton"
                  onClick={closeAssignmentDrawer}
                  type="button"
                >
                  Cancel
                </button>

                {assignmentType === "Program" && (
                  <button
                    className="outlineButton"
                    onClick={loadProgramSessionsForAssignment}
                    disabled={assignLoading}
                    type="button"
                  >
                    {assignLoading ? "Loading..." : "Load Sessions"}
                  </button>
                )}

                <button
                  className="goldButton"
                  disabled={
                    assignmentType === "Program"
                      ? assigningProgram
                      : creatingAssignment
                  }
                  onClick={() => {
                    if (assignmentType === "Program") {
                      void assignProgramToClient();
                      return;
                    }

                    void createContentAssignment({
                      assignmentType,
                      assignmentTemplateId,
                      assignmentClientId: selectedClient.id,
                      assignmentDueDate: normalizeDate(
                        calendarAssignmentDateInputRef.current?.value ||
                          assignmentDueDate
                      ),
                    });
                  }}
                  type="button"
                >
                  {assignmentType === "Program"
                    ? assigningProgram
                      ? "Assigning..."
                      : assignProgramKind === "session"
                      ? "Assign Session"
                      : "Assign Program"
                    : creatingAssignment
                    ? "Assigning..."
                    : "Assign Task"}
                </button>
              </div>
            </aside>
          </div>
    </>
  );
}
