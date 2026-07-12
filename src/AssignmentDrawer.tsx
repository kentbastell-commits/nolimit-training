// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { formatCalendarLabel, normalizeDate } from "./appCore";
import "./AssignmentDrawer.css";

export default function AssignmentDrawer({
  assignLoading,
  assignProgramKind,
  setAssignProgramKind,
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
  // Local filter for the Saved Session picker — narrow the list by session type
  // (Cardio, Mobility, Strength…) so a coach can find the session they built.
  const [sessionTypeFilter, setSessionTypeFilter] = useState("All");

  // The list the Saved Session/Program select shows, after kind + type filters.
  const assignList = (programs || []).filter((p: any) =>
    assignProgramKind === "session"
      ? p.productType === "Single Workout" &&
        (sessionTypeFilter === "All" ||
          (p.sessionType || "").trim() === sessionTypeFilter)
      : p.productType !== "Single Workout"
  );

  // Keep the selection honest: with value="" (or a value filtered out of the
  // list) the browser DISPLAYS the first option while React state holds
  // nothing — and with a single option onChange can never fire, so "Assign"
  // rejected a fully-filled form ("Please select a client and program").
  // Whenever the visible list no longer contains the selected id, adopt the
  // first item and drop sessions loaded for the previous selection.
  useEffect(() => {
    if (assignmentType !== "Program") return;
    if (assignList.some((p: any) => p.programId === selectedAssignProgramId)) {
      return;
    }
    setSelectedAssignProgramId(assignList[0]?.programId || "");
    setAssignableWorkouts([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assignmentType,
    assignProgramKind,
    sessionTypeFilter,
    programs,
    selectedAssignProgramId,
  ]);
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
                {/* Four coach-facing categories. "Session" and "Program" are the
                    same internal assignmentType ("Program") split by
                    assignProgramKind (Single Workout vs multi-week plan). "Form"
                    and "Test Item" are display labels for the persisted
                    "Questionnaire" / "Physical Test" types — the stored values
                    never change. Check-in forms remain assignable under Form. */}
                {([
                  { label: "Session", type: "Program", kind: "session" },
                  { label: "Program", type: "Program", kind: "program" },
                  { label: "Form", type: "Questionnaire" },
                  { label: "Test Item", type: "Physical Test" },
                ] as const).map((opt) => {
                  const active =
                    opt.type === "Program"
                      ? assignmentType === "Program" &&
                        assignProgramKind === opt.kind
                      : assignmentType === opt.type;
                  return (
                    <button
                      key={opt.label}
                      className={active ? "active" : ""}
                      type="button"
                      onClick={() => {
                        setAssignmentType(opt.type);
                        if (opt.type === "Program") {
                          setAssignProgramKind(opt.kind);
                          setAssignmentTemplateId("");
                          setSelectedAssignProgramId("");
                        } else if (opt.type === "Physical Test") {
                          const activeTests = savedTestTemplates.filter(
                            (test: any) => test.status !== "Archived"
                          );
                          setAssignmentTemplateId(
                            activeTests.length === 1
                              ? activeTests[0].testTemplateId
                              : ""
                          );
                        } else {
                          const formsForType = savedFormTemplates.filter(
                            (form: any) => form.status !== "Archived"
                          );
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
                      {opt.label}
                    </button>
                  );
                })}
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

                {assignmentType === "Program" &&
                  assignProgramKind === "session" &&
                  (() => {
                    const sessionTypes = Array.from(
                      new Set(
                        programs
                          .filter((p: any) => p.productType === "Single Workout")
                          .map((p: any) => (p.sessionType || "").trim())
                          .filter(Boolean)
                      )
                    ).sort();
                    if (sessionTypes.length === 0) return null;
                    return (
                      <label className="assignmentDrawerWide">
                        <span>Session Type</span>
                        <select
                          value={sessionTypeFilter}
                          onChange={(event) =>
                            setSessionTypeFilter(event.target.value)
                          }
                        >
                          <option value="All">All types</option>
                          {sessionTypes.map((type: any) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  })()}

                {assignmentType === "Program" ? (
                  <label className="assignmentDrawerWide">
                    <span>
                      {assignProgramKind === "session"
                        ? "Saved Session"
                        : "Saved Program"}
                    </span>
                    {(() => {
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
