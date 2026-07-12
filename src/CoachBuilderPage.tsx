// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ProgramExercise } from "./appCore";
import "./CoachBuilderPage.css";
import { isCardioCategory } from "./appCore";
import { Fragment, useState } from "react";
import CoachProgramsLanding from "./CoachProgramsLanding";
import { BookOpen, ChevronDown, ChevronLeft, ChevronsLeftRight, Copy, Dumbbell, Eye, GripVertical, Link2, MoreVertical, Pencil, Plus, RefreshCw, Settings, Shuffle, Trash2, X } from "lucide-react";
import type { Program, ProgramSession } from "./appCore";
import { getWorkoutColorClass, normalizeDate } from "./appCore";
import { TEST_CATEGORIES, testCategoryLabelKey } from "./testVisuals";
import { useTranslation } from "react-i18next";

// Type/form badge tones for the Library · Programming lists (redesign).
const WK_TYPE_TONE: Record<string, { background: string; color: string }> = {
  "Online Coaching": { background: "#e8f0ff", color: "#1f5fd6" },
  "In-Person Training": { background: "#eef6ec", color: "#2f7d32" },
  "Digital Program": { background: "#fbf1dd", color: "#a9791a" },
  "Digital Bundle": { background: "#f3ecfb", color: "#6a2f9e" },
  "Digital Add-on": { background: "#e6f6f7", color: "#0c7382" },
};
const wkTypeTone = (t?: string) =>
  WK_TYPE_TONE[t || ""] || { background: "#efece5", color: "#6b6459" };
const WK_FORM_TONE: Record<string, { background: string; color: string }> = {
  Intake: { background: "#e8f0ff", color: "#1f5fd6" },
  "Check-in": { background: "#eef6ec", color: "#2f7d32" },
  Readiness: { background: "#fbf1dd", color: "#a9791a" },
  Assessment: { background: "#f3ecfb", color: "#6a2f9e" },
  Questionnaire: { background: "#f3ecfb", color: "#6a2f9e" },
  Feedback: { background: "#e6f6f7", color: "#0c7382" },
};
const wkFormTone = (t?: string) =>
  WK_FORM_TONE[t || ""] || { background: "#efece5", color: "#6b6459" };

export default function CoachBuilderPage({
  builderScope,
  accessoryTargetIndex,
  copiedSession,
  mobileDragIndex,
  mobileDragOverIndex,
  programSessionDropId,
  selectedSavedFormId,
  selectedSavedProgramId,
  selectedSavedTestId,
  usePercentExerciseIndexes,
  activeWorkoutTabValue,
  addAlternateExercise,
  addCurrentSessionToProgram,
  addExerciseToProgram,
  addFormQuestion,
  addMobileDayToWeek,
  addTestItem,
  adjustProgramExerciseSets,
  alternateSearch,
  applyBulkPrescription,
  arrangementDragIndex,
  arrangementDropIndex,
  assignSavedProgramToClient,
  assignmentClientId,
  assignmentDueDate,
  assignmentHubDateInputRef,
  assignmentTemplateId,
  assignmentTemplateOptions,
  assignmentType,
  buildGlanceChain,
  builderEquipFilter,
  builderExercises,
  builderLibraryMode,
  builderModalListRef,
  builderMode,
  builderSaveStatus,
  builderSearch,
  builderSectionOptions,
  builderSubTab,
  bulkEditMode,
  bulkReps,
  bulkRest,
  bulkSelectedIdx,
  bulkSets,
  clearCurrentProgramSession,
  clientNameForCode,
  clients,
  coachVisibleClients,
  collapsedDays,
  commitMobilePicker,
  createContentAssignment,
  creatingAssignment,
  customBuilderSectionName,
  deleteSavedFormTemplate,
  deleteSavedProgram,
  deleteSavedTestTemplate,
  deletingSavedProgramId,
  draggedLibSessionId,
  draggedProgramSessionId,
  duplicateProgramExercise,
  duplicateProgramSession,
  duplicateSavedFormIntoBuilder,
  duplicateSavedProgram,
  duplicateSavedTestIntoBuilder,
  duplicateWeek,
  duplicatingProgramId,
  editProgramRecordId,
  editingFormTemplate,
  editingProgramSessionId,
  editingTestTemplate,
  estimateSessionMinutes,
  existingStoreCategories,
  finishMobileProgram,
  formQuestions,
  formTemplateName,
  formTemplateType,
  formTemplatesLoading,
  formView,
  getBuilderOrderItems,
  getBuilderSectionSelectOptions,
  insertLibSessionIntoCurrentDay,
  insertLibrarySessionAtCell,
  insertSavedSessionExercises,
  isBuilderLibraryOpen,
  isBuilderOrderOpen,
  isCircuitGroupStart,
  isExerciseLinkedWithPrevious,
  isSingleWorkoutBuilder,
  latestBuilderExerciseIndex,
  latestBuilderExerciseRef,
  libraryExercises,
  libraryLoading,
  linkExerciseWithPrevious,
  loadFormTemplates,
  loadPrograms,
  loadSavedFormIntoBuilder,
  loadSavedProgramIntoBuilder,
  loadSavedProgramSessionsForAssignment,
  loadSavedTestIntoBuilder,
  loadSessionForEditing,
  loadSessionLibrary,
  loadTestTemplates,
  mobileAlternateIndex,
  mobileArrangeItemsRef,
  mobileArrangeRefs,
  mobileBuilderStep,
  mobileDetailsIndex,
  mobileMenuIndex,
  mobilePickerSelected,
  moveSessionToCell,
  normalizeBuilderSection,
  openBuilderLibrary,
  openMobileAlternate,
  openMobileLibPick,
  openMobilePicker,
  pendingSectionName,
  programAccessLengthDays,
  programBuiltForClient,
  programBuiltForMode,
  programBuiltForTeam,
  programBundleIds,
  programBundleSearch,
  programCurrency,
  programDay,
  programDefaultIntakeFormId,
  programDetailsOpen,
  programDurationWeeks,
  programGoal,
  programGridDrop,
  programName,
  programPhase,
  programPrice,
  programCompareAtPrice,
  programSeason,
  programProductChecklist,
  programProductReadyCount,
  programProductReadyForSale,
  programProductStatus,
  programProductType,
  programPurchaseLink,
  programSalesDescription,
  programSalesDescriptionCn,
  programSessions,
  programStoreCategory,
  programStoreCategoryCn,
  programStoreFieldsVisible,
  programWeek,
  programs,
  programsLoading,
  removeAlternateExercise,
  removeFormQuestion,
  removeProgramExercise,
  removeProgramSession,
  removeTestItem,
  renderAlternateExerciseEditor,
  renderBuilderExerciseOptionsMenu,
  renderExerciseLabelBadge,
  renderMobileSetTable,
  renderSetPrescriptionTable,
  reorderAlternateExercise,
  reorderProgramExercise,
  reorderProgramSession,
  saveCurrentSessionToProgram,
  saveFormTemplate,
  saveFullProgram,
  saveMobileProgramDay,
  saveMobileWorkout,
  saveTestTemplate,
  savedAssignClientId,
  savedAssignLoading,
  savedAssignStartDate,
  savedAssignableWorkouts,
  savedAssigningProgram,
  savedFormSearch,
  savedFormTemplates,
  savedProgramProductFilter,
  savedProgramSearch,
  savedProgramSessions,
  savedTemplatesLoading,
  savedTestSearch,
  savedTestTemplates,
  savingFormTemplate,
  savingTemplate,
  savingTestTemplate,
  selectBuilderSection,
  selectWorkoutTab,
  selectedProgramExercises,
  selectedSavedProgram,
  sessionEditorOpen,
  sessionEstimatedDuration,
  sessionGoal,
  sessionIntensity,
  sessionLibLoading,
  sessionLibProgramId,
  sessionLibSessions,
  sessionName,
  sessionNotes,
  sessionSetupOpen,
  sessionType,
  setAlternateSearch,
  setArrangementDragIndex,
  setArrangementDropIndex,
  setAssignmentClientId,
  setAssignmentDueDate,
  setAssignmentTemplateId,
  setAssignmentType,
  setBuilderEquipFilter,
  setBuilderLibraryModeAndLoad,
  setBuilderMode,
  setBuilderSearch,
  setBuilderSubTab,
  setBulkEditMode,
  setBulkReps,
  setBulkRest,
  setBulkSelectedIdx,
  setBulkSets,
  setCalendarAnchorDate,
  setCellMenu,
  setCircuitGroupMode,
  setCircuitGroupRounds,
  setCollapsedDays,
  setCreateProgramOpen,
  setCustomBuilderSectionName,
  setDraggedLibSessionId,
  setDraggedProgramSessionId,
  setFormTemplateName,
  setFormTemplateType,
  setFormView,
  setIsBuilderLibraryOpen,
  setIsBuilderOrderOpen,
  setMobileAlternateIndex,
  setMobileBuilderStep,
  setMobileDetailsIndex,
  setMobileMenuIndex,
  setMobilePickerSelected,
  setPendingSectionName,
  setProgramAccessLengthDays,
  setProgramBuiltForClient,
  setProgramBuiltForMode,
  setProgramBuiltForTeam,
  setProgramBundleIds,
  setProgramBundleSearch,
  setProgramCurrency,
  setProgramDay,
  setProgramDefaultIntakeFormId,
  setProgramDetailsOpen,
  setProgramDurationWeeks,
  setProgramGoal,
  setProgramGridDrop,
  setProgramMenu,
  setProgramName,
  setProgramPhase,
  setProgramPrice,
  setProgramCompareAtPrice,
  setProgramSeason,
  setProgramProductStatus,
  setProgramProductType,
  setProgramPurchaseLink,
  setProgramSalesDescription,
  setProgramSalesDescriptionCn,
  setProgramSessionDropId,
  setProgramStoreCategory,
  setProgramStoreCategoryCn,
  setProgramWeek,
  setSavedAssignClientId,
  setSavedAssignStartDate,
  setSavedAssignableWorkouts,
  setSavedFormSearch,
  setSavedProgramProductFilter,
  setSavedProgramSearch,
  setSavedTestSearch,
  setSelectedProgramExercises,
  setSelectedSavedFormId,
  setSelectedSavedProgramId,
  setSelectedSavedTestId,
  setSessionEditorOpen,
  setSessionGoal,
  setSessionIntensity,
  setSessionLibProgramId,
  setSessionLibSessions,
  setSessionName,
  setSessionNotes,
  setSessionSetupOpen,
  setSessionType,
  setShowProgramDetail,
  setTestTemplateCategory,
  setTestTemplateName,
  exitTestBuilder,
  setWeekDupMenu,
  setWeekDupPct,
  setWorkoutTabsMenuOpen,
  showDigitalProductSettings,
  showProgramDetail,
  startMobileDrag,
  startNewSession,
  teams,
  testItems,
  testTemplateCategory,
  testTemplateName,
  testTemplatesLoading,
  testView,
  toggleBuilderCircuitLink,
  toggleBuilderSupersetLink,
  toggleMobilePick,
  toggleUsePercent,
  unlinkExerciseGroup,
  updateExerciseGrouping,
  updateFormQuestion,
  updateProgramExercise,
  updateSavedAssignableWorkoutDate,
  updateTestItem,
  useMobileWorkoutRows,
  visibleProgramsOnly,
  visibleSavedForms,
  visibleSavedTests,
  visibleSessionsOnly,
  weekDupMenu,
  weekDupPct,
  weekVolume,
  workoutPageTab,
  workoutTabList,
  workoutTabsMenuOpen,
}: { [key: string]: any }) {
  const { t } = useTranslation();
  // Which built-session exercise is open in the edit popup (null = none).
  // Editing moved off the row (rows are now compact + drag-only) into a modal.
  const [editExerciseIndex, setEditExerciseIndex] = useState<number | null>(
    null
  );
  // Optional fields in the editor reveal on demand (matching the "+ Tempo" /
  // "+ Cue" chips) so the popup stays clean until a coach needs them.
  const [cueOpen, setCueOpen] = useState(false);
  const [tempoOpen, setTempoOpen] = useState(false);
  const openExerciseEditor = (i: number) => {
    setCueOpen(false);
    setTempoOpen(false);
    setEditExerciseIndex(i);
  };
  // In the Digital "Product Builder", order the list by sport, then that
  // sport's bundles, with all add-ons last — inserting {__divider} rows.
  const groupDigitalList = (list: any[]) => {
    const isAddon = (p: any) =>
      (p.storeListingType || "").toLowerCase() === "add-on" ||
      p.productType === "Digital Add-on";
    const isBundle = (p: any) =>
      (p.storeListingType || "").toLowerCase() === "bundle" ||
      p.productType === "Digital Bundle";
    const key = (p: any) =>
      isAddon(p)
        ? "zzz~add-ons"
        : isBundle(p)
          ? `${p.storeCategory || "Other"}~1bundles`
          : `${p.storeCategory || "Other"}~0`;
    const label = (p: any) =>
      isAddon(p)
        ? "Add-ons"
        : isBundle(p)
          ? `${p.storeCategory || "Other"} · Bundles`
          : p.storeCategory || "Other";
    const sorted = [...list].sort((a, b) => key(a).localeCompare(key(b)));
    const out: any[] = [];
    let last: string | null = null;
    for (const p of sorted) {
      const lbl = label(p);
      if (lbl !== last) {
        out.push({ __divider: lbl });
        last = lbl;
      }
      out.push(p);
    }
    return out;
  };
  return (
    <>
              <>
                {builderScope === "digital" ? null : (() => {
                  // Redesigned Library · Programming hub — header + per-tab KPI
                  // board + segmented tabs. Numbers derived from the real arrays.
                  const isListTab =
                    workoutPageTab === "Saved Programs" ||
                    workoutPageTab === "Sessions" ||
                    workoutPageTab === "Forms";
                  const P = programs || [];
                  const S = visibleSessionsOnly || [];
                  const F = savedFormTemplates || [];
                  const grp = (t: string) =>
                    /online coaching|in.?person/i.test(t || "")
                      ? "coaching"
                      : /digital/i.test(t || "")
                      ? "digital"
                      : "internal";
                  const coaching = P.filter((p: any) => grp(p.productType) === "coaching").length;
                  const digital = P.filter((p: any) => grp(p.productType) === "digital").length;
                  const templates = P.filter((p: any) => grp(p.productType) === "internal").length;
                  const workoutsBuilt = P.reduce(
                    (a: number, p: any) =>
                      a + (Number(p.durationWeeks) || 0) * (Number(p.sessionsPerWeek) || 0),
                    0
                  );
                  const liveCount = P.filter((p: any) => p.publicStoreVisible).length;
                  const sessFocus = new Set(S.map((s: any) => s.goal).filter(Boolean)).size;
                  const sessLevels = new Set(S.map((s: any) => s.level).filter(Boolean)).size;
                  const fType = (re: RegExp) => F.filter((f: any) => re.test(f.type || "")).length;
                  const intakeN = fType(/intake/i);
                  const checkinN = fType(/check.?in|readiness/i);
                  const assessN = fType(/assessment|questionnaire|custom|feedback/i);
                  const formTypes = new Set(F.map((f: any) => f.type).filter(Boolean)).size;

                  let board: any = null;
                  if (workoutPageTab === "Sessions") {
                    board = {
                      eyebrow: "Reusable sessions",
                      mainNum: S.length,
                      mainLabel: "saved session templates",
                      breakdown: [
                        { num: sessFocus, label: "focus areas" },
                        { num: sessLevels, label: "levels" },
                      ],
                      statEyebrow: "Focus areas",
                      statNum: sessFocus,
                      statLabel: "across your sessions",
                      statNote: "Drag any session into the builder to reuse it.",
                    };
                  } else if (workoutPageTab === "Forms") {
                    board = {
                      eyebrow: "Forms",
                      mainNum: F.length,
                      mainLabel: "intake, check-in & assessment",
                      breakdown: [
                        { num: intakeN, label: "intake" },
                        { num: checkinN, label: "check-in" },
                        { num: assessN, label: "assessment" },
                      ],
                      statEyebrow: "Form types",
                      statNum: formTypes,
                      statLabel: "in your library",
                      statNote: "Set a default intake form per program.",
                    };
                  } else {
                    board = {
                      eyebrow: "Your programs",
                      mainNum: P.length,
                      mainLabel: "programs, bundles & add-ons",
                      breakdown: [
                        { num: coaching, label: "coaching" },
                        { num: digital, label: "digital" },
                        { num: templates, label: "templates" },
                      ],
                      statEyebrow: "Workouts built",
                      statNum: workoutsBuilt,
                      statLabel: "across all programs",
                      statNote: `${liveCount} live on the store right now.`,
                    };
                  }
                  const createLabel =
                    workoutPageTab === "Sessions"
                      ? "Create session"
                      : workoutPageTab === "Forms"
                      ? "Create form"
                      : "Create program";
                  const onCreate = () => {
                    if (workoutPageTab === "Sessions") startNewSession();
                    else if (workoutPageTab === "Forms") setFormView("builder");
                    else setCreateProgramOpen(true);
                  };

                  return (
                    <div className="wkHub">
                      <div className="wkHead">
                        <div>
                          <span className="wkEyebrow">
                            <BookOpen size={14} /> Library · Programming
                          </span>
                          <h1>Workouts</h1>
                          <p>
                            Your programs, reusable sessions, and intake forms —
                            build once, assign anywhere.
                          </p>
                        </div>
                        {isListTab && (
                          <button type="button" className="wkCreateBtn" onClick={onCreate}>
                            <Plus size={17} /> {createLabel}
                          </button>
                        )}
                      </div>

                      {isListTab && (
                        <div className="wkBoard">
                          <div className="wkBoardDark">
                            <div className="wkBoardGlow" />
                            <span className="wkBoardEyebrow">{board.eyebrow}</span>
                            <div className="wkBoardBig">
                              <span>{board.mainNum}</span>
                              <small>{board.mainLabel}</small>
                            </div>
                            <div className="wkBoardBreak">
                              {board.breakdown.map((b: any) => (
                                <span key={b.label}>
                                  <strong>{b.num}</strong> {b.label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="wkBoardLight">
                            <span className="wkBoardEyebrowLight">{board.statEyebrow}</span>
                            <div className="wkBoardBig">
                              <span className="wkBoardBigDark">{board.statNum}</span>
                              <small>{board.statLabel}</small>
                            </div>
                            <p>{board.statNote}</p>
                          </div>
                        </div>
                      )}

                      {useMobileWorkoutRows ? (
                        <div
                          className={`workoutTabMenu ${
                            workoutTabsMenuOpen ? "workoutTabMenuOpen" : ""
                          }`}
                        >
                          <button
                            className="workoutTabMenuTrigger"
                            aria-expanded={workoutTabsMenuOpen}
                            onClick={() => setWorkoutTabsMenuOpen((open: any) => !open)}
                          >
                            <span>
                              {workoutTabList.find(
                                (t: any) => t.value === activeWorkoutTabValue
                              )?.label || "Programs"}
                            </span>
                            <ChevronDown size={18} className="workoutTabMenuCaret" />
                          </button>
                          {workoutTabsMenuOpen && (
                            <div className="workoutTabMenuList">
                              {workoutTabList.map((tab: any) => (
                                <button
                                  key={tab.value}
                                  className={
                                    activeWorkoutTabValue === tab.value ? "active" : ""
                                  }
                                  onClick={() => {
                                    selectWorkoutTab(tab.value);
                                    setWorkoutTabsMenuOpen(false);
                                  }}
                                >
                                  {tab.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="wkTabs">
                          {workoutTabList.map((tab: any) => {
                            const count =
                              tab.value === "Sessions"
                                ? S.length
                                : tab.value === "Forms"
                                ? F.length
                                : P.length;
                            return (
                              <button
                                key={tab.value}
                                type="button"
                                className={`wkTab${
                                  activeWorkoutTabValue === tab.value ? " on" : ""
                                }`}
                                onClick={() => selectWorkoutTab(tab.value)}
                              >
                                <span>{tab.label}</span>
                                <span className="wkTabCount">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {(workoutPageTab === "Saved Programs" ||
                  workoutPageTab === "Sessions") &&
                  (() => {
                  const sessionsTab = workoutPageTab === "Sessions";
                  const libraryList = sessionsTab
                    ? visibleSessionsOnly
                    : visibleProgramsOnly;
                  if (builderScope === "digital" && !sessionsTab) {
                    return (
                      <CoachProgramsLanding
                        programs={programs}
                        visibleProgramsOnly={visibleProgramsOnly}
                        programsLoading={programsLoading}
                        savedProgramProductFilter={savedProgramProductFilter}
                        setSavedProgramProductFilter={setSavedProgramProductFilter}
                        savedProgramSearch={savedProgramSearch}
                        setSavedProgramSearch={setSavedProgramSearch}
                        loadPrograms={loadPrograms}
                        setCreateProgramOpen={setCreateProgramOpen}
                        setSelectedSavedProgramId={setSelectedSavedProgramId}
                        setSavedAssignableWorkouts={setSavedAssignableWorkouts}
                        setShowProgramDetail={setShowProgramDetail}
                        showProgramDetail={showProgramDetail}
                        selectedSavedProgram={selectedSavedProgram}
                        loadSavedProgramIntoBuilder={loadSavedProgramIntoBuilder}
                        duplicateSavedProgram={duplicateSavedProgram}
                        duplicatingProgramId={duplicatingProgramId}
                        deleteSavedProgram={deleteSavedProgram}
                        deletingSavedProgramId={deletingSavedProgramId}
                        savedProgramSessions={savedProgramSessions}
                        savedTemplatesLoading={savedTemplatesLoading}
                        clientNameForCode={clientNameForCode}
                        teams={teams}
                        coachVisibleClients={coachVisibleClients}
                        clients={clients}
                        savedAssignClientId={savedAssignClientId}
                        setSavedAssignClientId={setSavedAssignClientId}
                        savedAssignStartDate={savedAssignStartDate}
                        setSavedAssignStartDate={setSavedAssignStartDate}
                        savedAssignLoading={savedAssignLoading}
                        savedAssignableWorkouts={savedAssignableWorkouts}
                        savedAssigningProgram={savedAssigningProgram}
                        assignSavedProgramToClient={assignSavedProgramToClient}
                        loadSavedProgramSessionsForAssignment={
                          loadSavedProgramSessionsForAssignment
                        }
                        updateSavedAssignableWorkoutDate={
                          updateSavedAssignableWorkoutDate
                        }
                      />
                    );
                  }
                  return (
                  <section className="programLibraryPanel">
                    <div className="programLibraryHeader programLandingHeader">
                      <div className="programLandingControls">
                        {sessionsTab ? (
                          <span className="programViewSelect programViewStatic">
                            Sessions
                          </span>
                        ) : (
                          <select
                            className={`programViewSelect${
                              builderScope === "digital"
                                ? " programViewSelectSmall"
                                : ""
                            }`}
                            value={savedProgramProductFilter}
                            onChange={(event) =>
                              setSavedProgramProductFilter(event.target.value)
                            }
                          >
                            <option value="All">
                              {builderScope === "digital"
                                ? "All products"
                                : "My Programs"}
                            </option>
                            {builderScope === "digital" ? (
                              <optgroup label="Product type">
                                <option value="type:Digital Program">
                                  Digital programs
                                </option>
                                <option value="type:Digital Bundle">
                                  Bundles
                                </option>
                                <option value="type:Digital Add-on">
                                  Add-ons
                                </option>
                              </optgroup>
                            ) : (
                              <optgroup label="Program type">
                                <option value="type:Online Coaching">
                                  Online coaching
                                </option>
                                <option value="type:In-Person Training">
                                  In-person training
                                </option>
                                <option value="internal">
                                  Internal / general
                                </option>
                              </optgroup>
                            )}
                            {teams.length > 0 && (
                              <optgroup label="By team">
                                {teams.map((tm: any) => (
                                  <option key={tm.id} value={`team:${tm.name}`}>
                                    {tm.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="By client">
                              {coachVisibleClients.map((c: any) => (
                                <option
                                  key={c.id}
                                  value={`client:${c.clientCode || c.id}`}
                                >
                                  {c.name}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        )}
                        <input
                          className="templateSearchInput programLandingSearch"
                          value={savedProgramSearch}
                          onChange={(event) =>
                            setSavedProgramSearch(event.target.value)
                          }
                          placeholder={
                            sessionsTab
                              ? "Search sessions..."
                              : "Search programs..."
                          }
                        />
                      </div>
                      <div className="programLandingActions">
                        <button className="outlineButton" onClick={loadPrograms}>
                          Refresh
                        </button>
                      </div>
                    </div>

                    <div className="programLibraryStack">
                      <div className="programTable">
                        <div className="programTableHead">
                          <span>Title</span>
                          <span>Level</span>
                          <span>Focus</span>
                          <span>Type</span>
                          <span>Created By</span>
                          <span className="programTableActionsHead">Actions</span>
                        </div>

                        {programsLoading && programs.length === 0 && (
                          <p className="programTableEmpty">Loading…</p>
                        )}
                        {!programsLoading && libraryList.length === 0 && (
                          <p className="programTableEmpty">
                            {sessionsTab
                              ? "No saved sessions yet. Create one to reuse across programs."
                              : "No programs match your filter."}
                          </p>
                        )}

                        {(builderScope === "digital" && !sessionsTab
                          ? groupDigitalList(libraryList)
                          : libraryList
                        ).map((program: any) => {
                          if (program.__divider) {
                            return (
                              <div
                                key={`divider-${program.__divider}`}
                                className="programTableGroupDivider"
                              >
                                {program.__divider}
                              </div>
                            );
                          }
                          const initials =
                            (program.programName || "")
                              .split(/\s+/)
                              .map((w: any) => w[0])
                              .filter(Boolean)
                              .join("")
                              .slice(0, 3)
                              .toUpperCase() || "PR";
                          const builtFor = [
                            clientNameForCode(program.builtForClient),
                            program.builtForTeam,
                          ]
                            .filter(Boolean)
                            .join(" · ");
                          return (
                            <div
                              key={program.recordId}
                              className={`programTableRow${
                                selectedSavedProgramId === program.programId
                                  ? " active"
                                  : ""
                              }`}
                              onClick={() => {
                                setSelectedSavedProgramId(program.programId);
                                setSavedAssignableWorkouts([]);
                                setShowProgramDetail(true);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setProgramMenu({
                                  program,
                                  x: e.clientX,
                                  y: e.clientY,
                                });
                              }}
                            >
                              <span className="programTableTitle">
                                <span className="programTableBadge">
                                  {initials}
                                </span>
                                <span className="programTableName">
                                  <strong>{program.programName}</strong>
                                  {builtFor && (
                                    <em className="programBuiltForChip">
                                      {builtFor}
                                    </em>
                                  )}
                                </span>
                              </span>
                              <span className="programTableCell">
                                {program.level || "—"}
                              </span>
                              <span className="programTableCell">
                                {program.goal || "—"}
                              </span>
                              <span className="programTableCell">
                                <span
                                  className="wkTypePill"
                                  style={wkTypeTone(program.productType)}
                                >
                                  {program.productType || "Template"}
                                </span>
                              </span>
                              <span className="programTableCell">
                                {program.coach || "—"}
                              </span>
                              <span
                                className="programTableActions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="iconActionButton"
                                  title="Assign / details"
                                  onClick={() => {
                                    setSelectedSavedProgramId(program.programId);
                                    setSavedAssignableWorkouts([]);
                                    setShowProgramDetail(true);
                                  }}
                                >
                                  <Settings size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="iconActionButton"
                                  title="Duplicate program (copies every session)"
                                  disabled={
                                    duplicatingProgramId === program.recordId
                                  }
                                  onClick={() =>
                                    void duplicateSavedProgram(program)
                                  }
                                >
                                  <Copy size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="iconActionButton dangerMenuItem"
                                  title="Delete program"
                                  disabled={
                                    deletingSavedProgramId === program.recordId
                                  }
                                  onClick={() => deleteSavedProgram(program)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {showProgramDetail && selectedSavedProgram && (
                      <div
                        className="wkSlideScrim"
                        onClick={() => setShowProgramDetail(false)}
                      >
                      <section
                        className="programDetailPanel wkSlide"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {selectedSavedProgram && (
                          <>
                            <div className="programDetailTop">
                              <div>
                                <h3>{selectedSavedProgram.programName}</h3>
                                <p>
                                  {selectedSavedProgram.productType ||
                                    "Internal Coaching Template"}{" "}
                                  / {selectedSavedProgram.status || "--"}
                                </p>
                              </div>

                              <div className="rowActions">
                                <button
                                  className="goldButton"
                                  onClick={() => loadSavedProgramIntoBuilder()}
                                  disabled={savedTemplatesLoading}
                                >
                                  Open in Builder
                                </button>

                                <button
                                  className="outlineButton"
                                  onClick={() => setShowProgramDetail(false)}
                                >
                                  Close
                                </button>

                                <button
                                  className="dangerButton"
                                  onClick={() =>
                                    deleteSavedProgram(selectedSavedProgram)
                                  }
                                  disabled={
                                    deletingSavedProgramId ===
                                    selectedSavedProgram.recordId
                                  }
                                >
                                  {deletingSavedProgramId ===
                                  selectedSavedProgram.recordId
                                    ? "Deleting..."
                                    : "Delete Program"}
                                </button>
                              </div>
                            </div>

                            <div className="programMetaGrid">
                              <span>
                                <strong>Goal</strong>
                                {selectedSavedProgram.goal || "--"}
                              </span>
                              <span>
                                <strong>Sport</strong>
                                {selectedSavedProgram.sport || "--"}
                              </span>
                              <span>
                                <strong>Level</strong>
                                {selectedSavedProgram.level || "--"}
                              </span>
                              <span>
                                <strong>Duration</strong>
                                {selectedSavedProgram.durationWeeks || "--"} weeks
                              </span>
                              <span>
                                <strong>Phase</strong>
                                {selectedSavedProgram.phase || "--"}
                              </span>
                              <span>
                                <strong>Sessions / Week</strong>
                                {selectedSavedProgram.sessionsPerWeek || "--"}
                              </span>
                            </div>

                            <div className="savedAssignPanel">
                              <h3>Assign to Client</h3>

                              <div className="savedAssignGrid">
                                <label>
                                  <span>Client</span>
                                  <select
                                    className="miniSearch"
                                    value={savedAssignClientId}
                                    onChange={(e) => setSavedAssignClientId(e.target.value)}
                                  >
                                    <option value="">Select client</option>
                                    {clients.map((client: any) => (
                                      <option key={client.id} value={client.id}>
                                        {client.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label>
                                  <span>Start Date</span>
                                  <input
                                    type="date"
                                    className="miniSearch"
                                    value={savedAssignStartDate}
                                    onChange={(e) =>
                                      setSavedAssignStartDate(e.target.value)
                                    }
                                  />
                                </label>

                                <button
                                  className="outlineButton"
                                  onClick={loadSavedProgramSessionsForAssignment}
                                  disabled={savedAssignLoading}
                                >
                                  {savedAssignLoading ? "Loading..." : "Load Sessions"}
                                </button>

                                <button
                                  className="goldButton"
                                  onClick={assignSavedProgramToClient}
                                  disabled={savedAssigningProgram}
                                >
                                  {savedAssigningProgram ? "Assigning..." : "Assign Program"}
                                </button>
                              </div>

                              {savedAssignableWorkouts.length > 0 && (
                                <div className="arrangeWorkouts">
                                  <h4>Arrange Workouts</h4>

                                  {savedAssignableWorkouts.map((workout: any) => (
                                    <div
                                      key={workout.localId}
                                      className="arrangeWorkoutRow"
                                    >
                                      <span>Week {workout.week}</span>
                                      <span>Day {workout.day}</span>
                                      <strong>{workout.sessionName}</strong>

                                      <input
                                        type="date"
                                        className="miniSearch"
                                        value={workout.scheduledDate}
                                        onChange={(e) =>
                                          updateSavedAssignableWorkoutDate(
                                            workout.localId,
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="savedProgramSessions">
                              <div className="exerciseTitleRow">
                                <h3>Program Sessions</h3>
                                {savedTemplatesLoading && <span>Loading...</span>}
                              </div>

                              {!savedTemplatesLoading &&
                                savedProgramSessions.length === 0 && (
                                  <p>No template records found for this program.</p>
                                )}

                              {savedProgramSessions.map((session: any) => (
                                <div className="exercise-card" key={session.localId}>
                                  <h3>
                                    Week {session.week} / Day {session.day}:{" "}
                                    {session.sessionName}
                                  </h3>

                                  {session.exercises.map((exercise: any) => (
                                    <p key={`${session.localId}-${exercise.order}`}>
                                      {exercise.order}. {exercise.exerciseName || "--"}
                                    </p>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </section>
                      </div>
                      )}
                    </div>
                  </section>
                  );
                })()}

                {workoutPageTab === "Program Builder" &&
                  !useMobileWorkoutRows && (
              <section className="tableCard programBuilderPanel">
                {workoutPageTab === "Program Builder" && (
                  <button
                    type="button"
                    className="builderBackLink"
                    onClick={() =>
                      selectWorkoutTab(
                        isSingleWorkoutBuilder ? "Sessions" : "Saved Programs"
                      )
                    }
                  >
                    <ChevronLeft size={16} />{" "}
                    {isSingleWorkoutBuilder ? "Sessions" : "Programs"}
                  </button>
                )}

                <h2 className="builderPageTitle">
                  {isSingleWorkoutBuilder
                    ? programName.trim() || "Session Builder"
                    : programName.trim()
                    ? programName.trim()
                    : "Program Builder"}
                </h2>

                {showDigitalProductSettings && (
                  <div className="builderSubTabBar" role="tablist">
                    <button
                      type="button"
                      className={builderSubTab === "build" ? "active" : ""}
                      onClick={() => setBuilderSubTab("build")}
                    >
                      Build
                    </button>
                    <button
                      type="button"
                      className={builderSubTab === "product" ? "active" : ""}
                      onClick={() => setBuilderSubTab("product")}
                    >
                      Product Settings
                    </button>
                  </div>
                )}

                {(builderSubTab === "build" || !showDigitalProductSettings) && (
                <div className="mobileBuilderQuickNav" aria-label="Builder quick navigation">
                  {[
                    ["Details", "builder-details"],
                    ["Session", "builder-session"],
                    ["Exercises", "builder-exercises"],
                    ["Review", "builder-review"],
                  ].map(([label, targetId]) => (
                    <button
                      key={targetId}
                      type="button"
                      onClick={() =>
                        document
                          .getElementById(targetId)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                )}

                {!isSingleWorkoutBuilder && builderSubTab === "build" && (
                <details
                  className="builderCollapsiblePanel programDetailsPanel"
                  id="builder-details"
                  open={programDetailsOpen}
                  onToggle={(e) =>
                    setProgramDetailsOpen(
                      (e.currentTarget as HTMLDetailsElement).open
                    )
                  }
                >
                  <summary>
                    <div>
                      <span className="eyebrow">
                        {isSingleWorkoutBuilder ? "Workout Setup" : "Program Setup"}
                      </span>
                      <strong>
                        {isSingleWorkoutBuilder ? "Workout Details" : "Program Details"}
                      </strong>
                      <small>
                        {programName || "Untitled"}{" "}
                        {!isSingleWorkoutBuilder &&
                          `/ ${programProductType || "Program"} / ${
                            programDurationWeeks || "--"
                          } weeks`}
                      </small>
                    </div>
                    <span className="builderPanelToggle">
                      {programDetailsOpen ? "Hide ▴" : "Show ▾"}
                    </span>
                  </summary>

                  <div className="programDetailsGrid">
                    <label>
                      <span>{isSingleWorkoutBuilder ? "Workout Name" : "Program Name"}</span>
                      <input
                        value={programName}
                        onChange={(e) => setProgramName(e.target.value)}
                        placeholder={isSingleWorkoutBuilder ? "Workout Name" : "Program Name"}
                        className="miniSearch"
                      />
                    </label>

                    {!isSingleWorkoutBuilder && (
                      <>
                        <label>
                          <span>Goal</span>
                          <input
                            value={programGoal}
                            onChange={(e) => setProgramGoal(e.target.value)}
                            placeholder="e.g. Build muscle"
                            className="miniSearch"
                          />
                        </label>

                        <label>
                          <span>Duration</span>
                          <select
                            value={programDurationWeeks}
                            onChange={(e) =>
                              setProgramDurationWeeks(e.target.value)
                            }
                            className="miniSearch"
                          >
                            {Array.from({ length: 8 }, (_: any, i: any) => i + 1).map(
                              (n) => (
                                <option key={n} value={String(n)}>
                                  {n} week{n === 1 ? "" : "s"}
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        <label>
                          <span>Phase</span>
                          <input
                            value={programPhase}
                            onChange={(e) => setProgramPhase(e.target.value)}
                            placeholder="e.g. Foundation"
                            className="miniSearch"
                          />
                        </label>

                        <label>
                          <span>Program Type</span>
                          <select
                            value={programProductType}
                            onChange={(e) => setProgramProductType(e.target.value)}
                            className="miniSearch"
                          >
                            <option>Digital Program</option>
                            <option>Digital Add-on</option>
                            <option>Digital Bundle</option>
                            <option>Online Coaching</option>
                            <option>In-Person Training</option>
                            <option>Internal Coaching Template</option>
                          </select>
                        </label>

                        {(programProductType === "Online Coaching" ||
                          programProductType === "In-Person Training") && (
                          <label>
                            <span>Assign to</span>
                            <select
                              value={programBuiltForMode}
                              onChange={(e) => {
                                const mode = e.target.value as
                                  | "internal"
                                  | "client"
                                  | "team";
                                setProgramBuiltForMode(mode);
                                if (mode !== "client") setProgramBuiltForClient("");
                                if (mode !== "team") setProgramBuiltForTeam("");
                              }}
                              className="miniSearch"
                            >
                              <option value="internal">Internal (general)</option>
                              <option value="client">Client</option>
                              <option value="team">Team</option>
                            </select>
                          </label>
                        )}

                        {(programProductType === "Online Coaching" ||
                          programProductType === "In-Person Training") &&
                          programBuiltForMode === "client" && (
                            <label>
                              <span>Client</span>
                              <select
                                value={programBuiltForClient}
                                onChange={(e) =>
                                  setProgramBuiltForClient(e.target.value)
                                }
                                className="miniSearch"
                              >
                                <option value="">Select client…</option>
                                {coachVisibleClients.map((c: any) => (
                                  <option key={c.id} value={c.clientCode || c.id}>
                                    {c.name}
                                    {c.clientCode ? ` (${c.clientCode})` : ""}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}

                        {(programProductType === "Online Coaching" ||
                          programProductType === "In-Person Training") &&
                          programBuiltForMode === "team" && (
                            <label>
                              <span>Team</span>
                              <select
                                value={programBuiltForTeam}
                                onChange={(e) =>
                                  setProgramBuiltForTeam(e.target.value)
                                }
                                className="miniSearch"
                              >
                                <option value="">Select team…</option>
                                {teams.map((tm: any) => (
                                  <option key={tm.id} value={tm.name}>
                                    {tm.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                      </>
                    )}
                  </div>
                </details>
                )}

                {showDigitalProductSettings && builderSubTab === "product" && (
                  <div className="builderProductPanel builderTabPanel">
                    <div className="builderTabPanelHead">
                      <span className="eyebrow">{programProductType || "Digital Product"}</span>
                      <strong>Product Settings</strong>
                      <small>
                        {programPrice || "--"} {programCurrency || "CNY"} /{" "}
                        {programProductStatus || "Draft"}
                      </small>
                    </div>

                    <div className="programProductGrid">
                  <label>
                    <span>Price ({programCurrency || "CNY"})</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={programPrice}
                      onChange={(e) => setProgramPrice(e.target.value)}
                      placeholder="e.g. 299"
                      className="miniSearch"
                    />
                  </label>

                  <label>
                    <span>Compare-at (was)</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={programCompareAtPrice}
                      onChange={(e) => setProgramCompareAtPrice(e.target.value)}
                      placeholder="optional · struck-through"
                      className="miniSearch"
                    />
                  </label>

                  <label>
                    <span>Currency</span>
                    <select
                      value={programCurrency}
                      onChange={(e) => setProgramCurrency(e.target.value)}
                      className="miniSearch"
                    >
                      <option>CNY</option>
                      <option>USD</option>
                      <option>CAD</option>
                    </select>
                  </label>

                  <label>
                    <span>Access length (days)</span>
                    <input
                      type="number"
                      min="0"
                      value={programAccessLengthDays}
                      onChange={(e) => setProgramAccessLengthDays(e.target.value)}
                      placeholder="42 · blank = lifetime"
                      className="miniSearch"
                    />
                  </label>

                  <label>
                    <span>Product Status</span>
                    <select
                      value={programProductStatus}
                      onChange={(e) => setProgramProductStatus(e.target.value)}
                      className="miniSearch"
                    >
                      <option>Draft</option>
                      <option>Active</option>
                      <option>Hidden</option>
                      <option>Archived</option>
                    </select>
                  </label>

                  <label>
                    <span>Default Intake</span>
                    <select
                      value={programDefaultIntakeFormId}
                      onChange={(e) => setProgramDefaultIntakeFormId(e.target.value)}
                      className="miniSearch"
                    >
                      <option value="">No default intake</option>
                      {savedFormTemplates.map((form: any) => (
                        <option key={form.formId} value={form.formId}>
                          {form.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {programStoreFieldsVisible && (
                    <div className="programStorePlacement">
                      <div className="programCategoryPicker">
                        <span className="programCategoryPickerLabel">
                          Store category (sport)
                        </span>
                        <div className="programCategoryChips">
                          {existingStoreCategories.map((cat: any) => (
                            <button
                              type="button"
                              key={cat}
                              className={`programCategoryChip${
                                programStoreCategory === cat ? " active" : ""
                              }`}
                              onClick={() => setProgramStoreCategory(cat)}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                        <input
                          value={programStoreCategory}
                          onChange={(e) =>
                            setProgramStoreCategory(e.target.value)
                          }
                          placeholder="Pick a label above, or type a new one…"
                          className="miniSearch"
                        />
                      </div>
                      <label>
                        <span>Category name (中文)</span>
                        <input
                          value={programStoreCategoryCn}
                          onChange={(e) =>
                            setProgramStoreCategoryCn(e.target.value)
                          }
                          placeholder="可选 · 如 足球"
                          className="miniSearch"
                        />
                      </label>
                      <label>
                        <span>Season (badge)</span>
                        <input
                          type="number"
                          min="1"
                          value={programSeason}
                          onChange={(e) => setProgramSeason(e.target.value)}
                          placeholder="e.g. 1 → shows S1"
                          className="miniSearch"
                        />
                      </label>
                    </div>
                  )}

                  {programProductType === "Digital Bundle" && (
                      <div className="programBundlePicker">
                        <span className="programBundleLabel">
                          Programs in this bundle
                        </span>
                        <input
                          value={programBundleSearch}
                          onChange={(e) =>
                            setProgramBundleSearch(e.target.value)
                          }
                          placeholder="Search programs to add…"
                          className="miniSearch programBundleSearch"
                        />
                        {(() => {
                          const q = programBundleSearch.trim().toLowerCase();
                          const candidates = programs.filter(
                            (p: any) =>
                              p.status !== "Archived" &&
                              p.productType !== "Digital Bundle" &&
                              (programBundleIds.includes(p.programId) ||
                                !q ||
                                p.programName.toLowerCase().includes(q) ||
                                (p.storeCategory || "")
                                  .toLowerCase()
                                  .includes(q))
                          );
                          const priceNum = (p: Program) =>
                            parseFloat(p.price || "0") || 0;
                          const individualTotal = candidates
                            .filter((p: any) => programBundleIds.includes(p.programId))
                            .reduce((s: any, p: any) => s + priceNum(p), 0);
                          const bundlePrice = parseFloat(programPrice || "0") || 0;
                          const save = individualTotal - bundlePrice;
                          return (
                            <>
                              <div className="programBundleList">
                                {candidates.map((p: any) => {
                                  const checked = programBundleIds.includes(
                                    p.programId
                                  );
                                  return (
                                    <label
                                      className="programBundleRow"
                                      key={p.recordId}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() =>
                                          setProgramBundleIds((prev: any) =>
                                            checked
                                              ? prev.filter(
                                                  (x: any) => x !== p.programId
                                                )
                                              : [...prev, p.programId]
                                          )
                                        }
                                      />
                                      <span>{p.programName}</span>
                                      <span className="programBundleRowPrice">
                                        {priceNum(p)
                                          ? `${p.currency || "CNY"} ${p.price}`
                                          : "--"}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                              {programBundleIds.length > 0 && (
                                <p className="programBundleHint">
                                  Individual total: {individualTotal} · Package
                                  price: {bundlePrice || "set Price above"}
                                  {save > 0 ? ` · Save ${save}` : ""}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                  <label>
                    <span>Purchase Link</span>
                    <input
                      value={programPurchaseLink}
                      onChange={(e) => setProgramPurchaseLink(e.target.value)}
                      placeholder="Optional checkout link"
                      className="miniSearch"
                    />
                  </label>
                    </div>

                    <label className="programSalesDescription">
                      <span>Sales Description (EN)</span>
                      <textarea
                        value={programSalesDescription}
                        onChange={(e) => setProgramSalesDescription(e.target.value)}
                        placeholder="Short product description for the store or order workflow."
                      />
                    </label>

                    <label className="programSalesDescription">
                      <span>销售描述 (中文)</span>
                      <textarea
                        value={programSalesDescriptionCn}
                        onChange={(e) =>
                          setProgramSalesDescriptionCn(e.target.value)
                        }
                        placeholder="店铺中文简介 · 留空则中文用户看到英文描述。"
                      />
                    </label>

                    <div
                      className={`programProductReadiness ${
                        programProductReadyForSale ? "readyForSale" : ""
                      }`}
                    >
                  <div className="programProductReadinessHeader">
                    <div>
                      <span>Product Setup</span>
                      <h3>
                        {programProductReadyForSale
                          ? "Ready for external checkout"
                          : "Prep this program for sale"}
                      </h3>
                    </div>
                    <strong>
                      {programProductReadyCount}/{programProductChecklist.length}
                    </strong>
                  </div>

                  <div className="programProductChecklist">
                    {programProductChecklist.map((item: any) => (
                      <div
                        key={item.label}
                        className={item.complete ? "complete" : ""}
                      >
                        <span>{item.complete ? "Ready" : "Missing"}</span>
                        <strong>{item.label}</strong>
                      </div>
                    ))}
                  </div>
                    </div>
                  </div>
                )}

                {(builderSubTab === "build" || !showDigitalProductSettings) && (
                <>
                {!isSingleWorkoutBuilder && (() => {
                  const maxWeek = programSessions.reduce(
                    (m: any, s: any) => Math.max(m, Number(s.week) || 1),
                    1
                  );
                  const weekCount = Math.max(
                    Number(programDurationWeeks) || 1,
                    maxWeek
                  );
                  const weeks = Array.from({ length: weekCount }, (_: any, i: any) => i + 1);
                  const days = [1, 2, 3, 4, 5, 6, 7];

                  // Live overlay: reflect the in-progress session on the grid
                  // before it is saved (new draft) or while it is being edited.
                  type GridSession = ProgramSession & {
                    __draft?: boolean;
                    __live?: boolean;
                  };
                  const editingExisting =
                    !!editingProgramSessionId &&
                    programSessions.some(
                      (s: any) => s.localId === editingProgramSessionId
                    );
                  const gridSessions: GridSession[] = programSessions.map((s: any) =>
                    s.localId === editingProgramSessionId &&
                    selectedProgramExercises.length > 0
                      ? {
                          ...s,
                          week: programWeek,
                          day: programDay,
                          sessionName: sessionName.trim() || s.sessionName,
                          sessionType,
                          intensity: sessionIntensity,
                          estimatedDuration: sessionEstimatedDuration,
                          exercises: selectedProgramExercises,
                          __live: true,
                        }
                      : s
                  );
                  if (!editingExisting && selectedProgramExercises.length > 0) {
                    gridSessions.push({
                      localId: "__draft__",
                      week: programWeek,
                      day: programDay,
                      sessionName:
                        sessionName.trim() ||
                        `Week ${programWeek} Day ${programDay}`,
                      sessionType,
                      intensity: sessionIntensity,
                      estimatedDuration: sessionEstimatedDuration,
                      exercises: selectedProgramExercises,
                      __draft: true,
                      __live: true,
                    });
                  }

                  const dayColTemplate = days
                    .map((d) =>
                      collapsedDays.has(d) ? "38px" : "minmax(150px, 1fr)"
                    )
                    .join(" ");
                  const gridStyle = {
                    ["--dayCols" as string]: dayColTemplate,
                  } as React.CSSProperties;

                  return (
                    <>
                    <div className="programGridWrap" id="builder-review">
                      <div className="programGrid">
                        <div className="programGridHead" style={gridStyle}>
                          {days.map((d) => {
                            const collapsed = collapsedDays.has(d);
                            return (
                              <div
                                key={d}
                                className={`programGridDayLabel${
                                  collapsed ? " dayCollapsed" : ""
                                }`}
                                onClick={
                                  collapsed
                                    ? () =>
                                        setCollapsedDays((cur: any) => {
                                          const next = new Set(cur);
                                          next.delete(d);
                                          return next;
                                        })
                                    : undefined
                                }
                                title={collapsed ? `Expand Day ${d}` : undefined}
                              >
                                {collapsed ? (
                                  <span className="collapsedDayText">D{d}</span>
                                ) : (
                                  <>
                                    <span>Day {d}</span>
                                    <button
                                      type="button"
                                      className="dayCollapseBtn"
                                      title={`Collapse Day ${d}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCollapsedDays((cur: any) => {
                                          const next = new Set(cur);
                                          next.add(d);
                                          return next;
                                        });
                                      }}
                                    >
                                      <ChevronsLeftRight size={13} />
                                    </button>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {weeks.map((w: any) => (
                          <div key={w} className="programGridWeek">
                            <div className="programGridWeekLabel">
                              <span>Week {w}</span>
                              {(() => {
                                const v = weekVolume(w);
                                return v.days > 0 ? (
                                  <span className="weekVolChip">
                                    {v.days}d · {v.sets} sets · {v.exercises} ex
                                  </span>
                                ) : null;
                              })()}
                              {programSessions.some(
                                (s: any) => s.week === String(w)
                              ) && (
                                <div className="weekDupWrap">
                                  <button
                                    type="button"
                                    className="weekDupTrigger"
                                    onClick={() =>
                                      setWeekDupMenu((cur: any) =>
                                        cur === w ? null : w
                                      )
                                    }
                                  >
                                    <Copy size={13} /> Duplicate
                                    <ChevronDown size={12} />
                                  </button>
                                  {weekDupMenu === w && (
                                    <>
                                      <div
                                        className="weekDupBackdrop"
                                        onClick={() => setWeekDupMenu(null)}
                                      />
                                      <div className="weekDupMenu">
                                        <div className="weekDupSection">
                                          Progress load
                                        </div>
                                        <div className="weekDupPctRow">
                                          {[0, 2.5, 5, 10].map((pct) => (
                                            <button
                                              key={pct}
                                              type="button"
                                              className={
                                                weekDupPct === pct ? "active" : ""
                                              }
                                              onClick={() => setWeekDupPct(pct)}
                                            >
                                              {pct === 0 ? "None" : `+${pct}%`}
                                            </button>
                                          ))}
                                        </div>
                                        <div className="weekDupSection">
                                          Copy Week {w} to
                                        </div>
                                        {weeks
                                          .filter((t: any) => t !== w)
                                          .map((t: any) => (
                                            <button
                                              key={t}
                                              type="button"
                                              className="weekDupTarget"
                                              onClick={() =>
                                                duplicateWeek(w, [t], weekDupPct)
                                              }
                                            >
                                              Week {t}
                                            </button>
                                          ))}
                                        {weeks.filter((t: any) => t > w).length >
                                          1 && (
                                          <button
                                            type="button"
                                            className="weekDupTarget weekDupAll"
                                            onClick={() =>
                                              duplicateWeek(
                                                w,
                                                weeks.filter((t: any) => t > w),
                                                weekDupPct
                                              )
                                            }
                                          >
                                            All later weeks
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="programGridRow" style={gridStyle}>
                              {days.map((d) => {
                                const collapsed = collapsedDays.has(d);
                                const cellSessions = gridSessions.filter(
                                  (s: any) =>
                                    s.week === String(w) && s.day === String(d)
                                );
                                const isDrop =
                                  programGridDrop?.w === w &&
                                  programGridDrop?.d === d;

                                if (collapsed) {
                                  return (
                                    <div
                                      key={d}
                                      className="programGridCell dayCollapsed"
                                      title={`Expand Day ${d}`}
                                      onClick={() =>
                                        setCollapsedDays((cur: any) => {
                                          const next = new Set(cur);
                                          next.delete(d);
                                          return next;
                                        })
                                      }
                                    >
                                      {cellSessions.length > 0 && (
                                        <span className="collapsedCellDot">
                                          {cellSessions.length}
                                        </span>
                                      )}
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={d}
                                    className={`programGridCell${
                                      cellSessions.length ? " hasSess" : ""
                                    }${isDrop ? " gridDropActive" : ""}`}
                                    onDragOver={(e) => {
                                      if (
                                        !draggedProgramSessionId &&
                                        !draggedLibSessionId
                                      )
                                        return;
                                      e.preventDefault();
                                      setProgramGridDrop({ w, d });
                                    }}
                                    onDragLeave={() =>
                                      setProgramGridDrop((cur: any) =>
                                        cur?.w === w && cur?.d === d ? null : cur
                                      )
                                    }
                                    onDrop={() => {
                                      if (draggedLibSessionId) {
                                        const lib = sessionLibSessions.find(
                                          (s: any) =>
                                            s.localId === draggedLibSessionId
                                        );
                                        if (lib)
                                          insertLibrarySessionAtCell(lib, w, d);
                                      } else if (draggedProgramSessionId) {
                                        moveSessionToCell(
                                          draggedProgramSessionId,
                                          w,
                                          d
                                        );
                                      }
                                      setDraggedProgramSessionId("");
                                      setDraggedLibSessionId("");
                                      setProgramGridDrop(null);
                                    }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setCellMenu({
                                        w,
                                        d,
                                        x: e.clientX,
                                        y: e.clientY,
                                      });
                                    }}
                                  >
                                    {cellSessions.map((s: any) => (
                                      <div
                                        key={s.localId}
                                        className={`programGridCard ${getWorkoutColorClass(
                                          s.sessionName,
                                          s.sessionType
                                        )}${
                                          editingProgramSessionId === s.localId &&
                                          !s.__draft
                                            ? " calCardEditing"
                                            : ""
                                        }${s.__draft ? " gridCardDraft" : ""}${
                                          copiedSession?.mode === "cut" &&
                                          copiedSession.session.localId ===
                                            s.localId
                                            ? " gridCardCut"
                                            : ""
                                        }`}
                                        draggable={!s.__draft}
                                        onContextMenu={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setCellMenu({
                                            w,
                                            d,
                                            x: e.clientX,
                                            y: e.clientY,
                                            sessionLocalId: s.__draft
                                              ? undefined
                                              : s.localId,
                                          });
                                        }}
                                        onDragStart={(e) => {
                                          if (s.__draft) return;
                                          e.dataTransfer.effectAllowed = "move";
                                          setDraggedProgramSessionId(s.localId);
                                        }}
                                        onDragEnd={() => {
                                          setDraggedProgramSessionId("");
                                          setProgramGridDrop(null);
                                        }}
                                        onClick={() => {
                                          if (s.__draft) {
                                            setSessionEditorOpen(true);
                                          } else {
                                            loadSessionForEditing(s);
                                          }
                                        }}
                                      >
                                        <div className="programGridCardHead">
                                          <strong className="programGridCardName">
                                            {s.sessionName?.trim()
                                              ? s.sessionName
                                              : `Week ${w} Day ${d}`}
                                          </strong>
                                          {s.__draft ? (
                                            <span className="gridDraftTag">
                                              Unsaved
                                            </span>
                                          ) : (
                                            <div className="programGridCardActions">
                                              <button
                                                type="button"
                                                className="iconActionButton"
                                                title="Edit session"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  loadSessionForEditing(s);
                                                }}
                                              >
                                                <Pencil size={13} />
                                              </button>
                                              <button
                                                type="button"
                                                className="iconActionButton"
                                                title="Duplicate to next week"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  duplicateProgramSession(s);
                                                }}
                                              >
                                                <Copy size={13} />
                                              </button>
                                              <button
                                                type="button"
                                                className="iconActionButton dangerMenuItem"
                                                title="Remove session"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  removeProgramSession(s.localId);
                                                }}
                                              >
                                                <Trash2 size={13} />
                                              </button>
                                            </div>
                                          )}
                                        </div>

                                        {s.exercises.length === 0 ? (
                                          <span className="programGridCardMeta">
                                            No exercises yet
                                          </span>
                                        ) : (
                                          <div className="glanceChain">
                                            {buildGlanceChain(s.exercises).map(
                                              (it: any, gi: any) => (
                                                <div
                                                  className="glanceRow"
                                                  key={`${it.ex.exerciseRecordId}-${gi}`}
                                                >
                                                  <div className="glanceBadgeWrap">
                                                    {it.linked && !it.isFirst && (
                                                      <span
                                                        className={`glanceLineUp line-${it.lineUpColor}`}
                                                      />
                                                    )}
                                                    {it.linked && !it.isLast && (
                                                      <span
                                                        className={`glanceLineDown line-${it.lineDownColor}`}
                                                      />
                                                    )}
                                                    <span
                                                      className={`exerciseLabelBadge glanceBadge ${it.colorClass}`}
                                                    >
                                                      {it.display}
                                                    </span>
                                                  </div>
                                                  <div className="glanceText">
                                                    <strong>
                                                      {it.ex.exerciseName}
                                                    </strong>
                                                    {(it.ex.sets || it.ex.reps) && (
                                                      <span>
                                                        {it.ex.sets &&
                                                        it.ex.reps
                                                          ? `${it.ex.sets} x ${it.ex.reps}`
                                                          : it.ex.sets ||
                                                            it.ex.reps}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}

                                    <button
                                      type="button"
                                      className="programGridAdd"
                                      title={`Week ${w}, Day ${d}`}
                                      onClick={(e) => {
                                        const firstSaved = cellSessions.find(
                                          (s: any) => !s.__draft
                                        );
                                        setCellMenu({
                                          w,
                                          d,
                                          x: e.clientX,
                                          y: e.clientY,
                                          sessionLocalId: firstSaved?.localId,
                                        });
                                      }}
                                    >
                                      <Plus size={16} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    </>
                  );
                })()}

                {!isSingleWorkoutBuilder && sessionEditorOpen && (
                  <div
                    className="builderEditorBackdrop"
                    onClick={() => setSessionEditorOpen(false)}
                  />
                )}

                <div
                  className={`builderEditorWrap${
                    isSingleWorkoutBuilder ? "" : " asDrawer"
                  }${sessionEditorOpen ? " open" : ""}`}
                >
                  {!isSingleWorkoutBuilder && (
                    <div className="builderEditorDrawerHead">
                      <strong>
                        Week {programWeek || "--"} · Day {programDay || "--"}
                      </strong>
                      <button
                        type="button"
                        className="iconActionButton"
                        title="Close editor"
                        onClick={() => setSessionEditorOpen(false)}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}

                <div className="builderSectionHeader" id="builder-session">
                  <div>
                    <h3 className="builderSectionTitle">
                      {isSingleWorkoutBuilder ? "Workout Session" : "Current Session"}
                    </h3>
                    {editingProgramSessionId && (
                      <p className="builderSessionHint">
                        {isSingleWorkoutBuilder
                          ? "Editing this workout — save when ready."
                          : "Save this day, then pick the next session."}
                      </p>
                    )}
                  </div>
                  <div className="builderSessionHeaderActions">
                    <span
                      className={`builderSaveStatusPill compact ${
                        builderSaveStatus === "dirty" ? "isDirty" : "isSaved"
                      }`}
                    >
                      {builderSaveStatus === "dirty" ? "Unsaved" : "Saved"}
                    </span>
                    {editingProgramSessionId && isSingleWorkoutBuilder && (
                      <button
                        className="outlineButton"
                        onClick={() => clearCurrentProgramSession(false)}
                      >
                        Close Editor
                      </button>
                    )}
                    <button
                      className="goldButton sessionSaveButton"
                      onClick={addCurrentSessionToProgram}
                    >
                      {isSingleWorkoutBuilder ? "Save" : "Save & Next"}
                    </button>
                  </div>
                </div>

                <details
                  className="builderCollapsiblePanel builderSessionDetails"
                  open={sessionSetupOpen}
                  onToggle={(e) =>
                    setSessionSetupOpen(
                      (e.currentTarget as HTMLDetailsElement).open
                    )
                  }
                >
                  <summary>
                    <div>
                      <span className="eyebrow">
                        {isSingleWorkoutBuilder ? "Workout Setup" : "Session"}
                      </span>
                      <strong>
                        {isSingleWorkoutBuilder
                          ? "Workout Details"
                          : "Session Settings"}
                      </strong>
                    </div>
                    <span className="builderPanelToggle">
                      {sessionSetupOpen ? "Hide ▴" : "Show ▾"}
                    </span>
                  </summary>
                <div
                  className={`currentSessionGrid ${
                    isSingleWorkoutBuilder ? "singleWorkoutSessionGrid" : ""
                  }`}
                >
                  {isSingleWorkoutBuilder && (
                    <label className="sessionNameField">
                      <span>Workout Name</span>
                      <input
                        value={programName}
                        onChange={(e) => setProgramName(e.target.value)}
                        placeholder="Workout Name"
                        className="miniSearch"
                      />
                    </label>
                  )}
                  {isSingleWorkoutBuilder && (
                    <label>
                      <span>Assign to</span>
                      <select
                        value={programBuiltForMode}
                        onChange={(e) => {
                          const mode = e.target.value as
                            | "internal"
                            | "client"
                            | "team";
                          setProgramBuiltForMode(mode);
                          if (mode !== "client") setProgramBuiltForClient("");
                          if (mode !== "team") setProgramBuiltForTeam("");
                        }}
                        className="miniSearch"
                      >
                        <option value="internal">Internal (general)</option>
                        <option value="client">Client</option>
                        <option value="team">Team</option>
                      </select>
                    </label>
                  )}
                  {isSingleWorkoutBuilder &&
                    programBuiltForMode === "client" && (
                      <label>
                        <span>Client</span>
                        <select
                          value={programBuiltForClient}
                          onChange={(e) =>
                            setProgramBuiltForClient(e.target.value)
                          }
                          className="miniSearch"
                        >
                          <option value="">Select client…</option>
                          {coachVisibleClients.map((c: any) => (
                            <option key={c.id} value={c.clientCode || c.id}>
                              {c.name}
                              {c.clientCode ? ` (${c.clientCode})` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  {isSingleWorkoutBuilder &&
                    programBuiltForMode === "team" && (
                      <label>
                        <span>Team</span>
                        <select
                          value={programBuiltForTeam}
                          onChange={(e) =>
                            setProgramBuiltForTeam(e.target.value)
                          }
                          className="miniSearch"
                        >
                          <option value="">Select team…</option>
                          {teams.map((tm: any) => (
                            <option key={tm.id} value={tm.name}>
                              {tm.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  {!isSingleWorkoutBuilder && (
                    <>
                      <label className="sessionWeekField">
                        <span>Week</span>
                        <input
                          value={programWeek}
                          onChange={(e) => setProgramWeek(e.target.value)}
                          placeholder="Week"
                          className="miniSearch"
                        />
                      </label>

                      <label className="sessionDayField">
                        <span>Day</span>
                        <input
                          value={programDay}
                          onChange={(e) => setProgramDay(e.target.value)}
                          placeholder="Day"
                          className="miniSearch"
                        />
                      </label>

                      <label className="sessionNameField">
                        <span>Session Name</span>
                        <input
                          value={sessionName}
                          onChange={(e) => setSessionName(e.target.value)}
                          placeholder="Session Name"
                          className="miniSearch"
                        />
                      </label>

                    </>
                  )}

                  <label className="sessionTypeField">
                    <span>Session Type</span>
                    <select
                      value={sessionType}
                      onChange={(e) => setSessionType(e.target.value)}
                      className="miniSearch"
                    >
                      {/* Session type options come from the workout builder
                          sections (single source). A legacy value not in the
                          list (e.g. an older "Climbing" session) is kept so it
                          still shows until the coach re-tags it. */}
                      {Array.from(
                        new Set(
                          [...builderSectionOptions, sessionType].filter(Boolean)
                        )
                      ).map((opt: any) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="sessionIntensityField">
                    <span>Intensity</span>
                    <select
                      value={sessionIntensity}
                      onChange={(e) => setSessionIntensity(e.target.value)}
                      className="miniSearch"
                    >
                      <option>Low</option>
                      <option>Moderate</option>
                      <option>High</option>
                      <option>Max</option>
                      <option>Recovery</option>
                    </select>
                  </label>

                  <label className="sessionGoalField">
                    <span>Session Goal</span>
                    <input
                      value={sessionGoal}
                      onChange={(e) => setSessionGoal(e.target.value)}
                      placeholder="Primary focus..."
                      className="miniSearch"
                    />
                  </label>

                </div>

                <label className="builderSessionNotesField">
                  <span>Session Notes</span>
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Coach notes for this session, intensity cues, warm-up instructions..."
                    rows={3}
                  />
                </label>

                <div className="builderInsertSavedRow">
                  <span>Insert saved session</span>
                  <select
                    className="miniSearch"
                    value={sessionLibProgramId}
                    onChange={(e) => {
                      const prog = programs.find(
                        (pp: any) => pp.programId === e.target.value
                      );
                      if (prog) loadSessionLibrary(prog);
                      else {
                        setSessionLibProgramId("");
                        setSessionLibSessions([]);
                      }
                    }}
                  >
                    <option value="">From program…</option>
                    {programs.map((pp: any) => (
                      <option key={pp.recordId} value={pp.programId}>
                        {pp.programName}
                      </option>
                    ))}
                  </select>
                  {sessionLibLoading && <em>Loading…</em>}
                  {sessionLibSessions.length > 0 && (
                    <select
                      className="miniSearch"
                      value=""
                      onChange={(e) => {
                        const s = sessionLibSessions.find(
                          (x: any) => x.localId === e.target.value
                        );
                        if (s) insertSavedSessionExercises(s);
                      }}
                    >
                      <option value="">Pick a session…</option>
                      {sessionLibSessions.map((s: any) => (
                        <option key={s.localId} value={s.localId}>
                          W{s.week} D{s.day} · {s.sessionName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                </details>

                {selectedProgramExercises.length > 1 && (
                  <div className={`bulkEditBar${bulkEditMode ? " active" : ""}`}>
                    <button
                      type="button"
                      className={`outlineButton compactBuilderButton${
                        bulkEditMode ? " active" : ""
                      }`}
                      onClick={() => {
                        setBulkEditMode((cur: any) => !cur);
                        setBulkSelectedIdx(new Set());
                      }}
                    >
                      {bulkEditMode ? "Done selecting" : "Bulk edit"}
                    </button>
                    {bulkEditMode && (
                      <>
                        <button
                          type="button"
                          className="outlineButton compactBuilderButton"
                          onClick={() =>
                            setBulkSelectedIdx(
                              new Set(selectedProgramExercises.map((_: any, i: any) => i))
                            )
                          }
                        >
                          All
                        </button>
                        <input
                          className="miniSearch bulkEditInput"
                          placeholder="Sets"
                          value={bulkSets}
                          onChange={(e) => setBulkSets(e.target.value)}
                        />
                        <input
                          className="miniSearch bulkEditInput"
                          placeholder="Reps"
                          value={bulkReps}
                          onChange={(e) => setBulkReps(e.target.value)}
                        />
                        <input
                          className="miniSearch bulkEditInput bulkEditRest"
                          placeholder="Rest e.g. 90 sec"
                          value={bulkRest}
                          onChange={(e) => setBulkRest(e.target.value)}
                        />
                        <button
                          type="button"
                          className="primaryButton compactBuilderButton"
                          disabled={bulkSelectedIdx.size === 0}
                          onClick={applyBulkPrescription}
                        >
                          Apply to {bulkSelectedIdx.size}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {selectedProgramExercises.length === 0 && (
                  <div className="builderEmptyCanvas" id="builder-exercises">
                    <div className="builderEmptyCanvasIcon">
                      <Dumbbell size={34} />
                    </div>
                    <h3>Drag your session into shape</h3>
                    <p>Add exercises to build this session.</p>
                    <div>
                      <button
                        className="goldButton"
                        onClick={() => openBuilderLibrary("Exercises")}
                      >
                        + Add Exercise
                      </button>
                    </div>
                  </div>
                )}

                {isBuilderLibraryOpen && (
                  <div
                    className="builderLibraryOverlay"
                    onClick={() => setIsBuilderLibraryOpen(false)}
                  >
                    <div
                      className={`builderLibraryDrawer${
                        isBuilderOrderOpen && selectedProgramExercises.length > 0
                          ? " orderOpen"
                          : ""
                      }`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <aside className="builderLibraryDrawerSide">
                        <div className="builderDrawerTabs">
                          <button
                            className={
                              builderLibraryMode === "Exercises" ? "active" : ""
                            }
                            onClick={() => setBuilderLibraryModeAndLoad("Exercises")}
                          >
                            Exercises
                          </button>
                          <button
                            className={
                              builderLibraryMode === "Sections" ? "active" : ""
                            }
                            onClick={() => setBuilderLibraryModeAndLoad("Sections")}
                          >
                            Sections
                          </button>
                        </div>

                        <div className="builderDrawerSearch">
                          <input
                            placeholder="Search exercise library..."
                            value={builderSearch}
                            onChange={(e) => setBuilderSearch(e.target.value)}
                          />
                          <select
                            className="builderEquipSelect"
                            value={builderEquipFilter}
                            onChange={(e) => setBuilderEquipFilter(e.target.value)}
                            title="Filter by equipment"
                          >
                            <option value="">All equipment</option>
                            {["Barbell", "Dumbbell", "Kettlebell", "Bodyweight", "Bands", "Cable", "Machine", "Sled", "Medicine Ball", "Hangboard"].map(
                              (eq) => (
                                <option key={eq} value={eq}>
                                  {eq}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div className="builderDrawerExerciseGrid">
                          {libraryLoading && builderExercises.length === 0 && (
                            <div className="builderLibraryEmpty">
                              Loading exercises...
                            </div>
                          )}
                          {builderExercises.map((exercise: any) => (
                            <button
                              className="builderExercisePickCard"
                              key={exercise.recordId || exercise.exerciseId}
                              onClick={() => {
                                addExerciseToProgram(exercise);
                              }}
                            >
                              <span>{exercise.exerciseName}</span>
                              <small>
                                {[
                                  exercise.equipment,
                                  exercise.movementPattern,
                                  exercise.category,
                                ]
                                  .filter(Boolean)
                                  .join(" / ") || "Exercise"}
                              </small>
                            </button>
                          ))}
                          {!libraryLoading && builderExercises.length === 0 && (
                            <div className="builderLibraryEmpty">
                              No exercises match this search.
                            </div>
                          )}
                        </div>
                      </aside>

                      <section className="builderLibraryPreview">
                        <button
                          className="builderDrawerClose"
                          onClick={() => setIsBuilderLibraryOpen(false)}
                          aria-label="Close builder library"
                        >
                          <X size={22} />
                        </button>
                        <span className="eyebrow">
                          {builderMode === "Single Workout"
                            ? "Single Workout"
                            : `Week ${programWeek || "--"} / Day ${
                                programDay || "--"
                              }`}
                        </span>
                        <div className="builderPreviewTitleRow">
                          <h2>{sessionName || programName || "Name your workout"}</h2>
                          {selectedProgramExercises.length > 0 && (
                            <button
                              className={`outlineButton builderOrderToggle${
                                isBuilderOrderOpen ? " active" : ""
                              }`}
                              type="button"
                              onClick={() =>
                                setIsBuilderOrderOpen((current: any) => !current)
                              }
                            >
                              <GripVertical size={16} />
                              Exercise Order
                            </button>
                          )}
                        </div>
                        <p>
                          Active section:{" "}
                          <strong>{pendingSectionName || builderSectionOptions[0]}</strong>
                        </p>
                        {builderLibraryMode === "Sections" && (
                          <div className="builderSectionPicker builderSectionPickerInline">
                            <h3>Choose a section</h3>
                            <p>
                              New exercises will be added under the selected section.
                            </p>
                            <div className="builderSectionOptionGrid">
                              {builderSectionOptions.map((section: any) => (
                                <button
                                  key={section}
                                  className={
                                    pendingSectionName === section ? "active" : ""
                                  }
                                  onClick={() => selectBuilderSection(section)}
                                >
                                  {section}
                                </button>
                              ))}
                            </div>
                            <label>
                              <span>Custom section</span>
                              <div className="builderCustomSectionRow">
                                <input
                                  value={customBuilderSectionName}
                                  onChange={(e) =>
                                    setCustomBuilderSectionName(e.target.value)
                                  }
                                  placeholder="Return to sport, Fingerboard..."
                                />
                                <button
                                  className="goldButton"
                                  onClick={() =>
                                    selectBuilderSection(customBuilderSectionName)
                                  }
                                >
                                  Use
                                </button>
                              </div>
                            </label>
                          </div>
                        )}
                        <div className="builderDropHint">
                          {selectedProgramExercises.length === 0 ? (
                            <>
                              <Dumbbell size={28} />
                              <span>
                                Choose an exercise from the left to add it to this
                                session.
                              </span>
                            </>
                          ) : (
                            <div
                              className="builderModalExerciseList"
                              ref={builderModalListRef}
                            >
                              {selectedProgramExercises.map((exercise: any, index: any) => {
                                const currentSection = normalizeBuilderSection(
                                  exercise.sectionName
                                );
                                const previousSection = normalizeBuilderSection(
                                  selectedProgramExercises[index - 1]?.sectionName
                                );
                                const showSectionDivider =
                                  index === 0 || currentSection !== previousSection;
                                const canLinkWithPrevious =
                                  index > 0 && currentSection === previousSection;
                                const isLinkedToPrevious =
                                  isExerciseLinkedWithPrevious(index);

                                return (
                                  <Fragment
                                    key={`${exercise.exerciseRecordId}-${index}-modal-wrap`}
                                  >
                                    {showSectionDivider && (
                                      <div className="builderExerciseSectionDivider">
                                        <span>{currentSection}</span>
                                      </div>
                                    )}
                                    {canLinkWithPrevious && (
                                      <div className="builderSupersetLinkRow">
                                        {isLinkedToPrevious ? (
                                          <button
                                            type="button"
                                            className="builderSupersetLinkButton isLinked"
                                            onClick={() => unlinkExerciseGroup(index)}
                                            title={`Unlink this ${(
                                              exercise.groupType || "Superset"
                                            ).toLowerCase()}`}
                                          >
                                            <Link2 size={15} />
                                            <span>
                                              Linked{" "}
                                              {(exercise.groupType || "Superset").toLowerCase()}
                                            </span>
                                          </button>
                                        ) : (
                                          <>
                                            <button
                                              type="button"
                                              className="builderSupersetLinkButton"
                                              onClick={() =>
                                                toggleBuilderSupersetLink(index)
                                              }
                                              title="Link these exercises as a superset (alternate sets)"
                                            >
                                              <Link2 size={15} />
                                              <span>Link superset</span>
                                            </button>
                                            <button
                                              type="button"
                                              className="builderSupersetLinkButton"
                                              onClick={() =>
                                                toggleBuilderCircuitLink(index)
                                              }
                                              title="Link these exercises as a circuit (rounds of every exercise back-to-back)"
                                            >
                                              <RefreshCw size={15} />
                                              <span>Link circuit</span>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                    <div
                                      className={`builderModalExerciseEditor ${
                                        exercise.isAccessory ? "isAccessory" : ""
                                      }`}
                                      ref={
                                        index === latestBuilderExerciseIndex
                                          ? latestBuilderExerciseRef
                                          : null
                                      }
                                    >
                                  <div className="builderModalExerciseHeader">
                                    {renderExerciseLabelBadge(exercise, index)}
                                    <div>
                                      <strong>{exercise.exerciseName}</strong>
                                      <small>{exercise.sectionName || "Main"}</small>
                                    </div>
                                    <button
                                      type="button"
                                      className={`builderUsePercentToggle${
                                        usePercentExerciseIndexes.has(index)
                                          ? " active"
                                          : ""
                                      }`}
                                      onClick={() => toggleUsePercent(index)}
                                      title="Show the %1RM field for this exercise"
                                    >
                                      Use %
                                    </button>
                                    {renderBuilderExerciseOptionsMenu(exercise, index)}
                                  </div>

                                  <div className="builderModalEditGrid">
                                    <label>
                                      <span>Label</span>
                                      <input
                                        value={exercise.exerciseLabel}
                                        onChange={(e) =>
                                          updateProgramExercise(
                                            index,
                                            "exerciseLabel",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </label>
                                    <label>
                                      <span>Section</span>
                                      <select
                                        value={exercise.sectionName}
                                        onChange={(e) =>
                                          updateProgramExercise(
                                            index,
                                            "sectionName",
                                            e.target.value
                                          )
                                        }
                                      >
                                        {getBuilderSectionSelectOptions(
                                          exercise.sectionName
                                        ).map((section: any) => (
                                          <option key={section} value={section}>
                                            {section}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="builderModalCheck">
                                      <span>Accessory</span>
                                      <input
                                        type="checkbox"
                                        checked={Boolean(exercise.isAccessory)}
                                        onChange={(e) =>
                                          updateProgramExercise(
                                            index,
                                            "isAccessory",
                                            e.target.checked
                                          )
                                        }
                                      />
                                    </label>
                                    <label className="builderModalCheck">
                                      <span>Each Side</span>
                                      <input
                                        type="checkbox"
                                        checked={Boolean(exercise.isUnilateral)}
                                        onChange={(e) =>
                                          updateProgramExercise(
                                            index,
                                            "isUnilateral",
                                            e.target.checked
                                          )
                                        }
                                      />
                                    </label>
                                  </div>

                                  {renderAlternateExerciseEditor(exercise, index)}

                                  {renderSetPrescriptionTable(exercise, index)}

                                    </div>
                                  </Fragment>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="builderDrawerFooter">
                          <button
                            className="outlineButton"
                            onClick={() => setIsBuilderLibraryOpen(false)}
                          >
                            Cancel
                          </button>
                          <button
                            className="outlineButton"
                            onClick={() => saveCurrentSessionToProgram(false, false)}
                          >
                            Save
                          </button>
                          <button
                            className="goldButton"
                            onClick={() => {
                              saveCurrentSessionToProgram(false, false);
                              if (selectedProgramExercises.length > 0) {
                                setIsBuilderLibraryOpen(false);
                              }
                            }}
                          >
                            Save & Close
                          </button>
                        </div>
                      </section>

                      {isBuilderOrderOpen && selectedProgramExercises.length > 0 && (
                        <aside className="builderArrangementSidebar builderModalOrderSidebar">
                          <div className="builderArrangementSidebarHeader">
                            <span className="eyebrow">Order</span>
                            <h4>Exercise Order</h4>
                            <button
                              className="iconButton compactIconButton"
                              type="button"
                              onClick={() => setIsBuilderOrderOpen(false)}
                              aria-label="Collapse exercise order"
                            >
                              <X size={15} />
                            </button>
                          </div>
                          <div className="builderArrangementSidebarList">
                            {getBuilderOrderItems(selectedProgramExercises).map((item: any) => {
                              const primaryExercise = item.exercises[0];
                              const isDraggingItem =
                                arrangementDragIndex !== null &&
                                arrangementDragIndex >= item.start &&
                                arrangementDragIndex <= item.end;
                              const isDropTargetItem =
                                arrangementDropIndex !== null &&
                                arrangementDropIndex >= item.start &&
                                arrangementDropIndex <= item.end;

                              return (
                                <div
                                  key={`${item.key}-modal-sidebar`}
                                  className={`builderSidebarItem${
                                    item.isLinkedGroup ? " builderSidebarGroupItem" : ""
                                  }${isDraggingItem ? " isDragging" : ""}${
                                    isDropTargetItem ? " isDropTarget" : ""
                                  }`}
                                  draggable
                                  onDragStart={(event) => {
                                    event.dataTransfer.effectAllowed = "move";
                                    setArrangementDragIndex(item.start);
                                  }}
                                  onDragEnter={() => setArrangementDropIndex(item.start)}
                                  onDragOver={(event) => {
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = "move";
                                    setArrangementDropIndex(item.start);
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (arrangementDragIndex !== null) {
                                      reorderProgramExercise(
                                        arrangementDragIndex,
                                        item.start
                                      );
                                    }
                                    setArrangementDragIndex(null);
                                    setArrangementDropIndex(null);
                                  }}
                                  onDragEnd={() => {
                                    setArrangementDragIndex(null);
                                    setArrangementDropIndex(null);
                                  }}
                                >
                                  <GripVertical size={13} className="sidebarDragHandle" />
                                  {item.isLinkedGroup ? (
                                    <div className="builderSidebarGroupBadge">
                                      <Link2 size={14} />
                                    </div>
                                  ) : (
                                    renderExerciseLabelBadge(primaryExercise, item.start)
                                  )}
                                  <div className="builderSidebarItemStack">
                                    {item.isLinkedGroup && (
                                      <span className="builderSidebarGroupLabel">
                                        {primaryExercise.groupType}:{" "}
                                        {primaryExercise.groupName}
                                      </span>
                                    )}
                                    {item.exercises.map((exercise: any, exerciseOffset: any) => (
                                      <span
                                        className="sidebarItemName"
                                        key={`${exercise.exerciseRecordId}-${item.start + exerciseOffset}-order-name`}
                                      >
                                        {item.isLinkedGroup &&
                                          renderExerciseLabelBadge(
                                            exercise,
                                            item.start + exerciseOffset
                                          )}
                                        {exercise.exerciseName}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </aside>
                      )}
                    </div>
                  </div>
                )}

                {selectedProgramExercises.length > 0 && (
                  <div className="builderSessionStatsBar" id="builder-exercises">
                    <div className="builderSessionStats">
                      <div className="builderSessionStat">
                        <strong>{selectedProgramExercises.length}</strong>
                        <span>Exercises</span>
                      </div>
                      <div className="builderSessionStat">
                        <strong>
                          {selectedProgramExercises.reduce(
                            (sum: number, ex: any) =>
                              sum + (parseInt(ex.sets, 10) || 0),
                            0
                          )}
                        </strong>
                        <span>Work sets</span>
                      </div>
                      <div className="builderSessionStat">
                        <strong>
                          ~{estimateSessionMinutes(selectedProgramExercises)}
                          <em>min</em>
                        </strong>
                        <span>Est. duration</span>
                      </div>
                    </div>
                    <button
                      className="goldButton compactBuilderButton"
                      onClick={() => openBuilderLibrary("Exercises")}
                    >
                      + Add Exercise
                    </button>
                  </div>
                )}

                {selectedProgramExercises.map((exercise: any, index: any) => {
                  const currentSection = normalizeBuilderSection(exercise.sectionName);
                  const previousSection = normalizeBuilderSection(
                    selectedProgramExercises[index - 1]?.sectionName
                  );
                  const showSectionDivider =
                    index === 0 || currentSection !== previousSection;

                  return (
                    <Fragment key={`${exercise.exerciseRecordId}-${index}`}>
                      {showSectionDivider && (
                        <div className="builderExerciseSectionDivider pageDivider">
                          <span>{currentSection}</span>
                        </div>
                      )}
                      <div
                        className={`exercise-card builderExerciseCard builderExerciseCardCompact ${
                          exercise.groupType !== "Straight" ? "groupedExerciseCard" : ""
                        } ${exercise.isAccessory ? "accessoryExerciseCard" : ""} ${
                          accessoryTargetIndex === index ? "accessoryTargetCard" : ""
                        } ${arrangementDragIndex === index ? "isDraggingCard" : ""} ${
                          arrangementDropIndex === index ? "isDropTargetCard" : ""
                        }`}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          setArrangementDragIndex(index);
                        }}
                        onDragEnter={() => setArrangementDropIndex(index)}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setArrangementDropIndex(index);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (arrangementDragIndex !== null) {
                            reorderProgramExercise(arrangementDragIndex, index);
                          }
                          setArrangementDragIndex(null);
                          setArrangementDropIndex(null);
                        }}
                        onDragEnd={() => {
                          setArrangementDragIndex(null);
                          setArrangementDropIndex(null);
                        }}
                      >
                        <div className="builderExerciseCardHeader">
                          <button
                            className="builderExerciseSummaryButton"
                            onClick={() => openExerciseEditor(index)}
                            type="button"
                          >
                            <div className="builderExerciseSummaryTitle">
                              {renderExerciseLabelBadge(exercise, index)}
                              <div>
                                <span className="exerciseSectionName">
                                  {exercise.sectionName || "Main"}
                                </span>
                                <h3>{exercise.exerciseName}</h3>
                              </div>
                            </div>

                            <div className="builderExerciseSummaryStats">
                              <span>{exercise.sets || "--"} sets</span>
                              <span>{exercise.reps || "--"} reps</span>
                              {exercise.load && <span>{exercise.load}</span>}
                              {exercise.tempo && <span>Tempo {exercise.tempo}</span>}
                              {exercise.rest && <span>Rest {exercise.rest}</span>}
                            </div>

                            <span className="builderExerciseExpandIndicator">
                              Edit
                            </span>
                          </button>
                          {bulkEditMode && (
                            <input
                              type="checkbox"
                              className="bulkEditCheck"
                              checked={bulkSelectedIdx.has(index)}
                              onChange={() =>
                                setBulkSelectedIdx((cur: any) => {
                                  const next = new Set(cur);
                                  if (next.has(index)) next.delete(index);
                                  else next.add(index);
                                  return next;
                                })
                              }
                            />
                          )}
                        </div>

                        {(exercise.groupType !== "Straight" && exercise.groupName) ||
                        exercise.isAccessory ? (
                          <div className="builderExerciseCompactPills">
                            {exercise.groupType !== "Straight" && exercise.groupName && (
                              <span
                                className={`exerciseGroupPill ${
                                  exercise.groupType === "Circuit"
                                    ? "exerciseGroupPillCircuit"
                                    : "exerciseGroupPillSuperset"
                                }`}
                              >
                                {exercise.groupType}: {exercise.groupName}
                              </span>
                            )}
                            {isCircuitGroupStart(index) && (
                              <span className="circuitControlsRow">
                                <label
                                  className="circuitRoundsControl"
                                  title="Rounds / AMRAP (max rounds in the time cap) / EMOM (every minute on the minute)"
                                >
                                  <select
                                    value={exercise.groupMode || ""}
                                    onChange={(e) =>
                                      setCircuitGroupMode(
                                        index,
                                        e.target.value as "" | "AMRAP" | "EMOM"
                                      )
                                    }
                                  >
                                    <option value="">Rounds</option>
                                    <option value="AMRAP">AMRAP</option>
                                    <option value="EMOM">EMOM</option>
                                  </select>
                                </label>
                                {!exercise.groupMode ? (
                                  <label
                                    className="circuitRoundsControl"
                                    title="Rounds of this circuit — sets every member's set count"
                                  >
                                    <span>Rounds</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={20}
                                      value={exercise.sets || "3"}
                                      onChange={(e) =>
                                        setCircuitGroupRounds(index, e.target.value)
                                      }
                                    />
                                  </label>
                                ) : (
                                  <label
                                    className="circuitRoundsControl"
                                    title="Time cap in minutes"
                                  >
                                    <span>Min</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={90}
                                      value={exercise.groupMinutes || "12"}
                                      onChange={(e) =>
                                        setCircuitGroupMode(
                                          index,
                                          exercise.groupMode || "AMRAP",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>
                                )}
                              </span>
                            )}
                            {exercise.isAccessory && (
                              <span className="exerciseAccessoryPill">
                                Accessory for{" "}
                                {exercise.accessoryParentLabel ||
                                  exercise.exerciseLabel ||
                                  "main lift"}
                              </span>
                            )}
                          </div>
                        ) : null}

                        {renderAlternateExerciseEditor(exercise, index)}

                        {editExerciseIndex === index && (
                          <div
                            className="builderEditModalOverlay"
                            onClick={() => setEditExerciseIndex(null)}
                          >
                            <div
                              className="builderEditModal"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="builderEditModalHead">
                                <div className="builderEditModalTitle">
                                  <span className="exerciseSectionName">
                                    {exercise.sectionName || "Main"}
                                  </span>
                                  <h3>{exercise.exerciseName}</h3>
                                </div>
                                <button
                                  type="button"
                                  className={`builderUsePercentToggle${
                                    usePercentExerciseIndexes.has(index)
                                      ? " active"
                                      : ""
                                  }`}
                                  onClick={() => toggleUsePercent(index)}
                                  title="Show the %1RM field for this exercise"
                                >
                                  Use %
                                </button>
                                {renderBuilderExerciseOptionsMenu(exercise, index)}
                                <button
                                  type="button"
                                  className="builderEditModalClose"
                                  onClick={() => setEditExerciseIndex(null)}
                                  aria-label="Close"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                              <div className="builderEditModalBody">
                            {/* Quick optional fields — reveal on demand */}
                            <div className="exEditChipRow">
                              <button
                                type="button"
                                className={`exEditChip${
                                  tempoOpen || exercise.tempo ? " active" : ""
                                }`}
                                onClick={() => setTempoOpen((v) => !v)}
                              >
                                + Tempo
                              </button>
                              <button
                                type="button"
                                className={`exEditChip${
                                  cueOpen || exercise.coachingNotes ? " active" : ""
                                }`}
                                onClick={() => setCueOpen((v) => !v)}
                              >
                                + Cue
                              </button>
                              <label className="exEditChipCheck">
                                <input
                                  type="checkbox"
                                  checked={Boolean(exercise.isUnilateral)}
                                  onChange={(e) =>
                                    updateProgramExercise(
                                      index,
                                      "isUnilateral",
                                      e.target.checked
                                    )
                                  }
                                />
                                Each side
                              </label>
                            </div>

                            {(tempoOpen || exercise.tempo) && (
                              <input
                                className="miniSearch exEditReveal"
                                value={exercise.tempo || ""}
                                onChange={(e) =>
                                  updateProgramExercise(
                                    index,
                                    "tempo",
                                    e.target.value
                                  )
                                }
                                placeholder="Tempo — e.g. 3-1-1"
                              />
                            )}
                            {(cueOpen || exercise.coachingNotes) && (
                              <textarea
                                className="exEditReveal exEditCue"
                                value={exercise.coachingNotes || ""}
                                onChange={(e) =>
                                  updateProgramExercise(
                                    index,
                                    "coachingNotes",
                                    e.target.value
                                  )
                                }
                                placeholder="Cue for the athlete..."
                              />
                            )}

                            {/* Link this exercise with the one above it */}
                            <div className="exLinkRow">
                              <span className="exLinkLabel">link with above:</span>
                              <button
                                type="button"
                                className="exLinkPill exLinkSuperset"
                                onClick={() =>
                                  linkExerciseWithPrevious(index, "Superset")
                                }
                              >
                                + Superset
                              </button>
                              <button
                                type="button"
                                className="exLinkPill exLinkCircuit"
                                onClick={() =>
                                  linkExerciseWithPrevious(index, "Circuit")
                                }
                              >
                                + Circuit
                              </button>
                              <button
                                type="button"
                                className={`exLinkPill exLinkAccessory${
                                  exercise.isAccessory ? " active" : ""
                                }`}
                                onClick={() => {
                                  const makeAccessory = !exercise.isAccessory;
                                  setSelectedProgramExercises((current: any) =>
                                    current.map((item: any, itemIndex: any) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            isAccessory: makeAccessory,
                                            accessoryParentLabel: makeAccessory
                                              ? item.accessoryParentLabel ||
                                                selectedProgramExercises[
                                                  index - 1
                                                ]?.exerciseLabel ||
                                                ""
                                              : "",
                                            accessoryColor: makeAccessory
                                              ? item.accessoryColor || "Green"
                                              : item.accessoryColor,
                                          }
                                        : item
                                    )
                                  );
                                }}
                              >
                                + Accessory
                              </button>
                            </div>

                    <div className="builderPrescriptionGrid">
                      <label>
                        <span>Label</span>
                        <input
                          className="miniSearch"
                          value={exercise.exerciseLabel}
                          onChange={(e) =>
                            updateProgramExercise(
                              index,
                              "exerciseLabel",
                              e.target.value
                            )
                          }
                          placeholder="A1"
                        />
                      </label>

                      <label>
                        <span>Section</span>
                        <select
                          className="miniSearch"
                          value={exercise.sectionName}
                          onChange={(e) =>
                            updateProgramExercise(
                              index,
                              "sectionName",
                              e.target.value
                            )
                          }
                        >
                          {getBuilderSectionSelectOptions(exercise.sectionName).map(
                            (section: any) => (
                              <option key={section} value={section}>
                                {section}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label>
                        <span>Order</span>
                        <input
                          className="miniSearch"
                          value={exercise.order}
                          onChange={(e) =>
                            updateProgramExercise(index, "order", e.target.value)
                          }
                          placeholder="Order"
                        />
                      </label>
                    </div>

                    {renderSetPrescriptionTable(exercise, index)}

                    <div className="builderGroupGrid">
                      <label>
                        <span>Structure</span>
                        <select
                          className="miniSearch"
                          value={exercise.groupType}
                          onChange={(e) =>
                            updateExerciseGrouping(
                              index,
                              e.target.value as ProgramExercise["groupType"],
                              exercise.groupName || "Group A"
                            )
                          }
                        >
                          <option>Straight</option>
                          <option>Superset</option>
                          <option>Circuit</option>
                        </select>
                      </label>

                      <label>
                        <span>Group Label</span>
                        <input
                          className="miniSearch"
                          value={exercise.groupName}
                          onChange={(e) =>
                            updateProgramExercise(index, "groupName", e.target.value)
                          }
                          placeholder="A, B, Upper Circuit..."
                          disabled={exercise.groupType === "Straight"}
                        />
                      </label>

                      {exercise.isAccessory && (
                        <>
                          <label>
                            <span>Accessory Parent</span>
                            <input
                              className="miniSearch"
                              value={exercise.accessoryParentLabel || ""}
                              onChange={(e) =>
                                updateProgramExercise(
                                  index,
                                  "accessoryParentLabel",
                                  e.target.value
                                )
                              }
                              placeholder="A1"
                            />
                          </label>

                          <label>
                            <span>Accessory Color</span>
                            <select
                              className="miniSearch"
                              value={exercise.accessoryColor || "Green"}
                              onChange={(e) =>
                                updateProgramExercise(
                                  index,
                                  "accessoryColor",
                                  e.target.value
                                )
                              }
                            >
                              <option>Green</option>
                              <option>Gold</option>
                              <option>Blue</option>
                              <option>Grey</option>
                              <option>Red</option>
                              <option>Purple</option>
                            </select>
                          </label>
                        </>
                      )}

                    </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Fragment>
                  );
                })}

                {selectedProgramExercises.length > 0 && (
                  <div className="builderSessionSaveBar">
                    <div>
                      <strong>
                        {isSingleWorkoutBuilder
                          ? editingProgramSessionId
                            ? "Editing workout"
                            : "New workout"
                          : editingProgramSessionId
                          ? "Editing day"
                          : "New day"}
                      </strong>
                      <span>
                        {isSingleWorkoutBuilder
                          ? programName || "Untitled Workout"
                          : `Week ${programWeek || "--"} / Day ${
                              programDay || "--"
                            }: ${sessionName || "Untitled Session"}`}
                      </span>
                    </div>
                    <div>
                      {!isSingleWorkoutBuilder && (
                        <button
                          className="outlineButton"
                          onClick={() => saveCurrentSessionToProgram(true, false)}
                        >
                          Save Day
                        </button>
                      )}
                      <button className="goldButton" onClick={addCurrentSessionToProgram}>
                        {isSingleWorkoutBuilder ? "Save" : "Save & Next"}
                      </button>
                    </div>
                  </div>
                )}
                </div>

                {isSingleWorkoutBuilder && (
                  <>
                    <h3
                      className="builderSectionTitle builderSectionTitleSpaced"
                      id="builder-review"
                    >
                      Saved Workout
                    </h3>
                    {programSessions.length === 0 && (
                      <p>No workout saved yet.</p>
                    )}
                  </>
                )}

                {isSingleWorkoutBuilder && programSessions.map((session: any) => (
                  <div
                    className={`exercise-card programSessionCard ${
                      editingProgramSessionId === session.localId
                        ? "editingSessionCard"
                        : ""
                    } ${
                      draggedProgramSessionId === session.localId
                        ? "isDraggingSession"
                        : ""
                    } ${
                      programSessionDropId === session.localId
                        ? "isDropTargetSession"
                        : ""
                    }`}
                    key={session.localId}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      setDraggedProgramSessionId(session.localId);
                    }}
                    onDragEnter={() => setProgramSessionDropId(session.localId)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setProgramSessionDropId(session.localId);
                    }}
                    onDrop={() => {
                      reorderProgramSession(draggedProgramSessionId, session.localId);
                      setDraggedProgramSessionId("");
                      setProgramSessionDropId("");
                    }}
                    onDragEnd={() => {
                      setDraggedProgramSessionId("");
                      setProgramSessionDropId("");
                    }}
                  >
                    <div className="exerciseTitleRow">
                      <div className="programSessionTitle">
                        <span className="dragHandle" aria-hidden="true">
                          Drag
                        </span>
                        <h3
                          className={`builderSessionLabel ${getWorkoutColorClass(
                            session.sessionName,
                            session.sessionType
                          )}`}
                        >
                          {isSingleWorkoutBuilder
                            ? session.sessionName
                            : `Week ${session.week} / Day ${session.day}: ${session.sessionName}`}
                        </h3>
                        <div className="programSessionMeta">
                          <span>{session.sessionType || "Strength"}</span>
                          <span>{session.intensity || "Moderate"}</span>
                          {session.estimatedDuration && (
                            <span>{session.estimatedDuration} min</span>
                          )}
                          {session.isSingleWorkout && <span>Single Workout</span>}
                        </div>
                      </div>

                      <div className="programSessionActions">
                        <button
                          className="outlineButton"
                          onClick={() => loadSessionForEditing(session)}
                        >
                          Edit
                        </button>

                        {!isSingleWorkoutBuilder && (
                          <button
                            className="outlineButton"
                            onClick={() => duplicateProgramSession(session)}
                          >
                            Duplicate
                          </button>
                        )}

                        <button
                          className="outlineButton"
                          onClick={() => removeProgramSession(session.localId)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <p>{session.exercises.length} exercises</p>

                    {session.exercises.map((exercise: any) => (
                      <p key={exercise.exerciseRecordId} style={{ margin: "4px 0" }}>
                        {exercise.order}. {exercise.exerciseName} — {exercise.sets} x{" "}
                        {exercise.reps}, Tempo {exercise.tempo}, Rest {exercise.rest}
                      </p>
                    ))}
                  </div>
                ))}
                </>
                )}

                <button
                  className="goldButton saveWorkoutButton"
                  onClick={saveFullProgram}
                  disabled={savingTemplate}
                >
                  {savingTemplate
                    ? "Saving..."
                    : isSingleWorkoutBuilder
                    ? "Save Workout"
                    : editProgramRecordId
                    ? "Update Program"
                    : "Save Full Program"}
                </button>
              </section>
                )}

                {workoutPageTab === "Program Builder" &&
                  useMobileWorkoutRows && (
                  <>
                    {mobileBuilderStep !== "overview" && (
                    <section className="mobileBuilder">
                      {mobileBuilderStep === "details" ? (
                        <div className="mobileBuilderBody">
                          <h2 className="mbScreenTitle">
                            {isSingleWorkoutBuilder ? "New Workout" : "New Program"}
                          </h2>

                          <div className="mbField">
                            <span className="mbFieldLabel">Builder type</span>
                            <select
                              className="miniSearch"
                              value={builderMode}
                              onChange={(e) =>
                                setBuilderMode(
                                  e.target.value as "Program" | "Single Workout"
                                )
                              }
                            >
                              <option value="Single Workout">Single Workout</option>
                              <option value="Program">Multi-Day Program</option>
                            </select>
                          </div>

                          <div className="mbField">
                            <span className="mbFieldLabel">
                              {isSingleWorkoutBuilder ? "Workout name" : "Program name"}
                            </span>
                            <input
                              className="miniSearch"
                              value={programName}
                              onChange={(e) => setProgramName(e.target.value)}
                              placeholder={
                                isSingleWorkoutBuilder
                                  ? "e.g. Lower Strength"
                                  : "e.g. Off-Season Block"
                              }
                            />
                          </div>

                          <div className="mbField">
                            <span className="mbFieldLabel">
                              {isSingleWorkoutBuilder ? "Description" : "Goal"}
                            </span>
                            <textarea
                              className="miniSearch mbTextarea"
                              value={programGoal}
                              onChange={(e) => setProgramGoal(e.target.value)}
                              placeholder="Optional"
                            />
                          </div>

                          {!isSingleWorkoutBuilder && (
                            <>
                              <div className="mbFieldRow">
                                <div className="mbField">
                                  <span className="mbFieldLabel">Week</span>
                                  <input
                                    className="miniSearch"
                                    inputMode="numeric"
                                    value={programWeek}
                                    onChange={(e) => setProgramWeek(e.target.value)}
                                  />
                                </div>
                                <div className="mbField">
                                  <span className="mbFieldLabel">Day</span>
                                  <input
                                    className="miniSearch"
                                    inputMode="numeric"
                                    value={programDay}
                                    onChange={(e) => setProgramDay(e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="mbField">
                                <span className="mbFieldLabel">Session name</span>
                                <input
                                  className="miniSearch"
                                  value={sessionName}
                                  onChange={(e) => setSessionName(e.target.value)}
                                  placeholder="e.g. Lower Strength"
                                />
                              </div>
                              {programSessions.length > 0 && (
                                <p className="mbHint">
                                  {programSessions.length} day
                                  {programSessions.length === 1 ? "" : "s"} added so far.
                                </p>
                              )}
                            </>
                          )}

                          <button
                            className="goldButton mbFullButton"
                            onClick={() => setMobileBuilderStep("editor")}
                          >
                            Next
                          </button>
                          {!isSingleWorkoutBuilder &&
                            programSessions.length > 0 && (
                              <button
                                className="outlineButton mbFullButton"
                                onClick={() => setMobileBuilderStep("overview")}
                              >
                                View program ›
                              </button>
                            )}
                        </div>
                      ) : (
                        <>
                          <div className="mobileBuilderBody mbEditorBody">
                            <div className="mbEditorTop">
                              <button
                                className="mbTextButton"
                                onClick={() => setMobileBuilderStep("details")}
                              >
                                ‹ Details
                              </button>
                              <strong>{programName || "Untitled"}</strong>
                            </div>

                            {selectedProgramExercises.length === 0 ? (
                              <div className="mbEmpty">
                                <h3>Add Exercises</h3>
                                <p>
                                  Add at least one exercise to build this{" "}
                                  {isSingleWorkoutBuilder ? "workout" : "day"}.
                                </p>
                                <button
                                  className="goldButton mbFullButton"
                                  onClick={openMobilePicker}
                                >
                                  Add Exercise
                                </button>
                                {!isSingleWorkoutBuilder && (
                                  <button
                                    className="outlineButton mbFullButton"
                                    onClick={openMobileLibPick}
                                  >
                                    Insert saved session
                                  </button>
                                )}
                              </div>
                            ) : (
                              selectedProgramExercises.map((exercise: any, index: any) => {
                                const showSectionHeading =
                                  index === 0 ||
                                  selectedProgramExercises[index - 1].sectionName !==
                                    exercise.sectionName;
                                const linked = isExerciseLinkedWithPrevious(index);
                                return (
                                  <div
                                    className="mbExerciseGroup"
                                    key={`${exercise.exerciseId}-${index}`}
                                  >
                                    {showSectionHeading && (
                                      <div className="mobileSectionHeading">
                                        {exercise.sectionName || "Main"}
                                      </div>
                                    )}
                                    {index > 0 && !showSectionHeading && (
                                      linked ? (
                                        <button
                                          className="mobileSupersetLinkButton linked"
                                          onClick={() => unlinkExerciseGroup(index)}
                                        >
                                          {exercise.groupType === "Circuit"
                                            ? "🔁 Circuit with above"
                                            : "🔗 Superset with above"}
                                        </button>
                                      ) : (
                                        <div className="mobileGroupLinkRow">
                                          <button
                                            className="mobileSupersetLinkButton"
                                            onClick={() =>
                                              toggleBuilderSupersetLink(index)
                                            }
                                          >
                                            + Link as superset
                                          </button>
                                          <button
                                            className="mobileSupersetLinkButton"
                                            onClick={() =>
                                              toggleBuilderCircuitLink(index)
                                            }
                                          >
                                            + Link as circuit
                                          </button>
                                        </div>
                                      )
                                    )}
                                    <div className="mobileExerciseCard">
                                      <div className="mobileExerciseCardHeader">
                                        <strong>
                                          {exercise.exerciseLabel
                                            ? `${exercise.exerciseLabel} · `
                                            : ""}
                                          {exercise.exerciseName}
                                        </strong>
                                        <button
                                          className="mbCardMenuBtn"
                                          aria-label="Exercise options"
                                          onClick={() => setMobileMenuIndex(index)}
                                        >
                                          <MoreVertical size={18} />
                                        </button>
                                      </div>

                                      {renderMobileSetTable(exercise, index)}

                                      <div className="mbCardControls">
                                        <label className="mbEachSide">
                                          <input
                                            type="checkbox"
                                            checked={Boolean(exercise.isUnilateral)}
                                            onChange={(e) =>
                                              updateProgramExercise(
                                                index,
                                                "isUnilateral",
                                                e.target.checked
                                              )
                                            }
                                          />
                                          Each side
                                        </label>
                                        <button
                                          className="mbAddSet"
                                          onClick={() =>
                                            adjustProgramExerciseSets(index, 1)
                                          }
                                        >
                                          + Add Set
                                        </button>
                                      </div>

                                      <textarea
                                        className="miniSearch mbNote"
                                        value={exercise.coachingNotes}
                                        onChange={(e) =>
                                          updateProgramExercise(
                                            index,
                                            "coachingNotes",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Add note…"
                                      />
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <div className="mobileBuilderActionBar">
                            <button
                              className="outlineButton"
                              onClick={openMobilePicker}
                            >
                              + Add
                            </button>
                            {selectedProgramExercises.length > 1 && (
                              <button
                                className="outlineButton"
                                onClick={() => setMobileBuilderStep("arrange")}
                              >
                                Arrange
                              </button>
                            )}
                            {isSingleWorkoutBuilder ? (
                              <button
                                className="goldButton"
                                disabled={savingTemplate}
                                onClick={saveMobileWorkout}
                              >
                                {savingTemplate ? "Saving…" : "Save"}
                              </button>
                            ) : (
                              <>
                                <button
                                  className="outlineButton"
                                  disabled={savingTemplate}
                                  onClick={saveMobileProgramDay}
                                >
                                  Save Day
                                </button>
                                <button
                                  className="goldButton"
                                  disabled={savingTemplate}
                                  onClick={finishMobileProgram}
                                >
                                  {savingTemplate ? "Saving…" : "Finish"}
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </section>
                    )}

                    {mobileBuilderStep === "picker" && (
                      <div className="mobileSheet">
                        <header className="mobileBuilderHeader">
                          <button
                            className="mbHeaderBack"
                            onClick={() => {
                              setMobilePickerSelected(new Set());
                              setMobileBuilderStep("editor");
                            }}
                            aria-label="Back"
                          >
                            ‹
                          </button>
                          <h2>Select exercises</h2>
                          <button
                            className="mbHeaderAction"
                            disabled={mobilePickerSelected.size === 0}
                            onClick={commitMobilePicker}
                          >
                            {mobilePickerSelected.size > 0
                              ? `Add ${mobilePickerSelected.size}`
                              : "Add"}
                          </button>
                        </header>
                        <div className="mobileBuilderBody">
                          <div className="mbField">
                            <span className="mbFieldLabel">Section</span>
                            <select
                              className="miniSearch"
                              value={pendingSectionName}
                              onChange={(e) => setPendingSectionName(e.target.value)}
                            >
                              {builderSectionOptions.map((section: any) => (
                                <option key={section} value={section}>
                                  {section}
                                </option>
                              ))}
                            </select>
                          </div>
                          <input
                            className="miniSearch mbSearchInput"
                            value={builderSearch}
                            onChange={(e) => setBuilderSearch(e.target.value)}
                            placeholder="Search exercise…"
                          />
                          {libraryLoading && builderExercises.length === 0 && (
                            <p className="mbHint">Loading exercises…</p>
                          )}
                          {builderExercises.map((exercise: any) => {
                            const key =
                              exercise.recordId || exercise.exerciseId;
                            const checked = mobilePickerSelected.has(key);
                            return (
                              <button
                                key={key}
                                type="button"
                                className={`mobilePickerRow ${
                                  checked ? "mobilePickerRowSelected" : ""
                                }`}
                                onClick={() => toggleMobilePick(key)}
                              >
                                <span
                                  className={`mobilePickerCheck ${
                                    checked ? "checked" : ""
                                  }`}
                                >
                                  {checked ? "✓" : ""}
                                </span>
                                <span className="mobilePickerInfo">
                                  <strong>{exercise.exerciseName}</strong>
                                  <small>
                                    {[exercise.equipment, exercise.category]
                                      .filter(Boolean)
                                      .join(" · ") || "Exercise"}
                                  </small>
                                </span>
                              </button>
                            );
                          })}
                          {!libraryLoading &&
                            builderExercises.length === 0 && (
                              <p className="mbHint">No exercises match.</p>
                            )}
                        </div>
                      </div>
                    )}

                    {mobileBuilderStep === "arrange" && (
                      <div
                        className="mobileBackdrop"
                        onClick={() => setMobileBuilderStep("editor")}
                      >
                        <div
                          className="mobileBottomSheet"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="mobileSheetHandle" />
                          <div className="mobileSheetTitleRow">
                            <h3>Arrange exercises</h3>
                            <button
                              className="mbHeaderAction"
                              onClick={() => setMobileBuilderStep("editor")}
                            >
                              Done
                            </button>
                          </div>
                          <div className="mobileSheetScroll">
                            {(() => {
                              const items = getBuilderOrderItems(
                                selectedProgramExercises
                              );
                              mobileArrangeItemsRef.current = items;
                              return items.map((item: any, itemIndex: any) => (
                                <div
                                  key={item.key}
                                  ref={(el) => {
                                    mobileArrangeRefs.current[itemIndex] = el;
                                  }}
                                  className={`mobileArrangeRow ${
                                    item.isLinkedGroup ? "mobileArrangeRowGroup" : ""
                                  } ${
                                    mobileDragIndex === itemIndex
                                      ? "mobileArrangeRowDragging"
                                      : ""
                                  } ${
                                    mobileDragOverIndex === itemIndex &&
                                    mobileDragIndex !== null &&
                                    mobileDragIndex !== itemIndex
                                      ? "mobileArrangeRowOver"
                                      : ""
                                  }`}
                                  onPointerDown={(e) =>
                                    startMobileDrag(e, itemIndex)
                                  }
                                >
                                  <div className="mobileArrangeBody">
                                    {item.isLinkedGroup && (
                                      <span className="mobileArrangeSupersetTag">
                                        <Link2 size={13} /> Superset
                                      </span>
                                    )}
                                    {item.exercises.map((exercise: any, subIndex: any) => (
                                      <span
                                        className="mobileArrangeName"
                                        key={`${exercise.exerciseId}-${subIndex}`}
                                      >
                                        {exercise.exerciseLabel
                                          ? `${exercise.exerciseLabel} · `
                                          : ""}
                                        {exercise.exerciseName}
                                      </span>
                                    ))}
                                  </div>
                                  <span
                                    className="mobileArrangeHandle"
                                    aria-hidden="true"
                                  >
                                    <GripVertical size={22} />
                                  </span>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {mobileBuilderStep === "overview" && (
                      <section className="mobileBuilder mbOverview">
                        <div className="mobileBuilderBody">
                          <h2 className="mbScreenTitle">
                            {programName || "Program"}
                          </h2>
                          <p className="mbHint">
                            {programSessions.length} day
                            {programSessions.length === 1 ? "" : "s"} ·{" "}
                            tap a day to edit
                          </p>

                          {(() => {
                            const maxWeek = programSessions.reduce(
                              (m: any, s: any) => Math.max(m, Number(s.week) || 1),
                              1
                            );
                            const weekCount = Math.max(
                              Number(programDurationWeeks) || 1,
                              maxWeek
                            );
                            const weeks = Array.from(
                              { length: weekCount },
                              (_: any, i: any) => i + 1
                            );
                            return weeks.map((w: any) => {
                              const days = programSessions
                                .filter((s: any) => s.week === String(w))
                                .sort((a: any, b: any) => Number(a.day) - Number(b.day));
                              return (
                                <div className="mbOvWeek" key={w}>
                                  <div className="mbOvWeekHead">
                                    <strong>Week {w}</strong>
                                    {days.length > 0 && (
                                      <span className="weekVolChip">
                                        {weekVolume(w).sets} sets
                                      </span>
                                    )}
                                    {days.length > 0 && (
                                      <button
                                        type="button"
                                        className="mbOvDup"
                                        onClick={() =>
                                          duplicateWeek(w, [w + 1], 0)
                                        }
                                      >
                                        <Copy size={13} /> Duplicate →
                                      </button>
                                    )}
                                  </div>
                                  {days.map((s: any) => (
                                    <button
                                      key={s.localId}
                                      type="button"
                                      className="mbOvDay"
                                      onClick={() => {
                                        loadSessionForEditing(s);
                                        setMobileBuilderStep("editor");
                                      }}
                                    >
                                      <span className="mbOvDayMain">
                                        <strong>
                                          Day {s.day} ·{" "}
                                          {s.sessionName ||
                                            `Week ${w} Day ${s.day}`}
                                        </strong>
                                        <small>
                                          {s.exercises.length} exercise
                                          {s.exercises.length === 1 ? "" : "s"}
                                        </small>
                                      </span>
                                      <span className="mbOvChevron">›</span>
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    className="mbOvAdd"
                                    onClick={() => addMobileDayToWeek(w)}
                                  >
                                    <Plus size={15} /> Add day
                                  </button>
                                </div>
                              );
                            });
                          })()}

                          <button
                            type="button"
                            className="goldButton mbFullButton"
                            disabled={savingTemplate}
                            onClick={finishMobileProgram}
                          >
                            {savingTemplate ? "Saving…" : "Finish & Save"}
                          </button>
                        </div>
                      </section>
                    )}

                    {mobileBuilderStep === "libpick" && (
                      <div className="mobileSheet">
                        <header className="mobileBuilderHeader">
                          <button
                            className="mbHeaderBack"
                            onClick={() => setMobileBuilderStep("editor")}
                            aria-label="Back"
                          >
                            ‹
                          </button>
                          <h2>Insert session</h2>
                          <span style={{ width: 40 }} />
                        </header>
                        <div className="mobileBuilderBody">
                          <div className="mbField">
                            <span className="mbFieldLabel">From program</span>
                            <select
                              className="miniSearch"
                              value={sessionLibProgramId}
                              onChange={(e) => {
                                const prog = programs.find(
                                  (pp: any) => pp.programId === e.target.value
                                );
                                if (prog) loadSessionLibrary(prog);
                                else {
                                  setSessionLibProgramId("");
                                  setSessionLibSessions([]);
                                }
                              }}
                            >
                              <option value="">Choose a program…</option>
                              {programs.map((pp: any) => (
                                <option key={pp.recordId} value={pp.programId}>
                                  {pp.programName}
                                </option>
                              ))}
                            </select>
                          </div>
                          {sessionLibLoading && (
                            <p className="mbHint">Loading sessions…</p>
                          )}
                          {!sessionLibLoading &&
                            sessionLibProgramId &&
                            sessionLibSessions.length === 0 && (
                              <p className="mbHint">
                                No sessions in this program.
                              </p>
                            )}
                          {sessionLibSessions.map((s: any) => (
                            <button
                              key={s.localId}
                              type="button"
                              className="mobilePickerRow"
                              onClick={() => insertLibSessionIntoCurrentDay(s)}
                            >
                              <span className="mobilePickerInfo">
                                <strong>
                                  {s.sessionName || `W${s.week} D${s.day}`}
                                </strong>
                                <small>{s.exercises.length} exercises</small>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {mobileMenuIndex !== null &&
                      selectedProgramExercises[mobileMenuIndex] && (
                        <div
                          className="mobileBackdrop"
                          onClick={() => setMobileMenuIndex(null)}
                        >
                          <div
                            className="mobileBottomSheet mobileOptionsSheet"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="mobileSheetHandle" />
                            <h3 className="mobileOptionsTitle">Exercise options</h3>
                            <div className="mobileOptionsGrid">
                              <button
                                onClick={() => {
                                  setMobileDetailsIndex(mobileMenuIndex);
                                  setMobileMenuIndex(null);
                                }}
                              >
                                <span className="mbOptIcon">
                                  <Eye size={22} />
                                </span>
                                Details
                              </button>
                              <button
                                onClick={() =>
                                  openMobileAlternate(mobileMenuIndex)
                                }
                              >
                                <span className="mbOptIcon">
                                  <Shuffle size={22} />
                                </span>
                                {(
                                  selectedProgramExercises[mobileMenuIndex]
                                    .alternateExercises || []
                                ).length > 0
                                  ? "Edit alternates"
                                  : "Alternates"}
                              </button>
                              <button
                                onClick={() => {
                                  duplicateProgramExercise(mobileMenuIndex);
                                  setMobileMenuIndex(null);
                                }}
                              >
                                <span className="mbOptIcon">
                                  <Copy size={22} />
                                </span>
                                Duplicate
                              </button>
                              <button
                                onClick={() => {
                                  removeProgramExercise(mobileMenuIndex);
                                  setMobileMenuIndex(null);
                                }}
                              >
                                <span className="mbOptIcon mbOptIconDanger">
                                  <Trash2 size={22} />
                                </span>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                    {mobileDetailsIndex !== null &&
                      selectedProgramExercises[mobileDetailsIndex] && (
                        <div
                          className="mobileBackdrop"
                          onClick={() => setMobileDetailsIndex(null)}
                        >
                          <div
                            className="mobileBottomSheet mobileDetailsSheet"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="mobileSheetHandle" />
                            <div className="mobileSheetTitleRow">
                              <h3>
                                {
                                  selectedProgramExercises[mobileDetailsIndex]
                                    .exerciseName
                                }
                              </h3>
                              <button
                                className="mbHeaderAction"
                                onClick={() => setMobileDetailsIndex(null)}
                              >
                                Done
                              </button>
                            </div>
                            <div className="mobileSheetScroll">
                              <p className="mbDetailsHint">
                                Full set detail — load, %1RM, tempo, rest
                                {isCardioCategory(
                                  selectedProgramExercises[mobileDetailsIndex]
                                    .sectionName
                                )
                                  ? " and zones"
                                  : ""}
                                .
                              </p>
                              {renderSetPrescriptionTable(
                                selectedProgramExercises[mobileDetailsIndex],
                                mobileDetailsIndex
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                    {mobileAlternateIndex !== null &&
                      selectedProgramExercises[mobileAlternateIndex] &&
                      (() => {
                        const exIdx = mobileAlternateIndex;
                        const ex = selectedProgramExercises[exIdx];
                        const alts = ex.alternateExercises || [];
                        const q = alternateSearch.trim().toLowerCase();
                        const available = libraryExercises
                          .filter((le: any) => {
                            const isCurrent =
                              le.recordId === ex.exerciseRecordId ||
                              le.exerciseId === ex.exerciseId ||
                              le.exerciseName === ex.exerciseName;
                            const added = alts.some(
                              (a: any) =>
                                a.exerciseRecordId === le.recordId ||
                                a.exerciseId === le.exerciseId ||
                                a.exerciseName === le.exerciseName
                            );
                            const matches =
                              !q ||
                              [le.exerciseName, le.equipment, le.category]
                                .filter(Boolean)
                                .join(" ")
                                .toLowerCase()
                                .includes(q);
                            return !isCurrent && !added && matches;
                          })
                          .slice(0, 30);
                        return (
                          <div
                            className="mobileBackdrop"
                            onClick={() => setMobileAlternateIndex(null)}
                          >
                            <div
                              className="mobileBottomSheet mobileAltSheet"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="mobileSheetHandle" />
                              <div className="mobileSheetTitleRow">
                                <h3>Alternates · {ex.exerciseName}</h3>
                                <button
                                  className="mbHeaderAction"
                                  onClick={() => setMobileAlternateIndex(null)}
                                >
                                  Done
                                </button>
                              </div>
                              <div className="mobileSheetScroll">
                                <p className="mbDetailsHint">
                                  Swaps the athlete can use instead of this
                                  exercise.
                                </p>

                                {alts.length === 0 ? (
                                  <p className="mbHint">No alternates yet.</p>
                                ) : (
                                  <div className="mbAltList">
                                    {alts.map((a: any, ai: any) => (
                                      <div
                                        className="mbAltRow"
                                        key={`${a.exerciseId || a.exerciseName}-${ai}`}
                                      >
                                        <span className="mbAltNum">{ai + 1}</span>
                                        <span className="mbAltName">
                                          {a.exerciseName}
                                        </span>
                                        <div className="mbAltActions">
                                          <button
                                            disabled={ai === 0}
                                            aria-label="Move up"
                                            onClick={() =>
                                              reorderAlternateExercise(
                                                exIdx,
                                                ai,
                                                ai - 1
                                              )
                                            }
                                          >
                                            ▲
                                          </button>
                                          <button
                                            disabled={ai === alts.length - 1}
                                            aria-label="Move down"
                                            onClick={() =>
                                              reorderAlternateExercise(
                                                exIdx,
                                                ai,
                                                ai + 1
                                              )
                                            }
                                          >
                                            ▼
                                          </button>
                                          <button
                                            className="mbAltDel"
                                            aria-label={`Remove ${a.exerciseName}`}
                                            onClick={() =>
                                              removeAlternateExercise(exIdx, ai)
                                            }
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <input
                                  className="miniSearch mbAltSearch"
                                  value={alternateSearch}
                                  onChange={(e) =>
                                    setAlternateSearch(e.target.value)
                                  }
                                  placeholder="Search to add an alternate…"
                                />
                                <div className="mbAltLibrary">
                                  {libraryLoading &&
                                    libraryExercises.length === 0 && (
                                      <p className="mbHint">Loading…</p>
                                    )}
                                  {available.map((le: any) => (
                                    <button
                                      className="mbAltAddRow"
                                      key={le.recordId || le.exerciseId}
                                      onClick={() =>
                                        addAlternateExercise(exIdx, le)
                                      }
                                    >
                                      <Plus size={16} />
                                      <span>{le.exerciseName}</span>
                                    </button>
                                  ))}
                                  {!libraryLoading &&
                                    available.length === 0 && (
                                      <p className="mbHint">No matches.</p>
                                    )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                  </>
                )}

                {workoutPageTab === "Forms" && formView === "list" && (
                  <section className="programLibraryPanel">
                    <div className="programLibraryHeader programLandingHeader">
                      <div className="programLandingControls">
                        <span className="programViewSelect programViewStatic">
                          All forms
                        </span>
                        <input
                          className="templateSearchInput programLandingSearch"
                          value={savedFormSearch}
                          onChange={(e) => setSavedFormSearch(e.target.value)}
                          placeholder="Search forms..."
                        />
                      </div>
                      <div className="programLandingActions">
                        <button
                          className="outlineButton"
                          onClick={() => void loadFormTemplates(true)}
                        >
                          Refresh
                        </button>
                      </div>
                    </div>
                    <div className="programLibraryStack">
                      <div className="programTable wkFormsTable">
                        <div className="programTableHead">
                          <span>Title</span>
                          <span>Type</span>
                          <span>Items</span>
                          <span>Created By</span>
                          <span className="programTableActionsHead">Actions</span>
                        </div>
                        {formTemplatesLoading &&
                          savedFormTemplates.length === 0 && (
                            <p className="programTableEmpty">Loading…</p>
                          )}
                        {!formTemplatesLoading &&
                          savedFormTemplates.length === 0 && (
                            <p className="programTableEmpty">
                              No saved forms yet. Create one to assign to clients.
                            </p>
                          )}
                        {!formTemplatesLoading &&
                          savedFormTemplates.length > 0 &&
                          visibleSavedForms.length === 0 && (
                            <p className="programTableEmpty">
                              No forms match your search.
                            </p>
                          )}
                        {visibleSavedForms.map((form: any) => {
                          const initials =
                            (form.name || form.formId || "")
                              .split(/\s+/)
                              .map((w: any) => w[0])
                              .filter(Boolean)
                              .join("")
                              .slice(0, 3)
                              .toUpperCase() || "FM";
                          return (
                            <div
                              key={form.recordId}
                              className="programTableRow"
                              onClick={() => loadSavedFormIntoBuilder(form)}
                            >
                              <span className="programTableTitle">
                                <span
                                  className="programTableBadge"
                                  style={wkFormTone(form.type)}
                                >
                                  {initials}
                                </span>
                                <span className="programTableName">
                                  <strong>
                                    {form.name || form.formId || "Untitled Form"}
                                  </strong>
                                </span>
                              </span>
                              <span className="programTableCell">
                                <span
                                  className="wkTypePill"
                                  style={wkFormTone(form.type)}
                                >
                                  {form.type || "Form"}
                                </span>
                              </span>
                              <span className="programTableCell">
                                {(form.questions?.length ?? 0)} questions
                              </span>
                              <span className="programTableCell">
                                {form.createdBy || form.coach || "—"}
                              </span>
                              <span
                                className="programTableActions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="iconActionButton"
                                  title="Duplicate form"
                                  onClick={() => duplicateSavedFormIntoBuilder(form)}
                                >
                                  <Copy size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="iconActionButton dangerMenuItem"
                                  title="Delete form"
                                  onClick={() => deleteSavedFormTemplate(form)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                )}

                {workoutPageTab === "Forms" && formView === "builder" && (
                  <section className="tableCard builderHubPanel">
                    <button
                      type="button"
                      className="builderBackLink"
                      onClick={() => setFormView("list")}
                    >
                      <ChevronLeft size={16} /> Forms
                    </button>
                    <div className="builderHubHeader builderToneHeader">
                      <div>
                        <h2>Form & Questionnaire Builder</h2>
                        <p>
                          Build check-ins, intake forms, readiness surveys, and custom questionnaires for coach assignment.
                        </p>
                      </div>
                      <div className="builderHubActions">
                        <details className="savedTemplateDropdown">
                          <summary className="outlineButton">
                            Saved Forms
                            <span>{savedFormTemplates.length}</span>
                          </summary>
                          <div className="savedTemplateDropdownMenu">
                            <div className="savedTemplateHeader">
                              <h3>Saved Forms</h3>
                              <button
                                className="outlineButton"
                                onClick={(event) => {
                                  event.preventDefault();
                                  void loadFormTemplates(true);
                                }}
                              >
                                Reload
                              </button>
                            </div>

                            <input
                              className="templateSearchInput"
                              value={savedFormSearch}
                              onChange={(event) =>
                                setSavedFormSearch(event.target.value)
                              }
                              placeholder="Search forms..."
                            />

                            {formTemplatesLoading && (
                              <p className="emptyState">Loading forms...</p>
                            )}

                            {!formTemplatesLoading &&
                              savedFormTemplates.length === 0 && (
                                <p className="emptyState">No saved forms yet.</p>
                              )}

                            {!formTemplatesLoading &&
                              savedFormTemplates.length > 0 &&
                              visibleSavedForms.length === 0 && (
                                <p className="emptyState">No forms match your search.</p>
                              )}

                            <div className="savedTemplateList">
                              {visibleSavedForms.map((form: any) => (
                                <div
                                  key={form.recordId}
                                  className={`savedTemplateItem savedTemplateCard ${
                                    selectedSavedFormId === form.formId
                                      ? "selectedSavedTemplateItem"
                                      : ""
                                  }`}
                                >
                                  <button
                                    type="button"
                                    className="savedTemplateMainButton"
                                    onClick={() => {
                                      setSelectedSavedFormId(form.formId);
                                      loadSavedFormIntoBuilder(form);
                                    }}
                                  >
                                    <strong>
                                      {form.name || form.formId || "Untitled Form"}
                                    </strong>
                                    <span>{form.type || "Form"}</span>
                                    <small>{form.questions.length} questions</small>
                                  </button>
                                  <details className="templateActionMenu">
                                    <summary aria-label="Template actions">...</summary>
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => loadSavedFormIntoBuilder(form)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          duplicateSavedFormIntoBuilder(form)
                                        }
                                      >
                                        Duplicate
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteSavedFormTemplate(form)}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </details>
                                </div>
                              ))}
                            </div>
                          </div>
                        </details>

                        <button
                          className="goldButton"
                          onClick={saveFormTemplate}
                          disabled={savingFormTemplate}
                        >
                          {savingFormTemplate
                            ? "Saving..."
                            : editingFormTemplate
                            ? "Update Form Template"
                            : "Save Form Template"}
                        </button>
                      </div>
                    </div>

                    <div className="builderHubMain">
                        <div className="builderHubGrid">
                          <label>
                            <span>Form Name</span>
                            <input
                              className="miniSearch"
                              value={formTemplateName}
                              onChange={(e) => setFormTemplateName(e.target.value)}
                            />
                          </label>
                          <label>
                            <span>Type</span>
                            <select
                              className="miniSearch"
                              value={formTemplateType}
                              onChange={(e) => setFormTemplateType(e.target.value)}
                            >
                              <option>Check-in</option>
                              <option>Questionnaire</option>
                              <option>Intake</option>
                              <option>Readiness</option>
                              <option>Custom</option>
                            </select>
                          </label>
                        </div>

                        <div className="builderHubList">
                          <div className="exerciseTitleRow">
                            <h3>Questions</h3>
                            <button className="outlineButton" onClick={addFormQuestion}>
                              + Add Question
                            </button>
                          </div>

                          {formQuestions.map((question: any, index: any) => (
                            <div className="builderHubRow" key={`${question.id}-${index}`}>
                              <label>
                                <span>Question</span>
                                <input
                                  className="miniSearch"
                                  value={question.label}
                                  onChange={(e) =>
                                    updateFormQuestion(index, "label", e.target.value)
                                  }
                                  placeholder="Question text"
                                />
                              </label>
                              <label>
                                <span>Type</span>
                                <select
                                  className="miniSearch"
                                  value={question.questionType}
                                  onChange={(e) =>
                                    updateFormQuestion(
                                      index,
                                      "questionType",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option>Text</option>
                                  <option>Long Text</option>
                                  <option>Number</option>
                                  <option>Scale</option>
                                  <option>Single Select</option>
                                  <option>Multi Select</option>
                                  <option>Yes/No</option>
                                  <option>Date</option>
                                </select>
                              </label>
                              <label className="builderCheckboxLabel">
                                <input
                                  type="checkbox"
                                  checked={question.required}
                                  onChange={(e) =>
                                    updateFormQuestion(
                                      index,
                                      "required",
                                      e.target.checked
                                    )
                                  }
                                />
                                <span>Required</span>
                              </label>
                              <button
                                className="outlineButton"
                                onClick={() => removeFormQuestion(index)}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                    </div>
                  </section>
                )}

                {workoutPageTab === "Tests" && testView === "builder" && (
                  <section className="tableCard builderHubPanel">
                    <button
                      type="button"
                      className="builderBackLink"
                      onClick={() => exitTestBuilder()}
                    >
                      <ChevronLeft size={16} /> Tests
                    </button>
                    <div className="builderHubHeader builderToneHeader">
                      <div>
                        <h2>Physical Test Builder</h2>
                        <p>
                          Build test batteries for strength, speed, power, mobility, or return-to-training checkpoints.
                        </p>
                      </div>
                      <div className="builderHubActions">
                        <details className="savedTemplateDropdown">
                          <summary className="outlineButton">
                            Saved Tests
                            <span>{savedTestTemplates.length}</span>
                          </summary>
                          <div className="savedTemplateDropdownMenu">
                            <div className="savedTemplateHeader">
                              <h3>Saved Tests</h3>
                              <button
                                className="outlineButton"
                                onClick={(event) => {
                                  event.preventDefault();
                                  void loadTestTemplates(true);
                                }}
                              >
                                Reload
                              </button>
                            </div>

                            <input
                              className="templateSearchInput"
                              value={savedTestSearch}
                              onChange={(event) =>
                                setSavedTestSearch(event.target.value)
                              }
                              placeholder="Search tests..."
                            />

                            {testTemplatesLoading && (
                              <p className="emptyState">Loading tests...</p>
                            )}

                            {!testTemplatesLoading && savedTestTemplates.length === 0 && (
                              <p className="emptyState">No saved tests yet.</p>
                            )}

                            {!testTemplatesLoading &&
                              savedTestTemplates.length > 0 &&
                              visibleSavedTests.length === 0 && (
                                <p className="emptyState">No tests match your search.</p>
                              )}

                            <div className="savedTemplateList">
                              {visibleSavedTests.map((test: any) => (
                                <div
                                  key={test.recordId}
                                  className={`savedTemplateItem savedTemplateCard ${
                                    selectedSavedTestId === test.testTemplateId
                                      ? "selectedSavedTemplateItem"
                                      : ""
                                  }`}
                                >
                                  <button
                                    type="button"
                                    className="savedTemplateMainButton"
                                    onClick={() => {
                                      setSelectedSavedTestId(test.testTemplateId);
                                      loadSavedTestIntoBuilder(test);
                                    }}
                                  >
                                    <strong>
                                      {test.name ||
                                        test.testTemplateId ||
                                        "Untitled Test"}
                                    </strong>
                                    <span>{test.status || "Active"}</span>
                                    <small>{test.items.length} test items</small>
                                  </button>
                                  <details className="templateActionMenu">
                                    <summary aria-label="Template actions">...</summary>
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => loadSavedTestIntoBuilder(test)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          duplicateSavedTestIntoBuilder(test)
                                        }
                                      >
                                        Duplicate
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteSavedTestTemplate(test)}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </details>
                                </div>
                              ))}
                            </div>
                          </div>
                        </details>

                        <button
                          className="goldButton"
                          onClick={saveTestTemplate}
                          disabled={savingTestTemplate}
                        >
                          {savingTestTemplate
                            ? "Saving..."
                            : editingTestTemplate
                            ? "Update Test Template"
                            : "Save Test Template"}
                        </button>
                      </div>
                    </div>

                    <div className="builderHubMain">
                        <div className="builderHubGrid">
                          <label>
                            <span>Test Template Name</span>
                            <input
                              className="miniSearch"
                              value={testTemplateName}
                              onChange={(e) => setTestTemplateName(e.target.value)}
                            />
                          </label>
                          <label>
                            <span>{t("testsCategoryLabel")}</span>
                            <select
                              className="miniSearch"
                              value={testTemplateCategory}
                              onChange={(e) =>
                                setTestTemplateCategory(e.target.value)
                              }
                            >
                              {TEST_CATEGORIES.map((category) => (
                                <option key={category} value={category}>
                                  {t(testCategoryLabelKey(category))}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="builderHubList">
                          <div className="exerciseTitleRow">
                            <h3>Test Items</h3>
                            <button className="outlineButton" onClick={addTestItem}>
                              + Add Test
                            </button>
                          </div>

                          {testItems.map((item: any, index: any) => (
                            <div className="builderHubRow testBuilderRow" key={`${item.id}-${index}`}>
                              <label>
                                <span>Test Name</span>
                                <input
                                  className="miniSearch"
                                  value={item.testName}
                                  onChange={(e) =>
                                    updateTestItem(index, "testName", e.target.value)
                                  }
                                  placeholder="Countermovement jump, 5RM squat..."
                                />
                              </label>
                              <label>
                                <span>Metric</span>
                                <select
                                  className="miniSearch"
                                  value={item.metricType}
                                  onChange={(e) =>
                                    updateTestItem(index, "metricType", e.target.value)
                                  }
                                >
                                  <option>Weight</option>
                                  <option>Reps</option>
                                  <option>Time</option>
                                  <option>Distance</option>
                                  <option>Height</option>
                                  <option>Power</option>
                                  <option>Speed</option>
                                  <option>Score</option>
                                  <option>Yes/No</option>
                                </select>
                              </label>
                              <label>
                                <span>Unit</span>
                                <select
                                  className="miniSearch"
                                  value={item.unit}
                                  onChange={(e) =>
                                    updateTestItem(index, "unit", e.target.value)
                                  }
                                >
                                  <option>kg</option>
                                  <option>lb</option>
                                  <option>reps</option>
                                  <option>sec</option>
                                  <option>min</option>
                                  <option>m</option>
                                  <option>cm</option>
                                  <option>watts</option>
                                  <option>m/s</option>
                                  <option>score</option>
                                  <option>none</option>
                                </select>
                              </label>
                              <label className="checkboxRow builderMetricCheckbox">
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.createsMetric)}
                                  onChange={(e) =>
                                    updateTestItem(
                                      index,
                                      "createsMetric",
                                      e.target.checked
                                    )
                                  }
                                />
                                <span>Create athlete metric</span>
                              </label>
                              {item.createsMetric && (
                                <div className="builderHubRow builderMetricConfig">
                                  <label>
                                    <span>Metric Name</span>
                                    <input
                                      className="miniSearch"
                                      value={item.metricName || ""}
                                      onChange={(e) =>
                                        updateTestItem(
                                          index,
                                          "metricName",
                                          e.target.value
                                        )
                                      }
                                      placeholder="Predicted 1RM, MAS..."
                                    />
                                  </label>
                                  <label>
                                    <span>Metric Unit</span>
                                    <input
                                      className="miniSearch"
                                      value={item.metricUnit || ""}
                                      onChange={(e) =>
                                        updateTestItem(
                                          index,
                                          "metricUnit",
                                          e.target.value
                                        )
                                      }
                                      placeholder="kg, m/s, km/h..."
                                    />
                                  </label>
                                  <label>
                                    <span>Calculation</span>
                                    <select
                                      className="miniSearch"
                                      value={item.calculationMethod || "Direct Value"}
                                      onChange={(e) =>
                                        updateTestItem(
                                          index,
                                          "calculationMethod",
                                          e.target.value
                                        )
                                      }
                                    >
                                      <option>Direct Value</option>
                                      <option>Epley 1RM</option>
                                      <option>Brzycki 1RM</option>
                                      <option>Relative Strength (x BW)</option>
                                      <option>2km Time Trial Speed</option>
                                      <option>Max Aerobic Speed</option>
                                      <option>Max Aerobic Speed (m/s)</option>
                                      <option>30-15 IFT (VIFT)</option>
                                      <option>Run Pace (min/km)</option>
                                      <option>Lactate Threshold</option>
                                      <option>VO2max (Cooper 12-min)</option>
                                      <option>VO2max (Yo-Yo IR1)</option>
                                      <option>Peak Power (CMJ, Sayers)</option>
                                      <option>Reactive Strength Index (RSI)</option>
                                      <option>Sprint Velocity (m/s)</option>
                                    </select>
                                  </label>
                                  <label>
                                    <span>Input Unit</span>
                                    <input
                                      className="miniSearch"
                                      value={item.inputUnit || ""}
                                      onChange={(e) =>
                                        updateTestItem(
                                          index,
                                          "inputUnit",
                                          e.target.value
                                        )
                                      }
                                      placeholder="kg x reps, mm:ss..."
                                    />
                                  </label>
                                </div>
                              )}
                              <button
                                className="outlineButton"
                                onClick={() => removeTestItem(index)}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                    </div>
                  </section>
                )}

                {workoutPageTab === "Assignments" && (
                  <section className="tableCard builderHubPanel">
                    <div className="builderHubHeader">
                      <div>
                        <h2>Assignment Hub</h2>
                        <p>
                          Send programs, forms, check-ins, and tests to clients. Assigned items will appear in the client portal as tasks.
                        </p>
                      </div>
                    </div>

                    <div className="builderHubGrid assignmentHubGrid">
                      <label>
                        <span>Assignment Type</span>
                        <select
                          className="miniSearch"
                          value={assignmentType}
                          onChange={(e) => {
                            setAssignmentType(e.target.value);
                            setAssignmentTemplateId("");
                          }}
                        >
                          <option>Program</option>
                          <option>Check-in</option>
                          <option>Questionnaire</option>
                          <option>Physical Test</option>
                        </select>
                      </label>
                      <label>
                        <span>Client</span>
                        <select
                          className="miniSearch"
                          value={assignmentClientId}
                          onChange={(e) => setAssignmentClientId(e.target.value)}
                        >
                          <option value="">Select client</option>
                          {coachVisibleClients.map((client: any) => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>
                          {assignmentType === "Program"
                            ? "Saved Program"
                            : assignmentType === "Physical Test"
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
                              ? assignmentType === "Program"
                                ? "No saved programs"
                                : assignmentType === "Physical Test"
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
                      <label>
                        <span>Start Date</span>
                        <input
                          ref={assignmentHubDateInputRef}
                          className="miniSearch"
                          type="date"
                          value={assignmentDueDate}
                          onChange={(e) => {
                            const nextDate = normalizeDate(e.target.value);
                            setAssignmentDueDate(nextDate);
                            setCalendarAnchorDate(nextDate);
                          }}
                        />
                      </label>
                      <button
                        className="goldButton"
                        onClick={() =>
                          createContentAssignment({
                            assignmentDueDate: normalizeDate(
                              assignmentHubDateInputRef.current?.value ||
                                assignmentDueDate
                            ),
                          })
                        }
                        disabled={creatingAssignment}
                      >
                        {creatingAssignment ? "Creating..." : "Create Assignment"}
                      </button>
                    </div>

                    <div className="assignmentTypeGrid">
                      <div>
                        <strong>Programs</strong>
                        <span>Use saved programs to create scheduled workouts.</span>
                      </div>
                      <div>
                        <strong>Check-ins</strong>
                        <span>Assign recurring or one-off readiness questionnaires.</span>
                      </div>
                      <div>
                        <strong>Questionnaires</strong>
                        <span>Send intake, feedback, travel, pain, or custom forms.</span>
                      </div>
                      <div>
                        <strong>Physical Tests</strong>
                        <span>Assign test batteries and collect structured results.</span>
                      </div>
                    </div>
                  </section>
                )}
              </>
    </>
  );
}
