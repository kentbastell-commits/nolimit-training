import ExerciseLabelControl from "./ExerciseLabelControl";
import { SaveCalendarDraftButton } from "./CalendarDraftControls";
// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import "./CoachBuilderPage.css";
import ExercisePrescriptionEditor from "./ExercisePrescriptionEditor";
import ProgrammingBlocks from "./ProgrammingBlocks";
import WeekCopySheet from "./WeekCopySheet";
import AthletePrescriptionHistory, { useAthletePrescriptionHistory } from "./AthletePrescriptionHistory";
import { isCardioCategory } from "./appCore";
import { Fragment, useEffect, useRef, useState } from "react";
import CoachProgramsLanding from "./CoachProgramsLanding";
import ProgramDetailPanel from "./ProgramDetailPanel";
import PortalToApp from "./PortalToApp";
import { Activity, BookOpen, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsLeftRight, ClipboardList, Copy, Dumbbell, Feather, Film, GripVertical, HeartPulse, Link2, MoreVertical, Pencil, Plus, RefreshCw, Save, Shuffle, Tag, Target, Trash2, Trophy, X } from "lucide-react";
import type { ProgramSession } from "./appCore";
import { getWorkoutColorClass, glanceRepsToken, exercisePrescription } from "./appCore";
import { useTranslation } from "react-i18next";

// Type/form badge tones for the Library · Programming lists (redesign).
const WK_TYPE_TONE: Record<string, { background: string; color: string }> = {
  "Online Coaching": { background: "#e8f0ff", color: "#1f5fd6" },
  "In-Person Training": { background: "#eef6ec", color: "#2f7d32" },
  "Digital Program": { background: "#eceef2", color: "#4f5b6b" },
  "Digital Bundle": { background: "#f3ecfb", color: "#6a2f9e" },
  "Digital Add-on": { background: "#e6f6f7", color: "#0c7382" },
};
const wkTypeTone = (t?: string) =>
  WK_TYPE_TONE[t || ""] || { background: "#efece5", color: "#6b6459" };
const WK_FORM_TONE: Record<string, { background: string; color: string }> = {
  Intake: { background: "#e8f0ff", color: "#1f5fd6" },
  "Check-in": { background: "#eef6ec", color: "#2f7d32" },
  Readiness: { background: "#eceef2", color: "#4f5b6b" },
  Assessment: { background: "#f3ecfb", color: "#6a2f9e" },
  Questionnaire: { background: "#f3ecfb", color: "#6a2f9e" },
  Feedback: { background: "#e6f6f7", color: "#0c7382" },
};
const wkFormTone = (t?: string) =>
  WK_FORM_TONE[t || ""] || { background: "#efece5", color: "#6b6459" };

// Session focus → lucide icon, matching the client mobile category icons
// (CAT_ICON in PortalHome). The colour comes from the wcol- class the badge
// carries, so a Cardio session shows a vermilion heart, Mobility a moss wave, etc.
const WCOL_ICON: Record<string, any> = {
  "wcol-strength": Dumbbell,
  "wcol-cardio": HeartPulse,
  "wcol-mobility": Feather,
  "wcol-skill": Target,
  "wcol-test": Trophy,
  "wcol-purple": ClipboardList,
};
const wcolIcon = (cc: string) => WCOL_ICON[cc] || Dumbbell;

// Custom-section colour choices — deliberately distinct from every hue the
// keyword/hash section palette already uses.
const CUSTOM_SECTION_COLORS = [
  "#c92a2a", // red
  "#d6336c", // rose
  "#ae3ec9", // magenta
  "#1e3a8a", // navy
  "#15aabf", // cyan
  "#74b816", // lime
  "#795548", // brown
];

export default function CoachBuilderPage({
  builderUndo,
  editingPublishedSession,
  hasPrivateRevision,
  onSessionHistory,
  onSaveCalendarDraft,
  editingCalendarDraft = false,
  calendarBuilderContext,
  historyClientCode = "",
  builderScope,
  accessoryTargetIndex,
  copiedSession,
  mobileDragIndex,
  mobileDragOverIndex,
  selectedSavedFormId,
  selectedSavedProgramId,
  usePercentExerciseIndexes,
  addAlternateExercise,
  addExerciseToProgram,
  addFormQuestion,
  addMobileDayToWeek,
  alternateSearch,
  applyBulkPrescription,
  arrangementDragIndex,
  arrangementDropIndex,
  assignSavedProgramToClient,
  buildGlanceChain,
  builderEquipFilter,
  builderExercises,
  builderLibraryMode,
  builderModalListRef,
  builderMode,
  builderSaveStatus,
  coachDraftStatus,
  cloudDraftStatus,
  builderSearch,
  builderSectionOptions,
  bulkEditMode,
  bulkReps,
  bulkRest,
  bulkSelectedIdx,
  bulkSets,
  clientNameForCode,
  clients,
  coachVisibleClients,
  collapsedDays,
  commitMobilePicker,
  customBuilderSectionName,
  deleteSavedFormTemplate,
  deleteSavedProgram,
  deletingSavedProgramId,
  draggedLibSessionId,
  draggedProgramSessionId,
  duplicateProgramExercise,
  duplicateProgramSession,
  duplicateSavedFormIntoBuilder,
  duplicateSavedProgram,
  duplicateWeek,
  weekCopySessions,
  insertProgrammingBlock,
  duplicatingProgramId,
  editProgramRecordId,
  editingFormTemplate,
  editingProgramSessionId,
  estimateSessionMinutes,
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
  loadFormTemplates,
  loadPrograms,
  loadSavedFormIntoBuilder,
  loadSavedProgramIntoBuilder,
  loadSavedProgramSessionsForAssignment,
  loadSessionForEditing,
  loadSessionLibrary,
  mobileAlternateIndex,
  mobileArrangeItemsRef,
  mobileArrangeRefs,
  mobileBuilderStep,
  mobileDetailsIndex,
  mobileMenuIndex,
  mobilePickerSelected,
  moveSessionToCell,
  normalizeBuilderSection,
  openBuilderLibrary: openLibrary,
  scrollLatestBuilderExerciseIntoView,
  setLatestBuilderExerciseIndex,
  openMobileAlternate,
  openMobileLibPick,
  openMobilePicker,
  openProgramPreview,
  pendingSectionName,
  programBuiltForClient,
  programBuiltForMode,
  programBuiltForTeam,
  programDay,
  programDetailsOpen,
  programDurationWeeks,
  programGoal,
  programGridDrop,
  programName,
  programPhase,
  programSport,
  programLevel,
  programProductType,
  programSessions,
  programWeek,
  programs,
  programsLoading,
  removeAlternateExercise,
  removeFormQuestion,
  removeProgramExercise,
  removeProgramSession,
  renderAlternateExerciseEditor,
  renderBuilderExerciseOptionsMenu,
  renderExerciseLabelBadge,
  renderSetPrescriptionTable,
  reorderAlternateExercise,
  reorderProgramExercise,
  saveCurrentSessionToProgram,
  saveFormTemplate,
  saveFullProgram,
  openCreateExerciseFromBuilder,
  swapExerciseIndex,
  setSwapExerciseIndex,
  replaceProgramExerciseWith,
  viewProgramExercise,
  editProgramExerciseInLibrary,
  oneOffAssignTarget,
  oneOffSaveToLibrary,
  setOneOffSaveToLibrary,
  saveMobileProgramDay,
  saveMobileWorkout,
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
  savingFormTemplate,
  savingTemplate,
  saveBusyLabel = "Saving…",
  selectBuilderSection,
  setCustomSectionColors,
  selectWorkoutTab,
  builderReturnClientName,
  returnToBuilderOrigin,
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
  sessionNameCn,
  sessionNotes,
  sessionSetupOpen,
  sessionType,
  setAlternateSearch,
  setArrangementDragIndex,
  setArrangementDropIndex,
  setBuilderEquipFilter,
  setBuilderLibraryModeAndLoad,
  setBuilderMode,
  setBuilderSearch,
  setBulkEditMode,
  setBulkReps,
  setBulkRest,
  setBulkSelectedIdx,
  setBulkSets,
  setCellMenu,
  setCircuitGroupMode,
  setCircuitGroupRounds,
  setCollapsedDays,
  setCreateProgramOpen,
  setCreateSessionOpen,
  setCreateFormOpen,
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
  setProgramBuiltForClient,
  setProgramBuiltForMode,
  setProgramBuiltForTeam,
  setProgramDay,
  setProgramDetailsOpen,
  setProgramDurationWeeks,
  setProgramGoal,
  setProgramGridDrop,
  setProgramName,
  setProgramPhase,
  setProgramSport,
  setProgramLevel,
  setProgramProductType,
  setProgramWeek,
  setSavedAssignClientId,
  setSavedAssignStartDate,
  setSavedAssignableWorkouts,
  setSavedFormSearch,
  setSavedProgramProductFilter,
  setSavedProgramSearch,
  setSelectedSavedFormId,
  setSelectedSavedProgramId,
  setSessionEditorOpen,
  setSessionGoal,
  setSessionIntensity,
  setSessionLibProgramId,
  setSessionLibSessions,
  setSessionName,
  setSessionNameCn,
  setSessionEstimatedDuration,
  setSessionNotes,
  setSessionSetupOpen,
  setSessionType,
  setShowProgramDetail,
  setWeekDupMenu,
  showProgramDetail,
  startMobileDrag,
  teams,
  toggleBuilderCircuitLink,
  toggleBuilderSupersetLink,
  toggleMobilePick,
  toggleUsePercent,
  unlinkExerciseGroup,
  updateFormQuestion,
  updateProgramExercise,
  updateSavedAssignableWorkoutDate,
  useMobileWorkoutRows,
  visibleProgramsOnly,
  visibleSavedForms,
  visibleSessionsOnly,
  weekDupMenu = null,
  weekVolume,
  workoutPageTab,
}: { [key: string]: any }) {
  const { t, i18n } = useTranslation();
  const [blocksOpen, setBlocksOpen] = useState(false);
  const renderBlockActions = () => <div className="builderBlockActions"><button type="button" className="outlineButton" onClick={() => setBlocksOpen(true)}><Copy size={16} /> {i18n.language.startsWith("zh") ? "训练模块" : "Exercise blocks"}</button></div>;
  const renderPrescription = (exercise: any, index: number) => <ExercisePrescriptionEditor exercise={exercise} update={(key, value) => updateProgramExercise(index, key, value)} table={renderSetPrescriptionTable(exercise, index)} percent={usePercentExerciseIndexes.has(index)} togglePercent={() => toggleUsePercent(index)} alternates={renderAlternateExerciseEditor(exercise, index)} />;
  const prescriptionHistory = useAthletePrescriptionHistory(historyClientCode);
  const [focusedExerciseIndex, setFocusedExerciseIndex] = useState<number | null>(null);
  const [mobileLibraryPanel, setMobileLibraryPanel] = useState("exercises");
  const [mobileExpandedExercise, setMobileExpandedExercise] = useState<number | null>(null);
  const previousExerciseCount = useRef(selectedProgramExercises?.length || 0);
  const lastLibraryPick = useRef({ key: "", time: 0 });
  const focusedEditor = focusedExerciseIndex !== null && Boolean(selectedProgramExercises[focusedExerciseIndex]) && swapExerciseIndex === null;
  const openBuilderLibrary = (mode: string) => {
    lastLibraryPick.current = { key: "", time: 0 };
    setFocusedExerciseIndex(null);
    setMobileLibraryPanel(mode === "Sections" ? "sections" : "exercises");
    openLibrary(mode);
  };
  useEffect(() => {
    if (swapExerciseIndex !== null) {
      lastLibraryPick.current = { key: "", time: 0 };
      setMobileLibraryPanel("exercises");
    }
  }, [swapExerciseIndex]);
  useEffect(() => {
    if (builderLibraryMode === "Sections") setMobileLibraryPanel("sections");
    else setMobileLibraryPanel(current => current === "sections" ? "exercises" : current);
  }, [builderLibraryMode]);
  useEffect(() => {
    if (!isBuilderLibraryOpen) setFocusedExerciseIndex(null);
  }, [isBuilderLibraryOpen]);
  useEffect(() => {
    const count = selectedProgramExercises?.length || 0;
    // Indexes move when any row is removed. Return to the session rather than
    // showing an empty editor or silently editing the next exercise's slot.
    if (count < previousExerciseCount.current && focusedExerciseIndex !== null) {
      setFocusedExerciseIndex(null);
      setSwapExerciseIndex(null);
      setIsBuilderLibraryOpen(false);
    }
    previousExerciseCount.current = count;
  }, [selectedProgramExercises?.length, focusedExerciseIndex, setSwapExerciseIndex, setIsBuilderLibraryOpen]);
  const pickLibraryExercise = (exercise: any) => {
    // Keep the key stable after a replacement/accessory insertion clears its
    // target index; a second click must not become an ordinary append.
    const key = `${exercise.recordId || exercise.exerciseId}:${pendingSectionName}`;
    const now = Date.now();
    if (lastLibraryPick.current.key === key && now - lastLibraryPick.current.time < 700) return;
    lastLibraryPick.current = { key, time: now };
    if (swapExerciseIndex !== null) {
      replaceProgramExerciseWith(exercise);
      setMobileLibraryPanel("session");
    } else {
      const index = accessoryTargetIndex !== null ? accessoryTargetIndex + 1 : selectedProgramExercises.length;
      addExerciseToProgram(exercise);
      // A phone cannot see the library and new prescription side by side.
      // Open the added row immediately so one tap has a visible result.
      if (window.matchMedia("(max-width: 720px)").matches) setFocusedExerciseIndex(index);
    }
  };
  // Sessions library: filter the list by session category (Focus column —
  // Strength / Cardio / Mobility…). "All" shows everything.
  const [sessionCategoryFilter, setSessionCategoryFilter] = useState("All");
  // Swatch picked for the NEXT custom section (applied on "Use").
  const [customSectionColorChoice, setCustomSectionColorChoice] = useState("");
  // Circuit group settings — mode cards (Rounds / AMRAP / EMOM) + inputs.
  // Shared by the day-summary card AND the fullscreen editor card.
  const renderCircuitSettingsPanel = (exercise: any, index: number) => {

                                const gKey = `${exercise.groupType}:${(
                                  exercise.groupName || ""
                                )
                                  .trim()
                                  .toLowerCase()}`;
                                const members = selectedProgramExercises.filter(
                                  (e: any) =>
                                    e.groupType === "Circuit" &&
                                    `${e.groupType}:${(e.groupName || "")
                                      .trim()
                                      .toLowerCase()}` === gKey
                                ).length;
                                const mode = exercise.groupMode || "";
                                const minutes = Number(
                                  exercise.groupMinutes || "12"
                                );
                                const emomRounds =
                                  members > 0 && minutes % members === 0
                                    ? minutes / members
                                    : 0;
                                return (
                                  <div className="circuitSettingsPanel">
                                    <div className="circuitModeSeg">
                                      {[
                                        {
                                          v: "" as const,
                                          label: "Rounds",
                                          hint: "Fixed rounds, self-paced",
                                        },
                                        {
                                          v: "AMRAP" as const,
                                          label: "AMRAP",
                                          hint: "Max rounds in a time cap",
                                        },
                                        {
                                          v: "EMOM" as const,
                                          label: "EMOM",
                                          hint: "One station per minute",
                                        },
                                      ].map((o) => (
                                        <button
                                          key={o.label}
                                          type="button"
                                          className={
                                            mode === o.v ? "active" : ""
                                          }
                                          onClick={() =>
                                            setCircuitGroupMode(index, o.v)
                                          }
                                        >
                                          <strong>{o.label}</strong>
                                          <small>{o.hint}</small>
                                        </button>
                                      ))}
                                    </div>
                                    <div className="circuitModeDetail">
                                      {mode === "" && (
                                        <>
                                          <label>
                                            <span>{t("polishRoundsceea")}</span>
                                            <input
                                              type="number"
                                              min={1}
                                              max={20}
                                              value={exercise.sets || "3"}
                                              onChange={(e) =>
                                                setCircuitGroupRounds(
                                                  index,
                                                  e.target.value
                                                )
                                              }
                                            />
                                          </label>
                                          <small>
                                            {t("coachCircuitSequence", { count: members, rounds: exercise.sets || "3" })}
                                          </small>
                                        </>
                                      )}
                                      {mode === "AMRAP" && (
                                        <>
                                          <label>
                                            <span>{t("polishTimeCapMin4422")}</span>
                                            <input
                                              type="number"
                                              min={1}
                                              max={90}
                                              value={
                                                exercise.groupMinutes || "12"
                                              }
                                              onChange={(e) =>
                                                setCircuitGroupMode(
                                                  index,
                                                  "AMRAP",
                                                  e.target.value
                                                )
                                              }
                                            />
                                          </label>
                                          <small>
                                            {t("coachAmrapSequence", { count: members, minutes: exercise.groupMinutes || "12" })}
                                          </small>
                                        </>
                                      )}
                                      {mode === "EMOM" && (
                                        <>
                                          <label>
                                            <span>{t("polishTotalMindfea")}</span>
                                            <input
                                              type="number"
                                              min={1}
                                              max={90}
                                              value={
                                                exercise.groupMinutes || "12"
                                              }
                                              onChange={(e) =>
                                                setCircuitGroupMode(
                                                  index,
                                                  "EMOM",
                                                  e.target.value
                                                )
                                              }
                                            />
                                          </label>
                                          <small>
                                            {t("coachEmomSequence", { count: members, rounds: emomRounds || "—" })}
                                          </small>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
  };

  const openExerciseEditor = (i: number) => {
    setFocusedExerciseIndex(i);
    setLatestBuilderExerciseIndex(i);
    openLibrary("Exercises");
    scrollLatestBuilderExerciseIntoView();
  };
  useEffect(() => {
    const closeMobileLayer = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isBuilderLibraryOpen) { setSwapExerciseIndex(null); setIsBuilderLibraryOpen(false); }
      else if (mobileAlternateIndex != null) setMobileAlternateIndex(null);
      else if (mobileDetailsIndex != null) setMobileDetailsIndex(null);
      else if (mobileMenuIndex != null) setMobileMenuIndex(null);
      else if (["picker", "arrange", "libpick"].includes(mobileBuilderStep)) {
        setMobilePickerSelected(new Set());
        setMobileBuilderStep("editor");
      }
    };
    window.addEventListener("keydown", closeMobileLayer);
    return () => window.removeEventListener("keydown", closeMobileLayer);
  }, [
    isBuilderLibraryOpen, setIsBuilderLibraryOpen, setSwapExerciseIndex,
    mobileAlternateIndex,
    mobileBuilderStep,
    mobileDetailsIndex,
    mobileMenuIndex,
    setMobileAlternateIndex,
    setMobileBuilderStep,
    setMobileDetailsIndex,
    setMobileMenuIndex,
    setMobilePickerSelected,
  ]);
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
      {blocksOpen && <ProgrammingBlocks exercises={selectedProgramExercises} insert={insertProgrammingBlock} close={() => setBlocksOpen(false)} />}
      {weekDupMenu !== null && <WeekCopySheet week={weekDupMenu} count={Number(programDurationWeeks) || 1} sessions={weekCopySessions} clientCode={historyClientCode} copy={duplicateWeek} close={() => setWeekDupMenu(null)} />}
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
                    if (workoutPageTab === "Sessions") setCreateSessionOpen(true);
                    else if (workoutPageTab === "Forms") setCreateFormOpen(true);
                    else setCreateProgramOpen(true);
                  };

                  return (
                    <div
                      className={`wkHub${
                        workoutPageTab === "Program Builder"
                          ? " wkHubBuilderActive"
                          : ""
                      }`}
                    >
                      <div className="wkHead">
                        <div className="wkHeadLeft">
                          <span className="wkEyebrow">
                            <BookOpen size={14} /> {calendarBuilderContext ? t("calendarWorkoutHeading") : "Library · Programming"}
                          </span>
                          <h1>
                            {calendarBuilderContext ? sessionName || programName || t("calendarWorkoutHeading") : workoutPageTab === "Program Builder"
                              ? isSingleWorkoutBuilder
                                ? oneOffAssignTarget
                                  ? `New session for ${oneOffAssignTarget.clientName}`
                                  : editProgramRecordId ? t("editSavedSession") : "Create Session"
                                : editProgramRecordId
                                ? "Edit Program"
                                : "Create Program"
                              : workoutPageTab === "Sessions" ? (i18n.language.startsWith("zh") ? "单次训练" : "Sessions") : workoutPageTab === "Forms" ? (i18n.language.startsWith("zh") ? "表单" : "Forms") : (i18n.language.startsWith("zh") ? "训练计划" : "Programs")}
                          </h1>
                          <p className={oneOffAssignTarget ? "oneOffBuilderLibraryCopy" : ""}>
                            {editingPublishedSession ? (i18n.language.startsWith("zh") ? (hasPrivateRevision ? "\u6b63\u5728\u7f16\u8f91\u79c1\u4eba\u4fee\u6539\u3002\u53d1\u5e03\u524d\uff0c\u5b66\u5458\u4ecd\u770b\u5230\u5f53\u524d\u5df2\u53d1\u5e03\u7248\u672c\u3002" : "\u53ef\u4fdd\u5b58\u4e3a\u79c1\u4eba\u8349\u7a3f\uff0c\u6216\u53d1\u5e03\u4fee\u6539\u7ed9\u5b66\u5458\u3002") : (hasPrivateRevision ? "Editing a private revision. The athlete still sees the published version until you publish changes." : "Save a private draft, or publish changes to the athlete.")) : editingCalendarDraft ? (i18n.language.startsWith("zh") ? "日历草稿 · 仅教练可见。保存修改不会发布给学员。" : "Calendar draft · coach only. Saving changes keeps this session private.") : calendarBuilderContext ? t(oneOffAssignTarget ? "calendarNewWorkoutHint" : "calendarWorkoutIsolatedHint") : workoutPageTab === "Program Builder"
                              ? isSingleWorkoutBuilder
                                ? editProgramRecordId ? t("editSavedSessionHint") : "Build a reusable session once — drop it into any program, anytime."
                                : editProgramRecordId
                                ? "Editing an existing program — saving updates it in place."
                                : "Build a full phase of programming — sessions, weeks, and progressions in one place."
                              : "Your programs, reusable sessions, and intake forms — build once, assign anywhere."}
                          </p>
                          {oneOffAssignTarget && (
                            <p className="oneOffBuilderContextCopy">
                              {t("oneOffBuilderSub", {
                                name: oneOffAssignTarget.clientName,
                                date: oneOffAssignTarget.date,
                              })}
                            </p>
                          )}
                        </div>
                        <div className="wkHeadRight">
                          {isListTab && <button type="button" className="libraryRefresh" aria-label={i18n.language.startsWith("zh") ? "刷新资料库" : "Refresh library"} onClick={() => workoutPageTab === "Forms" ? loadFormTemplates(true) : loadPrograms(true)}><RefreshCw size={18} /></button>}
                          {isListTab && (
                            <button type="button" className="wkCreateBtn" onClick={onCreate}>
                              <Plus size={17} /> {createLabel}
                            </button>
                          )}
                {workoutPageTab === "Program Builder" && (
                            <div className="pbSaveCluster">
                              {onSaveCalendarDraft && <SaveCalendarDraftButton onClick={onSaveCalendarDraft} disabled={savingTemplate} />}
                              <div className="pbSaveRow">
                                <div className="pbSaveCol">
                                  <button
                                    type="button"
                                    className="pbSaveBtn"
                                    disabled={savingTemplate}
                                    onClick={() => {
                                      void saveFullProgram({ stay: true });
                                    }}
                                  >
                                    <Save size={17} strokeWidth={2.2} />
                                    {savingTemplate
                                      ? saveBusyLabel
                                      : editingPublishedSession ? (i18n.language.startsWith("zh") ? "\u53d1\u5e03\u4fee\u6539" : "Publish changes") : editingCalendarDraft ? (i18n.language.startsWith("zh") ? "保存草稿并返回" : "Save draft and return") : calendarBuilderContext ? t(oneOffAssignTarget ? "assignAndReturn" : "saveAndReturn") : oneOffAssignTarget
                                        ? t("assignSession")
                                        : isSingleWorkoutBuilder
                                          ? "Save Session"
                                          : "Save Program"}
                                  </button>
                                  <span
                                    className={`pbSaveStatus${
                                      builderSaveStatus === "dirty" ? " dirty" : ""
                                    }`}
                                  >
                                    <i />
                                    {builderSaveStatus === "dirty"
                                      ? (cloudDraftStatus || t(coachDraftStatus === "saved" ? "coachDraftSavedLocally" : coachDraftStatus === "conflict" ? "coachDraftConflict" : coachDraftStatus === "unavailable" ? "coachDraftUnavailable" : "coachDraftSaving"))
                                      : "All changes saved"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
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

                    </div>
                  );
                })()}

                {(workoutPageTab === "Saved Programs" ||
                  workoutPageTab === "Sessions") &&
                  (() => {
                  const sessionsTab = workoutPageTab === "Sessions";
                  const libraryList = sessionsTab
                    ? visibleSessionsOnly.filter(
                        (s: any) =>
                          sessionCategoryFilter === "All" ||
                          (s.sessionType || "").trim() === sessionCategoryFilter
                      )
                    : visibleProgramsOnly;
                  // The Digital side always shows its product library — the
                  // coaching Library's Sessions/Forms tab state must not leak
                  // in (it used to blank this page with an empty sessions
                  // list when you arrived from the Sessions tab).
                  if (builderScope === "digital") {
                    // Bundles/add-ons keep the landing's own slide (member
                    // lists, store framing). Real programs open the same full
                    // ProgramDetailPanel as the coaching library — portaled to
                    // .app so the animated page containers can't capture the
                    // fixed overlay (named mistake #34).
                    const detailIsAux =
                      Boolean(selectedSavedProgram) &&
                      ((selectedSavedProgram.storeListingType || "")
                        .toLowerCase() === "add-on" ||
                        (selectedSavedProgram.storeListingType || "")
                          .toLowerCase() === "bundle" ||
                        selectedSavedProgram.productType === "Digital Add-on" ||
                        selectedSavedProgram.productType === "Digital Bundle");
                    return (
                      <>
                      {showProgramDetail &&
                        selectedSavedProgram &&
                        !detailIsAux && (
                          <PortalToApp>
                            <ProgramDetailPanel
                              isSession={
                                selectedSavedProgram.goal === "Single Workout"
                              }
                              selectedSavedProgram={selectedSavedProgram}
                              setShowProgramDetail={setShowProgramDetail}
                              loadSavedProgramIntoBuilder={
                                loadSavedProgramIntoBuilder
                              }
                              savedTemplatesLoading={savedTemplatesLoading}
                              deleteSavedProgram={deleteSavedProgram}
                              duplicateSavedProgram={duplicateSavedProgram}
                              duplicatingProgramId={duplicatingProgramId}
                              deletingSavedProgramId={deletingSavedProgramId}
                              clients={clients}
                              savedAssignClientId={savedAssignClientId}
                              setSavedAssignClientId={setSavedAssignClientId}
                              savedAssignStartDate={savedAssignStartDate}
                              setSavedAssignStartDate={setSavedAssignStartDate}
                              savedAssignLoading={savedAssignLoading}
                              savedAssignableWorkouts={savedAssignableWorkouts}
                              savedAssigningProgram={savedAssigningProgram}
                              assignSavedProgramToClient={
                                assignSavedProgramToClient
                              }
                              loadSavedProgramSessionsForAssignment={
                                loadSavedProgramSessionsForAssignment
                              }
                              updateSavedAssignableWorkoutDate={
                                updateSavedAssignableWorkoutDate
                              }
                              savedProgramSessions={savedProgramSessions}
                              buildGlanceChain={buildGlanceChain}
                            />
                          </PortalToApp>
                        )}
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
                        showProgramDetail={showProgramDetail && detailIsAux}
                        selectedSavedProgram={selectedSavedProgram}
                        loadSavedProgramIntoBuilder={loadSavedProgramIntoBuilder}
                        openProgramPreview={openProgramPreview}
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
                      </>
                    );
                  }
                  return (
                  <section className="programLibraryPanel">
                    <div className="programLibraryHeader programLandingHeader">
                      <div className="programLandingControls">
                        {sessionsTab ? (
                          // Category filter — matches the Focus column. The
                          // full builder section list is offered (plus any
                          // legacy type already selected) so nothing is
                          // unreachable.
                          <select
                            className="programViewSelect"
                            value={sessionCategoryFilter}
                            onChange={(event) =>
                              setSessionCategoryFilter(event.target.value)
                            }
                          >
                            <option value="All">{t("polishAllCategories060b")}</option>
                            {Array.from(
                              new Set(
                                [
                                  ...(builderSectionOptions || []),
                                  sessionCategoryFilter === "All"
                                    ? ""
                                    : sessionCategoryFilter,
                                ].filter(Boolean)
                              )
                            ).map((type: any) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
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
                                <option value="type:Digital Program">{t("polishDigitalProgramsf261")} </option>
                                <option value="type:Digital Bundle">{t("polishBundles9a03")} </option>
                                <option value="type:Digital Add-on">{t("polishAddOns41b6")} </option>
                              </optgroup>
                            ) : (
                              <optgroup label="Program type">
                                <option value="type:Online Coaching">{t("polishOnlineCoaching7105")} </option>
                                <option value="type:In-Person Training">{t("polishInPersonTraining014b")} </option>
                                <option value="internal">{t("polishInternalGeneralffaa")} </option>
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

                    </div>

                    <div className="programLibraryStack">
                      <div className="programTable">
                        <div className="programTableHead">
                          <span>{t("polishTitle768e")}</span>
                          <span>{t("polishLevel7c7f")}</span>
                          <span>{t("polishFocusfe7f")}</span>
                          <span>{t("polishType3deb")}</span>
                          <span>{t("polishCreatedBy43de")}</span>
                          <span className="programTableActionsHead">{t("polishActionsc3cd")}</span>
                        </div>

                        {programsLoading && programs.length === 0 && (
                          <p className="programTableEmpty">{t("polishLoading33ce")}</p>
                        )}
                        {!programsLoading && libraryList.length === 0 && (
                          <p className="programTableEmpty">
                            {sessionsTab
                              ? sessionCategoryFilter !== "All"
                                ? `No ${sessionCategoryFilter} sessions yet.`
                                : "No saved sessions yet. Create one to reuse across programs."
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
                          // Sessions get a focus-coloured icon (heart = cardio,
                          // wave = mobility …) like the client mobile side;
                          // programs get a black/gold barbell.
                          const wcolClass = getWorkoutColorClass(
                            program.programName,
                            program.sessionType
                          );
                          const FocusIcon = wcolIcon(wcolClass);
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
                            >
                              <span className="programTableTitle">
                                {sessionsTab ? (
                                  <span
                                    className={`programTableBadge sessionFocusBadge ${wcolClass}`}
                                  >
                                    <FocusIcon size={19} strokeWidth={2.2} />
                                  </span>
                                ) : (
                                  <span className="programTableBadge programIconBadge">
                                    <Dumbbell size={19} strokeWidth={2.2} />
                                  </span>
                                )}
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
                                {/* Sessions carry their meaning in Session Type
                                    (goal is always "Single Workout" for them);
                                    real programs use goal as the focus. */}
                                {(sessionsTab
                                  ? program.sessionType
                                  : program.goal) || "—"}
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
                              <span className="programTableActions" aria-hidden="true">
                                <ChevronRight size={16} />
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {showProgramDetail && selectedSavedProgram && (
                        <ProgramDetailPanel
                          isSession={
                            sessionsTab ||
                            selectedSavedProgram.goal === "Single Workout"
                          }
                          selectedSavedProgram={selectedSavedProgram}
                          setShowProgramDetail={setShowProgramDetail}
                          loadSavedProgramIntoBuilder={loadSavedProgramIntoBuilder}
                          savedTemplatesLoading={savedTemplatesLoading}
                          deleteSavedProgram={deleteSavedProgram}
                          duplicateSavedProgram={duplicateSavedProgram}
                          duplicatingProgramId={duplicatingProgramId}
                          deletingSavedProgramId={deletingSavedProgramId}
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
                          savedProgramSessions={savedProgramSessions}
                          buildGlanceChain={buildGlanceChain}
                        />
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
                    onClick={() => {
                      if (builderReturnClientName && returnToBuilderOrigin) {
                        returnToBuilderOrigin();
                        return;
                      }
                      selectWorkoutTab(
                        isSingleWorkoutBuilder ? "Sessions" : "Saved Programs"
                      );
                    }}
                  >
                    <ChevronLeft size={16} />{" "}
                    {builderReturnClientName
                      ? `${builderReturnClientName}'s calendar`
                      : isSingleWorkoutBuilder
                        ? "Sessions"
                        : "Programs"}
                  </button>
                )}

                <h2
                  className={`builderPageTitle${
                    isSingleWorkoutBuilder ? " pbSessionTitle" : ""
                  }`}
                >
                  {isSingleWorkoutBuilder
                    ? programName.trim() || "Session Builder"
                    : programName.trim()
                    ? programName.trim()
                    : "Program Builder"}
                </h2>

                <>
                <div className="mobileBuilderQuickNav" aria-label={t("polishBuilderQuickNavigationac07")}>
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
                </>

                {!isSingleWorkoutBuilder && !calendarBuilderContext && (
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
                    <span className="pbSetupIcon">
                      {isSingleWorkoutBuilder ? (
                        <Dumbbell size={21} />
                      ) : (
                        <Pencil size={21} />
                      )}
                    </span>
                    <div>
                      <span className="eyebrow">
                        {isSingleWorkoutBuilder ? "Workout Setup" : "Program Setup"}
                      </span>
                      <strong>
                        {isSingleWorkoutBuilder ? "Workout Details" : "Program Details"}
                      </strong>
                      <span className="pbChipRow">
                        <em>{programName || "Untitled"}</em>
                        {isSingleWorkoutBuilder ? (
                          <>
                            <em>{sessionType || "Strength"}</em>
                            <em>{sessionIntensity || "Moderate"}</em>
                          </>
                        ) : (
                          <>
                            <em>{programProductType || "Program"}</em>
                            <em>
                              {programDurationWeeks || "--"}{t("polishWeekc0ee")} {programDurationWeeks === "1" ? "" : "s"}
                            </em>
                          </>
                        )}
                      </span>
                    </div>
                    <span className="builderPanelToggle">
                      {programDetailsOpen ? "Hide ▴" : "Show ▾"}
                    </span>
                  </summary>

                  <div className="programDetailsGrid">
                    <label className="pbFeat pbFeatGold">
                      <span>{isSingleWorkoutBuilder ? "Workout Name" : "Program Name"}</span>
                      <div className="pbFieldWrap">
                        <Tag size={15} className="pbFieldIco" />
                        <input
                          value={programName}
                          onChange={(e) => setProgramName(e.target.value)}
                          placeholder={isSingleWorkoutBuilder ? "Workout Name" : "Program Name"}
                          className="miniSearch"
                        />
                      </div>
                    </label>

                    {!isSingleWorkoutBuilder && (
                      <>
                        <label className="pbFeat pbFeatTeal">
                          <span>{t("polishGoal9fe0")}</span>
                          <div className="pbFieldWrap">
                            <Target size={15} className="pbFieldIco" />
                            <input
                              value={programGoal}
                              onChange={(e) => setProgramGoal(e.target.value)}
                              placeholder={t("polishEGBuildMuscle8d3c")}
                              className="miniSearch"
                            />
                          </div>
                        </label>

                        <label>
                          <span>{t("polishDuration1370")}</span>
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
                                  {n}{t("polishWeekc0ee")}{n === 1 ? "" : "s"}
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        <label>
                          <span>{t("polishPhasef637")}</span>
                          <input
                            value={programPhase}
                            onChange={(e) => setProgramPhase(e.target.value)}
                            placeholder={t("polishEGFoundation9fd3")}
                            className="miniSearch"
                          />
                        </label>

                        <label>
                          <span>{t("polishSport1855")}</span>
                          <input
                            value={programSport}
                            onChange={(e) => setProgramSport(e.target.value)}
                            placeholder={t("polishEGClimbingc373")}
                            className="miniSearch"
                          />
                        </label>

                        <label>
                          <span>{t("polishLevel7c7f")}</span>
                          <select
                            value={programLevel}
                            onChange={(e) => setProgramLevel(e.target.value)}
                            className="miniSearch"
                          >
                            <option value="Beginner">{t("polishBeginner6057")}</option>
                            <option value="Intermediate">{t("polishIntermediateb1cf")}</option>
                            <option value="Advanced">{t("polishAdvanced4d06")}</option>
                            <option value="Elite">{t("polishElite6f28")}</option>
                          </select>
                        </label>

                        <label>
                          <span>{t("polishProgramType7dbe")}</span>
                          <select
                            value={programProductType}
                            onChange={(e) => setProgramProductType(e.target.value)}
                            className="miniSearch"
                          >
                            {(() => {
                              // Scoped to the side you're building on; a legacy
                              // program whose type belongs to the other side
                              // keeps its value selectable (never silently
                              // re-typed by opening it).
                              const opts =
                                builderScope === "digital"
                                  ? [
                                      "Digital Program",
                                      "Digital Add-on",
                                      "Digital Bundle",
                                    ]
                                  : [
                                      "Online Coaching",
                                      "In-Person Training",
                                      "Internal Coaching Template",
                                    ];
                              const all =
                                programProductType && !opts.includes(programProductType)
                                  ? [programProductType, ...opts]
                                  : opts;
                              return all.map((o) => <option key={o}>{o}</option>);
                            })()}
                          </select>
                        </label>

                        {(programProductType === "Online Coaching" ||
                          programProductType === "In-Person Training") && (
                          <label>
                            <span>{t("polishAssignTocc79")}</span>
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
                              <option value="internal">{t("polishInternalGenerala16d")}</option>
                              <option value="client">{t("polishClient1bdd")}</option>
                              <option value="team">{t("polishTeam2188")}</option>
                            </select>
                          </label>
                        )}

                        {(programProductType === "Online Coaching" ||
                          programProductType === "In-Person Training") &&
                          programBuiltForMode === "client" && (
                            <label>
                              <span>{t("polishClient1bdd")}</span>
                              <select
                                value={programBuiltForClient}
                                onChange={(e) =>
                                  setProgramBuiltForClient(e.target.value)
                                }
                                className="miniSearch"
                              >
                                <option value="">{t("polishSelectClient0765")}</option>
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
                              <span>{t("polishTeam2188")}</span>
                              <select
                                value={programBuiltForTeam}
                                onChange={(e) =>
                                  setProgramBuiltForTeam(e.target.value)
                                }
                                className="miniSearch"
                              >
                                <option value="">{t("polishSelectTeam5c98")}</option>
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

                <>
                <>
                {!isSingleWorkoutBuilder && !calendarBuilderContext && (() => {
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
                                    <span>{t("polishDay987b")} {d}</span>
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
                              <span>{t("polishWeekf82b")} {w}</span>
                              {(() => {
                                const v = weekVolume(w);
                                return v.days > 0 ? (
                                  <span className="weekVolChip">
                                    {v.days}{t("polishDa3aa")} {v.sets}{t("polishSets23fe")} {v.exercises}{t("polishExe066")} </span>
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
                                    <Copy size={13} />{t("polishDuplicate972d")} <ChevronDown size={12} />
                                  </button>
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
                                        }${s.testTemplateId ? " gridCardTest" : ""}${s.__draft ? " gridCardDraft" : ""}${
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
                                          // A test day has no exercises to
                                          // edit — the session editor would
                                          // open empty and confuse.
                                          if (s.testTemplateId) return;
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
                                            <span className="gridDraftTag">{t("polishUnsaved2ab0")} </span>
                                          ) : (
                                            <div className="programGridCardActions">
                                              {!s.testTemplateId && (
                                              <button
                                                type="button"
                                                className="iconActionButton"
                                                title={t("polishEditSessionaca3")}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  loadSessionForEditing(s);
                                                }}
                                              >
                                                <Pencil size={13} />
                                              </button>
                                              )}
                                              <button
                                                type="button"
                                                className="iconActionButton"
                                                title={t("polishDuplicateToNextWeek8423")}
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
                                                title={t("polishRemoveSessiona72e")}
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

                                        {s.testTemplateId ? (
                                          <span className="programGridCardMeta gridCardTestMeta">
                                            <Activity size={12} />{t("polishPhysicalTestdc27")} </span>
                                        ) : s.exercises.length === 0 ? (
                                          <span className="programGridCardMeta">{t("polishNoExercisesYet71ff")} </span>
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
                                                      className={`exerciseLabelBadge glanceBadge ${it.colorClass}${
                                                        it.customHex
                                                          ? " labelCustomHex"
                                                          : ""
                                                      }`}
                                                      style={
                                                        it.customHex
                                                          ? ({
                                                              "--section-custom":
                                                                it.customHex,
                                                            } as any)
                                                          : undefined
                                                      }
                                                    >
                                                      {it.display}
                                                    </span>
                                                  </div>
                                                  <div className="glanceText">
                                                    <strong>
                                                      {it.ex.exerciseName}
                                                    </strong>
                                                    {(it.ex.sets || glanceRepsToken(it.ex)) && (
                                                      <span>
                                                        {exercisePrescription(it.ex, i18n.language.startsWith("zh")).summary}
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
                                      <span className="pbAddIco">
                                        <Plus size={14} />
                                      </span>
                                      {cellSessions.length === 0 && (
                                        <span className="pbAddLabel">{t("polishAdd61cc")}</span>
                                      )}
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

                {!isSingleWorkoutBuilder && !calendarBuilderContext && sessionEditorOpen && (
                  <PortalToApp>
                    <div
                      className="builderEditorBackdrop"
                      onClick={() => setSessionEditorOpen(false)}
                    />
                  </PortalToApp>
                )}

                <PortalToApp enabled={!isSingleWorkoutBuilder && !calendarBuilderContext}>
                <div
                  className={`builderEditorWrap${
                    isSingleWorkoutBuilder || calendarBuilderContext ? "" : " asDrawer"
                  }${sessionEditorOpen ? " open" : ""}`}
                >
                {/* Program drawer: one dark hero band carries the identity
                    (week/day + session name) and the save actions — matching
                    the hero language used across the detail pages. The
                    single-workout builder keeps its own hero. */}
                {!isSingleWorkoutBuilder && !calendarBuilderContext && (
                  <div className="drawerSessionHero" id="builder-session">
                    <div className="drawerSessionHeroText">
                      <span className="drawerSessionHeroEyebrow">{t("polishCurrentSessionWeek39df")} {programWeek || "--"}{t("polishDay2ad3")}{" "}
                        {programDay || "--"}
                      </span>
                      <h2>{sessionName || "Name your session"}</h2>
                      <p>
                        {t("redesignDayDraft")}
                      </p>
                    </div>
                    <div className="drawerSessionHeroActions">
                      <button
                        className="goldButton drawerHeroSave"
                        onClick={() => saveCurrentSessionToProgram(true, false)}
                      >
                        {t("mobileReviewProgram")}
                      </button>
                      <button
                        type="button"
                        className="drawerHeroClose"
                        title={t("polishCloseEditor3ada")}
                        onClick={() => setSessionEditorOpen(false)}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                )}

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
                    {isSingleWorkoutBuilder && (
                      <span className="pbSetupIcon">
                        <Dumbbell size={21} />
                      </span>
                    )}
                    <div>
                      <span className="eyebrow">
                        {isSingleWorkoutBuilder ? "Workout Setup" : "Session"}
                      </span>
                      <strong>
                        {isSingleWorkoutBuilder
                          ? "Workout Details"
                          : "Session Settings"}
                      </strong>
                      {isSingleWorkoutBuilder && (
                        <span className="pbChipRow">
                          <em>{programName || "Untitled"}</em>
                          <em>{sessionType || "Strength"}</em>
                          <em>{sessionIntensity || "Moderate"}</em>
                        </span>
                      )}
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
                  {isSingleWorkoutBuilder && oneOffAssignTarget && (
                    <div className="oneOffAssignBanner">
                      <span className="oneOffAssignText">
                        <CalendarDays size={15} /> {t("coachAssignOnSave", { name: oneOffAssignTarget.clientName, date: oneOffAssignTarget.date })}
                      </span>
                      <label className="oneOffAssignToggle">
                        <input
                          type="checkbox"
                          checked={Boolean(oneOffSaveToLibrary)}
                          onChange={(e) =>
                            setOneOffSaveToLibrary(e.target.checked)
                          }
                        />{t("polishAlsoSaveToSessionLibraryb1b8")} </label>
                    </div>
                  )}
                  {isSingleWorkoutBuilder && (
                    <label className="sessionNameField">
                      <span>{t("polishWorkoutName7adc")}</span>
                      <input
                        value={programName}
                        onChange={(e) => setProgramName(e.target.value)}
                        placeholder={t("polishWorkoutName7adc")}
                        className="miniSearch"
                      />
                    </label>
                  )}
                  {isSingleWorkoutBuilder && !oneOffAssignTarget && !calendarBuilderContext && (
                    <label>
                      <span>{t("builderDesignedFor")}</span>
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
                        <option value="internal">{t("polishInternalGenerala16d")}</option>
                        <option value="client">{t("polishClient1bdd")}</option>
                        <option value="team">{t("polishTeam2188")}</option>
                      </select>
                    </label>
                  )}
                  {isSingleWorkoutBuilder &&
                    !calendarBuilderContext &&
                    programBuiltForMode === "client" && (
                      <label>
                        <span>{t("polishClient1bdd")}</span>
                        <select
                          value={programBuiltForClient}
                          onChange={(e) =>
                            setProgramBuiltForClient(e.target.value)
                          }
                          className="miniSearch"
                        >
                          <option value="">{t("polishSelectClient0765")}</option>
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
                    !calendarBuilderContext &&
                    programBuiltForMode === "team" && (
                      <label>
                        <span>{t("polishTeam2188")}</span>
                        <select
                          value={programBuiltForTeam}
                          onChange={(e) =>
                            setProgramBuiltForTeam(e.target.value)
                          }
                          className="miniSearch"
                        >
                          <option value="">{t("polishSelectTeam5c98")}</option>
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
                        <span>{t("polishWeekf82b")}</span>
                        <input
                          value={programWeek}
                          readOnly={Boolean(calendarBuilderContext)}
                          onChange={(e) => setProgramWeek(e.target.value)}
                          placeholder={t("polishWeekf82b")}
                          className="miniSearch"
                        />
                      </label>

                      <label className="sessionDayField">
                        <span>{t("polishDay987b")}</span>
                        <input
                          value={programDay}
                          readOnly={Boolean(calendarBuilderContext)}
                          onChange={(e) => setProgramDay(e.target.value)}
                          placeholder={t("polishDay987b")}
                          className="miniSearch"
                        />
                      </label>

                      <label className="sessionNameField">
                        <span>{t("polishSessionNamec78b")}</span>
                        <input
                          value={sessionName}
                          onChange={(e) => setSessionName(e.target.value)}
                          placeholder={t("polishSessionNamec78b")}
                          className="miniSearch"
                        />
                      </label>

                      <label className="sessionNameField">
                        <span>{t("polishSessionName650a")}</span>
                        <input
                          value={sessionNameCn}
                          onChange={(e) => setSessionNameCn(e.target.value)}
                          placeholder="课次中文名（可选）"
                          className="miniSearch"
                        />
                      </label>

                      <label className="sessionDurationField">
                        <span>{t("polishEstDurationMinfd26")}</span>
                        <input
                          type="number"
                          min={0}
                          max={240}
                          value={sessionEstimatedDuration}
                          onChange={(e) =>
                            setSessionEstimatedDuration(e.target.value)
                          }
                          placeholder={String(
                            estimateSessionMinutes(selectedProgramExercises)
                          )}
                          className="miniSearch"
                        />
                      </label>

                    </>
                  )}

                  <label className="sessionTypeField">
                    <span>{t("polishSessionType3833")}</span>
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
                    <span>{t("polishIntensity0ad6")}</span>
                    <select
                      value={sessionIntensity}
                      onChange={(e) => setSessionIntensity(e.target.value)}
                      className="miniSearch"
                    >
                      <option>{t("polishLowa124")}</option>
                      <option>{t("polishModerateea8b")}</option>
                      <option>{t("polishHighb1a5")}</option>
                      <option>{t("polishMaxa95e")}</option>
                      <option>{t("polishRecoveryea92")}</option>
                    </select>
                  </label>

                  <label className="sessionGoalField">
                    <span>{t("polishSessionGoald948")}</span>
                    <input
                      value={sessionGoal}
                      onChange={(e) => setSessionGoal(e.target.value)}
                      placeholder={t("polishPrimaryFocus319f")}
                      className="miniSearch"
                    />
                  </label>

                </div>

                <div className="builderInsertSavedRow">
                  <span>{t("polishInsertSavedSessioncc09")}</span>
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
                    <option value="">{t("polishFromProgram794d")}</option>
                    {programs.map((pp: any) => (
                      <option key={pp.recordId} value={pp.programId}>
                        {pp.programName}
                      </option>
                    ))}
                  </select>
                  {sessionLibLoading && <em>{t("polishLoading33ce")}</em>}
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
                      <option value="">{t("polishPickASession52ec")}</option>
                      {sessionLibSessions.map((s: any) => (
                        <option key={s.localId} value={s.localId}>
                          W{s.week} D{s.day} · {s.sessionName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                </details>

                {renderBlockActions()}
                          {workoutPageTab === "Program Builder" && builderUndo && <div className="builderUndoBar" aria-label={i18n.language.startsWith("zh") ? "\u7f16\u8f91\u5386\u53f2" : "Edit history"}>
                  {onSessionHistory && <button type="button" className="outlineButton" disabled={savingTemplate} onClick={onSessionHistory}>{i18n.language.startsWith("zh") ? "\u5df2\u4fdd\u5b58\u7248\u672c" : "Saved history"}</button>}
                  <button type="button" className="outlineButton" disabled={savingTemplate || !builderUndo.canUndo} onClick={builderUndo.undo}>{i18n.language.startsWith("zh") ? "\u64a4\u9500" : "Undo"}</button>
                  <button type="button" className="outlineButton" disabled={savingTemplate || !builderUndo.canRedo} onClick={builderUndo.redo}>{i18n.language.startsWith("zh") ? "\u91cd\u505a" : "Redo"}</button>
                </div>}

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
                        >{t("polishAll6a72")} </button>
                        <input
                          className="miniSearch bulkEditInput"
                          placeholder={t("polishSets2ab2")}
                          value={bulkSets}
                          onChange={(e) => setBulkSets(e.target.value)}
                        />
                        <input
                          className="miniSearch bulkEditInput"
                          placeholder={t("polishReps7020")}
                          value={bulkReps}
                          onChange={(e) => setBulkReps(e.target.value)}
                        />
                        <input
                          className="miniSearch bulkEditInput bulkEditRest"
                          placeholder={t("polishRestEG90Secb7e4")}
                          value={bulkRest}
                          onChange={(e) => setBulkRest(e.target.value)}
                        />
                        <button
                          type="button"
                          className="primaryButton compactBuilderButton"
                          disabled={bulkSelectedIdx.size === 0}
                          onClick={applyBulkPrescription}
                        >{t("polishApplyToc76e")} {bulkSelectedIdx.size}
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
                    <h3>{t("polishDragYourSessionIntoShape137c")}</h3>
                    <p>{t("polishAddExercisesToBuildThisSession07d5")}</p>
                    <div>
                      <button
                        className="goldButton"
                        onClick={() => openBuilderLibrary("Exercises")}
                      >{t("polishAddExercise3ca5")} </button>
                    </div>
                  </div>
                )}

                {isBuilderLibraryOpen && (
                  <PortalToApp>
                  <div
                    className="builderLibraryOverlay"
                    onClick={() => setIsBuilderLibraryOpen(false)}
                  >
                    <div
                      className={`builderLibraryDrawer${
                        isBuilderOrderOpen && selectedProgramExercises.length > 0
                          ? " orderOpen"
                          : ""
                      }${focusedEditor ? " focusedExerciseEditor" : ""} mobileLibrary-${mobileLibraryPanel}`}
                      role="dialog"
                      aria-modal="true"
                      aria-label={focusedEditor ? t("editWorkoutExercise") : t("builderExerciseLibrary")}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {!focusedEditor && <header className="builderMobileLibraryHeader">
                        <div><strong>{t("mobileSessionEditorTitle")}</strong><button type="button" aria-label={t("closeExerciseEditor")} onClick={() => { setSwapExerciseIndex(null); setIsBuilderLibraryOpen(false); }}><X size={22} /></button></div>
                        <nav aria-label={t("mobileSessionEditorTitle")}>
                          {["exercises", "sections", "session", "order"].map(panel => <button key={panel} type="button" aria-pressed={mobileLibraryPanel === panel}
                            disabled={panel === "order" && !selectedProgramExercises.length}
                            onClick={() => { setMobileLibraryPanel(panel); setBuilderLibraryModeAndLoad(panel === "sections" ? "Sections" : "Exercises"); if (panel === "order") setIsBuilderOrderOpen(true); }}>
                            {t(`mobileLibraryPanel_${panel}`)}{panel === "session" ? ` (${selectedProgramExercises.length})` : ""}
                          </button>)}
                        </nav>
                      </header>}
                      {!focusedEditor && (
                      <aside className="builderLibraryDrawerSide">
                        <div className="builderDrawerTabs">
                          <button
                            className={
                              builderLibraryMode === "Exercises" ? "active" : ""
                            }
                            onClick={() => setBuilderLibraryModeAndLoad("Exercises")}
                          >{t("polishExercises4dc5")} </button>
                          <button
                            className={
                              builderLibraryMode === "Sections" ? "active" : ""
                            }
                            onClick={() => setBuilderLibraryModeAndLoad("Sections")}
                          >{t("polishSections7ff5")} </button>
                        </div>

                        <div className="builderDrawerSearch">
                          <input
                            placeholder={t("polishSearchExerciseLibrary09bf")}
                            value={builderSearch}
                            onChange={(e) => setBuilderSearch(e.target.value)}
                          />
                          <select
                            className="builderEquipSelect"
                            value={builderEquipFilter}
                            onChange={(e) => setBuilderEquipFilter(e.target.value)}
                            title={t("polishFilterByEquipmentc44b")}
                          >
                            <option value="">{t("polishAllEquipmentf3df")}</option>
                            {["Barbell", "Dumbbell", "Kettlebell", "Landmine", "Trap Bar", "Bodyweight", "Bands", "Cable", "Machine", "Sled", "Medicine Ball", "Box", "Pull-Up Bar", "Hangboard"].map(
                              (eq) => (
                                <option key={eq} value={eq}>
                                  {eq}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        {swapExerciseIndex !== null &&
                          selectedProgramExercises[swapExerciseIndex] && (
                            <div className="builderSwapBanner">
                              <span>
                                Choosing a replacement for{" "}
                                <strong>
                                  {
                                    selectedProgramExercises[swapExerciseIndex]
                                      .exerciseName
                                  }
                                </strong>{" "}
                                — sets &amp; reps stay.
                              </span>
                              <button
                                type="button"
                                onClick={() => setSwapExerciseIndex(null)}
                              >{t("polishCancel77df")} </button>
                            </div>
                          )}
                        <div className="builderDrawerExerciseGrid">
                          <button
                            className="builderExercisePickCard builderCreateExerciseCard"
                            onClick={openCreateExerciseFromBuilder}
                          >
                            <span>
                              <Plus size={14} />{t("polishCreateExerciseb53a")} </span>
                            <small>{t("polishNewToTheLibrarySavedANDAddedToThisSessiona5dc")} </small>
                          </button>
                          {libraryLoading && builderExercises.length === 0 && (
                            <div className="builderLibraryEmpty">{t("polishLoadingExercisesd973")} </div>
                          )}
                          {builderExercises.map((exercise: any) => (
                            <button
                              className="builderExercisePickCard"
                              type="button"
                              key={exercise.recordId || exercise.exerciseId}
                              onClick={() => pickLibraryExercise(exercise)}
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
                              {selectedProgramExercises.some((item: any) => item.exerciseId === exercise.exerciseId) && (
                                <small className="builderLibraryAdded">{t("builderInSessionCount", { count: selectedProgramExercises.filter((item: any) => item.exerciseId === exercise.exerciseId).length })}</small>
                              )}
                            </button>
                          ))}
                          {!libraryLoading && builderExercises.length === 0 && (
                            <div className="builderLibraryEmpty">{t("polishNoExercisesMatchThisSearch1df8")} </div>
                          )}
                        </div>
                      </aside>
                      )}

                      <section className="builderLibraryPreview">
                        <button
                          className="builderDrawerClose"
                          onClick={() => {
                            // Edits already live in the session draft. Closing
                            // a read-only inspection must not mark it dirty.
                            setSwapExerciseIndex(null);
                            setIsBuilderLibraryOpen(false);
                          }}
                          aria-label={t("closeExerciseEditor")}
                        >
                          <X size={22} />
                        </button>
                        <span className="eyebrow">
                          {focusedEditor ? t("editWorkoutExercise") : builderMode === "Single Workout"
                            ? "Single Workout"
                            : `Week ${programWeek || "--"} / Day ${
                                programDay || "--"
                              }`}
                        </span>
                        <div className="builderPreviewTitleRow">
                          <h2>{focusedEditor ? selectedProgramExercises[focusedExerciseIndex]?.exerciseName : sessionName || programName || "Name your workout"}</h2>
                          {!focusedEditor && selectedProgramExercises.length > 0 && (
                            <button
                              className={`outlineButton builderOrderToggle${
                                isBuilderOrderOpen ? " active" : ""
                              }`}
                              type="button"
                              onClick={() =>
                                { setIsBuilderOrderOpen((current: any) => !current); setMobileLibraryPanel("order"); }
                              }
                            >
                              <GripVertical size={16} />{t("polishExerciseOrderbc78")} </button>
                          )}
                        </div>
                        {!focusedEditor && <p>{t("polishActiveSection34db")}{" "}
                          <strong>{pendingSectionName || builderSectionOptions[0]}</strong>
                        </p>}
                        {!focusedEditor && pendingSectionName === "Circuit" &&
                          builderLibraryMode !== "Sections" && (
                            <p className="builderCircuitHint">
                              {t("coachCircuitAddHint")}
                            </p>
                          )}
                        {!focusedEditor && builderLibraryMode === "Sections" && (
                          <div className="builderSectionPicker builderSectionPickerInline">
                            <h3>{t("polishChooseASection87f5")}</h3>
                            <p>{t("polishNewExercisesWillBeAddedUnderTheSelectedSection2263")} </p>
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
                            {pendingSectionName === "Circuit" && (
                              <p className="builderCircuitHint">
                                {t("coachCircuitAddHint")}
                              </p>
                            )}
                            <label>
                              <span>{t("polishCustomSection8a73")}</span>
                              <div className="builderCustomSectionRow">
                                <input
                                  value={customBuilderSectionName}
                                  onChange={(e) =>
                                    setCustomBuilderSectionName(e.target.value)
                                  }
                                  placeholder={t("polishReturnToSportFingerboardd854")}
                                />
                                <button
                                  className="goldButton"
                                  onClick={() => {
                                    const name = (customBuilderSectionName || "").trim();
                                    if (name && customSectionColorChoice) {
                                      setCustomSectionColors((prev: any) => ({
                                        ...prev,
                                        [normalizeBuilderSection(name).toLowerCase()]:
                                          customSectionColorChoice,
                                      }));
                                    }
                                    selectBuilderSection(customBuilderSectionName);
                                  }}
                                >{t("polishUse1d4d")} </button>
                              </div>
                              <div className="builderSectionColorRow">
                                <small>{t("polishColourf285")}</small>
                                {CUSTOM_SECTION_COLORS.map((hex) => (
                                  <button
                                    key={hex}
                                    type="button"
                                    className={`builderSectionColorDot${
                                      customSectionColorChoice === hex
                                        ? " active"
                                        : ""
                                    }`}
                                    style={{ background: hex }}
                                    title={hex}
                                    onClick={() =>
                                      setCustomSectionColorChoice(
                                        customSectionColorChoice === hex
                                          ? ""
                                          : hex
                                      )
                                    }
                                  />
                                ))}
                              </div>
                            </label>
                          </div>
                        )}
                        <div className="builderDropHint">
                          {selectedProgramExercises.length === 0 ? (
                            <>
                              <Dumbbell size={28} />
                              <span>{t("polishChooseAnExerciseFromTheLeftToAddItToThisSessionb592")} </span>
                            </>
                          ) : (
                            <div
                              className="builderModalExerciseList"
                              ref={builderModalListRef}
                            >
                              {selectedProgramExercises.map((exercise: any, index: any) => {
                                if (focusedEditor && index !== focusedExerciseIndex) return null;
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
                                            <span>{t("polishLinkeda089")}{" "}
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
                                              title={t("polishLinkTheseExercisesAsASupersetAlternateSets047c")}
                                            >
                                              <Link2 size={15} />
                                              <span>{t("polishLinkSuperset7988")}</span>
                                            </button>
                                            <button
                                              type="button"
                                              className="builderSupersetLinkButton"
                                              onClick={() =>
                                                toggleBuilderCircuitLink(index)
                                              }
                                              title={t("polishLinkTheseExercisesAsACircuitRoundsOfEveryExerciseBackToBack40f1")}
                                            >
                                              <RefreshCw size={15} />
                                              <span>{t("polishLinkCircuit4dda")}</span>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                    {isCircuitGroupStart(index) && (
                                      <details className="circuitPanelInEditor builderCircuitDetails">
                                        <summary>{t("builderCircuitSettings")}</summary>
                                        {renderCircuitSettingsPanel(
                                          exercise,
                                          index
                                        )}
                                      </details>
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
                                    {renderBuilderExerciseOptionsMenu(exercise, index)}
                                  </div>

                                  <AthletePrescriptionHistory exercise={exercise} history={prescriptionHistory} date={calendarBuilderContext?.date || ""} />
                                  <div className="builderModalEditGrid">
                                    <ExerciseLabelControl exercise={exercise} index={index}
                                      change={value => updateProgramExercise(index, "exerciseLabel", value)} />
                                    <label>
                                      <span>{t("polishSectionf2c6")}</span>
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
                                      <span>{t("polishAccessory9624")}</span>
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

                                  </div>

                                  {renderPrescription(exercise, index)}

                                    </div>
                                  </Fragment>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="builderDrawerFooter">
                          <button
                            className="goldButton"
                            onClick={() => {
                              // The header save includes the current draft.
                              setIsBuilderLibraryOpen(false);
                            }}
                          >
                            {t("doneEditingExercise")}
                          </button>
                        </div>
                      </section>

                      {!focusedEditor && isBuilderOrderOpen && selectedProgramExercises.length > 0 && (
                        <aside className="builderArrangementSidebar builderModalOrderSidebar">
                          <div className="builderArrangementSidebarHeader">
                            <span className="eyebrow">{t("polishOrder1d75")}</span>
                            <h4>{t("polishExerciseOrderbc78")}</h4>
                            <button
                              className="iconButton compactIconButton"
                              type="button"
                              onClick={() => { setIsBuilderOrderOpen(false); setMobileLibraryPanel("session"); }}
                              aria-label={t("polishCollapseExerciseOrderbfee")}
                            >
                              <X size={15} />
                            </button>
                          </div>
                          <div className="builderArrangementSidebarList">
                            {getBuilderOrderItems(selectedProgramExercises).map((item: any, itemIndex: number, items: any[]) => {
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
                                  <div className="builderMobileOrderButtons">
                                    <button type="button" disabled={itemIndex === 0} aria-label={t("mobileMoveExerciseUp", { name: primaryExercise.exerciseName })} onClick={() => reorderProgramExercise(item.start, items[itemIndex - 1].start)}><ChevronUp size={18} /></button>
                                    <button type="button" disabled={itemIndex === items.length - 1} aria-label={t("mobileMoveExerciseDown", { name: primaryExercise.exerciseName })} onClick={() => reorderProgramExercise(item.start, items[itemIndex + 1].start)}><ChevronDown size={18} /></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </aside>
                      )}
                      {!focusedEditor && <footer className="builderMobileLibraryFooter"><span>{t("mobileLibraryCount", { count: selectedProgramExercises.length })}</span><button type="button" className="goldButton" onClick={() => { setSwapExerciseIndex(null); setIsBuilderLibraryOpen(false); }}>{t("doneEditingExercise")}</button></footer>}
                    </div>
                  </div>
                  </PortalToApp>
                )}

                {selectedProgramExercises.length > 0 && (
                  <div className="builderSessionStatsBar" id="builder-exercises">
                    <div className="builderSessionStats">
                      <div className="builderSessionStat">
                        <strong>{selectedProgramExercises.length}</strong>
                        <span>{t("polishExercises4dc5")}</span>
                      </div>
                      <div className="builderSessionStat">
                        <strong>
                          {selectedProgramExercises.reduce(
                            (sum: number, ex: any) =>
                              sum + (parseInt(ex.sets, 10) || 0),
                            0
                          )}
                        </strong>
                        <span>{t("polishWorkSets125a")}</span>
                      </div>
                      <div className="builderSessionStat">
                        <strong>
                          ~{estimateSessionMinutes(selectedProgramExercises)}
                          <em>{t("polishMinb6c9")}</em>
                        </strong>
                        <span>{t("polishEstDurationdca1")}</span>
                      </div>
                    </div>
                    <button
                      className="goldButton compactBuilderButton"
                      onClick={() => openBuilderLibrary("Exercises")}
                    >{t("polishAddExercise3ca5")} </button>
                  </div>
                )}

                {selectedProgramExercises.length > 0 && (
                  <details className="builderNotesDetails">
                    <summary>{t("redesignSessionNotes")}{sessionNotes?.trim() && <span aria-hidden="true"> · •</span>}</summary>
                  <label className="builderSessionNotesField builderSessionNotesFieldInline">
                    <span>{t("redesignSessionNotes")}</span>
                    <textarea
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                      placeholder={t("redesignNotesHint")}
                      rows={2}
                    />
                  </label>
                  </details>
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
                              <span>{exercisePrescription(exercise, i18n.language.startsWith("zh")).summary}</span>
                              {exercise.load && <span>{exercise.load}</span>}
                              {exercise.tempo && <span>{t("polishTempo8996")} {exercise.tempo}</span>}
                              {exercise.rest && <span>{t("polishRestb79e")} {exercise.rest}</span>}
                            </div>

                            <span className="builderExerciseExpandIndicator">{t("polishEdit5301")} </span>
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

                        <AthletePrescriptionHistory exercise={exercise} history={prescriptionHistory} date={calendarBuilderContext?.date || ""} />
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
                            {isCircuitGroupStart(index) && <details className="builderCircuitDetails">
                              <summary>{t("builderCircuitSettings")}</summary>
                              {renderCircuitSettingsPanel(exercise, index)}
                            </details>}
                            {exercise.isAccessory && (
                              <span className="exerciseAccessoryPill">{t("polishAccessoryFordd2d")}{" "}
                                {exercise.accessoryParentLabel ||
                                  exercise.exerciseLabel ||
                                  "main lift"}
                              </span>
                            )}
                          </div>
                        ) : null}

                        {renderAlternateExerciseEditor(exercise, index)}

                      </div>
                    </Fragment>
                  );
                })}

                </div>
                </PortalToApp>

                </>
                </>

                {/* Bottom save now lives in the sticky pbSaveBar (plus the
                    hero's Save Full Program) — one primary action per surface. */}
              </section>
                )}

                {workoutPageTab === "Program Builder" &&
                  useMobileWorkoutRows && (
                  <>
                    <div className="mobileBuilderContext">
                      <button type="button" onClick={returnToBuilderOrigin}><ChevronLeft size={18} />{t("mobileBackToLibrary")}</button>
                      <div><strong>{programName || (isSingleWorkoutBuilder ? t("mobileNewSession") : t("mobileNewProgram"))}</strong>
                        <small>{builderSaveStatus === "dirty" ? (cloudDraftStatus || t(coachDraftStatus === "saved" ? "coachDraftSavedLocally" : coachDraftStatus === "conflict" ? "coachDraftConflict" : coachDraftStatus === "unavailable" ? "coachDraftUnavailable" : "coachDraftSaving")) : t("mobileAllChangesSaved")}</small></div>
                    </div>
                    {mobileBuilderStep !== "overview" && (
                    <section className="mobileBuilder">
                      {mobileBuilderStep === "details" ? (
                        <div className="mobileBuilderBody">
                          <h2 className="mbScreenTitle">
                            {isSingleWorkoutBuilder ? t(editProgramRecordId ? "editSavedSession" : "mobileNewSession") : t("mobileSessionDetails")}
                          </h2>
                          <details className="mbProgramDetails" open={isSingleWorkoutBuilder}>
                          <summary>{t("mobileProgramSettings")}</summary>
                          <div className="mbField">
                            <span className="mbFieldLabel">{t("polishBuilderType18e9")}</span>
                            <select
                              className="miniSearch"
                              value={builderMode}
                              onChange={(e) =>
                                setBuilderMode(
                                  e.target.value as "Program" | "Single Workout"
                                )
                              }
                            >
                              <option value="Single Workout">{t("polishSingleWorkout8b3d")}</option>
                              <option value="Program">{t("polishMultiDayProgram407f")}</option>
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
                              placeholder={t("polishOptional0c6c")}
                            />
                          </div>

                          {!isSingleWorkoutBuilder && (
                              <label className="mbField"><span className="mbFieldLabel">{t("mobileProgramWeeks")}</span>
                                <input className="miniSearch" type="number" min="1" max="52" value={programDurationWeeks} onChange={(e) => setProgramDurationWeeks(e.target.value)} />
                              </label>
                          )}
                          </details>
                          {!isSingleWorkoutBuilder && (
                            <>
                              <div className="mbFieldRow">
                                <div className="mbField">
                                  <span className="mbFieldLabel">{t("polishWeekf82b")}</span>
                                  <input
                                    className="miniSearch"
                                    inputMode="numeric"
                                    value={programWeek}
                                    onChange={(e) => setProgramWeek(e.target.value)}
                                  />
                                </div>
                                <div className="mbField">
                                  <span className="mbFieldLabel">{t("polishDay987b")}</span>
                                  <input
                                    className="miniSearch"
                                    inputMode="numeric"
                                    value={programDay}
                                    onChange={(e) => setProgramDay(e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="mbField">
                                <span className="mbFieldLabel">{t("polishSessionName9dd6")}</span>
                                <input
                                  className="miniSearch"
                                  value={sessionName}
                                  onChange={(e) => setSessionName(e.target.value)}
                                  placeholder={t("polishEGLowerStrength497a")}
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
                          >{t("polishNextbc98")} </button>
                          {!isSingleWorkoutBuilder && (
                              <button
                                className="outlineButton mbFullButton"
                                onClick={() => setMobileBuilderStep("overview")}
                              >{t("polishViewProgram2e88")} </button>
                            )}
                        </div>
                      ) : (
                        <>
                          <div className="mobileBuilderBody mbEditorBody">
                            <div className="mbEditorTop">
                              <button
                                className="mbTextButton"
                                onClick={() => setMobileBuilderStep("details")}
                              >{t("polishDetailsa328")} </button>
                              <strong>{programName || "Untitled"}</strong>
                            </div>

                            {selectedProgramExercises.length === 0 ? (
                              <div className="mbEmpty">
                                <h3>{t("polishAddExercisesa4ef")}</h3>
                                <p>
                                  {t("coachAddFirstExercise")}
                                </p>
                                <button
                                  className="goldButton mbFullButton"
                                  onClick={openMobilePicker}
                                >{t("polishAddExercise0ca1")} </button>
                                {!isSingleWorkoutBuilder && (
                                  <button
                                    className="outlineButton mbFullButton"
                                    onClick={openMobileLibPick}
                                  >{t("polishInsertSavedSessioncc09")} </button>
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
                                    {index > 0 && !showSectionHeading && mobileExpandedExercise === index && (
                                      <details className="builderCircuitDetails"><summary>{t("mobileCircuitLinks")}</summary>
                                      {
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
                                          >{t("polishLinkAsSupersetf478")} </button>
                                          <button
                                            className="mobileSupersetLinkButton"
                                            onClick={() =>
                                              toggleBuilderCircuitLink(index)
                                            }
                                          >{t("polishLinkAsCircuit37b2")} </button>
                                        </div>
                                      )}
                                      </details>
                                    )}
                                    {isCircuitGroupStart(index) && mobileExpandedExercise === index &&
                                      <details className="builderCircuitDetails"><summary>{t("builderCircuitSettings")}</summary>{renderCircuitSettingsPanel(
                                        exercise,
                                        index
                                      )}</details>}
                                    <div className="mobileExerciseCard">
                                      <div className="mobileExerciseCardHeader">
                                        <button type="button" className="mobileExerciseToggle" aria-expanded={mobileExpandedExercise === index}
                                          onClick={() => setMobileExpandedExercise(mobileExpandedExercise === index ? null : index)}>
                                        <strong>
                                          {exercise.exerciseLabel
                                            ? `${exercise.exerciseLabel} · `
                                            : ""}
                                          {exercise.exerciseName}
                                        </strong>
                                        <small>{exercisePrescription(exercise, i18n.language.startsWith("zh")).summary}</small>
                                        <small>{t(mobileExpandedExercise === index ? "mobileClosePrescription" : "mobileEditPrescription")}</small>
                                        </button>
                                        <button
                                          className="mbCardMenuBtn"
                                          aria-label={t("polishExerciseOptionsb4ed")}
                                          onClick={() => setMobileMenuIndex(index)}
                                        >
                                          <MoreVertical size={18} />
                                        </button>
                                      </div>
                                      {mobileExpandedExercise === index && <div className="mobileExerciseCardBody">
                                      <ExerciseLabelControl exercise={exercise} index={index}
                                        change={value => updateProgramExercise(index, "exerciseLabel", value)} />
                                      {renderPrescription(exercise, index)}
                                      </div>}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {renderBlockActions()}
                          {onSaveCalendarDraft && isSingleWorkoutBuilder && <div className="calendarDraftSaveMobile"><SaveCalendarDraftButton onClick={onSaveCalendarDraft} disabled={savingTemplate} /></div>}
                          <div className="mobileBuilderActionBar">
                            <button
                              className="outlineButton"
                              onClick={openMobilePicker}
                            >{t("polishAdd109b")} </button>
                            {selectedProgramExercises.length > 1 && (
                              <button
                                className="outlineButton"
                                onClick={() => setMobileBuilderStep("arrange")}
                              >{t("polishArrangecfdd")} </button>
                            )}
                            {isSingleWorkoutBuilder ? (
                              <button
                                className="goldButton"
                                disabled={savingTemplate}
                                onClick={saveMobileWorkout}
                              >
                                {savingTemplate ? saveBusyLabel : editingPublishedSession ? (i18n.language.startsWith("zh") ? "\u53d1\u5e03\u4fee\u6539" : "Publish changes") : editingCalendarDraft ? (i18n.language.startsWith("zh") ? "保存草稿" : "Save draft") : "Save"}
                              </button>
                            ) : (
                              <button
                                className="goldButton"
                                disabled={savingTemplate}
                                onClick={saveMobileProgramDay}
                              >
                                {t("mobileReviewProgram")}
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </section>
                    )}

                    {mobileBuilderStep === "picker" && (
                      <div
                        className="mobileSheet"
                        role="dialog"
                        aria-modal="true"
                        aria-label={t("polishSelectExercisesc770")}
                      >
                        <header className="mobileBuilderHeader">
                          <button
                            className="mbHeaderBack"
                            onClick={() => {
                              setMobilePickerSelected(new Set());
                              setSwapExerciseIndex(null);
                              setMobileBuilderStep("editor");
                            }}
                            aria-label={t("polishBackb52b")}
                          >
                            ‹
                          </button>
                          <h2>
                            {swapExerciseIndex !== null &&
                            selectedProgramExercises[swapExerciseIndex]
                              ? `Replace ${selectedProgramExercises[swapExerciseIndex].exerciseName}`
                              : "Select exercises"}
                          </h2>
                          {swapExerciseIndex === null && (
                            <button
                              className="mbHeaderAction"
                              disabled={mobilePickerSelected.size === 0}
                              onClick={commitMobilePicker}
                            >
                              {mobilePickerSelected.size > 0
                                ? `Add ${mobilePickerSelected.size}`
                                : "Add"}
                            </button>
                          )}
                        </header>
                        <div className="mobileBuilderBody">
                          <div className="mbField">
                            <span className="mbFieldLabel">{t("polishSectionf2c6")}</span>
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
                            placeholder={t("polishSearchExercisec4cc")}
                          />
                          <button
                            type="button"
                            className="builderCreateExerciseCard mbCreateExercise"
                            onClick={openCreateExerciseFromBuilder}
                          >
                            <Plus size={14} />{t("polishCreateExerciseb53a")} </button>
                          {libraryLoading && builderExercises.length === 0 && (
                            <p className="mbHint">{t("polishLoadingExercisesd450")}</p>
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
                                onClick={() => {
                                  // Swap mode: one tap replaces the movement
                                  // in place and returns to the editor.
                                  if (swapExerciseIndex !== null) {
                                    replaceProgramExerciseWith(exercise);
                                    setMobileBuilderStep("editor");
                                    return;
                                  }
                                  toggleMobilePick(key);
                                }}
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
                              <p className="mbHint">{t("polishNoExercisesMatch16db")}</p>
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
                          role="dialog"
                          aria-modal="true"
                          aria-label={t("polishArrangeExercises94f0")}
                        >
                          <div className="mobileSheetHandle" />
                          <div className="mobileSheetTitleRow">
                            <h3>{t("polishArrangeExercises94f0")}</h3>
                            <button
                              className="mbHeaderAction"
                              onClick={() => setMobileBuilderStep("editor")}
                            >{t("polishDonee9b4")} </button>
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
                                >
                                  <div className="mobileArrangeBody">
                                    {item.isLinkedGroup && (
                                      <span className="mobileArrangeSupersetTag">
                                        <Link2 size={13} />{t("polishSupersetd568")} </span>
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
                                  <div className="mobileArrangeActions">
                                    <button
                                      type="button"
                                      className="mobileArrangeMove"
                                      disabled={itemIndex === 0}
                                      aria-label={`Move ${
                                        item.exercises[0]?.exerciseName || "exercise"
                                      } up`}
                                      onClick={() =>
                                        reorderProgramExercise(
                                          item.start,
                                          items[itemIndex - 1].start
                                        )
                                      }
                                    >
                                      <ChevronUp size={18} />
                                    </button>
                                    <button
                                      type="button"
                                      className="mobileArrangeMove"
                                      disabled={itemIndex === items.length - 1}
                                      aria-label={`Move ${
                                        item.exercises[0]?.exerciseName || "exercise"
                                      } down`}
                                      onClick={() =>
                                        reorderProgramExercise(
                                          item.start,
                                          items[itemIndex + 1].start
                                        )
                                      }
                                    >
                                      <ChevronDown size={18} />
                                    </button>
                                    <button
                                      type="button"
                                      className="mobileArrangeHandle"
                                      aria-label={`Drag ${
                                        item.exercises[0]?.exerciseName || "exercise"
                                      } to reorder`}
                                      onPointerDown={(e) =>
                                        startMobileDrag(e, itemIndex)
                                      }
                                    >
                                      <GripVertical size={22} />
                                    </button>
                                  </div>
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
                            {t("redesignDays", { count: programSessions.length })}
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
                                <details className="mbOvWeek" key={w} open={w === 1 || days.length > 0}>
                                  <summary className="mbOvWeekHead">
                                    <strong>{t("redesignWeek", { week: w })}</strong>
                                    {days.length > 0 && (
                                      <span className="weekVolChip">
                                        {t("redesignSets", { count: weekVolume(w).sets })}
                                      </span>
                                    )}
                                    {days.length > 0 && (
                                      <button
                                        type="button"
                                        className="mbOvDup"
                                        onClick={(event) => { event.preventDefault(); setWeekDupMenu(w); }}
                                      >
                                        <Copy size={13} /> {t("redesignDuplicateWeek")}
                                      </button>
                                    )}
                                  </summary>
                                  {days.map((s: any) => (
                                    <div className="mbOvDayRow" key={s.localId}><button
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
                                          {t("day")} {s.day} ·{" "}
                                          {s.sessionName ||
                                            `Week ${w} Day ${s.day}`}
                                        </strong>
                                        <small>
                                          {t("redesignExercises", { count: s.exercises.length })}
                                        </small>
                                      </span>
                                      <span className="mbOvChevron">›</span>
                                    </button><button type="button" className="mbCopyDay" aria-label={t("redesignCopyDay")} onClick={() => duplicateProgramSession(s)}><Copy size={17} /></button></div>
                                  ))}
                                  <button
                                    type="button"
                                    className="mbOvAdd"
                                    onClick={() => addMobileDayToWeek(w)}
                                  >
                                    <Plus size={15} /> {t("redesignAddDay")}
                                  </button>
                                </details>
                              );
                            });
                          })()}

                          <button type="button" className="outlineButton mbFullButton" onClick={() => setProgramDurationWeeks(String(Math.max(Number(programDurationWeeks) || 1, ...programSessions.map((s: any) => Number(s.week) || 1)) + 1))}>
                            <Plus size={16} /> {t("mobileAddWeek")}
                          </button>
                          <button
                            type="button"
                            className="goldButton mbFullButton mbSaveProgramAction"
                            disabled={savingTemplate}
                            onClick={finishMobileProgram}
                          >
                            {savingTemplate
                              ? t("redesignSaving")
                              : editProgramRecordId
                                ? t("redesignUpdateProgram")
                                : t("redesignSaveProgram")}
                          </button>
                          {onSaveCalendarDraft && <SaveCalendarDraftButton onClick={onSaveCalendarDraft} disabled={savingTemplate} />}
                        </div>
                      </section>
                    )}

                    {mobileBuilderStep === "libpick" && (
                      <div
                        className="mobileSheet"
                        role="dialog"
                        aria-modal="true"
                        aria-label={t("polishSelectSavedSessionea91")}
                      >
                        <header className="mobileBuilderHeader">
                          <button
                            className="mbHeaderBack"
                            onClick={() => setMobileBuilderStep("editor")}
                            aria-label={t("polishBackb52b")}
                          >
                            ‹
                          </button>
                          <h2>{t("polishInsertSessionb53b")}</h2>
                          <span style={{ width: 40 }} />
                        </header>
                        <div className="mobileBuilderBody">
                          <div className="mbField">
                            <span className="mbFieldLabel">{t("polishFromProgram22b1")}</span>
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
                              <option value="">{t("polishChooseAProgram45d8")}</option>
                              {programs.map((pp: any) => (
                                <option key={pp.recordId} value={pp.programId}>
                                  {pp.programName}
                                </option>
                              ))}
                            </select>
                          </div>
                          {sessionLibLoading && (
                            <p className="mbHint">{t("polishLoadingSessions3164")}</p>
                          )}
                          {!sessionLibLoading &&
                            sessionLibProgramId &&
                            sessionLibSessions.length === 0 && (
                              <p className="mbHint">{t("polishNoSessionsInThisProgramf4b6")} </p>
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
                                <small>{s.exercises.length}{t("polishExercises0ee6")}</small>
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
                            role="dialog"
                            aria-modal="true"
                            aria-label={t("polishExerciseOptionsb4ed")}
                          >
                            <div className="mobileSheetHandle" />
                            <h3 className="mobileOptionsTitle">{t("polishExerciseOptionsb4ed")}</h3>
                            <div className="mobileOptionsGrid">
                              {/* "Details" (the per-set % / tempo table) moved
                                  to an inline link on the card — this slot now
                                  swaps the movement, keeping the prescription. */}
                              <button
                                onClick={() => {
                                  setSwapExerciseIndex(mobileMenuIndex);
                                  setMobileMenuIndex(null);
                                  openMobilePicker();
                                }}
                              >
                                <span className="mbOptIcon">
                                  <RefreshCw size={22} />
                                </span>{t("polishChange64fb")} </button>
                              <button
                                onClick={() => {
                                  viewProgramExercise(
                                    selectedProgramExercises[mobileMenuIndex]
                                  );
                                  setMobileMenuIndex(null);
                                }}
                              >
                                <span className="mbOptIcon">
                                  <Film size={22} />
                                </span>{t("polishViewExercise6a3d")} </button>
                              {/* Edit-on-the-fly: same library editor the
                                  desktop builder kebab opens — fix a video or
                                  name without leaving the session. */}
                              <button
                                onClick={() => {
                                  editProgramExerciseInLibrary(
                                    selectedProgramExercises[mobileMenuIndex]
                                  );
                                  setMobileMenuIndex(null);
                                }}
                              >
                                <span className="mbOptIcon">
                                  <Pencil size={22} />
                                </span>
                                {t("editLibraryExercise")}
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
                                </span>{t("polishDuplicate972d")} </button>
                              <button
                                onClick={() => {
                                  removeProgramExercise(mobileMenuIndex);
                                  setMobileMenuIndex(null);
                                }}
                              >
                                <span className="mbOptIcon mbOptIconDanger">
                                  <Trash2 size={22} />
                                </span>{t("polishDeletef6fd")} </button>
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
                            role="dialog"
                            aria-modal="true"
                            aria-label={`Exercise details for ${
                              selectedProgramExercises[mobileDetailsIndex]
                                .exerciseName
                            }`}
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
                              >{t("polishDonee9b4")} </button>
                            </div>
                            <div className="mobileSheetScroll">
                              <p className="mbDetailsHint">{t("polishFullSetDetailLoad1RMTempoResta800")} {isCardioCategory(
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
                              role="dialog"
                              aria-modal="true"
                              aria-label={`Alternates for ${ex.exerciseName}`}
                            >
                              <div className="mobileSheetHandle" />
                              <div className="mobileSheetTitleRow">
                                <h3>{t("polishAlternates90d6")} {ex.exerciseName}</h3>
                                <button
                                  className="mbHeaderAction"
                                  onClick={() => setMobileAlternateIndex(null)}
                                >{t("polishDonee9b4")} </button>
                              </div>
                              <div className="mobileSheetScroll">
                                <p className="mbDetailsHint">{t("polishSwapsTheAthleteCanUseInsteadOfThisExercisee604")} </p>

                                {alts.length === 0 ? (
                                  <p className="mbHint">{t("polishNoAlternatesYetc3dc")}</p>
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
                                            aria-label={t("polishMoveUpb4f5")}
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
                                            aria-label={t("polishMoveDown260f")}
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
                                  placeholder={t("polishSearchToAddAnAlternate2546")}
                                />
                                <div className="mbAltLibrary">
                                  {libraryLoading &&
                                    libraryExercises.length === 0 && (
                                      <p className="mbHint">{t("polishLoading33ce")}</p>
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
                                      <p className="mbHint">{t("polishNoMatches0be6")}</p>
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
                        <span className="programViewSelect programViewStatic">{t("polishAllForms04f4")} </span>
                        <input
                          className="templateSearchInput programLandingSearch"
                          value={savedFormSearch}
                          onChange={(e) => setSavedFormSearch(e.target.value)}
                          placeholder={t("polishSearchForms9253")}
                        />
                      </div>

                    </div>
                    <div className="programLibraryStack">
                      <div className="programTable wkFormsTable">
                        <div className="programTableHead">
                          <span>{t("polishTitle768e")}</span>
                          <span>{t("polishType3deb")}</span>
                          <span>{t("polishItems44d2")}</span>
                          <span>{t("polishCreatedBy43de")}</span>
                          <span className="programTableActionsHead">{t("polishActionsc3cd")}</span>
                        </div>
                        {formTemplatesLoading &&
                          savedFormTemplates.length === 0 && (
                            <p className="programTableEmpty">{t("polishLoading33ce")}</p>
                          )}
                        {!formTemplatesLoading &&
                          savedFormTemplates.length === 0 && (
                            <p className="programTableEmpty">{t("polishNoSavedFormsYetCreateOneToAssignToClients2172")} </p>
                          )}
                        {!formTemplatesLoading &&
                          savedFormTemplates.length > 0 &&
                          visibleSavedForms.length === 0 && (
                            <p className="programTableEmpty">{t("polishNoFormsMatchYourSearch3ae9")} </p>
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
                                {(form.questions?.length ?? 0)}{t("polishQuestionsff3d")} </span>
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
                                  title={t("polishDuplicateForm4a5d")}
                                  onClick={() => duplicateSavedFormIntoBuilder(form)}
                                >
                                  <Copy size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="iconActionButton dangerMenuItem"
                                  title={t("polishDeleteForme51f")}
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
                      <ChevronLeft size={16} />{t("polishForms4bec")} </button>
                    <div className="builderHubHeader builderToneHeader">
                      <div>
                        <h2>{t("polishFormQuestionnaireBuilder9b72")}</h2>
                        <p>{t("polishBuildCheckInsIntakeFormsReadinessSurveysAndCustomQuestionnairesFo1d31")} </p>
                      </div>
                      <div className="builderHubActions">
                        <details className="savedTemplateDropdown">
                          <summary className="outlineButton">{t("polishSavedForms370a")} <span>{savedFormTemplates.length}</span>
                          </summary>
                          <div className="savedTemplateDropdownMenu">
                            <div className="savedTemplateHeader">
                              <h3>{t("polishSavedForms370a")}</h3>
                              <button
                                className="outlineButton"
                                onClick={(event) => {
                                  event.preventDefault();
                                  void loadFormTemplates(true);
                                }}
                              >{t("polishReloadcce7")} </button>
                            </div>

                            <input
                              className="templateSearchInput"
                              value={savedFormSearch}
                              onChange={(event) =>
                                setSavedFormSearch(event.target.value)
                              }
                              placeholder={t("polishSearchForms9253")}
                            />

                            {formTemplatesLoading && (
                              <p className="emptyState">{t("polishLoadingFormsc68a")}</p>
                            )}

                            {!formTemplatesLoading &&
                              savedFormTemplates.length === 0 && (
                                <p className="emptyState">{t("polishNoSavedFormsYet6be8")}</p>
                              )}

                            {!formTemplatesLoading &&
                              savedFormTemplates.length > 0 &&
                              visibleSavedForms.length === 0 && (
                                <p className="emptyState">{t("polishNoFormsMatchYourSearch3ae9")}</p>
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
                                    <small>{form.questions.length}{t("polishQuestionsff3d")}</small>
                                  </button>
                                  <details className="templateActionMenu">
                                    <summary aria-label={t("polishTemplateActionsa931")}>...</summary>
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => loadSavedFormIntoBuilder(form)}
                                      >{t("polishEdit5301")} </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          duplicateSavedFormIntoBuilder(form)
                                        }
                                      >{t("polishDuplicate972d")} </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteSavedFormTemplate(form)}
                                      >{t("polishDeletef6fd")} </button>
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
                            <span>{t("polishFormName3baf")}</span>
                            <input
                              className="miniSearch"
                              value={formTemplateName}
                              onChange={(e) => setFormTemplateName(e.target.value)}
                            />
                          </label>
                          <label>
                            <span>{t("polishType3deb")}</span>
                            <select
                              className="miniSearch"
                              value={formTemplateType}
                              onChange={(e) => setFormTemplateType(e.target.value)}
                            >
                              <option>{t("polishCheckIn4843")}</option>
                              <option>{t("polishQuestionnaire42d2")}</option>
                              <option>{t("polishIntaked9e7")}</option>
                              <option>{t("polishReadiness6dc1")}</option>
                              <option>{t("polishCustom081a")}</option>
                            </select>
                          </label>
                        </div>

                        <div className="builderHubList">
                          <div className="exerciseTitleRow">
                            <h3>{t("polishQuestions9a1f")}</h3>
                            <button className="outlineButton" onClick={addFormQuestion}>{t("polishAddQuestion1475")} </button>
                          </div>

                          {formQuestions.map((question: any, index: any) => (
                            <div className="builderHubRow" key={`${question.id}-${index}`}>
                              <label>
                                <span>{t("polishQuestion002f")}</span>
                                <input
                                  className="miniSearch"
                                  value={question.label}
                                  onChange={(e) =>
                                    updateFormQuestion(index, "label", e.target.value)
                                  }
                                  placeholder={t("polishQuestionTextdda9")}
                                />
                              </label>
                              <label>
                                <span>{t("polishType3deb")}</span>
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
                                  <option>{t("polishTextc332")}</option>
                                  <option>{t("polishLongText3afc")}</option>
                                  <option>{t("polishNumberb7ba")}</option>
                                  <option>{t("polishScalea29f")}</option>
                                  <option>{t("polishSingleSelectc17b")}</option>
                                  <option>{t("polishMultiSelect9ffa")}</option>
                                  <option>{t("polishYesNo9f62")}</option>
                                  <option>{t("polishDateeb9a")}</option>
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
                                <span>{t("polishRequiredeed6")}</span>
                              </label>
                              <button
                                className="outlineButton"
                                onClick={() => removeFormQuestion(index)}
                              >{t("polishRemovee963")} </button>
                            </div>
                          ))}
                        </div>
                    </div>
                  </section>
                )}

              </>
    </>
  );
}
